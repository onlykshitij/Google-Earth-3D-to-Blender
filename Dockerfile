# Builds the interface, then serves it from a minimal Python image.
#
# The container is the interface and the router only. Downloading tiles and
# importing geometry happen inside Blender on the host, which is why no Node.js
# or Blender is needed here and the image stays small.

# --- stage 1: build the web interface ---------------------------------------
FROM node:22-alpine AS web

WORKDIR /build
COPY web/package.json web/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY web/ ./
# vite.config.ts writes to ../google_map_export_bridge/web, so give it that layout.
RUN mkdir -p /google_map_export_bridge/web \
 && npm run build -- --outDir /out --emptyOutDir

# --- stage 2: runtime -------------------------------------------------------
FROM python:3.12-alpine

# Only the hub module is needed; it is standard library only.
COPY google_map_export_bridge/hub.py /app/google_map_export_bridge/hub.py
COPY run.py /app/run.py
COPY --from=web /out /app/google_map_export_bridge/web

WORKDIR /app

# Bind all interfaces inside the container; the published port decides who can
# actually reach it. docker-compose.yml publishes to 127.0.0.1 by default.
ENV GMEB_HOST=0.0.0.0 \
    GMEB_PORT=8777 \
    GMEB_NO_BROWSER=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8777

RUN adduser -D -H gmeb
USER gmeb

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request,sys; \
sys.exit(0 if 'google-map-export-bridge' in urllib.request.urlopen('http://127.0.0.1:8777/api/hub',timeout=3).read().decode() else 1)"

CMD ["python", "run.py"]
