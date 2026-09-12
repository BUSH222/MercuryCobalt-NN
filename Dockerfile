FROM node:24-alpine AS build
WORKDIR /app
COPY MercuryCobaldFrontend/package.json MercuryCobaldFrontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm i --no-audit --no-fund
COPY MercuryCobaldFrontend/ ./
ARG NODE_BUILD_HEAP_MB=1024
RUN NODE_OPTIONS="--max-old-space-size=${NODE_BUILD_HEAP_MB}" npm run build

FROM nginx:stable-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]

# Terrain proxy (advanced-mode ground-visibility feature): a small FastAPI
# service, deployed as its own container per README's existing guidance ("if a
# backend is added, deploy it separately and configure an API proxy") — see
# nginx.conf's `/api/` proxy_pass and compose.yaml's `terrain` service.
FROM python:3.14-slim AS backend
WORKDIR /app

# rasterio's wheel bundles its own GDAL, but installing the system libraries
# too makes the build resilient if a matching wheel isn't available for this
# exact Python/platform combination (then pip falls back to a source build,
# which needs these headers).
RUN apt-get update && apt-get install -y --no-install-recommends \
        gdal-bin libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.9.7 /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY main.py ./
COPY terrain_api/ ./terrain_api/

RUN useradd --create-home --uid 1000 terrain \
    && mkdir -p /app/.terrain_cache \
    && chown -R terrain:terrain /app
USER terrain

ENV PATH="/app/.venv/bin:${PATH}"
EXPOSE 8000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
