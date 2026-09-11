from __future__ import annotations

from pathlib import Path
from typing import Any
from functools import lru_cache
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict

from src.data_pipeline import CLEAN_DATA, RAW_DATA, TARGET, TRAINING_DATA
from src.hydration import FeatureHydrator
from src.space_engine import (
    add_or_update_verification,
    get_candidate_zones,
    get_historical_change_detection,
    get_prospectivity_heatmap_features,
    get_satellite_metadata,
    get_spectral_analysis,
    get_unregistered_mining_alerts,
    handle_assistant_query,
    load_verifications,
    run_preprocessing_telemetry,
)
from src.moil_engine import (
    MOIL_MINES,
    get_drillholes,
    get_reserve_estimation,
    get_production_forecast,
    get_equipment_intelligence,
    get_prescriptive_actions,
    simulate_what_if_scenario,
    get_operational_alerts,
    get_model_performance_audit,
)

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "model.pkl"
PLOTS_DIR = ROOT / "plots"

app = FastAPI(
    title="MANGAN-AI: Space Technology & AI/ML Manganese Exploration Engine",
    description="Multispectral satellite intelligence, spectral mineralogy, and Random Forest prospectivity prediction for manganese exploration.",
    version="3.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_data() -> pd.DataFrame:
    if not CLEAN_DATA.exists():
        from src.data_pipeline import prepare_data
        cleaned, _ = prepare_data()
        return cleaned
    return pd.read_csv(CLEAN_DATA)


@lru_cache(maxsize=1)
def _load_bundle() -> dict:
    if not MODEL_PATH.exists():
        from src.train import train_model
        train_model()
    return joblib.load(MODEL_PATH)


def _json_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    return value


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    Latitude: float | None = None
    Longitude: float | None = None
    State: str | None = None
    District: str | None = None
    Elevation_m: float | None = None
    Topo_Slope_deg: float | None = None
    Avg_Temperature_C: float | None = None
    Annual_Precip_mm: float | None = None
    Rainy_Days: int | None = None
    Soil_Type: str | None = None
    Host_Rock: str | None = None
    Formation: str | None = None
    Road_Accessibility: str | None = None
    Distance_to_Port_km: float | None = None


class PreprocessingRequest(BaseModel):
    latitude: float = 21.63
    longitude: float = 85.58
    sensor: str = "sentinel-2"


class AssistantRequest(BaseModel):
    query: str
    context: dict[str, Any] | None = None


class VerificationPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    zone_id: str
    zone_name: str
    latitude: float
    longitude: float
    status: str
    geologist: str
    verification_date: str | None = None
    field_notes: str | None = None
    sample_id: str | None = None
    recommendation: str | None = None


@app.get("/")
def root() -> dict:
    return {
        "service": "MANGAN-AI Exploration Engine API",
        "version": "3.0.0",
        "mission": "Using Space Technology and AI/ML to Identify Manganese Mineralization Zones",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health() -> dict:
    data = _load_data()
    return {
        "status": "ok",
        "dataset_rows": len(data),
        "inventory_rows": len(data),
        "dataset_file": "data/cleaned_districts.csv",
        "grade_data_status": "BLOCKED_BY_SOURCE_DATA",
    }


@app.get("/api/summary")
def summary() -> dict:
    data = _load_data()
    raw = pd.read_csv(RAW_DATA) if RAW_DATA.exists() else pd.DataFrame()
    training = pd.read_csv(TRAINING_DATA) if TRAINING_DATA.exists() else pd.DataFrame()
    production = pd.to_numeric(data[TARGET], errors="coerce").sum()
    
    return {
        "total_records": int(len(data)),
        "inventory_records": int(len(data)),
        "raw_records": int(len(raw)),
        "training_rows": int(len(training)),
        "real_observations": int((training.get("Synthetic", pd.Series(dtype=bool)) == False).sum()) if not training.empty else len(data),
        "synthetic_observations": int((training.get("Synthetic", pd.Series(dtype=bool)) == True).sum()) if not training.empty else 0,
        "states": int(data["State"].nunique()),
        "districts": int(data["District"].nunique()),
        "total_annual_production_tonnes": float(production),
        "average_grade_pct": None,
        "grade_reporting_status": "Grade_pct not reported in historical IBM source. A-Grade standard unconfigured.",
        "year_range": sorted(data["Year"].dropna().unique().tolist()),
        "year_basis": "financial_year",
        "soil_types": sorted(data["Soil_Type"].dropna().astype(str).unique().tolist()),
        "provenance_note": "ML model trains exclusively with RandomForestRegressor over validated historical district observations with synthetic sibling augmentation.",
    }


@app.get("/api/deposits")
def deposits(
    state: str | None = None,
    district: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
) -> dict:
    data = _load_data()
    if state:
        data = data[data["State"].str.casefold() == state.casefold()]
    if district:
        data = data[data["District"].str.casefold() == district.casefold()]
    if search:
        mask = data.astype(str).apply(lambda column: column.str.contains(search, case=False, na=False)).any(axis=1)
        data = data[mask]
    total = len(data)
    page_data = data.iloc[(page - 1) * limit : page * limit]
    return {
        "items": page_data.replace({np.nan: None}).to_dict(orient="records"),
        "page": page,
        "limit": limit,
        "total": total,
    }


@app.get("/api/deposits/{deposit_id}")
def deposit_detail(deposit_id: str) -> dict:
    data = _load_data()
    matches = data[data["Deposit_ID"].astype(str) == deposit_id]
    if matches.empty:
        raise HTTPException(status_code=404, detail="Deposit record not found")
    return matches.iloc[0].replace({np.nan: None}).to_dict()


@app.get("/api/map/deposits")
def map_deposits() -> dict:
    data = _load_data().dropna(subset=["Latitude", "Longitude"])
    points = [
        {
            "deposit_id": str(row.get("Deposit_ID")),
            "state": str(row.get("State")),
            "district": str(row.get("District")),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "production_tonnes": _json_value(row.get(TARGET)),
            "grade_pct": None,
            "soil_type": str(row.get("Soil_Type", "Unknown")),
            "formation": str(row.get("Formation", "Unknown")),
            "elevation_m": _json_value(row.get("Elevation_m")),
            "is_observed": True,
        }
        for _, row in data.iterrows()
    ]
    return {"points": points}


@app.get("/api/production/trend")
def production_trend(
    state: str | None = None,
    district: str | None = None,
    deposit_id: str | None = None,
) -> dict:
    data = _load_data()
    if state:
        data = data[data["State"].str.casefold() == state.casefold()]
    if district:
        data = data[data["District"].str.casefold() == district.casefold()]
    if deposit_id:
        data = data[data["Deposit_ID"].astype(str) == deposit_id]
    series = data.groupby("Year", as_index=False)[TARGET].sum().sort_values("Year")
    return {
        "series": [
            {"year": str(row["Year"]), "production_tonnes": float(row[TARGET])}
            for _, row in series.iterrows()
        ]
    }


@app.get("/api/model/metrics")
def model_metrics() -> dict:
    bundle = _load_bundle()
    metrics = bundle["metrics"].copy()
    metrics["charts"] = {
        "actual_vs_predicted": "/plots/ml_actual_vs_predicted.png",
        "feature_importance": "/plots/ml_feature_importance.png",
    }
    return metrics


# ============================================================
# SPACE TECHNOLOGY & SPECTRAL MINERALOGY ENDPOINTS
# ============================================================

@app.get("/api/satellite/metadata")
def satellite_metadata(sensor: str = Query("sentinel-2")) -> dict:
    return get_satellite_metadata(sensor)


@app.post("/api/preprocess/run")
def preprocess_run(req: PreprocessingRequest) -> dict:
    return run_preprocessing_telemetry(req.latitude, req.longitude)


@app.get("/api/spectral/analysis")
def spectral_analysis(
    latitude: float = Query(21.63),
    longitude: float = Query(85.58),
) -> dict:
    return get_spectral_analysis(latitude, longitude)


@app.get("/api/prospectivity/heatmap")
def prospectivity_heatmap() -> dict:
    return {"zones": get_prospectivity_heatmap_features()}


@app.get("/api/candidates/zones")
def candidate_zones() -> dict:
    return {"candidates": get_candidate_zones()}


@app.get("/api/change-detection")
def change_detection() -> dict:
    return get_historical_change_detection()


@app.get("/api/alerts/unregistered")
def unregistered_alerts() -> dict:
    return {"alerts": get_unregistered_mining_alerts()}


@app.get("/api/field-verification")
def get_field_verifications() -> dict:
    return {"verifications": load_verifications()}


@app.post("/api/field-verification")
def post_field_verification(payload: VerificationPayload) -> dict:
    return add_or_update_verification(payload.model_dump())


@app.post("/api/assistant/chat")
def assistant_chat(req: AssistantRequest) -> dict:
    return handle_assistant_query(req.query, req.context)


@app.post("/api/reports/generate")
def generate_report_dossier(req: dict[str, Any]) -> dict:
    zone_id = req.get("zone_id", "CZ-01")
    candidates = get_candidate_zones()
    zone = next((c for c in candidates if c["id"] == zone_id), candidates[0])
    change_data = get_historical_change_detection()
    alerts = get_unregistered_mining_alerts()
    verifications = load_verifications()
    ver = next((v for v in verifications if v.get("zone_id") == zone["id"]), None)

    return {
        "report_id": f"MANGAN-EXP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{zone['id']}",
        "title": f"MANGANESE EXPLORATION INTELLIGENCE DOSSIER — {zone['name'].upper()}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "lead_agency": "Ministry of Mines / Geological Survey of India (GSI) / IBM",
        "target_zone": zone,
        "satellite_telemetry": get_satellite_metadata("sentinel-2"),
        "spectral_indices": get_spectral_analysis(zone["latitude"], zone["longitude"]),
        "historical_change": change_data,
        "unregistered_alerts": [a for a in alerts if a.get("district") in zone["region"]],
        "field_verification": ver,
        "disclaimer": "This dossier is generated by MANGAN-AI for exploration target prioritization. Subsurface ore volume, grade tonnage, and economic viability require statutory GSI/IBM ground verification and diamond core borehole assaying.",
    }


# ============================================================
# MOIL MINING INTELLIGENCE & PRODUCTION PLANNING ENDPOINTS
# ============================================================

class SimulatorPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mine_id: str = "moil-balaghat"
    num_excavators: int = 4
    num_dumpers: int = 8
    equipment_avail_delta_pct: float = 0.0
    working_hours_per_day: float = 16.0
    rainfall_scenario_mm: float = 20.0
    blasting_delay_hrs: float = 0.0


@app.get("/api/moil/mines")
def moil_mines() -> dict:
    return {"mines": MOIL_MINES}


@app.get("/api/moil/drillholes")
def moil_drillholes(mine_id: str | None = None) -> dict:
    return {"drillholes": get_drillholes(mine_id)}


@app.get("/api/moil/reserves")
def moil_reserves(mine_id: str = Query("moil-balaghat")) -> dict:
    return get_reserve_estimation(mine_id)


@app.get("/api/moil/production/forecast")
def moil_production_forecast(mine_id: str = Query("moil-balaghat")) -> dict:
    return get_production_forecast(mine_id)


@app.get("/api/moil/equipment")
def moil_equipment(mine_id: str = Query("moil-balaghat")) -> dict:
    return get_equipment_intelligence(mine_id)


@app.get("/api/moil/prescriptions")
def moil_prescriptions(mine_id: str = Query("moil-balaghat")) -> dict:
    return {"recommendations": get_prescriptive_actions(mine_id)}


@app.post("/api/moil/simulator/run")
def moil_simulator_run(payload: SimulatorPayload) -> dict:
    return simulate_what_if_scenario(
        mine_id=payload.mine_id,
        num_excavators=payload.num_excavators,
        num_dumpers=payload.num_dumpers,
        equipment_avail_delta_pct=payload.equipment_avail_delta_pct,
        working_hours_per_day=payload.working_hours_per_day,
        rainfall_scenario_mm=payload.rainfall_scenario_mm,
        blasting_delay_hrs=payload.blasting_delay_hrs,
    )


@app.get("/api/moil/alerts")
def moil_alerts() -> dict:
    return {"alerts": get_operational_alerts()}


@app.get("/api/moil/model-audit")
def moil_model_audit() -> dict:
    return get_model_performance_audit()


def _compute_explanations(bundle: dict, row_dict: dict, prediction: float) -> list[dict]:
    pipeline = bundle["pipeline"]
    features = bundle["features"]
    reference = bundle["reference"]
    impacts = []

    for feature in features:
        if feature not in row_dict:
            continue
        perturbed = row_dict.copy()
        perturbed[feature] = reference.get(feature, row_dict.get(feature))
        try:
            counterfactual = float(pipeline.predict(pd.DataFrame([perturbed], columns=features))[0])
            contribution = prediction - counterfactual
            if abs(contribution) > 10.0:
                impacts.append({
                    "feature": feature,
                    "value": str(row_dict.get(feature)),
                    "impact": "increased" if contribution > 0 else "decreased",
                    "contribution_tonnes": round(contribution, 2),
                    "reason": f"Estimated marginal output impact compared to reference baseline value ({reference.get(feature)}).",
                })
        except Exception:
            continue

    return sorted(impacts, key=lambda item: abs(item["contribution_tonnes"]), reverse=True)[:5]


@app.post("/api/model/predict")
def predict(request: PredictionRequest) -> dict:
    lat = request.Latitude
    lon = request.Longitude

    if lat is not None and not (6.0 <= lat <= 37.5):
        raise HTTPException(status_code=422, detail=f"Latitude {lat} is outside India's geographic bounds (6.0 - 37.5°N).")
    if lon is not None and not (68.0 <= lon <= 97.5):
        raise HTTPException(status_code=422, detail=f"Longitude {lon} is outside India's geographic bounds (68.0 - 97.5°E).")

    bundle = _load_bundle()
    body = request.model_dump(exclude_none=True)

    hydrated_context: dict[str, Any] = {}
    if lat is not None and lon is not None:
        try:
            hydrated_context = FeatureHydrator().hydrate(lat, lon)
            for k, v in hydrated_context.items():
                if body.get(k) is None:
                    body[k] = v
        except ValueError as err:
            raise HTTPException(status_code=422, detail=str(err)) from err

    reference = bundle.get("reference", {})
    row = {feature: body.get(feature, reference.get(feature)) for feature in bundle["features"]}

    missing_features = [f for f, v in row.items() if v is None]
    if missing_features:
        raise HTTPException(status_code=422, detail=f"Missing essential model features: {missing_features}")

    input_df = pd.DataFrame([row], columns=bundle["features"])
    raw_pred = float(bundle["pipeline"].predict(input_df)[0])
    prediction = max(0.0, raw_pred)

    if prediction >= 400000.0:
        feasibility_rating = "High Feasibility (>400k t/yr)"
    elif prediction >= 50000.0:
        feasibility_rating = "Moderate Feasibility (50k-400k t/yr)"
    else:
        feasibility_rating = "Low Feasibility (<50k t/yr)"

    coverage_level = hydrated_context.get("coverage_level", "Moderate")
    coverage_score = hydrated_context.get("coverage_score", 70)
    coverage_warning = hydrated_context.get("coverage_warning")

    explanations = _compute_explanations(bundle, row, prediction)

    return {
        "predicted_annual_production_tonnes": round(prediction, 2),
        "feasibility_rating": feasibility_rating,
        "predicted_grade_pct": None,
        "grade_prediction_status": "DATA_BLOCKED: Grade_pct values not present in IBM historical source tables.",
        "high_grade_potential_status": "A-Grade classification threshold unconfigured (Future Prospect).",
        "training_data_coverage": {
            "level": coverage_level,
            "score": coverage_score,
            "distance_to_nearest_mine_km": hydrated_context.get("Distance_to_Nearest_Mine_km"),
            "warning": coverage_warning,
        },
        "environmental_context": {
            "elevation_m": body.get("Elevation_m"),
            "topo_slope_deg": body.get("Topo_Slope_deg"),
            "avg_temperature_c": body.get("Avg_Temperature_C"),
            "annual_precip_mm": body.get("Annual_Precip_mm"),
            "rainy_days": body.get("Rainy_Days"),
            "weather_available": hydrated_context.get("weather_available", True),
            "terrain_available": hydrated_context.get("terrain_available", True),
        },
        "accessibility_context": {
            "nearest_port": hydrated_context.get("nearest_port"),
            "distance_to_port_km": body.get("Distance_to_Port_km"),
            "road_accessibility": body.get("Road_Accessibility"),
        },
        "hydrated_from_district": hydrated_context.get("hydrated_from_district"),
        "input_features_used": {f: _json_value(row.get(f)) for f in bundle["features"]},
        "explanation": {
            "top_contributing_factors": explanations,
        },
    }


@app.get("/plots/{filename}")
def chart(filename: str):
    path = PLOTS_DIR / filename
    if not path.is_file() or path.suffix.lower() != ".png":
        raise HTTPException(status_code=404, detail="Chart not found")
    return FileResponse(path)
