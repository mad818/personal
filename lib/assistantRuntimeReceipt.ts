import { apiFetch } from "@/lib/apiFetch";
import {
  type AssistantRuntimeReceipt,
  createLocalFastPathRuntimeReceipt,
} from "@/lib/assistantChatActions";
import type { FreeLocalReadinessSnapshot } from "@/lib/freeLocalReadiness";

interface RuntimeReceiptSettings {
  aiProvider?: string;
  localModel?: string;
}

interface RuntimeReceiptOptions {
  provider?: string | null;
  recoveryCode?: string | null;
  filesChanged?: boolean;
  localFastPath?: boolean;
}

function fallbackProvider(settings: RuntimeReceiptSettings) {
  if (settings.aiProvider === "ollama") return "ollama";
  return settings.aiProvider || "ollama";
}

function localModelQuery(settings: RuntimeReceiptSettings) {
  const model = settings.localModel?.trim();
  return model ? `?model=${encodeURIComponent(model)}` : "";
}

export async function loadAssistantRuntimeReceipt(
  settings: RuntimeReceiptSettings,
  options: RuntimeReceiptOptions = {},
): Promise<AssistantRuntimeReceipt> {
  if (options.localFastPath) return createLocalFastPathRuntimeReceipt();

  try {
    const response = await apiFetch(
      `/api/free-local-readiness${localModelQuery(settings)}`,
    );

    if (!response.ok) {
      throw new Error(`free_local_readiness_${response.status}`);
    }

    const snapshot = (await response.json()) as FreeLocalReadinessSnapshot;
    const provider =
      options.provider ||
      (snapshot.ollama.reachable ? "ollama" : fallbackProvider(settings));
    const model =
      snapshot.resolvedModel.resolvedModel ||
      snapshot.resolvedModel.requestedModel ||
      settings.localModel ||
      "auto";

    return {
      provider,
      model,
      networkMode: snapshot.networkMode.mode,
      paidApisAllowed: snapshot.paidApisAllowed.allowed,
      localFastPath: false,
      filesChanged: options.filesChanged ?? false,
      recoveryCode: options.recoveryCode ?? null,
    };
  } catch {
    return {
      provider: options.provider || fallbackProvider(settings),
      model: settings.localModel || "auto",
      networkMode: "unknown",
      paidApisAllowed: false,
      localFastPath: false,
      filesChanged: options.filesChanged ?? false,
      recoveryCode: options.recoveryCode ?? null,
    };
  }
}
