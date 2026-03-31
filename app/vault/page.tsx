// ── vault/page ──────────────────────────────────────────────
// VAULT tab: bookmarked articles, search, folders, export.

"use client";

import dynamic from "next/dynamic";

const LazyVaultSearch = dynamic(
  () => import("@/components/vault/VaultSearch"),
  { ssr: false },
);
const LazyVaultFolders = dynamic(
  () => import("@/components/vault/VaultFolders"),
  { ssr: false },
);
const LazyVaultExport = dynamic(
  () => import("@/components/vault/VaultExport"),
  { ssr: false },
);
const LazySavedArticles = dynamic(
  () => import("@/components/vault/SavedArticles"),
  { ssr: false },
);

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px",
      }}
    >
      {children}
    </div>
  );
}

export default function VaultPage() {
  return (
    <div style={{ padding: "18px 16px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 900,
            color: "var(--text)",
            margin: 0,
          }}
        >
          🗂 VAULT
        </h1>
        <p
          style={{ fontSize: "12px", color: "var(--text3)", margin: "4px 0 0" }}
        >
          Saved articles, research, and intelligence
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: "14px",
          alignItems: "start",
        }}
      >
        {/* Left sidebar — folders + export */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Card>
            <LazyVaultFolders active="All" onSelect={() => {}} />
          </Card>
          <Card>
            <LazyVaultExport />
          </Card>
        </div>

        {/* Main — search + articles (components manage own state) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Card>
            <LazyVaultSearch onChange={() => {}} />
          </Card>
          <Card>
            <LazySavedArticles />
          </Card>
        </div>
      </div>
    </div>
  );
}
