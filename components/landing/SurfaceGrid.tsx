const SURFACE_LABELS: readonly string[] = [
  "HQ",
  "COMMAND",
  "INTEL",
  "ALPHA",
  "CYBER",
  "RECON",
  "VAULT",
  "RESOURCES",
];

export default function SurfaceGrid() {
  return (
    <div
      className="nexus-landing-surface-grid nexus-landing-enter"
      role="list"
      aria-label="Nexus operational surfaces"
    >
      {SURFACE_LABELS.map((label, index) => (
        <span
          key={label}
          className="nexus-landing-surface-grid__item"
          role="listitem"
        >
          <span className="nexus-landing-surface-grid__label">{label}</span>
          {index < SURFACE_LABELS.length - 1 ? (
            <span
              className="nexus-landing-surface-grid__separator"
              aria-hidden="true"
            >
              •
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
