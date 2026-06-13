"use client";

import { useEffect, useState } from "react";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";

type Payload = {
  readiness?: {
    status: "disabled" | "misconfigured" | "client-offline" | "ready";
    ready: boolean;
    listenerReachable: boolean;
    blockers: string[];
    summary: string;
    warning: string;
  };
  configuration?: {
    authorized: boolean;
    delegatedDomainConfigured: boolean;
    resolverCount: number;
    encryption: string;
    proxyHost: string;
    proxyPortConfigured: boolean;
    localDnsEnabled: boolean;
    cacheEnabled: boolean;
    compressionEnabled: boolean;
    requestPackingEnabled: boolean;
    externalSocksConfigured: boolean;
  };
};

export default function MasterDnsVpnReadinessPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const response = await fetch("/api/masterdnsvpn/readiness", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      setPayload((await response.json()) as Payload);
    } catch {
      // Optional external transport readiness must fail silently.
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void check();
  }, []);

  const readiness = payload?.readiness;
  const config = payload?.configuration;

  return (
    <section
      data-testid="masterdnsvpn-readiness"
      style={{
        display: "grid",
        gap: "8px",
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", flexWrap: "wrap" }}>
        <SectionLabel detail="External, operator-managed">
          Emergency external transport
        </SectionLabel>
        <ShellButton
          active={!checking}
          disabled={checking}
          title="Probe only the configured loopback client listener"
          onClick={check}
        >
          {checking ? "Checking" : "Check client"}
        </ShellButton>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <ShellBadge tone={readiness?.ready ? "success" : "muted"}>
          {readiness?.status ?? "unavailable"}
        </ShellBadge>
        <ShellBadge tone={config?.authorized ? "accent" : "muted"}>
          {config?.authorized ? "authorized" : "not authorized"}
        </ShellBadge>
        <ShellBadge tone="muted">
          {config?.encryption ?? "encryption unknown"}
        </ShellBadge>
        <ShellBadge tone="muted">
          {config?.resolverCount ?? 0} resolvers
        </ShellBadge>
        <ShellBadge tone="muted">
          {config?.proxyHost ?? "loopback pending"}
        </ShellBadge>
      </div>
      <p style={{ margin: 0, color: "var(--text2)", fontSize: "12px", lineHeight: 1.5 }}>
        {readiness?.summary ??
          "Readiness is unavailable. Configure the external client through local environment settings."}{" "}
        This transport does not unlock public links. {readiness?.warning}
      </p>
      {readiness?.blockers?.length ? (
        <p style={{ margin: 0, color: "var(--text3)", fontSize: "11px", lineHeight: 1.5 }}>
          {readiness.blockers.join(" ")}
        </p>
      ) : null}
    </section>
  );
}
