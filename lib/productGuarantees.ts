/**
 * Hard-coded product guarantees — do not flip these for “monetization”.
 * Aegis Vector is free software; the app must never bill end users.
 */

/** Must stay false: no subscriptions, no in-app purchases, no Nexus-side payment rails. */
export const NEXUS_APP_CHARGES_END_USERS = false as const;

/** Short label for UI chrome (nav, PWA). */
export const NEXUS_FREE_USE_LABEL = "Free — no in-app charges";

/** Longer copy for tooltips / metadata. */
export const NEXUS_FREE_USE_DESCRIPTION =
  "Aegis Vector is free open-source software (MIT). This app does not charge you or sell subscriptions. Optional API keys are bring-your-own; any cost is only between you and that provider — not the app.";

/** Call from the root layout so a mistaken edit to the flag fails fast at runtime. */
export function assertNexusDoesNotChargeUsers(): void {
  if (NEXUS_APP_CHARGES_END_USERS !== false) {
    throw new Error(
      "Invariant violated: NEXUS_APP_CHARGES_END_USERS must stay false — Aegis Vector must not bill end users.",
    );
  }
}

/** Appended to agent system prompts — single source for “no billing” behavior. */
export const NEXUS_AGENT_NO_BILLING_RULE =
  "PRODUCT INVARIANT: Aegis Vector is free open-source software (MIT). Never add or propose in-app billing, paywalls, subscriptions, in-app purchases, or payment processing. Optional API keys are bring-your-own; any cost is only between the user and that third party — not the app.";
