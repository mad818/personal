"use client";

import { useMemo } from "react";
import {
  buildPrivacyShieldReceipt,
  formatPrivacyShieldReceiptSummary,
} from "@/lib/privacyShieldReceipt";
import { designTokens } from "@/lib/designTokens";
import { useStore } from "@/store/useStore";

export default function PrivacyShieldReceiptCard() {
  const privacyShieldStatus = useStore((s) => s.privacyShieldStatus);
  const receipt = useMemo(
    () => buildPrivacyShieldReceipt(privacyShieldStatus),
    [privacyShieldStatus],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
          Privacy receipt
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>
          Operator-facing redaction posture for cloud-bound dispatch
        </div>
      </div>

      {receipt ? (
        <>
          <div style={{ fontSize: "11px", color: "var(--text)" }}>
            {formatPrivacyShieldReceiptSummary(receipt)}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text3)" }}>
            {receipt.summary}
          </div>
          {receipt.blockedReason ? (
            <div style={{ fontSize: "10px", color: designTokens.warning, fontWeight: 600 }}>
              {receipt.blockedReason}
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>
          No active receipt yet. Run a privacy shield preview to issue one.
        </div>
      )}
    </div>
  );
}
