#!/usr/bin/env bash
# Build and push images for Railway (Linux AMD64).
# Railway runs x86_64 nodes. Images built on Apple Silicon are arm64-only unless
# you use buildx with --platform linux/amd64 (or a multi-arch manifest).
set -euo pipefail
cd "$(dirname "$0")/.."

NAMESPACE="${DOCKERHUB_NAMESPACE:-aryawagle}"
TAG="${IMAGE_TAG:-latest}"
PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

echo "==> Namespace: $NAMESPACE  Tag: $TAG  Platform: $PLATFORM"
docker buildx version >/dev/null

# Ensure a builder that can emit the target platform (uses QEMU when host is ARM).
if ! docker buildx inspect railway-multi >/dev/null 2>&1; then
  docker buildx create --name railway-multi --driver docker-container --use
else
  docker buildx use railway-multi
fi
docker buildx inspect --bootstrap >/dev/null

echo "==> API (FastAPI)"
docker buildx build --platform "$PLATFORM" \
  --tag "${NAMESPACE}/supplier-risk-api:${TAG}" \
  --push \
  ./supplier-risk-api

echo "==> Streamlit UI"
docker buildx build --platform "$PLATFORM" \
  --file ./supplier-risk-api/Dockerfile.streamlit \
  --tag "${NAMESPACE}/supplier-risk-streamlit:${TAG}" \
  --push \
  ./supplier-risk-api

echo "==> Next.js (sri-command)"
docker buildx build --platform "$PLATFORM" \
  --tag "${NAMESPACE}/sri-command:${TAG}" \
  --push \
  ./sri-command

echo "==> Done. Railway image refs:"
echo "    ${NAMESPACE}/supplier-risk-api:${TAG}"
echo "    ${NAMESPACE}/supplier-risk-streamlit:${TAG}"
echo "    ${NAMESPACE}/sri-command:${TAG}"
