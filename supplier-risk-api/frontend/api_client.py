"""Thin requests-based wrapper around the FastAPI backend."""
from __future__ import annotations

import os
from typing import Any, Optional

import requests

API_BASE = os.environ.get("RISK_API_URL", "http://127.0.0.1:8000").rstrip("/")
TIMEOUT = 30


class ApiError(RuntimeError):
    pass


def _get(path: str, params: Optional[dict] = None) -> Any:
    r = requests.get(f"{API_BASE}{path}", params=params, timeout=TIMEOUT)
    if r.status_code >= 400:
        raise ApiError(f"GET {path} failed [{r.status_code}]: {r.text}")
    return r.json()


def _post(path: str, payload: Any) -> Any:
    r = requests.post(f"{API_BASE}{path}", json=payload, timeout=TIMEOUT)
    if r.status_code >= 400:
        raise ApiError(f"POST {path} failed [{r.status_code}]: {r.text}")
    return r.json()


def health() -> dict:
    return _get("/health")


def metrics() -> dict:
    return _get("/metrics")


def categories() -> list[str]:
    return _get("/categories")


def countries() -> list[str]:
    return _get("/countries")


def list_suppliers(**filters) -> dict:
    cleaned = {k: v for k, v in filters.items() if v not in (None, "", "All")}
    return _get("/suppliers", params=cleaned)


def list_all_suppliers(**filters) -> list[dict]:
    """Fetch all suppliers across paginated API responses."""
    cleaned = {k: v for k, v in filters.items() if v not in (None, "", "All")}
    page = 1
    page_size = int(cleaned.pop("page_size", 500))
    page_size = min(max(page_size, 1), 500)

    all_items: list[dict] = []
    while True:
        payload = _get("/suppliers", params={**cleaned, "page": page, "page_size": page_size})
        items = payload.get("items", [])
        total = int(payload.get("total", 0))
        if not items:
            break
        all_items.extend(items)
        if len(all_items) >= total:
            break
        page += 1
    return all_items


def get_supplier(supplier_id: str) -> dict:
    return _get(f"/suppliers/{supplier_id}")


def score(features: dict) -> dict:
    return _post("/score", features)


def score_batch(features_list: list[dict]) -> dict:
    return _post("/score/batch", {"suppliers": features_list})


def snapshots() -> list[dict]:
    return _get("/snapshots").get("items", [])
