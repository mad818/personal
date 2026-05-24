export type PhoneAcceptanceLiveStatusSource = {
  count?: number | null;
  mobileCount?: number | null;
  latestAt?: string | null;
  phoneOpened?: boolean | null;
  mobileAuthenticated?: boolean | null;
  browserStorageReady?: boolean | null;
  pwaCapable?: boolean | null;
  pwaInstalled?: boolean | null;
  localFastPathReceipt?: boolean | null;
  localAiReceipt?: boolean | null;
};

export type PhoneAcceptanceLiveStatusItemId =
  | "phoneOpened"
  | "phoneLogin"
  | "browserStorageReady"
  | "pingReceipt"
  | "localAiReceipt"
  | "pwaCapable"
  | "pwaInstalled";

export type PhoneAcceptanceLiveStatusItem = {
  id: PhoneAcceptanceLiveStatusItemId;
  label: string;
  passed: boolean;
  detail: string;
};

export type PhoneAcceptanceLiveStatus = {
  overallStatus: "ready" | "warning" | "blocked";
  acceptanceReady: boolean;
  receiptCount: number;
  mobileReceiptCount: number;
  latestAt: string | null;
  items: PhoneAcceptanceLiveStatusItem[];
};

function positive(value: unknown) {
  return value === true;
}

function safeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

export function buildPhoneAcceptanceLiveStatus(
  summary: PhoneAcceptanceLiveStatusSource | null | undefined,
): PhoneAcceptanceLiveStatus {
  const phoneOpened = positive(summary?.phoneOpened);
  const phoneLogin = positive(summary?.mobileAuthenticated);
  const browserStorageReady = positive(summary?.browserStorageReady);
  const pingReceipt = positive(summary?.localFastPathReceipt);
  const localAiReceipt = positive(summary?.localAiReceipt);
  const pwaCapable = positive(summary?.pwaCapable);
  const pwaInstalled = positive(summary?.pwaInstalled);
  const acceptanceReady =
    phoneOpened && phoneLogin && pingReceipt && localAiReceipt && pwaInstalled;
  const requiredCount = [
    phoneOpened,
    phoneLogin,
    pingReceipt,
    localAiReceipt,
    pwaInstalled,
  ].filter(Boolean).length;

  return {
    overallStatus: acceptanceReady
      ? "ready"
      : requiredCount > 0
        ? "warning"
        : "blocked",
    acceptanceReady,
    receiptCount: safeCount(summary?.count),
    mobileReceiptCount: safeCount(summary?.mobileCount),
    latestAt:
      typeof summary?.latestAt === "string" && summary.latestAt
        ? summary.latestAt
        : null,
    items: [
      {
        id: "phoneOpened",
        label: "Phone opened",
        passed: phoneOpened,
        detail: phoneOpened
          ? "A recent mobile receipt exists."
          : "Open the LAN HQ URL from the phone or iPad.",
      },
      {
        id: "phoneLogin",
        label: "Phone login",
        passed: phoneLogin,
        detail: phoneLogin
          ? "The mobile receipt shows protected access."
          : "Log in with NEXUS_TOKEN on the phone.",
      },
      {
        id: "browserStorageReady",
        label: "Browser storage",
        passed: browserStorageReady,
        detail: browserStorageReady
          ? "Phone browser storage accepted the local probe."
          : "Let the Free Local Readiness panel finish loading on the phone.",
      },
      {
        id: "pingReceipt",
        label: "Ping receipt",
        passed: pingReceipt,
        detail: pingReceipt
          ? "The phone recorded the local fast-path assistant receipt."
          : "Send `ping` from HQ chat on the phone.",
      },
      {
        id: "localAiReceipt",
        label: "Local AI receipt",
        passed: localAiReceipt,
        detail: localAiReceipt
          ? "The phone recorded a local/free AI receipt."
          : "Ask the local Ollama proof prompt from the phone.",
      },
      {
        id: "pwaCapable",
        label: "PWA capable",
        passed: pwaCapable,
        detail: pwaCapable
          ? "The phone browser can install the app shell."
          : "Use a browser with home-screen install support.",
      },
      {
        id: "pwaInstalled",
        label: "PWA installed",
        passed: pwaInstalled,
        detail: pwaInstalled
          ? "A recent receipt came from standalone display mode."
          : "Install Homefront from the phone browser home-screen flow.",
      },
    ],
  };
}
