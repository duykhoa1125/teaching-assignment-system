FROM nginx:1.28-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/index.html /usr/share/nginx/html/index.html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD curl --fail --silent --show-error http://127.0.0.1/healthz || exit 1
