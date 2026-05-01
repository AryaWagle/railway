# Supplier Risk Intelligence

An AI-powered supplier financial-distress scoring system. A scikit-learn model is trained on synthetic operational, financial, and engagement metrics and served via a FastAPI prediction endpoint. A Streamlit dashboard visualizes scores across the active supplier base and provides a what-if scoring form, styled with an Ant Design feel via [`streamlit-antd-components`](https://pypi.org/project/streamlit-antd-components/) and Plotly.

For a full architecture and implementation deep-dive (with diagrams), see [`docs/DEEP_DOCUMENTATION.md`](docs/DEEP_DOCUMENTATION.md).

## Design & product direction (Google Stitch)

**UI design is moving to [Google Stitch](https://stitch.withgoogle.com/)** so layouts, components, and motion can be iterated outside Streamlit. When you export or hand off Stitch screens:

- Treat the **FastAPI contract** (endpoints in [API overview](#api-overview)) as the source of truth for data shapes.
- Aim for **pixel-perfect** spacing, type scale, and alignment; specify a **4px or 8px grid**, exact font sizes/weights, and hex tokens for light/dark variants.
- **Iron Man / JARVIS HUD aesthetic**: deep charcoal or near-black background, electric cyan (`#00d4ff`–`#00fff0`) and hot-amber accent (`#ffaa00`), subtle **outer glow** on primary actions, thin **holographic** borders (1px, low-opacity), optional **scanline or vignette** overlay at ~3–5% opacity. Motion: **short, purposeful** transitions (150–300ms), **staggered** KPI count-up on load, **pulse** on live-data indicators, **arc-reactor-style** radial glow behind the hero metric (CSS or Lottie — keep performance in mind).
- **Composer / multi-screen flows**: Overview → Supplier directory → Facility detail → Risk explainability → What-if simulator → Model insights; each screen should list required API calls and empty/error states.

## Next implementation: live data ([Open Supply Hub](https://opensupplyhub.org/))

Planned evolution of the data layer (not yet wired in this repo):

1. **Ingest** public supply-chain / facility data from [Open Supply Hub](https://opensupplyhub.org/) per their API and usage terms.
2. **Map** OSH fields to your feature schema (or extend `SupplierFeatures` / training pipeline for new signals).
3. **Refresh** scoring and dashboards from live-backed stores (cache + rate limits).
4. **Stitch screens** should assume **real facility IDs**, geo, and contributor metadata where available; show **data freshness** and **source attribution** on every chart/table.

Until that integration ships, the app continues to use **synthetic CSVs** generated under `backend/data/`.

## Google Stitch — master prompt (copy/paste)

Use this as the initial prompt inside Stitch to generate a cohesive multi-page app. Adjust product name if needed.

```
Design a multi-page web app called "Supplier Risk Intelligence" — an executive + analyst console for supply-chain financial distress scoring.

Brand & motion: Iron Man / JARVIS HUD — NOT cartoon. Dark theme base (#0a0e14 to #12181f), electric cyan primary (#00e5ff), amber secondary (#ffb020), danger red (#ff4d4f). Pixel-perfect: 8px grid, consistent 12/14/16/20/24px type scale, Inter or SF Pro. Subtle holographic 1px borders (white 8% opacity), soft outer glow on primary CTAs, optional light scanline overlay (max 4% opacity). Micro-interactions: KPI cards stagger-fade-in on load (100ms stagger), numbers count up once, live data badge soft pulse (2s), page transitions 200ms ease-out. One hero moment: central "arc reactor" glow behind the main risk gauge (CSS radial gradient, no heavy video).

Pages (desktop 1440px primary, responsive tablet):
1) Overview — KPI row (active suppliers, critical count, avg risk, fulfillment, OTD, defect), risk tier donut, risk score histogram, fulfillment vs target by category, 36-month trend, top 10 risk table with export affordance.
2) Suppliers — searchable/filterable directory, pagination, row expand to mini sparkline; link to detail.
3) Supplier detail — score gauge, tier badge, top contributing factors list, operational/financial/engagement metric groups.
4) Analytics — category and country breakdowns, scatter (defect vs OTD), correlation heatmap, time series by category; chart toolbar with export hints.
5) What-if scorer — form with presets (healthy / average / at-risk), submit shows score + tier + factors.
6) Model insights — ROC, confusion matrix, feature importance, calibration notes.

Data reality: Phase 1 uses a FastAPI backend with JSON endpoints: GET /health, GET /suppliers (filters, pagination), GET /suppliers/{id}, GET /snapshots, POST /score, GET /metrics. Phase 2 will enrich with live facility data from Open Supply Hub (https://opensupplyhub.org/) — reserve UI space for attribution, "last synced", and API status.

Deliver: component library tokens, all key screens, empty states, loading skeletons, error toasts, and accessibility (contrast, focus rings). No lorem ipsum in KPIs — use realistic placeholder numbers.
```

## Features

- **Backend (FastAPI + scikit-learn)**
  - `RandomForestClassifier` (300 trees, depth 12, balanced class weights) inside a `Pipeline` with `StandardScaler`
  - 20,000 synthetic historical suppliers with a probabilistic distress label
  - ~2,000 active suppliers (configurable in `backend/data/generate_data.py`) scored at request time
  - Endpoints for single & batch scoring, supplier listing with filters/pagination, supplier drill-down, training metrics, and health
  - Explanations: top contributing factors per scored supplier (importance × signed deviation from mean)
- **Frontend (Streamlit + Ant Design)** — reference implementation until Stitch-export UI is integrated
  - Five sections: **Overview**, **Suppliers**, **Analytics**, **Score a Supplier**, **Model Insights**
  - Ant-Design–inspired theme (primary `#1677ff`), KPI cards, risk badges, gauges, donut/bar/scatter/line/box/heatmap charts via Plotly
  - Sidebar navigation built from `sac.menu`, paginated supplier table via `sac.pagination`, alerts via `sac.alert`, segmented controls via `sac.segmented`, and result cards via `sac.result`
  - Live what-if scoring form with three preset profiles (healthy / average / at-risk)
- **Mock data with rich fulfillment metrics**
  - Operational: on-time delivery, fulfillment, defect, return, delivery delay
  - Financial: credit score, debt/equity, current ratio, revenue growth, cash runway, payment delays
  - Engagement: complaints, contract renewal, quality audits, years in business, tier
  - 36-month fulfillment & risk snapshots per category for trend charts

## Repo layout

```
supplier-risk-api/
  backend/
    app/                 # FastAPI app, schemas, scoring, data store
    data/                # Synthetic data generator + generated CSVs
    ml/                  # Trainer + persisted model + metrics.json
  frontend/
    app.py               # Streamlit entry point with AntD sidebar menu
    pages_/              # Per-page render modules (overview, suppliers, ...)
    theme.py             # Ant-Design CSS injection + Plotly styling helpers
    api_client.py        # Thin requests-based API wrapper
    assets/style.css     # Custom CSS overlay for the AntD look
  scripts/
    bootstrap.sh         # Generate data + train model
    run_backend.sh       # Start FastAPI (default :8000, host 0.0.0.0 for LAN)
    run_frontend.sh      # Start Streamlit (default :8501, host 0.0.0.0 for LAN)
  requirements.txt
  README.md
```

## Quick start

```bash
# 1. Install deps (Python 3.9+)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Generate synthetic data + train the model
./scripts/bootstrap.sh

# 3. Start the API in one terminal
./scripts/run_backend.sh        # http://127.0.0.1:8000  (Swagger at /docs)

# 4. Start the dashboard in another terminal
./scripts/run_frontend.sh       # http://127.0.0.1:8501
```

Optional env vars:

- `RISK_API_URL` — API base URL the Streamlit app calls (default `http://127.0.0.1:8000`). On another device, set this to `http://<your-mac-lan-ip>:8000`.
- `HOST` — bind address for both scripts (default `0.0.0.0` for same-WiFi access).
- `PORT` — override ports if needed.

## API overview

| Method | Path                       | Description |
|--------|----------------------------|-------------|
| GET    | `/health`                  | Service & model health |
| GET    | `/metrics`                 | Training metrics, feature importances, score distribution |
| GET    | `/categories`              | Supplier categories used in mock data |
| GET    | `/countries`               | Supplier countries used in mock data |
| POST   | `/score`                   | Score a single supplier (returns score, tier, top factors) |
| POST   | `/score/batch`             | Score many suppliers in one call |
| GET    | `/suppliers`               | List/filter/paginate active suppliers (returns precomputed risk scores) |
| GET    | `/suppliers/{supplier_id}` | Full supplier detail with explanation |
| GET    | `/snapshots`               | 36 months of category-level fulfillment & risk |

### Example: score a supplier

```bash
curl -s http://127.0.0.1:8000/score \
  -H 'Content-Type: application/json' \
  -d '{
    "years_in_business": 5, "tier": 2,
    "on_time_delivery_rate": 0.7, "avg_delivery_delay_days": 8,
    "defect_rate": 0.05, "order_volume_monthly": 2000,
    "fulfillment_rate": 0.85, "return_rate": 0.08,
    "payment_delay_days": 25, "credit_score": 580,
    "debt_to_equity": 2.5, "current_ratio": 0.9,
    "revenue_growth_pct": -5, "cash_runway_months": 3,
    "complaints_last_90d": 12, "contract_renewal_rate": 0.6,
    "quality_audit_score": 65
  }' | python -m json.tool
```

Returns:

```json
{
  "risk_score": 73.77,
  "distress_probability": 0.7377,
  "risk_tier": "High",
  "top_factors": [
    {"feature": "credit_score", "label": "Credit score", "contribution": 0.297, "direction": "increases_risk", "value": 580.0, "benchmark": 698.94},
    {"feature": "quality_audit_score", "label": "Quality audit score", "contribution": 0.235, "direction": "increases_risk", "value": 65.0, "benchmark": 84.45}
  ],
  "model_version": "..."
}
```

### Example: list suppliers

```bash
curl "http://127.0.0.1:8000/suppliers?category=Electronics&risk_tier=Critical&page=1&page_size=10"
```

## Risk-score interpretation

The risk score is the model's predicted distress probability mapped to 0–100:

| Score range | Tier      | Meaning                              |
|-------------|-----------|--------------------------------------|
| `< 25`      | Low       | Healthy supplier; no action          |
| `25 – 50`   | Moderate  | Watchlist; quarterly review          |
| `50 – 75`   | High      | Action: schedule a business review   |
| `≥ 75`      | Critical  | Mitigate exposure; identify backups  |

Top contributing factors are computed as `feature_importance × signed_deviation_from_mean` so that positive contributions push the score up and negative contributions pull it down.

## Notes

- Reproducibility: data generation uses `numpy` seed `7`; model training uses `random_state=42`.
- Streamlit caches API responses for 60–300 s; use the **R**erun button if you regenerate data.
- This is a teaching/demo project. The synthetic distress label is correlated with features by design so the model learns clear signal.
