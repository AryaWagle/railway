# Deploy on Railway (Python + Next.js)

This guide deploys the project as **3 services**:
- `supplier-risk-api-backend` (FastAPI)
- `supplier-risk-ui` (Streamlit, Python UI)
- `sri-command-web` (Next.js UI)

It is written for your **Railway Pro** workflow and mobile-first stakeholder demos.

## 1) Railway Pro features to use (recommended)

Based on Railway pricing/docs:
- Pro plan includes **$20 monthly usage credits** and pay-as-you-go beyond that.
- Pro supports high limits (up to **42 replicas**, high CPU/RAM ceilings per service).
- Pro has **30-day log retention** (with additional observability capabilities listed on pricing page).
- Pro supports collaboration features for team/workspace workflows.
- Use **Usage Limits** (soft alert + hard cap) to prevent surprise bills.
- Use **Private Networking** between services to reduce egress costs.
- Use **Healthcheck endpoints** and per-service replica limits.

References:
- [Railway Pricing](https://railway.com/pricing)
- [Railway Plans Docs](https://docs.railway.com/reference/pricing/plans)
- [Railway Usage Limits](https://docs.railway.com/reference/usage-limits)
- [Railway Build/Start Commands](https://docs.railway.com/builds/build-and-start-commands)

## 2) Pre-deploy checklist (local)

From `supplier-risk-api/`:

```bash
./scripts/bootstrap.sh
./scripts/run_backend.sh
./scripts/run_frontend.sh
```

Confirm:
- `GET /health` is 200 at `http://127.0.0.1:8000/health`
- Streamlit opens at `http://127.0.0.1:8501`
- No UI text contrast issues on mobile viewport

## 3) Create services in Railway

1. Push this repo to GitHub.
2. In Railway, create a new project from GitHub.
3. Create **Service A** (`supplier-risk-api-backend`) from this repo.
4. Create **Service B** (`supplier-risk-ui`) from the same repo.
5. Create **Service C** (`sri-command-web`) from this repo.

Use repo root as service root unless you prefer custom root directories.

## 4) Configure backend service (FastAPI)

Service: `supplier-risk-api-backend`

### Build
- Builder: auto (Railpack)

### Start command

```bash
APP_ENV=production PORT=$PORT HOST=0.0.0.0 ./scripts/run_backend.sh
```

### Variables
- `APP_ENV=production`
- `HOST=0.0.0.0`

### Healthcheck
- Path: `/health`
- Protocol: HTTP

## 5) Configure frontend service (Streamlit)

Service: `supplier-risk-ui`

### Build
- Builder: auto (Railpack)

### Start command

```bash
APP_ENV=production PORT=$PORT HOST=0.0.0.0 ./scripts/run_frontend.sh
```

### Variables
- `APP_ENV=production`
- `HOST=0.0.0.0`
- `RISK_API_URL=http://supplier-risk-api-backend.railway.internal:8000`

If you cannot resolve the internal hostname, use the backend private URL shown in Railway service settings.

## 6) Domain setup

1. Assign Railway domain(s) to all services.
2. Share Streamlit and/or Next.js domain with stakeholders.
3. Keep backend domain private unless needed.

## 6.1) Configure Next.js service (Service C)

Service: `sri-command-web`

### Root directory
- `sri-command`

### Build command
```bash
npm ci && npm run build
```

### Start command
```bash
npx next start -H 0.0.0.0 -p $PORT
```

### Variables
- `RISK_API_URL=http://supplier-risk-api-backend.railway.internal:8000`
- Optional (when live OSH is available): `OSH_API_TOKEN`

## 7) Cost and reliability settings (Pro plan best practice)

In Railway dashboard:
- Set **Usage alert** (soft limit) and **Hard limit** for compute.
- Set **Replica limits** for each service.
- Keep backend and frontend in same project and use **private networking**.
- Enable serverless only if cold starts are acceptable for your demos.

Suggested starting footprint:
- Backend: 1 replica, 0.5-1 GB RAM
- Frontend: 1 replica, 0.5 GB RAM
- Next.js: 1 replica, 0.5 GB RAM

Scale up only if p95 latency or memory pressure increases.

## 8) Production safety settings included in this repo

Already prepared:
- Backend runs without auto-reload in production (`APP_ENV=production`)
- Streamlit production flags:
  - `--server.fileWatcherType none`
  - `--browser.gatherUsageStats false`
  - `--client.showErrorDetails false`
  - `--client.toolbarMode minimal`
- API request logging with request IDs and timing
- Solarized dark/light theming for readability

## 9) Post-deploy smoke test (must run)

1. Open Streamlit URL on desktop + mobile.
2. Test all Streamlit pages:
   - Overview
   - Suppliers
   - Analytics
   - Score a supplier
   - Model insights
3. Run at least 10 supplier searches.
4. Submit one score form.
5. Open Next.js URL and test:
   - `/overview`
   - `/suppliers`
   - `/analytics`
   - `/what-if`
   - `/model-insights`
6. Check backend `/health` and logs.
7. Validate no hidden stack traces in UI.

## 10) Stakeholder demo mode

Before sharing:
- Warm both services by opening UI once.
- Keep one tab open to avoid cold-start surprises.
- Prepare 3 saved queries:
  - high-risk supplier ID
  - category-focused query
  - zero-result query (to show empty state quality)

This keeps the demo smooth, readable on mobile, and resilient if live integrations are delayed.
