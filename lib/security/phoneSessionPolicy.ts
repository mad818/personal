export type PhoneSessionMutationPurpose =
  | "local_ai"
  | "governed_tools"
  | "acceptance_receipt";

export const PHONE_SESSION_READ_METHODS = ["GET", "HEAD", "OPTIONS"] as const;

export const PHONE_SESSION_MUTATION_EXCEPTIONS = [
  {
    pathname: "/api/ai",
    method: "POST",
    purpose: "local_ai",
  },
  {
    pathname: "/api/tools",
    method: "POST",
    purpose: "governed_tools",
  },
  {
    pathname: "/api/phone-acceptance/receipt",
    method: "POST",
    purpose: "acceptance_receipt",
  },
] as const satisfies ReadonlyArray<{
  pathname: string;
  method: string;
  purpose: PhoneSessionMutationPurpose;
}>;

export const PHONE_SESSION_LOCAL_AI_PROVIDERS = [
  "ollama",
  "turboquant",
] as const;

function normalizeMethod(method: string) {
  return method.trim().toUpperCase();
}

export function resolvePhoneSessionRequestPolicy(
  pathname: string,
  method: string,
) {
  const normalizedMethod = normalizeMethod(method);
  if (
    PHONE_SESSION_READ_METHODS.some(
      (readMethod) => readMethod === normalizedMethod,
    )
  ) {
    return {
      allowed: true,
      reason: "read_only",
      method: normalizedMethod,
    } as const;
  }

  const exception = PHONE_SESSION_MUTATION_EXCEPTIONS.find(
    (candidate) =>
      candidate.pathname === pathname && candidate.method === normalizedMethod,
  );
  if (exception) {
    return {
      allowed: true,
      reason: "explicit_exception",
      method: normalizedMethod,
      purpose: exception.purpose,
    } as const;
  }

  return {
    allowed: false,
    reason: "mutation_blocked",
    method: normalizedMethod,
  } as const;
}

export function resolvePhoneSessionAiPolicy(
  authTier: "master" | "phone" | null | undefined,
  explicitProvider?: string | null,
) {
  const phoneSession = authTier === "phone";
  const provider = explicitProvider?.trim().toLowerCase() || null;
  const explicitProviderAllowed =
    !phoneSession ||
    !provider ||
    PHONE_SESSION_LOCAL_AI_PROVIDERS.some(
      (localProvider) => localProvider === provider,
    );

  return {
    phoneSession,
    localOnly: phoneSession,
    provider,
    explicitProviderAllowed,
  } as const;
}
