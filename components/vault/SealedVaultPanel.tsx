"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShellBadge, ShellButton, SectionLabel } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { requestTextDownload } from "@/components/ui/downloadFeedback";
import { takeSelectedFile } from "@/components/ui/fileInput";
import {
  createSealedVaultRecordId,
  createSealedVaultPayload,
  deleteSealedVaultRecord,
  openSealedVault,
  parseSealedVaultEnvelopeJson,
  sealVaultPayload,
  SEALED_VAULT_AUTO_LOCK_MS,
  SEALED_VAULT_KDF_ITERATIONS,
  SEALED_VAULT_MAX_RECORDS,
  SEALED_VAULT_STORAGE_KEY,
  serializeSealedVaultEnvelope,
  upsertSealedVaultRecord,
  type SealedVaultEnvelope,
  type SealedVaultPayload,
} from "@/lib/sealedVault";

type BusyAction =
  | "create"
  | "unlock"
  | "save"
  | "delete"
  | "rekey"
  | "import"
  | "export"
  | "destroy";

type PendingConfirmation =
  | {
      kind: "replace-invalid-create";
      title: string;
      description: string;
    }
  | {
      kind: "delete-record";
      recordId: string;
      title: string;
      description: string;
    }
  | {
      kind: "replace-import";
      imported: SealedVaultEnvelope;
      title: string;
      description: string;
    }
  | {
      kind: "destroy-vault";
      title: string;
      description: string;
    };

const FIELD_STYLE = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--surf2)",
  color: "var(--text)",
} as const;

function normalizedTags(value: string): string[] {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function SealedVaultPanel() {
  const [envelope, setEnvelope] = useState<SealedVaultEnvelope | null>(null);
  const [payload, setPayload] = useState<SealedVaultPayload | null>(null);
  const [sessionPassphrase, setSessionPassphrase] = useState("");
  const [createPassphrase, setCreatePassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmNewPassphrase, setConfirmNewPassphrase] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Checking browser-local sealed storage.",
  );
  const [storageReady, setStorageReady] = useState(false);
  const [storedEnvelopePresent, setStoredEnvelopePresent] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const lockVault = useCallback((message = "Sealed notes locked.") => {
    setPayload(null);
    setSessionPassphrase("");
    setUnlockPassphrase("");
    setNewPassphrase("");
    setConfirmNewPassphrase("");
    setSelectedId(null);
    setDraftTitle("");
    setDraftBody("");
    setDraftTags("");
    setStatusMessage(message);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SEALED_VAULT_STORAGE_KEY);
      if (stored) {
        setStoredEnvelopePresent(true);
        setEnvelope(parseSealedVaultEnvelopeJson(stored));
        setStatusMessage(
          "A sealed local envelope is ready. Enter its passphrase to unlock.",
        );
      } else {
        setStatusMessage(
          "No sealed vault exists in this browser. Create one or import an encrypted backup.",
        );
      }
    } catch {
      setStatusMessage(
        "The stored sealed envelope is invalid. Import a known-good encrypted backup or replace the local copy.",
      );
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!payload) return;
    let timer = window.setTimeout(
      () => lockVault("Sealed notes auto-locked after five minutes."),
      SEALED_VAULT_AUTO_LOCK_MS,
    );
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => lockVault("Sealed notes auto-locked after five minutes."),
        SEALED_VAULT_AUTO_LOCK_MS,
      );
    };
    const lockWhenHidden = () => {
      if (document.hidden) {
        lockVault("Sealed notes locked when the document was hidden.");
      }
    };
    window.addEventListener("pointerdown", resetTimer, { passive: true });
    window.addEventListener("keydown", resetTimer);
    document.addEventListener("visibilitychange", lockWhenHidden);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      document.removeEventListener("visibilitychange", lockWhenHidden);
    };
  }, [lockVault, payload]);

  const selectedRecord = useMemo(
    () => payload?.records.find((record) => record.id === selectedId) ?? null,
    [payload, selectedId],
  );
  const controlsDisabled = Boolean(busyAction || pendingConfirmation);

  useEffect(() => {
    if (!selectedRecord) return;
    setDraftTitle(selectedRecord.title);
    setDraftBody(selectedRecord.body);
    setDraftTags(selectedRecord.tags.join(", "));
  }, [selectedRecord]);

  async function persistPayload(
    nextPayload: SealedVaultPayload,
    passphrase = sessionPassphrase,
  ) {
    const nextEnvelope = await sealVaultPayload(nextPayload, passphrase);
    window.localStorage.setItem(
      SEALED_VAULT_STORAGE_KEY,
      serializeSealedVaultEnvelope(nextEnvelope),
    );
    setEnvelope(nextEnvelope);
    setPayload(nextPayload);
  }

  async function createVault(replacementApproved = false) {
    setBusyAction("create");
    try {
      if (createPassphrase !== confirmPassphrase) {
        throw new Error("Passphrase confirmation does not match.");
      }
      if (storedEnvelopePresent && !replacementApproved) {
        setPendingConfirmation({
          kind: "replace-invalid-create",
          title: "Replace invalid local envelope?",
          description:
            "Creating this vault will replace existing invalid sealed-vault data in this browser. Export or copy that data first if it may be needed.",
        });
        setStatusMessage("Creation paused for explicit replacement approval.");
        return;
      }
      const nextPayload = createSealedVaultPayload();
      const nextEnvelope = await sealVaultPayload(
        nextPayload,
        createPassphrase,
      );
      window.localStorage.setItem(
        SEALED_VAULT_STORAGE_KEY,
        serializeSealedVaultEnvelope(nextEnvelope),
      );
      setEnvelope(nextEnvelope);
      setStoredEnvelopePresent(true);
      setPayload(nextPayload);
      setSessionPassphrase(createPassphrase);
      setCreatePassphrase("");
      setConfirmPassphrase("");
      setStatusMessage(
        "Sealed notes created and unlocked. Export an encrypted backup before adding irreplaceable material.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Sealed notes could not be created.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function unlockVault() {
    if (!envelope) return;
    setBusyAction("unlock");
    try {
      const nextPayload = await openSealedVault(envelope, unlockPassphrase);
      setPayload(nextPayload);
      setSessionPassphrase(unlockPassphrase);
      setUnlockPassphrase("");
      setStatusMessage(
        `Sealed notes unlocked locally with ${nextPayload.records.length} record(s).`,
      );
    } catch {
      setStatusMessage(
        "Unable to unlock sealed notes. Check the passphrase and encrypted backup.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function saveRecord() {
    if (!payload || !sessionPassphrase) return;
    setBusyAction("save");
    try {
      const recordId = selectedId ?? createSealedVaultRecordId();
      const nextPayload = upsertSealedVaultRecord(payload, {
        id: recordId,
        title: draftTitle,
        body: draftBody,
        tags: normalizedTags(draftTags),
      });
      await persistPayload(nextPayload);
      setSelectedId(recordId);
      setStatusMessage(
        "Record encrypted with a fresh salt and IV, then saved locally.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Record could not be encrypted and saved.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function requestRecordRemoval() {
    if (!selectedRecord) return;
    setPendingConfirmation({
      kind: "delete-record",
      recordId: selectedRecord.id,
      title: `Delete "${selectedRecord.title}"?`,
      description:
        "This removes the note from the sealed local vault and cannot be undone without an older encrypted backup.",
    });
    setStatusMessage("Record deletion paused for explicit approval.");
  }

  async function removeRecord(recordId: string) {
    if (!payload) return;
    setBusyAction("delete");
    try {
      const nextPayload = deleteSealedVaultRecord(payload, recordId);
      await persistPayload(nextPayload);
      startNewRecord();
      setStatusMessage("Record removed and the remaining vault resealed.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Record could not be removed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function changePassphrase() {
    if (!payload) return;
    setBusyAction("rekey");
    try {
      if (newPassphrase !== confirmNewPassphrase) {
        throw new Error("New passphrase confirmation does not match.");
      }
      const nextEnvelope = await sealVaultPayload(payload, newPassphrase);
      window.localStorage.setItem(
        SEALED_VAULT_STORAGE_KEY,
        serializeSealedVaultEnvelope(nextEnvelope),
      );
      setEnvelope(nextEnvelope);
      setSessionPassphrase(newPassphrase);
      setNewPassphrase("");
      setConfirmNewPassphrase("");
      setStatusMessage(
        "Passphrase changed. The complete vault was resealed with fresh cryptographic parameters.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Passphrase could not be changed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function exportEnvelope() {
    if (!envelope) return;
    setBusyAction("export");
    try {
      const requested = requestTextDownload({
        filename: `nexus-sealed-vault-${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
        content: serializeSealedVaultEnvelope(envelope),
        label: "Encrypted sealed-vault backup",
        mimeType: "application/json",
        announce: false,
      });
      if (!requested) throw new Error("Browser download was unavailable.");
      setStatusMessage(
        "Encrypted backup downloaded. Its contents still require the passphrase.",
      );
    } catch {
      setStatusMessage("Encrypted backup could not be downloaded.");
    } finally {
      setBusyAction(null);
    }
  }

  async function importEnvelope(file: File) {
    setBusyAction("import");
    try {
      if (file.size > 800 * 1024) {
        throw new Error("Encrypted backup exceeds the 800 KiB import limit.");
      }
      const imported = parseSealedVaultEnvelopeJson(await file.text());
      if (storedEnvelopePresent) {
        setPendingConfirmation({
          kind: "replace-import",
          imported,
          title: "Replace the local sealed vault?",
          description:
            "Importing this encrypted backup will replace the browser's current sealed vault. Export the current envelope first if it is needed.",
        });
        setStatusMessage(
          "Encrypted import paused for explicit overwrite approval.",
        );
        return;
      }
      acceptImportedEnvelope(imported);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Encrypted backup could not be imported.",
      );
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
      setBusyAction(null);
    }
  }

  function acceptImportedEnvelope(imported: SealedVaultEnvelope) {
    try {
      window.localStorage.setItem(
        SEALED_VAULT_STORAGE_KEY,
        serializeSealedVaultEnvelope(imported),
      );
      setEnvelope(imported);
      setStoredEnvelopePresent(true);
      lockVault(
        "Encrypted backup imported and kept locked. Enter its passphrase to verify it.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Encrypted backup could not be imported.",
      );
    }
  }

  function requestVaultDestruction() {
    setPendingConfirmation({
      kind: "destroy-vault",
      title: "Delete the complete sealed vault?",
      description:
        "This removes the envelope from this browser and cannot be recovered without an encrypted export and its passphrase.",
    });
    setStatusMessage("Complete vault deletion paused for explicit approval.");
  }

  async function destroyVault() {
    setBusyAction("destroy");
    try {
      window.localStorage.removeItem(SEALED_VAULT_STORAGE_KEY);
      lockVault(
        "The sealed local vault was deleted from this browser. A prior encrypted export is the only recovery path.",
      );
      setEnvelope(null);
      setStoredEnvelopePresent(false);
    } catch {
      setStatusMessage("The sealed local vault could not be deleted.");
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmPendingAction() {
    const pending = pendingConfirmation;
    if (!pending) return;
    setPendingConfirmation(null);
    switch (pending.kind) {
      case "replace-invalid-create":
        await createVault(true);
        break;
      case "delete-record":
        await removeRecord(pending.recordId);
        break;
      case "replace-import":
        acceptImportedEnvelope(pending.imported);
        break;
      case "destroy-vault":
        await destroyVault();
        break;
    }
  }

  function cancelPendingAction() {
    setPendingConfirmation(null);
    setStatusMessage("Destructive action cancelled. No local data changed.");
  }

  function startNewRecord() {
    setSelectedId(null);
    setDraftTitle("");
    setDraftBody("");
    setDraftTags("");
  }

  if (!storageReady) {
    return (
      <SurfaceCallout
        tone="info"
        role="status"
        title="Checking sealed notes"
        description="Inspecting this browser's local encrypted envelope."
      />
    );
  }

  return (
    <div
      style={{ display: "grid", gap: "14px" }}
      data-testid="sealed-vault-panel"
    >
      <SurfaceCallout
        tone="warning"
        role="status"
        title="Local privacy layer, not a password manager"
        description="AES-GCM protects the persisted envelope, but active same-origin code can access plaintext while this panel is unlocked. There is no sync, recovery key, Bitwarden compatibility, or security-audit parity."
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <SectionLabel detail="Browser-local encrypted notes">
            Sealed notes
          </SectionLabel>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--text2)",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            PBKDF2-SHA-256 · {SEALED_VAULT_KDF_ITERATIONS.toLocaleString()}{" "}
            iterations · AES-GCM-256 · five-minute or hidden-document lock
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellBadge tone={payload ? "success" : "muted"}>
            {payload ? "Unlocked locally" : "Locked"}
          </ShellBadge>
          <ShellBadge tone="muted">
            {payload?.records.length ?? "?"}/{SEALED_VAULT_MAX_RECORDS} records
          </ShellBadge>
        </div>
      </div>

      <p
        aria-live="polite"
        role="status"
        style={{
          margin: 0,
          minHeight: "20px",
          color: "var(--text2)",
          fontSize: "12px",
        }}
      >
        {statusMessage}
      </p>

      {pendingConfirmation ? (
        <section
          role="alertdialog"
          aria-labelledby="sealed-vault-confirmation-title"
          aria-describedby="sealed-vault-confirmation-description"
          style={{
            display: "grid",
            gap: "10px",
            padding: "14px",
            border: "1px solid rgba(214, 165, 109, 0.62)",
            borderRadius: "14px",
            background: "rgba(214, 165, 109, 0.09)",
          }}
        >
          <strong id="sealed-vault-confirmation-title">
            {pendingConfirmation.title}
          </strong>
          <p
            id="sealed-vault-confirmation-description"
            style={{
              margin: 0,
              color: "var(--text2)",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            {pendingConfirmation.description}
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellButton onClick={() => void confirmPendingAction()}>
              Confirm action
            </ShellButton>
            <ShellButton onClick={cancelPendingAction}>
              Keep current data
            </ShellButton>
          </div>
        </section>
      ) : null}

      {!envelope ? (
        <section
          style={{
            display: "grid",
            gap: "12px",
            padding: "14px",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            background: "rgba(7, 10, 18, 0.72)",
          }}
        >
          <SectionLabel detail="No recovery service">
            Create local vault
          </SectionLabel>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text3)" }}>
              Passphrase (12-256 characters)
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={createPassphrase}
              minLength={12}
              maxLength={256}
              onChange={(event) => setCreatePassphrase(event.target.value)}
              style={FIELD_STYLE}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text3)" }}>
              Confirm passphrase
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassphrase}
              minLength={12}
              maxLength={256}
              onChange={(event) => setConfirmPassphrase(event.target.value)}
              style={FIELD_STYLE}
            />
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellButton
              onClick={() => void createVault()}
              disabled={controlsDisabled}
            >
              {busyAction === "create"
                ? "Creating encrypted vault…"
                : "Create sealed vault"}
            </ShellButton>
            <ShellButton
              onClick={() => importInputRef.current?.click()}
              disabled={controlsDisabled}
            >
              Import encrypted backup
            </ShellButton>
          </div>
        </section>
      ) : null}

      {envelope && !payload ? (
        <section
          style={{
            display: "grid",
            gap: "12px",
            padding: "14px",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            background: "rgba(7, 10, 18, 0.72)",
          }}
        >
          <SectionLabel detail={`Sealed ${envelope.sealedAt}`}>
            Unlock local envelope
          </SectionLabel>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text3)" }}>
              Passphrase
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={unlockPassphrase}
              minLength={12}
              maxLength={256}
              onChange={(event) => setUnlockPassphrase(event.target.value)}
              style={FIELD_STYLE}
            />
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellButton
              onClick={() => void unlockVault()}
              disabled={controlsDisabled}
            >
              {busyAction === "unlock" ? "Unlocking locally…" : "Unlock notes"}
            </ShellButton>
            <ShellButton
              onClick={() => void exportEnvelope()}
              disabled={controlsDisabled}
            >
              Download encrypted backup
            </ShellButton>
            <ShellButton
              onClick={() => importInputRef.current?.click()}
              disabled={controlsDisabled}
            >
              Replace from encrypted backup
            </ShellButton>
            <ShellButton
              onClick={requestVaultDestruction}
              disabled={controlsDisabled}
            >
              Delete sealed vault
            </ShellButton>
          </div>
        </section>
      ) : null}

      {payload ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "14px",
              alignItems: "start",
            }}
          >
            <section
              style={{
                display: "grid",
                gap: "10px",
                padding: "14px",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                background: "rgba(7, 10, 18, 0.72)",
              }}
            >
              <SectionLabel detail={`${payload.records.length} private notes`}>
                Record index
              </SectionLabel>
              <ShellButton onClick={startNewRecord} disabled={controlsDisabled}>
                New sealed note
              </ShellButton>
              {payload.records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    border:
                      selectedId === record.id
                        ? "1px solid rgba(214, 165, 109, 0.62)"
                        : "1px solid var(--border)",
                    background:
                      selectedId === record.id
                        ? "rgba(214, 165, 109, 0.09)"
                        : "rgba(10, 15, 30, 0.62)",
                    color: "var(--text)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "12px" }}>
                    {record.title}
                  </strong>
                  <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                    {record.tags.join(" · ") || "untagged"}
                  </span>
                </button>
              ))}
              {payload.records.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    color: "var(--text3)",
                    fontSize: "11px",
                    lineHeight: 1.55,
                  }}
                >
                  The decrypted session has no notes yet.
                </p>
              ) : null}
            </section>

            <section
              style={{
                display: "grid",
                gap: "12px",
                padding: "14px",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                background: "rgba(7, 10, 18, 0.72)",
              }}
            >
              <SectionLabel
                detail={selectedRecord ? "Edit and reseal" : "Create and seal"}
              >
                {selectedRecord ? selectedRecord.title : "New private note"}
              </SectionLabel>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Title
                </span>
                <input
                  value={draftTitle}
                  maxLength={120}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  style={FIELD_STYLE}
                />
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Private note
                </span>
                <textarea
                  value={draftBody}
                  rows={8}
                  maxLength={10_000}
                  onChange={(event) => setDraftBody(event.target.value)}
                  style={{ ...FIELD_STYLE, resize: "vertical" }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Tags (comma separated, 12 maximum)
                </span>
                <input
                  value={draftTags}
                  maxLength={491}
                  onChange={(event) => setDraftTags(event.target.value)}
                  style={FIELD_STYLE}
                />
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <ShellButton
                  onClick={() => void saveRecord()}
                  disabled={controlsDisabled}
                >
                  {busyAction === "save"
                    ? "Encrypting and saving…"
                    : "Seal note"}
                </ShellButton>
                {selectedRecord ? (
                  <ShellButton
                    onClick={requestRecordRemoval}
                    disabled={controlsDisabled}
                  >
                    Delete note
                  </ShellButton>
                ) : null}
              </div>
            </section>
          </div>

          <section
            style={{
              display: "grid",
              gap: "12px",
              padding: "14px",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              background: "rgba(7, 10, 18, 0.72)",
            }}
          >
            <SectionLabel detail="Full reseal required">
              Session and recovery
            </SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  New passphrase
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassphrase}
                  minLength={12}
                  maxLength={256}
                  onChange={(event) => setNewPassphrase(event.target.value)}
                  style={FIELD_STYLE}
                />
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Confirm new passphrase
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassphrase}
                  minLength={12}
                  maxLength={256}
                  onChange={(event) =>
                    setConfirmNewPassphrase(event.target.value)
                  }
                  style={FIELD_STYLE}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <ShellButton
                onClick={() => void changePassphrase()}
                disabled={controlsDisabled}
              >
                {busyAction === "rekey"
                  ? "Resealing complete vault…"
                  : "Change passphrase"}
              </ShellButton>
              <ShellButton
                onClick={() => void exportEnvelope()}
                disabled={controlsDisabled}
              >
                Download encrypted backup
              </ShellButton>
              <ShellButton
                onClick={() => lockVault()}
                disabled={controlsDisabled}
              >
                Lock now
              </ShellButton>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                lineHeight: 1.6,
                color: "var(--text3)",
              }}
            >
              Forgotten passphrases cannot be reset. Clearing browser storage
              removes the local copy. Keep an encrypted export in a separate
              trusted location; the export is useless without its passphrase.
            </p>
          </section>
        </>
      ) : null}

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        aria-label="Import encrypted sealed-vault backup"
        hidden
        onChange={(event) => {
          const file = takeSelectedFile(event.currentTarget);
          if (file) void importEnvelope(file);
        }}
      />
    </div>
  );
}
