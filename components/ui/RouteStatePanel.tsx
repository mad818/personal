import type { ReactNode } from "react";

export type RouteStateKind = "loading" | "error" | "not-found";

interface RouteStatePanelProps {
  kind: RouteStateKind;
  eyebrow: string;
  title: string;
  description: string;
  announcement: string;
  testId: string;
  actions?: ReactNode;
  debugDetail?: string;
  asMain?: boolean;
}

export default function RouteStatePanel({
  kind,
  eyebrow,
  title,
  description,
  announcement,
  testId,
  actions,
  debugDetail,
  asMain = false,
}: RouteStatePanelProps) {
  const Root = asMain ? "main" : "section";
  const Heading = asMain ? "h1" : "h2";
  const titleId = `${testId}-title`;
  const descriptionId = `${testId}-description`;

  return (
    <Root
      id={asMain ? "nexus-main-content" : undefined}
      tabIndex={asMain ? -1 : undefined}
      className="nexus-route-state"
      data-kind={kind}
      data-main={asMain ? "true" : "false"}
      data-testid={testId}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={kind === "loading" ? true : undefined}
    >
      <div
        className="sr-only"
        role={kind === "error" ? "alert" : "status"}
        aria-live={kind === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {announcement}
      </div>

      <div className="nexus-route-state__frame">
        <div className="nexus-route-state__signal" aria-hidden="true" />
        <div className="nexus-route-state__copy">
          <span className="nexus-route-state__eyebrow">{eyebrow}</span>
          <Heading className="nexus-route-state__title" id={titleId}>
            {title}
          </Heading>
          <p className="nexus-route-state__description" id={descriptionId}>
            {description}
          </p>
          {actions ? (
            <div className="nexus-route-state__actions">{actions}</div>
          ) : null}
          {debugDetail ? (
            <details className="nexus-route-state__debug">
              <summary>Development diagnostic</summary>
              <pre>{debugDetail}</pre>
            </details>
          ) : null}
        </div>
      </div>
    </Root>
  );
}
