"""Generate synthetic supplier risk data.

Produces three CSV files in this directory:
    - historical_suppliers.csv : ~20000 rows with `defaulted` label, used for training
    - active_suppliers.csv     : ~2000 unlabeled rows representing the live supplier base
    - monthly_snapshots.csv    : 36 months of fulfillment / risk snapshots per category

Run:
    python backend/data/generate_data.py
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.features import CATEGORIES, COUNTRIES  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent
SEED = 7
N_HISTORICAL = 20000
N_ACTIVE = 2000
N_MONTHS = 36


def _company_name(rng: np.random.Generator, idx: int) -> str:
    prefixes = [
        "Acme", "Globex", "Initech", "Umbrella", "Soylent", "Stark", "Wayne",
        "Tyrell", "Hooli", "Pied Piper", "Vandelay", "Wonka", "Cyberdyne",
        "Massive Dynamic", "Aperture", "Black Mesa", "Oscorp", "Gringotts",
        "Wayne Tech", "Nakatomi", "Weyland", "Yutani", "Cogswell", "Spacely",
        "Duff", "Krusty", "Planet", "Bluth", "Dunder", "Mifflin", "Sterling",
        "Cooper", "Pearson", "Hardman", "Hammer", "Roxxon", "Rand", "Pym",
        "Queen", "LexCorp", "Daily", "Bugle", "Genco", "Compu", "Vortex",
        "Cortex", "Pinnacle", "Apex", "Summit", "Vertex", "Zenith",
    ]
    suffixes = ["Industries", "Corp", "Holdings", "Group", "Logistics", "Partners", "Systems", "Solutions", "Manufacturing", "Trading", "Supply Co", "Worldwide", "International", "LLC", "Limited"]
    return f"{rng.choice(prefixes)} {rng.choice(suffixes)} {idx:04d}"


def _generate_features(n: int, rng: np.random.Generator) -> pd.DataFrame:
    """Generate raw feature columns with realistic ranges and correlations."""
    # Latent "health" factor that correlates many features.
    health = rng.normal(0.0, 1.0, n)

    years_in_business = np.clip(rng.gamma(shape=2.0, scale=6.0, size=n) + 1.0, 1, 80).round(1)
    tier = rng.choice([1, 2, 3], size=n, p=[0.25, 0.5, 0.25])

    on_time_delivery_rate = np.clip(0.9 + 0.05 * health + rng.normal(0, 0.06, n) - 0.03 * (tier - 1), 0.4, 1.0)
    avg_delivery_delay_days = np.clip(np.where(on_time_delivery_rate > 0.95, rng.exponential(0.8, n), rng.exponential(3.5, n)) - 0.5 * health, 0, 30).round(1)

    defect_rate = np.clip(rng.beta(2.0, 80.0, n) + 0.005 * (tier - 1) - 0.005 * health, 0.0, 0.3)
    order_volume_monthly = np.clip((rng.lognormal(mean=8.0, sigma=1.0, size=n) * (1 + 0.1 * health)).round(0), 50, 500_000).astype(int)
    fulfillment_rate = np.clip(0.93 + 0.04 * health + rng.normal(0, 0.04, n) - 0.5 * defect_rate, 0.3, 1.0)
    return_rate = np.clip(rng.beta(1.5, 40.0, n) + 0.5 * defect_rate, 0.0, 0.3)

    payment_delay_days = np.clip(rng.exponential(scale=8.0, size=n) - 3.0 * health, 0, 90).round(1)
    credit_score = np.clip(700 + 60 * health + rng.normal(0, 40, n), 300, 850).round(0).astype(int)
    debt_to_equity = np.clip(1.0 - 0.4 * health + rng.normal(0, 0.5, n), 0.05, 6.0).round(2)
    current_ratio = np.clip(1.6 + 0.5 * health + rng.normal(0, 0.4, n), 0.2, 5.0).round(2)
    revenue_growth_pct = np.clip(5.0 + 6.0 * health + rng.normal(0, 5.0, n), -40, 60).round(1)
    cash_runway_months = np.clip(8.0 + 5.0 * health + rng.normal(0, 3.0, n), 0.5, 36).round(1)

    complaints_last_90d = np.clip(rng.poisson(lam=np.where(health > 0, 1.0, 4.0)), 0, 50).astype(int)
    contract_renewal_rate = np.clip(0.85 + 0.1 * health + rng.normal(0, 0.08, n), 0.2, 1.0).round(3)
    quality_audit_score = np.clip(85 + 8 * health + rng.normal(0, 6, n), 30, 100).round(1)

    return pd.DataFrame({
        "years_in_business": years_in_business,
        "tier": tier,
        "on_time_delivery_rate": on_time_delivery_rate.round(3),
        "avg_delivery_delay_days": avg_delivery_delay_days,
        "defect_rate": defect_rate.round(4),
        "order_volume_monthly": order_volume_monthly,
        "fulfillment_rate": fulfillment_rate.round(3),
        "return_rate": return_rate.round(4),
        "payment_delay_days": payment_delay_days,
        "credit_score": credit_score,
        "debt_to_equity": debt_to_equity,
        "current_ratio": current_ratio,
        "revenue_growth_pct": revenue_growth_pct,
        "cash_runway_months": cash_runway_months,
        "complaints_last_90d": complaints_last_90d,
        "contract_renewal_rate": contract_renewal_rate,
        "quality_audit_score": quality_audit_score,
    })


def _label_from_features(df: pd.DataFrame, rng: np.random.Generator) -> np.ndarray:
    """Compute a probabilistic distress label from features."""
    z = (
        4.0 * df["defect_rate"]
        + 0.06 * df["payment_delay_days"]
        + 0.15 * df["complaints_last_90d"]
        + 0.6 * df["debt_to_equity"]
        + 1.5 * (1 - df["on_time_delivery_rate"])
        + 1.0 * (1 - df["fulfillment_rate"])
        - 0.18 * df["cash_runway_months"]
        - 0.012 * (df["credit_score"] - 600)
        - 0.04 * df["quality_audit_score"]
        - 0.02 * df["revenue_growth_pct"]
        - 0.6 * df["current_ratio"]
        + 0.3 * (df["tier"] - 1)
        - 0.2
    )
    z = z + rng.normal(0, 0.5, len(df))
    p = 1.0 / (1.0 + np.exp(-z))
    return (rng.uniform(size=len(df)) < p).astype(int)


def _add_identity_columns(df: pd.DataFrame, rng: np.random.Generator, prefix: str) -> pd.DataFrame:
    n = len(df)
    df = df.copy()
    df.insert(0, "supplier_id", [f"{prefix}-{i:05d}" for i in range(1, n + 1)])
    df.insert(1, "name", [_company_name(rng, i) for i in range(1, n + 1)])
    df.insert(2, "category", rng.choice(CATEGORIES, size=n))
    df.insert(3, "country", rng.choice(COUNTRIES, size=n))
    onboarded = pd.Timestamp("2018-01-01") + pd.to_timedelta(rng.integers(0, 365 * 7, size=n), unit="D")
    df.insert(4, "onboarded_date", onboarded.strftime("%Y-%m-%d"))
    return df


def _generate_monthly_snapshots(rng: np.random.Generator, n_months: int) -> pd.DataFrame:
    """n_months x len(CATEGORIES) snapshot rows for trend charts."""
    months = pd.date_range(
        end=pd.Timestamp.today().normalize().replace(day=1),
        periods=n_months,
        freq="MS",
    )
    rows = []
    for cat in CATEGORIES:
        base_fulfillment = rng.uniform(0.90, 0.97)
        base_risk = rng.uniform(25, 45)
        base_otd = rng.uniform(0.88, 0.96)
        for i, m in enumerate(months):
            seasonal = 0.01 * np.sin(2 * np.pi * i / 12)
            drift = rng.normal(0, 0.005)
            fulfillment = float(np.clip(base_fulfillment + seasonal + drift + i * 0.0008, 0.7, 0.999))
            otd = float(np.clip(base_otd + seasonal + rng.normal(0, 0.008), 0.6, 0.999))
            risk = float(np.clip(base_risk + 5 * np.sin(2 * np.pi * (i + 3) / 12) + rng.normal(0, 2.0) - i * 0.15, 5, 90))
            defect = float(np.clip(rng.beta(2, 80) + 0.002 * (50 - risk) * -1, 0, 0.1))
            volume = int(np.clip(rng.lognormal(11.5, 0.3) * (1 + seasonal * 5), 1000, 1_000_000))
            rows.append({
                "month": m.strftime("%Y-%m-%d"),
                "category": cat,
                "fulfillment_rate": round(fulfillment, 4),
                "on_time_delivery_rate": round(otd, 4),
                "avg_risk_score": round(risk, 2),
                "defect_rate": round(defect, 4),
                "order_volume": volume,
            })
    return pd.DataFrame(rows)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic supplier datasets.")
    parser.add_argument(
        "--historical",
        type=int,
        default=N_HISTORICAL,
        help=f"Number of historical labeled suppliers (default: {N_HISTORICAL})",
    )
    parser.add_argument(
        "--active",
        type=int,
        default=N_ACTIVE,
        help=f"Number of active unlabeled suppliers (default: {N_ACTIVE})",
    )
    parser.add_argument(
        "--months",
        type=int,
        default=N_MONTHS,
        help=f"Number of monthly snapshot periods (default: {N_MONTHS})",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=SEED,
        help=f"Random seed for reproducibility (default: {SEED})",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    if args.historical <= 0 or args.active <= 0 or args.months <= 0:
        raise SystemExit("All of --historical, --active, and --months must be > 0.")

    rng = np.random.default_rng(args.seed)

    print(f"Generating {args.historical} historical suppliers...")
    hist_features = _generate_features(args.historical, rng)
    hist = _add_identity_columns(hist_features, rng, prefix="HIST")
    hist["defaulted"] = _label_from_features(hist_features, rng)
    hist_path = DATA_DIR / "historical_suppliers.csv"
    hist.to_csv(hist_path, index=False)
    print(f"  -> {hist_path} ({len(hist)} rows, distress rate {hist['defaulted'].mean():.1%})")

    print(f"Generating {args.active} active suppliers...")
    active_features = _generate_features(args.active, rng)
    active = _add_identity_columns(active_features, rng, prefix="SUP")
    active_path = DATA_DIR / "active_suppliers.csv"
    active.to_csv(active_path, index=False)
    print(f"  -> {active_path} ({len(active)} rows)")

    print("Generating monthly snapshots...")
    snapshots = _generate_monthly_snapshots(rng, args.months)
    snap_path = DATA_DIR / "monthly_snapshots.csv"
    snapshots.to_csv(snap_path, index=False)
    print(f"  -> {snap_path} ({len(snapshots)} rows)")

    print("Done.")


if __name__ == "__main__":
    main()
