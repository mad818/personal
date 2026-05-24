import { apiFetch } from "@/lib/apiFetch";
import type {
  AssistantChatActionModel,
  AssistantRuntimeReceipt,
} from "@/lib/assistantChatActions";

type PhoneAssistantReceiptPayload = {
  source: "assistant-turn-receipt";
  route: string;
  localFastPathReceipt: boolean;
  localAiReceipt: boolean;
};

function getCurrentInternalRoute() {
  if (typeof window === "undefined") return "/";
  try {
    return `${window.location.pathname}${window.location.search}`;
  } catch {
    return "/";
  }
}

function sanitizeReceiptRoute(route: string) {
  if (!route.startsWith("/")) return "/";
  try {
    const url = new URL(route, "http://nexus.local");
    for (const key of Array.from(url.searchParams.keys())) {
      if (/token|secret|password|auth|cookie|session/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return `${url.pathname}${url.search}`.slice(0, 180);
  } catch {
    return "/";
  }
}

function isOllamaOrLocalRuntime(receipt: AssistantRuntimeReceipt) {
  const provider = receipt.provider.toLowerCase();
  const networkMode = receipt.networkMode.toLowerCase();
  return (
    provider.includes("ollama") ||
    networkMode === "isolated" ||
    networkMode === "internal"
  );
}

function isLocalAiReceipt(receipt: AssistantRuntimeReceipt) {
  return (
    !receipt.localFastPath &&
    !receipt.paidApisAllowed &&
    !receipt.filesChanged &&
    !receipt.recoveryCode &&
    isOllamaOrLocalRuntime(receipt)
  );
}

export function buildPhoneAssistantReceiptPayload(
  actionModel: AssistantChatActionModel | null | undefined,
): PhoneAssistantReceiptPayload | null {
  const runtimeReceipt = actionModel?.runtimeReceipt;
  if (!runtimeReceipt) return null;

  const localFastPathReceipt = runtimeReceipt.localFastPath === true;
  const localAiReceipt = isLocalAiReceipt(runtimeReceipt);

  if (!localFastPathReceipt && !localAiReceipt) return null;

  return {
    source: "assistant-turn-receipt",
    route: sanitizeReceiptRoute(getCurrentInternalRoute()),
    localFastPathReceipt,
    localAiReceipt,
  };
}

export function phoneAssistantReceiptKey(
  actionModel: AssistantChatActionModel | null | undefined,
) {
  const payload = buildPhoneAssistantReceiptPayload(actionModel);
  const receipt = actionModel?.runtimeReceipt;
  if (!payload || !receipt) return null;

  return [
    payload.source,
    payload.route,
    payload.localFastPathReceipt ? "fast" : "ai",
    receipt.provider,
    receipt.model,
    receipt.networkMode,
    receipt.paidApisAllowed ? "paid" : "free",
    receipt.filesChanged ? "files" : "clean",
    receipt.recoveryCode ?? "ok",
  ].join("|");
}

function sessionStorageKey(key: string) {
  return `nexus-phone-assistant-receipt:${key}`;
}

export async function markPhoneAssistantReceipt(
  actionModel: AssistantChatActionModel | null | undefined,
) {
  const payload = buildPhoneAssistantReceiptPayload(actionModel);
  const key = phoneAssistantReceiptKey(actionModel);
  if (!payload || !key) return;

  try {
    const storageKey = sessionStorageKey(key);
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      // Some phone browsers restrict sessionStorage; the receipt can still post.
    }

    const response = await apiFetch("/api/phone-acceptance/receipt", {
      method: "POST",
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    if (!response.ok) return;

    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Silent: the protected local receipt already accepted the marker.
    }
  } catch {
    // Silent acceptance marker; chat rendering must never depend on it.
  }
}
