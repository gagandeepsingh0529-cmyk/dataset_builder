from __future__ import annotations

from pathlib import Path
import re

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DATA = ROOT / "combined_dataset.csv"
DATA_DIR = ROOT / "data"
CLEAN_DATA = DATA_DIR / "cleaned_districts.csv"
REAL_ONLY_DATA = DATA_DIR / "manganese_real_only.csv"
SYNTHETIC_ONLY_DATA = DATA_DIR / "manganese_synthetic_only.csv"
TRAINING_DATA = DATA_DIR / "training_dataset.csv"
TARGET = "Annual_Production_tonnes"

# District-level geographic and environmental reference for known manganese centers
DISTRICT_METADATA: dict[str, dict[str, object]] = {
    "Ballari": {
        "State": "Karnataka",
        "Latitude": 15.1394,
        "Longitude": 76.9214,
        "Elevation_m": 478.0,
        "Topo_Slope_deg": 14.0,
        "Avg_Temperature_C": 27.5,
        "Annual_Precip_mm": 630.0,
        "Rainy_Days": 42,
        "Soil_Type": "Red sandy loam and black soil",
        "Host_Rock": "Serpentinized ultramafic rocks and Dharwar schists",
        "Formation": "Dharwar Supergroup / Sandur Schist Belt",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 380.0,
    },
    "Chitradurga": {
        "State": "Karnataka",
        "Latitude": 14.2251,
        "Longitude": 76.3980,
        "Elevation_m": 732.0,
        "Topo_Slope_deg": 16.0,
        "Avg_Temperature_C": 26.5,
        "Annual_Precip_mm": 580.0,
        "Rainy_Days": 38,
        "Soil_Type": "Red sandy loam",
        "Host_Rock": "Banded iron formation and Dharwar schists",
        "Formation": "Dharwar Supergroup / Chitradurga Schist Belt",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 360.0,
    },
    "Davangere": {
        "State": "Karnataka",
        "Latitude": 14.4644,
        "Longitude": 75.9218,
        "Elevation_m": 602.0,
        "Topo_Slope_deg": 12.0,
        "Avg_Temperature_C": 26.2,
        "Annual_Precip_mm": 680.0,
        "Rainy_Days": 45,
        "Soil_Type": "Black and red loam",
        "Host_Rock": "Dharwar metabasalts and metasediments",
        "Formation": "Dharwar Supergroup / Shimoga Belt",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 330.0,
    },
    "Tumakuru": {
        "State": "Karnataka",
        "Latitude": 13.3409,
        "Longitude": 77.1010,
        "Elevation_m": 822.0,
        "Topo_Slope_deg": 15.0,
        "Avg_Temperature_C": 25.5,
        "Annual_Precip_mm": 780.0,
        "Rainy_Days": 50,
        "Soil_Type": "Red loamy and gravelly soil",
        "Host_Rock": "Amphibolite, quartzites and Dharwar schists",
        "Formation": "Dharwar Supergroup / Closepet Granites boundary",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 390.0,
    },
    "Alirajpur": {
        "State": "Madhya Pradesh",
        "Latitude": 22.3039,
        "Longitude": 74.3541,
        "Elevation_m": 288.0,
        "Topo_Slope_deg": 18.0,
        "Avg_Temperature_C": 26.8,
        "Annual_Precip_mm": 850.0,
        "Rainy_Days": 46,
        "Soil_Type": "Mixed red and black soil",
        "Host_Rock": "Phyllite, quartzite and gondite metasediments",
        "Formation": "Aravalli / Sausar Supergroup transition",
        "Road_Accessibility": "Moderate",
        "Distance_to_Port_km": 420.0,
    },
    "Balaghat": {
        "State": "Madhya Pradesh",
        "Latitude": 21.8129,
        "Longitude": 80.1838,
        "Elevation_m": 302.0,
        "Topo_Slope_deg": 16.0,
        "Avg_Temperature_C": 25.0,
        "Annual_Precip_mm": 1450.0,
        "Rainy_Days": 72,
        "Soil_Type": "Deep red lateritic and black loam",
        "Host_Rock": "Gonditic metasediments, quartzites and schists",
        "Formation": "Sausar Group / Mansar Formation (Bharveli Belt)",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 680.0,
    },
    "Chhindwara": {
        "State": "Madhya Pradesh",
        "Latitude": 22.0574,
        "Longitude": 78.9382,
        "Elevation_m": 675.0,
        "Topo_Slope_deg": 19.0,
        "Avg_Temperature_C": 24.2,
        "Annual_Precip_mm": 1180.0,
        "Rainy_Days": 58,
        "Soil_Type": "Black cotton and gravelly loam",
        "Host_Rock": "Gondite, dolomitic marble and calc-silicate",
        "Formation": "Sausar Group / Bichua Formation",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 720.0,
    },
    "Jabalpur": {
        "State": "Madhya Pradesh",
        "Latitude": 23.1815,
        "Longitude": 79.9864,
        "Elevation_m": 411.0,
        "Topo_Slope_deg": 13.0,
        "Avg_Temperature_C": 25.6,
        "Annual_Precip_mm": 1250.0,
        "Rainy_Days": 62,
        "Soil_Type": "Black clay and red sandy loam",
        "Host_Rock": "Dolomite, phyllite and banded iron formation",
        "Formation": "Mahakoshal Group / Archaean basement",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 760.0,
    },
    "Jhabua": {
        "State": "Madhya Pradesh",
        "Latitude": 22.7699,
        "Longitude": 74.5947,
        "Elevation_m": 318.0,
        "Topo_Slope_deg": 20.0,
        "Avg_Temperature_C": 26.5,
        "Annual_Precip_mm": 830.0,
        "Rainy_Days": 44,
        "Soil_Type": "Shallow black and skeletal soil",
        "Host_Rock": "Manganese-bearing quartzites and phyllites",
        "Formation": "Aravalli Supergroup / Lunavada Group",
        "Road_Accessibility": "Moderate",
        "Distance_to_Port_km": 450.0,
    },
    "Katni": {
        "State": "Madhya Pradesh",
        "Latitude": 23.8343,
        "Longitude": 80.3957,
        "Elevation_m": 392.0,
        "Topo_Slope_deg": 11.0,
        "Avg_Temperature_C": 25.8,
        "Annual_Precip_mm": 1150.0,
        "Rainy_Days": 56,
        "Soil_Type": "Alluvial and red loam",
        "Host_Rock": "Limestone, dolomite and BIF association",
        "Formation": "Vindhyan Supergroup / Mahakoshal Group",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 800.0,
    },
    "Bhandara": {
        "State": "Maharashtra",
        "Latitude": 21.1654,
        "Longitude": 79.6499,
        "Elevation_m": 244.0,
        "Topo_Slope_deg": 10.0,
        "Avg_Temperature_C": 27.2,
        "Annual_Precip_mm": 1320.0,
        "Rainy_Days": 66,
        "Soil_Type": "Red and yellow loamy soil",
        "Host_Rock": "Gondite, quartzite and manganese oxide lenses",
        "Formation": "Sausar Group / Dongri Buzurg Formation",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 640.0,
    },
    "Nagpur": {
        "State": "Maharashtra",
        "Latitude": 21.1458,
        "Longitude": 79.0882,
        "Elevation_m": 310.0,
        "Topo_Slope_deg": 12.0,
        "Avg_Temperature_C": 27.4,
        "Annual_Precip_mm": 1160.0,
        "Rainy_Days": 60,
        "Soil_Type": "Deep black cotton soil",
        "Host_Rock": "Gondite and braunite-bearing quartzites",
        "Formation": "Sausar Group / Mansar Formation (Gumgaon-Ramtek)",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 620.0,
    },
    "Kendujhar": {
        "State": "Odisha",
        "Latitude": 21.6289,
        "Longitude": 85.5817,
        "Elevation_m": 580.0,
        "Topo_Slope_deg": 22.0,
        "Avg_Temperature_C": 25.2,
        "Annual_Precip_mm": 1550.0,
        "Rainy_Days": 76,
        "Soil_Type": "Red lateritic and ferric soil",
        "Host_Rock": "Banded iron formation, shale and chert",
        "Formation": "Iron Ore Group (Barbil / Joda / Jamda-Koira Belt)",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 240.0,
    },
    "Rayagada": {
        "State": "Odisha",
        "Latitude": 19.1667,
        "Longitude": 83.4167,
        "Elevation_m": 215.0,
        "Topo_Slope_deg": 24.0,
        "Avg_Temperature_C": 26.5,
        "Annual_Precip_mm": 1400.0,
        "Rainy_Days": 68,
        "Soil_Type": "Red sandy loam and laterite",
        "Host_Rock": "Khondalite and calc-granulite suites",
        "Formation": "Eastern Ghats Mobile Belt",
        "Road_Accessibility": "Moderate",
        "Distance_to_Port_km": 190.0,
    },
    "Sundargarh": {
        "State": "Odisha",
        "Latitude": 22.1197,
        "Longitude": 84.0378,
        "Elevation_m": 233.0,
        "Topo_Slope_deg": 17.0,
        "Avg_Temperature_C": 26.0,
        "Annual_Precip_mm": 1480.0,
        "Rainy_Days": 72,
        "Soil_Type": "Red and yellow soil",
        "Host_Rock": "Gonditic metasediments and quartzites",
        "Formation": "Gangpur Group / Sausar-equivalent belt",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 310.0,
    },
    "Banswara": {
        "State": "Rajasthan",
        "Latitude": 23.5461,
        "Longitude": 74.4349,
        "Elevation_m": 220.0,
        "Topo_Slope_deg": 15.0,
        "Avg_Temperature_C": 26.9,
        "Annual_Precip_mm": 920.0,
        "Rainy_Days": 42,
        "Soil_Type": "Mixed red and black soil",
        "Host_Rock": "Dolomitic limestone, quartzite and phyllite",
        "Formation": "Aravalli Supergroup / Ghatol-Tambesra Belt",
        "Road_Accessibility": "Moderate",
        "Distance_to_Port_km": 490.0,
    },
    "Vizianagaram": {
        "State": "Andhra Pradesh",
        "Latitude": 18.1067,
        "Longitude": 83.3956,
        "Elevation_m": 66.0,
        "Topo_Slope_deg": 12.0,
        "Avg_Temperature_C": 28.0,
        "Annual_Precip_mm": 1080.0,
        "Rainy_Days": 58,
        "Soil_Type": "Red loamy and coastal alluvial",
        "Host_Rock": "Khondalite and calc-granulite complex",
        "Formation": "Eastern Ghats Mobile Belt (Garividi / Garbham)",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 60.0,
    },
    "Adilabad": {
        "State": "Telangana",
        "Latitude": 19.6641,
        "Longitude": 78.5320,
        "Elevation_m": 264.0,
        "Topo_Slope_deg": 14.0,
        "Avg_Temperature_C": 27.5,
        "Annual_Precip_mm": 1100.0,
        "Rainy_Days": 54,
        "Soil_Type": "Deep black cotton and red soil",
        "Host_Rock": "Limestone, chert and sandstone",
        "Formation": "Penganga Group / Pranhita-Godavari Basin",
        "Road_Accessibility": "Good",
        "Distance_to_Port_km": 540.0,
    },
}

NUMERIC_FEATURES = [
    "Latitude",
    "Longitude",
    "Elevation_m",
    "Topo_Slope_deg",
    "Avg_Temperature_C",
    "Annual_Precip_mm",
    "Rainy_Days",
    "Distance_to_Port_km",
    "Year_Index",
]
CATEGORICAL_FEATURES = ["State", "District", "Road_Accessibility", "Soil_Type", "Host_Rock", "Formation"]
MODEL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def _normalise(value: object) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def _extract_district_name(deposit_id: str, state: str) -> str:
    if not deposit_id or pd.isna(deposit_id):
        return state
    clean_dep = str(deposit_id).strip()
    tokens = clean_dep.split("_")
    if len(tokens) >= 2:
        district_token = tokens[-1]
        if district_token.lower() == "raygada":
            return "Rayagada"
        return district_token
    return state


def _is_aggregate_row(row: pd.Series) -> bool:
    state = _normalise(row.get("State", ""))
    deposit_id = str(row.get("Deposit_ID", "")).strip()
    if not deposit_id or deposit_id.lower() in {"nan", "none", ""}:
        return True
    if _normalise(deposit_id) in {"india", "national", "allindia"}:
        return True
    last_token = deposit_id.rsplit("_", 1)[-1]
    return _normalise(last_token) == state


def _source_year_lookup() -> dict[tuple[str, float], str]:
    lookup: dict[tuple[str, float], str] = {}
    sources = [
        (ROOT / "ibm_yearbook" / "cleaned_table5a_2022_23.csv", "2022-23"),
        (ROOT / "ibm_yearbook" / "cleaned_table5b_2023_24.csv", "2023-24"),
    ]
    for path, year in sources:
        if not path.exists():
            continue
        frame = pd.read_csv(path)
        if not {"Deposit_ID", "Annual_Production"}.issubset(frame.columns):
            continue
        for _, row in frame.iterrows():
            deposit_id = str(row["Deposit_ID"]).strip()
            production = pd.to_numeric(row["Annual_Production"], errors="coerce")
            if deposit_id and pd.notna(production):
                lookup[(deposit_id, float(production))] = year
    return lookup


def _assign_years(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    lookup = _source_year_lookup()
    production = pd.to_numeric(result[TARGET], errors="coerce")
    result["Year"] = [
        lookup.get((str(deposit_id).strip(), float(value)), pd.NA)
        if pd.notna(value)
        else pd.NA
        for deposit_id, value in zip(result["Deposit_ID"], production)
    ]
    for deposit_id, indexes in result.groupby("Deposit_ID", sort=False).groups.items():
        fallback_years = ["2022-23", "2023-24"]
        for position, index in enumerate(result.loc[indexes].index):
            if pd.isna(result.at[index, "Year"]):
                result.at[index, "Year"] = fallback_years[min(position, 1)]
    result["Year"] = result["Year"].fillna("2023-24")
    result["Year_Index"] = result["Year"].map(
        {"2019-20": 0, "2020-21": 1, "2021-22": 2, "2022-23": 3, "2023-24": 4}
    ).fillna(4).astype(int)
    return result


def load_clean_dataset() -> pd.DataFrame:
    frame = pd.read_csv(RAW_DATA)
    frame = frame.loc[~frame.apply(_is_aggregate_row, axis=1)].copy()
    frame = frame.loc[frame[TARGET].notna()].copy()
    frame = _assign_years(frame)
    frame = frame.drop_duplicates(subset=["Deposit_ID", "Year"], keep="last").copy()

    for index, row in frame.iterrows():
        dep_id = str(row.get("Deposit_ID", ""))
        state = str(row.get("State", ""))
        dist = _extract_district_name(dep_id, state)
        frame.at[index, "District"] = dist
        if dist in DISTRICT_METADATA:
            meta = DISTRICT_METADATA[dist]
            for key, val in meta.items():
                frame.at[index, key] = val

    for column in NUMERIC_FEATURES + [TARGET]:
        if column in frame:
            frame[column] = pd.to_numeric(frame[column], errors="coerce")
        else:
            frame[column] = np.nan

    for column in NUMERIC_FEATURES:
        if column in frame and frame[column].isna().any():
            frame[column] = frame[column].fillna(frame[column].median())

    for column in CATEGORICAL_FEATURES:
        if column in frame:
            frame[column] = frame[column].fillna("Unknown").astype(str)

    if "Grade_pct" not in frame:
        frame["Grade_pct"] = np.nan

    return frame.reset_index(drop=True)


def generate_synthetic_data(cleaned: pd.DataFrame, samples: int = 360, seed: int = 42) -> pd.DataFrame:
    if cleaned.empty:
        raise ValueError("No district-level records remain after filtering.")
    rng = np.random.default_rng(seed)
    rows = []
    for index in rng.integers(0, len(cleaned), size=max(samples, len(cleaned))):
        row = cleaned.iloc[index].copy()
        row["Synthetic"] = True
        row["Annual_Precip_mm"] = max(250.0, float(row["Annual_Precip_mm"]) * rng.normal(1.0, 0.035))
        row["Topo_Slope_deg"] = max(0.2, float(row["Topo_Slope_deg"]) + rng.normal(0, 1.0))
        row["Avg_Temperature_C"] = float(row["Avg_Temperature_C"]) + rng.normal(0, 0.35)
        row["Rainy_Days"] = max(1.0, float(row["Rainy_Days"]) + rng.normal(0, 2.0))
        row["Latitude"] = float(row["Latitude"]) + rng.normal(0, 0.04)
        row["Longitude"] = float(row["Longitude"]) + rng.normal(0, 0.04)
        row["Elevation_m"] = max(10.0, float(row.get("Elevation_m", 300.0)) + rng.normal(0, 15.0))
        row[TARGET] = max(0.0, float(row[TARGET]) * rng.lognormal(0, 0.08))
        rows.append(row)
    augmented = pd.DataFrame(rows)
    original = cleaned.copy()
    original["Synthetic"] = False
    return pd.concat([original, augmented], ignore_index=True)


def prepare_data(samples: int = 360, seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    cleaned = load_clean_dataset()
    cleaned["Synthetic"] = False
    training = generate_synthetic_data(cleaned, samples=samples, seed=seed)
    
    DATA_DIR.mkdir(exist_ok=True)
    cleaned.to_csv(CLEAN_DATA, index=False)
    cleaned.to_csv(REAL_ONLY_DATA, index=False)
    training[training["Synthetic"] == True].to_csv(SYNTHETIC_ONLY_DATA, index=False)
    training.to_csv(TRAINING_DATA, index=False)
    return cleaned, training


if __name__ == "__main__":
    cleaned, training = prepare_data()
    print(f"Cleaned district rows: {len(cleaned)}")
    print(f"Training rows: {len(training)}")
    print(f"Real observations: {(training['Synthetic'] == False).sum()}")
    print(f"Synthetic observations: {(training['Synthetic'] == True).sum()}")
    print(f"Districts: {sorted(cleaned['District'].unique())}")
    print(f"Years: {sorted(cleaned['Year'].unique())}")
