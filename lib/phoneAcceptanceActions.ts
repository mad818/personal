import { FREE_LOCAL_ASSISTANT_TURN_PROOF } from "@/lib/freeLocalOperations";
import type { PhoneAcceptanceLiveStatus } from "@/lib/phoneAcceptanceStatus";

export type PhoneAcceptanceActionId =
  | "sendPing"
  | "sendLocalAi"
  | "installPwa"
  | "refreshReceipt";

export type PhoneAcceptanceAction = {
  id: PhoneAcceptanceActionId;
  label: string;
  detail: string;
};

function itemPassed(
  status: PhoneAcceptanceLiveStatus | null,
  id: string,
): boolean {
  return Boolean(status?.items.find((entry) => entry.id === id)?.passed);
}

export function buildPhoneAcceptancePendingActions(
  status: PhoneAcceptanceLiveStatus | null,
  options: { sessionAuthenticated: boolean; canInstallPwa?: boolean },
): PhoneAcceptanceAction[] {
  if (status?.acceptanceReady) return [];

  const actions: PhoneAcceptanceAction[] = [];

  if (!options.sessionAuthenticated && !itemPassed(status, "phoneLogin")) {
    return [
      {
        id: "refreshReceipt",
        label: "Log in first",
        detail: "Use your phone token at the access gate, then return here.",
      },
    ];
  }

  if (
    !itemPassed(status, "phoneOpened") ||
    !itemPassed(status, "browserStorageReady")
  ) {
    actions.push({
      id: "refreshReceipt",
      label: "Register this phone",
      detail: "Records that HQ opened on this device.",
    });
  }

  if (!itemPassed(status, "pingReceipt")) {
    actions.push({
      id: "sendPing",
      label: "Send ping",
      detail: `Sends "${FREE_LOCAL_ASSISTANT_TURN_PROOF.localFastPathPrompt}" in chat.`,
    });
  }

  if (!itemPassed(status, "localAiReceipt")) {
    actions.push({
      id: "sendLocalAi",
      label: "Check local AI",
      detail: "Runs the Ollama proof prompt for phone receipt.",
    });
  }

  // Only show PWA install if the browser supports it. Brave on iOS and non-Safari
  // iOS browsers cannot install PWAs — showing the button there is confusing.
  const pwaCapable = options.canInstallPwa !== false;
  if (pwaCapable && !itemPassed(status, "pwaInstalled")) {
    actions.push({
      id: "installPwa",
      label: "Install app",
      detail:
        "iPhone Safari: Share → Add to Home Screen. Android Chrome: Install app.",
    });
  }

  return actions;
}

export function promptForPhoneAcceptanceAction(
  actionId: PhoneAcceptanceActionId,
): string | null {
  switch (actionId) {
    case "sendPing":
      return FREE_LOCAL_ASSISTANT_TURN_PROOF.localFastPathPrompt;
    case "sendLocalAi":
      return FREE_LOCAL_ASSISTANT_TURN_PROOF.localModelPrompt;
    default:
      return null;
  }
}
