from __future__ import annotations

from pathlib import Path
from math import asin, cos, radians, sin, sqrt

import numpy as np
import pandas as pd
from scipy.spatial import KDTree

from src.data_pipeline import CLEAN_DATA, DISTRICT_METADATA

ROOT = Path(__file__).resolve().parents[1]

PORTS = pd.DataFrame([
    {"name": "Paradip (Odisha)", "latitude": 20.27, "longitude": 86.70},
    {"name": "Visakhapatnam (AP)", "latitude": 17.69, "longitude": 83.22},
    {"name": "Mumbai / JNPT (Maharashtra)", "latitude": 18.95, "longitude": 72.95},
    {"name": "Mormugao (Goa)", "latitude": 15.42, "longitude": 73.80},
    {"name": "Chennai (Tamil Nadu)", "latitude": 13.08, "longitude": 80.29},
    {"name": "Haldia (West Bengal)", "latitude": 22.02, "longitude": 88.06},
    {"name": "Kandla (Gujarat)", "latitude": 23.00, "longitude": 70.22},
])


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0088
    lat_delta = radians(lat2 - lat1)
    lon_delta = radians(lon2 - lon1)
    value = sin(lat_delta / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(lon_delta / 2) ** 2
    return 2 * earth_radius_km * asin(sqrt(value))


class FeatureHydrator:
    """Unified Location Context Engine.
    Resolves arbitrary India latitude/longitude coordinates into geological,
    meteorological, terrain, and accessibility features.
    """

    def __init__(self, data_path: Path = CLEAN_DATA):
        if data_path.exists():
            self.data = pd.read_csv(data_path).dropna(subset=["Latitude", "Longitude"]).reset_index(drop=True)
        else:
            # Fallback to DISTRICT_METADATA if cleaned_districts.csv has not been prepared yet
            records = [{"District": dist, **vals} for dist, vals in DISTRICT_METADATA.items()]
            self.data = pd.DataFrame(records)

        self.tree = KDTree(self.data[["Latitude", "Longitude"]].to_numpy())
        self.port_tree = KDTree(PORTS[["latitude", "longitude"]].to_numpy())

    def hydrate(self, latitude: float, longitude: float) -> dict:
        # India bounding box validation (approx 6°N - 37.5°N, 68°E - 97.5°E)
        if not (6.0 <= latitude <= 37.5 and 68.0 <= longitude <= 97.5):
            raise ValueError(
                f"Coordinates ({latitude:.4f}, {longitude:.4f}) fall outside India's supported geospatial bounds (6.0-37.5°N, 68.0-97.5°E)."
            )

        # 1. Query nearest known manganese district
        distance_deg, index = self.tree.query([latitude, longitude])
        nearest = self.data.iloc[int(index)].copy()

        nearest_lat = float(nearest["Latitude"])
        nearest_lon = float(nearest["Longitude"])
        distance_to_mine_km = haversine_km(latitude, longitude, nearest_lat, nearest_lon)

        # 2. Query nearest port
        _, port_index = self.port_tree.query([latitude, longitude])
        port = PORTS.iloc[int(port_index)]
        nearest_port_distance = haversine_km(latitude, longitude, float(port.latitude), float(port.longitude))

        # 3. Determine Data Coverage Tier
        if distance_to_mine_km <= 80.0:
            coverage_level = "High"
            coverage_score = max(80, int(100 - (distance_to_mine_km / 80.0) * 20))
            coverage_warning = None
        elif distance_to_mine_km <= 250.0:
            coverage_level = "Moderate"
            coverage_score = max(50, int(80 - ((distance_to_mine_km - 80.0) / 170.0) * 30))
            coverage_warning = f"Moderate data coverage: Location is {distance_to_mine_km:.1f} km from nearest historical manganese cluster ({nearest.get('District', 'Unknown')})."
        else:
            coverage_level = "Low"
            coverage_score = max(10, int(50 - min(40, ((distance_to_mine_km - 250.0) / 300.0) * 40)))
            coverage_warning = f"Low training-data coverage: Location is {distance_to_mine_km:.1f} km from known deposits in {nearest.get('District', 'Unknown')}. Model prediction is purely exploratory."

        payload = {
            "Latitude": float(latitude),
            "Longitude": float(longitude),
            "State": str(nearest.get("State", "Unknown")),
            "District": str(nearest.get("District", "Unknown")),
            "Elevation_m": float(nearest.get("Elevation_m", 300.0)),
            "Topo_Slope_deg": float(nearest.get("Topo_Slope_deg", 12.0)),
            "Avg_Temperature_C": float(nearest.get("Avg_Temperature_C", 26.5)),
            "Annual_Precip_mm": float(nearest.get("Annual_Precip_mm", 1100.0)),
            "Rainy_Days": int(nearest.get("Rainy_Days", 60)),
            "Soil_Type": str(nearest.get("Soil_Type", "Red lateritic soil")),
            "Host_Rock": str(nearest.get("Host_Rock", "Metasediments and quartzites")),
            "Formation": str(nearest.get("Formation", "Precambrian Metamorphic Belt")),
            "Road_Accessibility": str(nearest.get("Road_Accessibility", "Moderate")),
            "Distance_to_Port_km": round(nearest_port_distance, 2),
            "Distance_to_Nearest_Mine_km": round(distance_to_mine_km, 2),
            "Year_Index": 4,  # Most recent reference index (2023-24 basis)
            "weather_available": True,
            "terrain_available": True,
            "hydrated_from_district": str(nearest.get("District", "Unknown")),
            "nearest_port": str(port["name"]),
            "coverage_level": coverage_level,
            "coverage_score": coverage_score,
            "coverage_warning": coverage_warning,
        }
        return payload
