"""Model loading and scoring helpers."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np
import pandas as pd

from backend.app.features import FEATURE_COLUMNS, FEATURE_LABELS, risk_tier

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "backend" / "ml" / "risk_model.joblib"
METRICS_PATH = ROOT / "backend" / "ml" / "metrics.json"
MEANS_PATH = ROOT / "backend" / "ml" / "feature_means.json"

# Features where a HIGHER value means HIGHER risk.
HIGH_IS_BAD = {
    "tier",
    "avg_delivery_delay_days",
    "defect_rate",
    "return_rate",
    "payment_delay_days",
    "debt_to_equity",
    "complaints_last_90d",
}
# Features where a LOWER value means HIGHER risk.
LOW_IS_BAD = {
    "years_in_business",
    "on_time_delivery_rate",
    "order_volume_monthly",
    "fulfillment_rate",
    "credit_score",
    "current_ratio",
    "revenue_growth_pct",
    "cash_runway_months",
    "contract_renewal_rate",
    "quality_audit_score",
}


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file {MODEL_PATH} not found. Run `python backend/ml/train_model.py` first."
        )
    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def load_metrics() -> dict:
    if not METRICS_PATH.exists():
        return {}
    return json.loads(METRICS_PATH.read_text())


@lru_cache(maxsize=1)
def load_feature_stats() -> dict:
    if not MEANS_PATH.exists():
        return {}
    return json.loads(MEANS_PATH.read_text())


@lru_cache(maxsize=1)
def feature_importances() -> dict[str, float]:
    metrics = load_metrics()
    return {row["feature"]: float(row["importance"]) for row in metrics.get("feature_importances", [])}


def _features_to_frame(features: Iterable[dict]) -> pd.DataFrame:
    """Coerce supplier-feature dicts to the canonical column order."""
    rows = list(features)
    return pd.DataFrame(rows, columns=FEATURE_COLUMNS)


def predict_proba(features: Iterable[dict]) -> np.ndarray:
    model = load_model()
    X = _features_to_frame(features)
    return model.predict_proba(X)[:, 1]


def score_supplier(features: dict, top_k: int = 5) -> dict:
    """Score a single supplier and return the structured response payload."""
    return score_suppliers([features], top_k=top_k)[0]


def score_suppliers(features_list: list[dict], top_k: int = 5) -> list[dict]:
    """Batch score helper used by both /score and /score/batch."""
    proba = predict_proba(features_list)
    importances = feature_importances()
    stats = load_feature_stats()

    results = []
    for features, p in zip(features_list, proba):
        score = float(round(p * 100, 2))
        results.append({
            "risk_score": score,
            "distress_probability": float(round(p, 4)),
            "risk_tier": risk_tier(score),
            "top_factors": _top_factors(features, importances, stats, top_k=top_k),
            "model_version": _model_version(),
        })
    return results


def _top_factors(
    features: dict,
    importances: dict[str, float],
    stats: dict,
    top_k: int,
) -> list[dict]:
    """Heuristic explanation: importance * (signed deviation from mean)."""
    contributions = []
    for col in FEATURE_COLUMNS:
        val = float(features.get(col, 0))
        s = stats.get(col, {})
        mean = float(s.get("mean", val))
        std = float(s.get("std", 1.0)) or 1.0
        z = (val - mean) / std

        if col in HIGH_IS_BAD:
            signed = z
        elif col in LOW_IS_BAD:
            signed = -z
        else:
            signed = 0.0

        weight = importances.get(col, 0.0)
        contribution = float(round(signed * weight, 4))
        if contribution == 0.0:
            continue

        contributions.append({
            "feature": col,
            "label": FEATURE_LABELS.get(col, col),
            "contribution": contribution,
            "direction": "increases_risk" if contribution > 0 else "decreases_risk",
            "value": float(round(val, 4)),
            "benchmark": float(round(mean, 4)),
        })

    contributions.sort(key=lambda r: abs(r["contribution"]), reverse=True)
    return contributions[:top_k]


def _model_version() -> str:
    metrics = load_metrics()
    return metrics.get("trained_at", "unknown")
