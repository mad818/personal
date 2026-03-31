"use client";

// ── AlphaEarthCard ────────────────────────────────────────────────────────────
// Reference card for AlphaEarth / Google Earth Engine free-tier datasets.
// Zero API cost — static informational panel, no keys required.
// Sources: DeepMind AlphaEarth (2024), Google Earth Engine public catalog.

export function AlphaEarthCard() {
  const datasets = [
    {
      label: "Building Footprints",
      detail: "1.4 T footprints · 2017–2024 · global",
      url: "https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings_v3_polygons",
    },
    {
      label: "Landsat 8/9 Surface",
      detail: "Cloud-masked TOA reflectance · 30 m/px",
      url: "https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC09_C02_T1_TOA",
    },
    {
      label: "Sentinel-2 Harmonised",
      detail: "MSI L2A · 10 m/px · 12 bands",
      url: "https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED",
    },
    {
      label: "FIRMS Fire Detections",
      detail: "MODIS + VIIRS near-realtime · free key",
      url: "https://firms.modaps.eosdis.nasa.gov/",
    },
    {
      label: "SRTM Elevation",
      detail: "30 m DEM · global land coverage",
      url: "https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003",
    },
  ];

  return (
    <div
      style={{
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: "16px",
        marginTop: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "20px" }}>🛰</span>
        <div>
          <div
            style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}
          >
            AlphaEarth — Earth Engine Free Tier
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text2)",
              marginTop: "1px",
            }}
          >
            DeepMind virtual satellite model · public datasets · no in-app cost
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "12px",
          color: "var(--text2)",
          lineHeight: 1.55,
          marginBottom: "12px",
        }}
      >
        AlphaEarth is DeepMind&apos;s foundation model trained on satellite
        imagery. The datasets below are publicly available on Google Earth
        Engine&apos;s free tier and complement the live layers already on this
        map (quakes, flights, fires). No Nexus API key is needed — click any
        dataset to open Earth Engine directly.
      </p>

      {/* Dataset list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          marginBottom: "14px",
        }}
      >
        {datasets.map((d) => (
          <a
            key={d.label}
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--surf3)",
              border: "1px solid var(--border)",
              borderRadius: "var(--rs)",
              padding: "7px 10px",
              textDecoration: "none",
              transition: "border-color var(--t)",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text2)",
                textAlign: "right",
              }}
            >
              {d.detail}
            </span>
          </a>
        ))}
      </div>

      {/* CTA buttons */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <a
          href="https://earthengine.google.com/new_signup/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "6px 12px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--rs)",
            textDecoration: "none",
          }}
        >
          Get Free Earth Engine Access →
        </a>
        <a
          href="https://leafmap.org/notebooks/00_key_features/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "6px 12px",
            background: "var(--surf3)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--rs)",
            textDecoration: "none",
          }}
        >
          leafmap demo (Python)
        </a>
        <a
          href="https://deepmind.google/discover/blog/alphaearth-ai-for-a-better-understanding-of-our-planet/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "6px 12px",
            background: "var(--surf3)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--rs)",
            textDecoration: "none",
          }}
        >
          AlphaEarth paper
        </a>
      </div>
    </div>
  );
}
