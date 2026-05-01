"""Pydantic v2 schemas for the supplier risk scoring API."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SupplierFeatures(BaseModel):
    """Input features for scoring a single supplier."""

    years_in_business: float = Field(..., ge=0, le=200)
    tier: int = Field(..., ge=1, le=3)
    on_time_delivery_rate: float = Field(..., ge=0.0, le=1.0)
    avg_delivery_delay_days: float = Field(..., ge=0.0, le=365.0)
    defect_rate: float = Field(..., ge=0.0, le=1.0)
    order_volume_monthly: int = Field(..., ge=0)
    fulfillment_rate: float = Field(..., ge=0.0, le=1.0)
    return_rate: float = Field(..., ge=0.0, le=1.0)
    payment_delay_days: float = Field(..., ge=0.0, le=365.0)
    credit_score: int = Field(..., ge=300, le=850)
    debt_to_equity: float = Field(..., ge=0.0, le=20.0)
    current_ratio: float = Field(..., ge=0.0, le=20.0)
    revenue_growth_pct: float = Field(..., ge=-100.0, le=500.0)
    cash_runway_months: float = Field(..., ge=0.0, le=120.0)
    complaints_last_90d: int = Field(..., ge=0, le=1000)
    contract_renewal_rate: float = Field(..., ge=0.0, le=1.0)
    quality_audit_score: float = Field(..., ge=0.0, le=100.0)


class TopFactor(BaseModel):
    feature: str
    label: str
    contribution: float
    direction: str  # "increases_risk" | "decreases_risk"
    value: float
    benchmark: float


class ScoreResponse(BaseModel):
    risk_score: float = Field(..., description="Risk score 0-100 (higher = riskier)")
    distress_probability: float = Field(..., description="Predicted probability of distress (0-1)")
    risk_tier: str = Field(..., description="Low | Moderate | High | Critical")
    top_factors: list[TopFactor]
    model_version: str


class BatchScoreRequest(BaseModel):
    suppliers: list[SupplierFeatures]


class BatchScoreResponse(BaseModel):
    results: list[ScoreResponse]


class SupplierRecord(SupplierFeatures):
    supplier_id: str
    name: str
    category: str
    country: str
    onboarded_date: str
    risk_score: float
    distress_probability: float
    risk_tier: str


class SupplierListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[SupplierRecord]


class SupplierDetailResponse(BaseModel):
    supplier: SupplierRecord
    top_factors: list[TopFactor]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: Optional[str]
    n_active_suppliers: int


class MetricsResponse(BaseModel):
    n_train: int
    n_test: int
    positive_rate_train: float
    positive_rate_test: float
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    confusion_matrix: list[list[int]]
    feature_importances: list[dict]
    score_distribution: dict
    feature_columns: list[str]
    trained_at: str
