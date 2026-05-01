"""In-memory data store for active suppliers and monthly snapshots."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd

from backend.app.features import FEATURE_COLUMNS, risk_tier
from backend.app.scoring import predict_proba

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "backend" / "data"
ACTIVE_PATH = DATA_DIR / "active_suppliers.csv"
SNAPSHOTS_PATH = DATA_DIR / "monthly_snapshots.csv"


@lru_cache(maxsize=1)
def active_suppliers() -> pd.DataFrame:
    """Return the active supplier table augmented with risk scores."""
    if not ACTIVE_PATH.exists():
        raise FileNotFoundError(
            f"{ACTIVE_PATH} not found. Run `python backend/data/generate_data.py` first."
        )
    df = pd.read_csv(ACTIVE_PATH)
    proba = predict_proba(df[FEATURE_COLUMNS].to_dict(orient="records"))
    df["distress_probability"] = proba.round(4)
    df["risk_score"] = (proba * 100).round(2)
    df["risk_tier"] = df["risk_score"].apply(risk_tier)
    return df


@lru_cache(maxsize=1)
def monthly_snapshots() -> pd.DataFrame:
    if not SNAPSHOTS_PATH.exists():
        return pd.DataFrame()
    return pd.read_csv(SNAPSHOTS_PATH, parse_dates=["month"])


def filter_suppliers(
    category: Optional[str] = None,
    country: Optional[str] = None,
    risk_tier_filter: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    search: Optional[str] = None,
) -> pd.DataFrame:
    df = active_suppliers().copy()
    if category:
        df = df[df["category"] == category]
    if country:
        df = df[df["country"] == country]
    if risk_tier_filter:
        df = df[df["risk_tier"] == risk_tier_filter]
    if min_score is not None:
        df = df[df["risk_score"] >= min_score]
    if max_score is not None:
        df = df[df["risk_score"] <= max_score]
    if search:
        s = search.lower()
        df = df[
            df["name"].str.lower().str.contains(s, na=False)
            | df["supplier_id"].str.lower().str.contains(s, na=False)
        ]
    return df


def paginate(df: pd.DataFrame, page: int, page_size: int) -> pd.DataFrame:
    start = max(0, (page - 1) * page_size)
    end = start + page_size
    return df.iloc[start:end]


def get_supplier(supplier_id: str) -> Optional[dict]:
    df = active_suppliers()
    rows = df[df["supplier_id"] == supplier_id]
    if rows.empty:
        return None
    return rows.iloc[0].to_dict()
