// ── vault/page ──────────────────────────────────────────────
// VAULT tab: archive, search, folders, and export surfaces.

"use client";

import dynamic from "next/dynamic";
import {
  SectionLabel,
  ShellBadge,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellStack,
} from "@/components/ui/shell";

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
const LazyRegistryConsole = dynamic(
  () => import("@/components/resources/RegistryConsole"),
  { ssr: false },
);

export default function VaultPage() {
  return (
    <ShellPage
      width="wide"
      surface="vault"
      eyebrow="Cold-storage vault"
      title="ARCHIVE"
      description="Search, organize, and export saved intelligence artifacts with clearer archive hierarchy and faster retrieval."
      actions={
        <>
          <ShellBadge tone="accent">Local archive</ShellBadge>
          <ShellBadge tone="muted">Export ready</ShellBadge>
        </>
      }
    >
      <ShellGrid columns="minmax(240px, 0.28fr) minmax(0, 0.72fr)" align="start">
        <ShellStack>
          <ShellPanel>
            <SectionLabel>Folders</SectionLabel>
            <LazyVaultFolders active="All" onSelect={() => {}} />
          </ShellPanel>
          <ShellPanel tone="muted">
            <SectionLabel>Export</SectionLabel>
            <LazyVaultExport />
          </ShellPanel>
          <ShellPanel tone="muted">
            <SectionLabel detail="Shelf-style kits and custody">Registry kits</SectionLabel>
            <LazyRegistryConsole compact view="kits" />
          </ShellPanel>
        </ShellStack>

        <ShellStack>
          <ShellPanel>
            <SectionLabel detail="Title, summary, and tag filtering">Search</SectionLabel>
            <LazyVaultSearch onChange={() => {}} />
          </ShellPanel>
          <ShellPanel>
            <SectionLabel detail="Saved reports and intelligence clips">
              Saved articles
            </SectionLabel>
            <LazySavedArticles />
          </ShellPanel>
        </ShellStack>
      </ShellGrid>
    </ShellPage>
  );
}
