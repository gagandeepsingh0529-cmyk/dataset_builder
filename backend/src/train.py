from __future__ import annotations

from pathlib import Path
import json
from datetime import datetime, timezone

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from src.data_pipeline import (
    CATEGORICAL_FEATURES,
    MODEL_FEATURES,
    NUMERIC_FEATURES,
    TARGET,
    TRAINING_DATA,
    prepare_data,
)

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"
PLOTS_DIR = ROOT / "plots"
MODEL_PATH = MODELS_DIR / "model.pkl"
METRICS_PATH = MODELS_DIR / "metrics.json"


def train_model() -> dict:
    cleaned, frame = prepare_data()
    numeric = [column for column in NUMERIC_FEATURES if column in frame.columns]
    categorical = [column for column in CATEGORICAL_FEATURES if column in frame.columns]
    features = numeric + categorical
    
    X = frame[features]
    y = frame[TARGET].astype(float)
    groups = frame["Deposit_ID"].where(frame["Deposit_ID"].notna(), frame.index.to_series().astype(str)).astype(str)
    group_count = groups.nunique()

    preprocessor = ColumnTransformer([
        ("numeric", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric),
        ("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]), categorical),
    ])

    rf_regressor = RandomForestRegressor(
        n_estimators=500,
        max_depth=12,
        min_samples_split=3,
        min_samples_leaf=1,
        max_features="sqrt",
        random_state=42,
        n_jobs=1,
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", TransformedTargetRegressor(
            regressor=rf_regressor,
            func=np.log1p,
            inverse_func=np.expm1,
        )),
    ])

    # 1. Real-only evaluation (honest baseline on un-augmented historical records)
    real_mask = frame["Synthetic"] == False
    X_real = X[real_mask]
    y_real = y[real_mask]
    groups_real = groups[real_mask]
    real_group_count = groups_real.nunique()

    real_cv_scores = np.array([])
    if real_group_count >= 3:
        real_cv_scores = cross_val_score(
            pipeline,
            X_real,
            y_real,
            cv=GroupKFold(n_splits=min(5, real_group_count)),
            groups=groups_real,
            scoring="r2",
        )

    # 2. Strict Group-based Train/Validation/Test split (Deposit_ID groups)
    # Synthetic sibling perturbations stay with their source group
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_indices, test_indices = next(splitter.split(X, y, groups))
    X_train, X_test = X.iloc[train_indices], X.iloc[test_indices]
    y_train, y_test = y.iloc[train_indices], y.iloc[test_indices]

    pipeline.fit(X_train, y_train)
    predictions_test = pipeline.predict(X_test)
    predictions_train = pipeline.predict(X_train)

    test_r2 = float(r2_score(y_test, predictions_test))
    test_mae = float(mean_absolute_error(y_test, predictions_test))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, predictions_test)))
    train_r2 = float(r2_score(y_train, predictions_train))
    train_mae = float(mean_absolute_error(y_train, predictions_train))
    train_rmse = float(np.sqrt(mean_squared_error(y_train, predictions_train)))

    # Cross-validation across all groups
    cv_scores = cross_val_score(
        pipeline,
        X,
        y,
        cv=GroupKFold(n_splits=min(5, group_count)),
        groups=groups,
        scoring="r2",
    ) if group_count >= 3 else np.array([])

    # Final fit on full dataset for serving inference
    pipeline.fit(X, y)

    metrics = {
        "model": "RandomForestRegressor",
        "target": TARGET,
        "features": features,
        "feature_count": len(features),
        "r2": test_r2,
        "mae": test_mae,
        "rmse": test_rmse,
        "test_r2": test_r2,
        "test_mae": test_mae,
        "test_rmse": test_rmse,
        "training_r2": train_r2,
        "training_mae": train_mae,
        "training_rmse": train_rmse,
        "cross_validation_r2_mean": float(cv_scores.mean()) if len(cv_scores) else None,
        "cross_validation_r2_std": float(cv_scores.std()) if len(cv_scores) else None,
        "real_only_cv_r2_mean": float(real_cv_scores.mean()) if len(real_cv_scores) else None,
        "real_only_cv_r2_std": float(real_cv_scores.std()) if len(real_cv_scores) else None,
        "total_rows": int(len(frame)),
        "training_rows": int(len(train_indices)),
        "test_rows": int(len(test_indices)),
        "test_size": 0.25,
        "real_rows": int((frame["Synthetic"] == False).sum()),
        "synthetic_rows": int((frame["Synthetic"] == True).sum()),
        "validation_method": "GroupShuffleSplit and GroupKFold grouped by Deposit_ID to strictly prevent synthetic leakage.",
        "years": sorted(frame["Year"].dropna().unique().tolist()),
        "model_version": "rf-log1p-grouped-v3",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "model_parameters": {
            "n_estimators": 500,
            "max_depth": 12,
            "min_samples_split": 3,
            "min_samples_leaf": 1,
            "max_features": "sqrt",
            "target_transform": "log1p",
        },
        "leakage_columns_excluded": [
            "Reserve_to_Production_ratio",
            "Production_Gap_tonnes",
            "Reserves_tonnes",
            "Synthetic",
        ],
        "grade_prediction_status": "DATA_BLOCKED: Grade_pct source data not available in inventory records. Model trained on Annual_Production_tonnes.",
    }

    MODELS_DIR.mkdir(exist_ok=True)
    PLOTS_DIR.mkdir(exist_ok=True)

    reference_dict = X.iloc[0].to_dict()
    joblib.dump(
        {
            "pipeline": pipeline,
            "features": features,
            "numeric_features": numeric,
            "categorical_features": categorical,
            "metrics": metrics,
            "reference": reference_dict,
        },
        MODEL_PATH,
    )
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    # Diagnostic Plots
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, predictions_test, color="#3b82f6", alpha=0.75, edgecolors="none")
    bounds = [min(y_test.min(), predictions_test.min()), max(y_test.max(), predictions_test.max())]
    plt.plot(bounds, bounds, "r--", linewidth=1.5, label="Perfect 1:1")
    plt.xlabel("Actual Production (tonnes)")
    plt.ylabel("Predicted Production (tonnes)")
    plt.title("Random Forest: Actual vs Predicted Annual Production")
    plt.grid(True, alpha=0.25)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "ml_actual_vs_predicted.png", dpi=180)
    plt.close()

    # Feature Importance Plot
    fitted_rf = pipeline.named_steps["regressor"].regressor_
    transformed_feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out()
    importances = pd.Series(fitted_rf.feature_importances_, index=transformed_feature_names)
    plt.figure(figsize=(9, 6))
    importances.sort_values(ascending=False).head(12).sort_values().plot(kind="barh", color="#10b981")
    plt.title("Top 12 Random Forest Feature Importances")
    plt.xlabel("Gini Importance")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "ml_feature_importance.png", dpi=180)
    plt.close()

    print(f"Training Complete. Metrics written to {METRICS_PATH}")
    print(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    train_model()
