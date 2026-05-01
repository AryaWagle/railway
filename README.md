# Railway Docker Deployment Guide

This repository has **three** Docker Hub images:

| Service | Image | Docker Hub |
|--------|--------|------------|
| Next.js UI | `aryawagle/sri-command` | [hub.docker.com/r/aryawagle/sri-command](https://hub.docker.com/r/aryawagle/sri-command) |
| FastAPI backend | `aryawagle/supplier-risk-api` | [hub.docker.com/r/aryawagle/supplier-risk-api](https://hub.docker.com/r/aryawagle/supplier-risk-api) |
| Streamlit UI | `aryawagle/supplier-risk-streamlit` | [hub.docker.com/r/aryawagle/supplier-risk-streamlit](https://hub.docker.com/r/aryawagle/supplier-risk-streamlit) |

Default tag used here: **`latest`**. Replace with your own namespace if you fork or republish.

### Railway runs **Linux AMD64** (x86_64)

If you build on **Apple Silicon** (ARM64) with plain `docker build`, the image is often **arm64-only**. Railway then errors: *no Linux AMD64 variant available*.

**Always** build for Railway with **`linux/amd64`** using Buildx (script below, or the manual `buildx` commands).

---

## 1) Build and push for Railway (recommended)

From the repo root, after `docker login`:

```bash
chmod +x scripts/docker-build-push-railway.sh
export DOCKERHUB_NAMESPACE="aryawagle"   # your Docker Hub user/org
export IMAGE_TAG="latest"
./scripts/docker-build-push-railway.sh
```

This creates a Buildx builder if needed, builds **`--platform linux/amd64`**, and **pushes** all three images.

### Manual equivalent (one-off)

```bash
export DOCKERHUB_NAMESPACE="aryawagle"
export IMAGE_TAG="latest"
docker buildx create --name railway-multi --driver docker-container --use 2>/dev/null || docker buildx use railway-multi
docker buildx inspect --bootstrap

docker buildx build --platform linux/amd64 \
  --tag ${DOCKERHUB_NAMESPACE}/supplier-risk-api:${IMAGE_TAG} --push ./supplier-risk-api
docker buildx build --platform linux/amd64 \
  -f supplier-risk-api/Dockerfile.streamlit \
  --tag ${DOCKERHUB_NAMESPACE}/supplier-risk-streamlit:${IMAGE_TAG} --push ./supplier-risk-api
docker buildx build --platform linux/amd64 \
  --tag ${DOCKERHUB_NAMESPACE}/sri-command:${IMAGE_TAG} --push ./sri-command
```

### Optional: AMD64 **and** ARM64 (one manifest)

For the same tag to work on Railway **and** ARM laptops without emulation:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  --tag ${DOCKERHUB_NAMESPACE}/supplier-risk-api:${IMAGE_TAG} --push ./supplier-risk-api
# (repeat for the other two images)
```

## 2) Local-only build (native platform — not for Railway)

```bash
docker build -t ${DOCKERHUB_NAMESPACE}/sri-command:${IMAGE_TAG} ./sri-command
docker build -t ${DOCKERHUB_NAMESPACE}/supplier-risk-api:${IMAGE_TAG} ./supplier-risk-api
docker build -f supplier-risk-api/Dockerfile.streamlit \
  -t ${DOCKERHUB_NAMESPACE}/supplier-risk-streamlit:${IMAGE_TAG} ./supplier-risk-api
```

---

## 3) Deploy on Railway (three services)

Create **three** image-based services.

### A) FastAPI — deploy first (Streamlit needs its URL)

- **Image:** `aryawagle/supplier-risk-api:latest`
- **Port:** Railway `PORT` is injected; the container listens on that port.
- **Public URL:** e.g. `https://supplier-risk-api-production-xxxx.up.railway.app` (your dashboard shows the exact hostname).

### B) Streamlit — point at the API

- **Image:** `aryawagle/supplier-risk-streamlit:latest`
- **Port:** Same as above (`PORT`); Streamlit listens on `0.0.0.0`.
- **Required env:** `RISK_API_URL` = **public base URL of the API** (no path), e.g. `https://supplier-risk-api-production-xxxx.up.railway.app`
- **Public URL:** separate Railway hostname for this service; open `/` in the browser.

### C) Next.js (`sri-command`)

- **Image:** `aryawagle/sri-command:latest`
- **Env:** set `NEXT_PUBLIC_API_BASE_URL` to the **same API public URL** as in B (unless your Next app uses a different backend).
- **Public URL:** your Next service hostname.

---

## 4) Local smoke test (optional)

```bash
# Terminal 1 — API
docker run --rm -p 8000:8000 -e PORT=8000 aryawagle/supplier-risk-api:latest

# Terminal 2 — Streamlit (use host.docker.internal on Mac/Windows Docker Desktop)
docker run --rm -p 8501:8501 \
  -e PORT=8501 \
  -e RISK_API_URL=http://host.docker.internal:8000 \
  aryawagle/supplier-risk-streamlit:latest

# Terminal 3 — Next.js
docker run --rm -p 3000:3000 aryawagle/sri-command:latest
```

API health:

```bash
curl http://localhost:8000/health
```

---

## Notes

- The **API** image runs `python backend/ml/train_model.py` at build time so `risk_model.joblib` is present.
- The **Streamlit** image only contains `frontend/` + Python deps; it does **not** bundle the model — it calls the API via `RISK_API_URL`.
- For each release, rebuild with a new tag (e.g. `v20260430`) and update Railway to that tag.

---

## Final checklist

1. Push all three images (or confirm `latest` on Docker Hub).
2. Railway: create API service → note its **HTTPS origin**.
3. Railway: create Streamlit service → set `RISK_API_URL` to that origin.
4. Railway: create Next service → set `NEXT_PUBLIC_API_BASE_URL` to that origin (if applicable).
5. Open each service’s Railway URL and verify Streamlit loads and charts/API calls succeed.
