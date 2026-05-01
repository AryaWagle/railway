"""Train the supplier-distress classifier and persist artifacts.

Inputs:
    backend/data/historical_suppliers.csv

Outputs:
    backend/ml/risk_model.joblib      (sklearn Pipeline: StandardScaler + RandomForestClassifier)
    backend/ml/metrics.json           (training metrics + feature importances)
    backend/ml/feature_means.json     (per-feature mean & std used for explanation)

Run:
    python backend/ml/train_model.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.features import FEATURE_COLUMNS  # noqa: E402

DATA_DIR = ROOT / "backend" / "data"
ML_DIR = ROOT / "backend" / "ml"
MODEL_PATH = ML_DIR / "risk_model.joblib"
METRICS_PATH = ML_DIR / "metrics.json"
MEANS_PATH = ML_DIR / "feature_means.json"

RANDOM_STATE = 42


def main() -> None:
    csv_path = DATA_DIR / "historical_suppliers.csv"
    if not csv_path.exists():
        raise SystemExit(
            f"Missing {csv_path}. Run `python backend/data/generate_data.py` first."
        )

    print(f"Loading {csv_path}...")
    df = pd.read_csv(csv_path)
    X = df[FEATURE_COLUMNS].copy()
    y = df["defaulted"].astype(int).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    print(f"Training on {len(X_train)} rows ({y_train.mean():.1%} positive)...")
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=4,
            class_weight="balanced",
            n_jobs=-1,
            random_state=RANDOM_STATE,
        )),
    ])
    pipe.fit(X_train, y_train)

    proba = pipe.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)

    metrics = {
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "positive_rate_train": float(y_train.mean()),
        "positive_rate_test": float(y_test.mean()),
        "accuracy": float(accuracy_score(y_test, pred)),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
        "f1": float(f1_score(y_test, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, proba)),
        "confusion_matrix": confusion_matrix(y_test, pred).tolist(),
        "feature_importances": [
            {"feature": f, "importance": float(imp)}
            for f, imp in sorted(
                zip(FEATURE_COLUMNS, pipe.named_steps["clf"].feature_importances_),
                key=lambda x: x[1],
                reverse=True,
            )
        ],
        "score_distribution": {
            "mean": float(proba.mean() * 100),
            "p25": float(np.percentile(proba, 25) * 100),
            "p50": float(np.percentile(proba, 50) * 100),
            "p75": float(np.percentile(proba, 75) * 100),
            "p95": float(np.percentile(proba, 95) * 100),
        },
        "feature_columns": FEATURE_COLUMNS,
        "trained_at": pd.Timestamp.utcnow().isoformat(),
    }

    feature_stats = {
        col: {"mean": float(X[col].mean()), "std": float(X[col].std() or 1.0)}
        for col in FEATURE_COLUMNS
    }

    ML_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))
    MEANS_PATH.write_text(json.dumps(feature_stats, indent=2))

    print("\nTest set metrics:")
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        print(f"  {key:>10}: {metrics[key]:.4f}")
    print("\nTop 5 features:")
    for row in metrics["feature_importances"][:5]:
        print(f"  {row['feature']:>28}: {row['importance']:.4f}")
    print(f"\nSaved model to    {MODEL_PATH}")
    print(f"Saved metrics to  {METRICS_PATH}")
    print(f"Saved feature stats to {MEANS_PATH}")


if __name__ == "__main__":
    main()
