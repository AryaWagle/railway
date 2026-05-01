"""FastAPI application exposing the supplier risk scoring endpoints."""
from __future__ import annotations

import logging
import time
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from backend.app import data_store, scoring
from backend.app.features import CATEGORIES, COUNTRIES
from backend.app.schemas import (
    BatchScoreRequest,
    BatchScoreResponse,
    HealthResponse,
    MetricsResponse,
    ScoreResponse,
    SupplierDetailResponse,
    SupplierFeatures,
    SupplierListResponse,
    SupplierRecord,
)

logger = logging.getLogger("supplier-risk-api")

app = FastAPI(
    title="Supplier Risk Scoring API",
    description=(
        "AI-powered supplier financial-distress risk scoring. "
        "Trained on synthetic operational, financial, and engagement metrics."
    ),
    version="1.0.0",
)

@app.on_event("startup")
def _configure_logging() -> None:
    # Keep it simple and deployment-friendly: logfmt-ish lines to stdout.
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(level=logging.INFO, format="%(message)s")
    logger.info("event=startup service=supplier-risk-api version=%s", app.version)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as e:
        dur_ms = int((time.perf_counter() - start) * 1000)
        logger.exception(
            "event=request_error request_id=%s method=%s path=%s duration_ms=%s error=%s",
            request_id,
            request.method,
            request.url.path,
            dur_ms,
            type(e).__name__,
        )
        raise

    dur_ms = int((time.perf_counter() - start) * 1000)
    logger.info(
        "event=request request_id=%s method=%s path=%s status=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        getattr(response, "status_code", 0),
        dur_ms,
    )
    response.headers["x-request-id"] = request_id
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return {
        "name": "Supplier Risk Scoring API",
        "docs": "/docs",
        "endpoints": [
            "/health",
            "/metrics",
            "/categories",
            "/countries",
            "/score",
            "/score/batch",
            "/suppliers",
            "/suppliers/{id}",
        ],
    }


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        scoring.load_model()
        loaded = True
    except Exception:
        loaded = False
    try:
        n = len(data_store.active_suppliers())
    except Exception:
        n = 0
    return HealthResponse(
        status="ok" if loaded else "degraded",
        model_loaded=loaded,
        model_version=scoring.load_metrics().get("trained_at"),
        n_active_suppliers=n,
    )


@app.get("/metrics", response_model=MetricsResponse)
def metrics() -> MetricsResponse:
    m = scoring.load_metrics()
    if not m:
        raise HTTPException(status_code=503, detail="Metrics not available — train the model first.")
    return MetricsResponse(**m)


@app.get("/categories", response_model=list[str])
def categories() -> list[str]:
    return CATEGORIES


@app.get("/countries", response_model=list[str])
def countries() -> list[str]:
    return COUNTRIES


@app.post("/score", response_model=ScoreResponse)
def score(features: SupplierFeatures) -> ScoreResponse:
    result = scoring.score_supplier(features.model_dump())
    return ScoreResponse(**result)


@app.post("/score/batch", response_model=BatchScoreResponse)
def score_batch(payload: BatchScoreRequest) -> BatchScoreResponse:
    results = scoring.score_suppliers([s.model_dump() for s in payload.suppliers])
    return BatchScoreResponse(results=[ScoreResponse(**r) for r in results])


@app.get("/suppliers", response_model=SupplierListResponse)
def list_suppliers(
    category: Optional[str] = None,
    country: Optional[str] = None,
    risk_tier: Optional[str] = Query(None, alias="risk_tier"),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
) -> SupplierListResponse:
    df = data_store.filter_suppliers(
        category=category,
        country=country,
        risk_tier_filter=risk_tier,
        min_score=min_score,
        max_score=max_score,
        search=search,
    )
    total = len(df)
    page_df = data_store.paginate(df, page, page_size)
    items = [SupplierRecord(**row) for row in page_df.to_dict(orient="records")]
    return SupplierListResponse(total=total, page=page, page_size=page_size, items=items)


@app.get("/suppliers/{supplier_id}", response_model=SupplierDetailResponse)
def get_supplier(supplier_id: str) -> SupplierDetailResponse:
    row = data_store.get_supplier(supplier_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")
    importances = scoring.feature_importances()
    stats = scoring.load_feature_stats()
    factors = scoring._top_factors(row, importances, stats, top_k=8)
    return SupplierDetailResponse(
        supplier=SupplierRecord(**row),
        top_factors=factors,
    )


@app.get("/snapshots")
def snapshots():
    df = data_store.monthly_snapshots()
    if df.empty:
        return {"items": []}
    out = df.copy()
    out["month"] = out["month"].dt.strftime("%Y-%m-%d")
    return {"items": out.to_dict(orient="records")}
