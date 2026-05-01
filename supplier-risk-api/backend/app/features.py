"""Shared feature definitions used by data generation, training, and scoring."""
from __future__ import annotations

FEATURE_COLUMNS: list[str] = [
    "years_in_business",
    "tier",
    "on_time_delivery_rate",
    "avg_delivery_delay_days",
    "defect_rate",
    "order_volume_monthly",
    "fulfillment_rate",
    "return_rate",
    "payment_delay_days",
    "credit_score",
    "debt_to_equity",
    "current_ratio",
    "revenue_growth_pct",
    "cash_runway_months",
    "complaints_last_90d",
    "contract_renewal_rate",
    "quality_audit_score",
]

FEATURE_LABELS: dict[str, str] = {
    "years_in_business": "Years in business",
    "tier": "Supplier tier",
    "on_time_delivery_rate": "On-time delivery rate",
    "avg_delivery_delay_days": "Avg delivery delay (days)",
    "defect_rate": "Defect rate",
    "order_volume_monthly": "Monthly order volume",
    "fulfillment_rate": "Fulfillment rate",
    "return_rate": "Return rate",
    "payment_delay_days": "Payment delay (days)",
    "credit_score": "Credit score",
    "debt_to_equity": "Debt-to-equity",
    "current_ratio": "Current ratio",
    "revenue_growth_pct": "Revenue growth %",
    "cash_runway_months": "Cash runway (months)",
    "complaints_last_90d": "Complaints (90d)",
    "contract_renewal_rate": "Contract renewal rate",
    "quality_audit_score": "Quality audit score",
}

CATEGORIES: list[str] = [
    "Electronics",
    "Raw Materials",
    "Logistics",
    "Packaging",
    "Chemicals",
    "Textiles",
    "Food",
    "Machinery",
]

COUNTRIES: list[str] = [
    "USA",
    "Germany",
    "China",
    "India",
    "Mexico",
    "Vietnam",
    "Brazil",
    "Japan",
    "Turkey",
    "Poland",
]


def risk_tier(score: float) -> str:
    """Map a 0-100 risk score to a tier label."""
    if score < 25:
        return "Low"
    if score < 50:
        return "Moderate"
    if score < 75:
        return "High"
    return "Critical"


def tier_color(tier: str) -> str:
    """Ant Design palette colors for risk tier badges."""
    return {
        "Low": "green",
        "Moderate": "blue",
        "High": "orange",
        "Critical": "red",
    }.get(tier, "default")
