export function readTimesfmSpikeStatus() {
  const enabled = process.env.NEXUS_EXPERIMENT_TIMESFM_SPIKE === "true";
  return {
    id: "timesfm-spike",
    enabled,
    defaultEnabled: false,
    summary:
      "Forecasting adapter experiment stays behind an explicit non-default flag until decision-lift is measured.",
  };
}
