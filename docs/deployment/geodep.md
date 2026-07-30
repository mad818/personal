# GeoDeep Feature Scan — Local Service Setup

GeoDeep adds a **Feature Scan** layer to the Nexus Prime OPS map. It runs a
lightweight pixel-contrast pass over a public map tile and plots measured
high-contrast features as purple markers on the Leaflet map. The bundled scanner
does not infer object classes and is not a trained ML model.

The service runs **locally on your machine** — no cloud, no API key, no cost.
Nexus routes the request through `/api/geo-scan`, which proxies to `localhost:5050`.
If the service is not running, the toggle still works but returns zero markers (graceful).

---

## How it works

1. You toggle **Feature Scan** on the OPS map.
2. Nexus calls `GET /api/geo-scan`.
3. The API route proxies to `http://localhost:5050/scan`.
4. The Python service fetches one public OSM map tile,
   runs a pixel-contrast edge scan (no GPU, no ML model download), and returns
   feature centroids as `{ lat, lng, label, confidence }`. The `confidence`
   value is normalized measured contrast strength, not a model probability.
5. Nexus plots them on the map as purple circle markers.

The default scan area is the Gulf of Mexico (open ocean, no privacy concerns).
You can change the AOI with env vars.

---

## Prerequisites

- Python 3.9+
- `pip install fastapi uvicorn pillow requests`

---

## Start the service

```bash
# From the Nexus project root:
python scripts/geodep-service.py
```

Expected output:

```
GeoDeep service starting on http://localhost:5050
Default AOI: 25.0, -90.0 (zoom 8)
Override via env: GEODEP_LAT, GEODEP_LNG, GEODEP_ZOOM, GEODEP_PORT
```

Then switch to **Feature Scan** in the OPS tab and click **Run feature scan**.

---

## Configuration (env vars)

| Variable | Default | Description |
|----------|---------|-------------|
| `GEODEP_PORT` | `5050` | Port the service listens on |
| `GEODEP_LAT` | `25.0` | Default scan latitude (AOI centre) |
| `GEODEP_LNG` | `-90.0` | Default scan longitude |
| `GEODEP_ZOOM` | `8` | OSM zoom level (6–10 recommended) |
| `GEODEP_SERVICE_URL` | `http://localhost:5050` | Set this in `.env.local` to override the proxy target |

---

## Changing the scan area

```bash
GEODEP_LAT=51.5 GEODEP_LNG=-0.1 GEODEP_ZOOM=9 python scripts/geodep-service.py
```

Or in `.env.local` (for the Next.js API proxy):

```
GEODEP_SERVICE_URL=http://localhost:5050
```

---

## Notes

- The detection algorithm is a pixel-contrast edge scan. It is intentionally simple:
  no GPU, no model download, runs on any machine in under a second.
- Feature labels stay generic, and confidence is derived from the mean RGB contrast
  of each cluster instead of coordinates or invented object classifications.
- Results are cached in-memory for 5 minutes. Click **Run feature scan** to force a refresh.
- The service only reads public OSM tile imagery — no user data is sent externally.
- This is an optional local tool. Nexus works normally without it.

---

## Future upgrades (optional, not bundled)

If you want higher-quality detections, you can swap `simple_edge_detect()` in
`scripts/geodep-service.py` for a real ONNX/TorchScript model:

- [microsoft/CosmosFM](https://github.com/microsoft/torchgeo) — satellite foundation model
- [ultralytics/YOLOv8](https://github.com/ultralytics/ultralytics) — general object detection
- [GeoDeep](https://github.com/uav4geo/GeoDeep) — the original inspiration

Drop in a model call, keep the same `{ lat, lng, label, confidence }` return shape,
and Nexus renders it automatically.
