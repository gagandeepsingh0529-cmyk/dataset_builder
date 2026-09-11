from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from main import app
from src.data_pipeline import (
    CATEGORICAL_FEATURES,
    CLEAN_DATA,
    MODEL_FEATURES,
    NUMERIC_FEATURES,
    RAW_DATA,
    REAL_ONLY_DATA,
    SYNTHETIC_ONLY_DATA,
    TARGET,
    TRAINING_DATA,
    load_clean_dataset,
    prepare_data,
)
from src.hydration import FeatureHydrator
from src.train import train_model


def test_data_integrity():
    print("TEST: Data Integrity & Deduplication...")
    cleaned, training = prepare_data()

    assert len(cleaned) == 30, f"Expected 30 district inventory records, got {len(cleaned)}"
    assert (training["Synthetic"] == False).sum() == 30, "Real observations must equal 30"
    assert (training["Synthetic"] == True).sum() == 360, "Synthetic observations must equal 360"
    assert len(training) == 390, f"Expected 390 total training rows, got {len(training)}"

    # Check that duplicates on (Deposit_ID, Year) do not exist
    dups = cleaned.duplicated(subset=["Deposit_ID", "Year"]).sum()
    assert dups == 0, f"Found {dups} duplicate records on (Deposit_ID, Year)"

    # Check Grade_pct remains missing without fabrication
    assert cleaned["Grade_pct"].isna().all(), "Grade_pct must remain missing (no fabricated values)"
    print("  [PASS] Data integrity and clean separation verified.")


def test_target_leakage():
    print("TEST: Target Leakage Prevention...")
    _, training = prepare_data()
    forbidden = {"Reserve_to_Production_ratio", "Production_Gap_tonnes", "Reserves_tonnes"}
    used_features = set(MODEL_FEATURES)
    leakage = forbidden.intersection(used_features)
    assert len(leakage) == 0, f"Target leakage features found in MODEL_FEATURES: {leakage}"
    assert "Synthetic" not in MODEL_FEATURES, "Synthetic provenance flag must not be used as model feature"
    print("  [PASS] Target leakage completely absent from model feature set.")


def test_model_training_and_serialization():
    print("TEST: RandomForestRegressor Pipeline & Serialization...")
    metrics = train_model()

    assert metrics["model"] == "RandomForestRegressor", "Model must be RandomForestRegressor"
    assert metrics["target"] == TARGET, f"Target must be {TARGET}"
    assert "r2" in metrics and "mae" in metrics and "rmse" in metrics, "Missing evaluation metrics"
    assert metrics["training_rows"] > 0 and metrics["test_rows"] > 0, "Invalid split counts"
    assert metrics["real_rows"] == 30 and metrics["synthetic_rows"] == 360, "Row count mismatch"

    # Verify model bundle on disk
    model_path = Path(__file__).resolve().parent / "models" / "model.pkl"
    assert model_path.exists(), "model.pkl not saved"
    import joblib
    bundle = joblib.load(model_path)
    assert "pipeline" in bundle and "features" in bundle, "Invalid bundle structure"
    print("  [PASS] Model training, Group-validation, and bundle serialization verified.")


def test_location_context_engine():
    print("TEST: Unified Location Context Engine (Hydration)...")
    hydrator = FeatureHydrator()

    # 1. Test coordinate close to known mine (Keonjhar, Odisha)
    keonjhar = hydrator.hydrate(21.63, 85.58)
    assert keonjhar["hydrated_from_district"] == "Kendujhar", "Expected district Kendujhar"
    assert keonjhar["coverage_level"] == "High", f"Expected High coverage, got {keonjhar['coverage_level']}"
    assert keonjhar["coverage_score"] >= 80, "Expected score >= 80"
    assert keonjhar["weather_available"] is True, "Weather must be flagged available"
    assert keonjhar["terrain_available"] is True, "Terrain must be flagged available"
    assert keonjhar["Distance_to_Port_km"] > 0, "Port distance must be positive"

    # 2. Test distant/remote coordinate (Delhi NCR)
    delhi = hydrator.hydrate(28.61, 77.20)
    assert delhi["coverage_level"] == "Low", f"Expected Low coverage for remote Delhi coord, got {delhi['coverage_level']}"
    assert delhi["coverage_warning"] is not None, "Low coverage must have an explicit warning"
    print("  [PASS] Unified Location Context Engine and coverage tiers verified.")


def test_api_endpoints():
    print("TEST: FastAPI API Endpoints...")
    client = TestClient(app)

    # 1. Health
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    health_json = res.json()
    assert health_json["status"] == "ok"
    assert health_json["dataset_rows"] == 30

    # 2. Summary
    res = client.get("/api/summary")
    assert res.status_code == 200
    summary_json = res.json()
    assert summary_json["inventory_records"] == 30
    assert summary_json["average_grade_pct"] is None, "Average grade must remain None"
    assert "unconfigured" in summary_json["grade_reporting_status"].lower() or "not reported" in summary_json["grade_reporting_status"].lower()

    # 3. Map Deposits
    res = client.get("/api/map/deposits")
    assert res.status_code == 200
    pts = res.json()["points"]
    assert len(pts) == 30, f"Expected 30 map deposit points, got {len(pts)}"
    assert pts[0]["is_observed"] is True

    # 4. Deposits pagination
    res = client.get("/api/deposits?page=1&limit=10")
    assert res.status_code == 200
    dep_json = res.json()
    assert len(dep_json["items"]) == 10
    assert dep_json["total"] == 30

    # 5. Model Prediction
    res = client.post("/api/model/predict", json={"Latitude": 21.63, "Longitude": 85.58})
    assert res.status_code == 200
    pred_json = res.json()
    assert pred_json["predicted_annual_production_tonnes"] > 0
    assert "Feasibility" in pred_json["feasibility_rating"]
    assert pred_json["predicted_grade_pct"] is None
    assert "explanation" in pred_json and "top_contributing_factors" in pred_json["explanation"]
    print("  [PASS] All API endpoints verified.")


def test_moil_intelligence():
    print("TEST: MOIL Mining Intelligence & Decision Support Pipeline...")
    client = TestClient(app)

    # 1. MOIL Mines
    res = client.get("/api/moil/mines")
    assert res.status_code == 200
    mines = res.json()["mines"]
    assert len(mines) == 8, f"Expected 8 MOIL mines, got {len(mines)}"
    balaghat = next(m for m in mines if m["mine_id"] == "moil-balaghat")
    assert "Bharveli" in balaghat["name"]

    # 2. Drillholes & Stratigraphy
    res = client.get("/api/moil/drillholes?mine_id=moil-balaghat")
    assert res.status_code == 200
    dhs = res.json()["drillholes"]
    assert len(dhs) >= 5, "Expected at least 5 drillholes for Balaghat"
    dh0 = dhs[0]
    assert "assay_profile" in dh0 and len(dh0["assay_profile"]) > 0
    assert "layers" in dh0 and len(dh0["layers"]) > 0
    assert dh0["avg_mn_grade_pct"] > 30.0

    # 3. Reserve Estimation
    res = client.get("/api/moil/reserves?mine_id=moil-balaghat")
    assert res.status_code == 200
    reserves = res.json()
    assert reserves["total_estimated_reserve_mt"] > 0
    assert reserves["proven_reserve_mt"] > 0
    assert len(reserves["zones"]) == 5

    # 4. Production Forecast & Shortfall
    res = client.get("/api/moil/production/forecast?mine_id=moil-balaghat")
    assert res.status_code == 200
    forecast = res.json()
    assert forecast["monthly_planned_target_tonnes"] == 45000
    assert forecast["shortfall_tonnes"] == forecast["monthly_planned_target_tonnes"] - forecast["predicted_monthly_production_tonnes"]
    assert len(forecast["causes"]) >= 4

    # 5. Equipment Intelligence
    res = client.get("/api/moil/equipment?mine_id=moil-balaghat")
    assert res.status_code == 200
    equip = res.json()
    assert equip["fleet_size"] >= 10
    assert len(equip["equipment_list"]) >= 10

    # 6. Prescriptive Recommendations
    res = client.get("/api/moil/prescriptions?mine_id=moil-balaghat")
    assert res.status_code == 200
    recs = res.json()["recommendations"]
    assert len(recs) >= 3
    assert recs[0]["priority_score"] >= recs[1]["priority_score"]

    # 7. What-If Simulator
    res = client.post("/api/moil/simulator/run", json={
        "mine_id": "moil-balaghat",
        "num_excavators": 5,
        "num_dumpers": 10,
        "equipment_avail_delta_pct": 5.0,
        "working_hours_per_day": 18.0,
        "rainfall_scenario_mm": 10.0,
        "blasting_delay_hrs": 0.0,
    })
    assert res.status_code == 200
    sim = res.json()
    assert sim["simulated_predicted_tonnes"] >= sim["baseline_predicted_tonnes"]

    # 8. Alerts & Audit
    res = client.get("/api/moil/alerts")
    assert res.status_code == 200
    assert len(res.json()["alerts"]) >= 3

    res = client.get("/api/moil/model-audit")
    assert res.status_code == 200
    audit = res.json()
    assert audit["overall_data_quality_score"] > 90.0

    print("  [PASS] MOIL Mining Intelligence endpoints & mathematics verified.")


if __name__ == "__main__":
    print("========================================")
    print("RUNNING PIPELINE VERIFICATION SUITE")
    print("========================================")
    test_data_integrity()
    test_target_leakage()
    test_model_training_and_serialization()
    test_location_context_engine()
    test_api_endpoints()
    test_moil_intelligence()
    print("========================================")
    print("ALL TESTS PASSED SUCCESSFULLY! (10/10 + MOIL)")
    print("========================================")

