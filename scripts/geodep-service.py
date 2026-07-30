#!/usr/bin/env python3
"""
geodep-service.py — Local GeoDeep feature scan service for Nexus Prime OPS tab.

Wraps a lightweight contrast scan over a public map tile and returns
high-contrast feature centroids as lat/lng points. It does not infer object
classes and its confidence field is a normalized contrast-strength score.

Setup: see docs/deployment/geodep.md
Usage:
    pip install fastapi uvicorn pillow requests
    python scripts/geodep-service.py
    # Runs on http://localhost:5050
"""

from __future__ import annotations

import io
import math
import os
import time
from typing import Any

try:
    import requests
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from PIL import Image
except ImportError as e:
    raise SystemExit(
        f"Missing dependency: {e}\n"
        "Run: pip install fastapi uvicorn pillow requests"
    ) from e

# ── Config ────────────────────────────────────────────────────────────────
PORT        = int(os.getenv("GEODEP_PORT", "5050"))
# Default AOI: Gulf of Mexico (open ocean — no privacy concerns for demo)
DEFAULT_LAT = float(os.getenv("GEODEP_LAT", "25.0"))
DEFAULT_LNG = float(os.getenv("GEODEP_LNG", "-90.0"))
ZOOM        = int(os.getenv("GEODEP_ZOOM", "8"))
# Tile provider: OpenStreetMap (free, no key required)
TILE_URL    = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
CACHE_TTL   = 300  # seconds before a fresh scan is triggered

app = FastAPI(title="Nexus GeoDeep Feature Scan", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Simple in-memory cache ────────────────────────────────────────────────
_cache: dict[str, Any] = {"ts": 0.0, "detections": []}


def lat_lng_to_tile(lat: float, lng: float, zoom: int) -> tuple[int, int]:
    """Convert lat/lng to OSM tile x/y."""
    n = 2 ** zoom
    x = int((lng + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def tile_to_lat_lng(x: int, y: int, zoom: int) -> tuple[float, float]:
    """Convert OSM tile x/y to top-left lat/lng corner."""
    n = 2 ** zoom
    lng = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat = math.degrees(lat_rad)
    return lat, lng


def pixel_to_lat_lng(
    px: int, py: int,
    tile_x: int, tile_y: int,
    zoom: int,
    tile_size: int = 256,
) -> tuple[float, float]:
    """Convert pixel offset within a tile to lat/lng."""
    n = 2 ** zoom
    x_tile_f = tile_x + px / tile_size
    y_tile_f = tile_y + py / tile_size
    lng = x_tile_f / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y_tile_f / n)))
    lat = math.degrees(lat_rad)
    return lat, lng


def fetch_tile(x: int, y: int, zoom: int) -> Image.Image | None:
    """Download one OSM tile as a PIL image."""
    url = TILE_URL.format(z=zoom, x=x, y=y)
    headers = {"User-Agent": "NexusPrime-GeoDeep/1.0 (+https://github.com/nexus-prime)"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    except Exception:
        return None


def simple_edge_detect(img: Image.Image) -> list[tuple[int, int, float]]:
    """
    Lightweight pixel-difference scan — no GPU, no ML model.
    Finds high-contrast blobs that may indicate visual boundaries.
    Returns (px, py, mean_contrast) centroids within the tile.
    """
    width, height = img.size
    pixels = list(img.getdata())

    hits: list[tuple[int, int, int]] = []
    threshold = 80  # summed RGB contrast threshold (0–765)
    step = 8        # sample every 8 pixels for speed

    for y in range(step, height - step, step):
        for x in range(step, width - step, step):
            idx = y * width + x
            r, g, b = pixels[idx]

            # Compare against right and down neighbours
            r2, g2, b2 = pixels[idx + step]
            r3, g3, b3 = pixels[idx + step * width]

            diff_h = abs(r - r2) + abs(g - g2) + abs(b - b2)
            diff_v = abs(r - r3) + abs(g - g3) + abs(b - b3)

            contrast = max(diff_h, diff_v)
            if contrast > threshold:
                hits.append((x, y, contrast))

    # Cluster nearby hits to avoid duplicate markers
    clusters: list[tuple[int, int, float]] = []
    used = [False] * len(hits)
    for i, (x1, y1, contrast1) in enumerate(hits):
        if used[i]:
            continue
        cx, cy, contrast_total, count = x1, y1, contrast1, 1
        for j, (x2, y2, contrast2) in enumerate(hits[i + 1:], start=i + 1):
            if abs(x1 - x2) < 24 and abs(y1 - y2) < 24:
                cx += x2
                cy += y2
                contrast_total += contrast2
                count += 1
                used[j] = True
        clusters.append((cx // count, cy // count, contrast_total / count))

    return clusters[:50]  # cap at 50 detections per tile


def contrast_confidence(contrast: float, threshold: int = 80) -> float:
    """Map measured RGB contrast (0–765) to the public 0.35–0.92 score range."""
    usable_range = 765 - threshold
    normalized = (contrast - threshold) / usable_range
    normalized = min(1.0, max(0.0, normalized))
    return round(0.35 + normalized * 0.57, 2)


def run_scan(lat: float, lng: float, zoom: int) -> list[dict]:
    """Fetch tile, run the contrast scan, and return feature centroids."""
    tx, ty = lat_lng_to_tile(lat, lng, zoom)
    img = fetch_tile(tx, ty, zoom)
    if img is None:
        return []

    blobs = simple_edge_detect(img)
    detections = []
    for px, py, contrast in blobs:
        dlat, dlng = pixel_to_lat_lng(px, py, tx, ty, zoom)
        detections.append({
            "lat":        round(dlat, 6),
            "lng":        round(dlng, 6),
            "label":      "High-contrast feature",
            "confidence": contrast_confidence(contrast),
        })
    return detections


# ── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "nexus-geodep"})


@app.get("/scan")
def scan(
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
    zoom: int = ZOOM,
) -> JSONResponse:
    """
    Run a lightweight image-contrast feature scan over a map tile.
    Query params: lat, lng, zoom (all optional — default AOI used if omitted).
    """
    global _cache
    now = time.time()

    if now - _cache["ts"] < CACHE_TTL and _cache["detections"]:
        return JSONResponse({
            "detections": _cache["detections"],
            "cached":     True,
            "scan_at":    _cache["ts"],
        })

    detections = run_scan(lat, lng, zoom)
    _cache = {"ts": now, "detections": detections}

    return JSONResponse({
        "detections": detections,
        "cached":     False,
        "scan_at":    now,
    })


# ── Entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        import uvicorn
    except ImportError:
        raise SystemExit("Missing uvicorn — run: pip install uvicorn")

    print(f"GeoDeep service starting on http://localhost:{PORT}")
    print(f"Default AOI: {DEFAULT_LAT}, {DEFAULT_LNG} (zoom {ZOOM})")
    print("Override via env: GEODEP_LAT, GEODEP_LNG, GEODEP_ZOOM, GEODEP_PORT")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
