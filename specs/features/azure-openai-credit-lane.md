# Azure OpenAI Credit Lane

## Outcome

Add Microsoft Foundry / Azure OpenAI as an explicit advanced Nexus AI provider so eligible Azure credit can fund demanding research, reasoning, and tool-assisted operator work without replacing the free/local Ollama default.

## Surface

- Existing `/api/ai` server proxy
- Existing Settings provider posture and preferred-provider field
- Existing provider health, status, and diagnostics payloads
- Existing `callAI()` / `streamAIWithThinking()` and Nexus agent paths

No new route, tab, direct browser-to-Azure request, or phone workflow is added.

## Server configuration

Nexus reads the following values from the ignored server-side `.env.local` file:

- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- existing explicit opt-in: `NEXUS_ALLOW_PAID_APIS=true`

The endpoint must use HTTPS, contain no credentials, query, or fragment, and use an Azure OpenAI host ending in `.openai.azure.com` or `.services.ai.azure.com`. Nexus normalizes the configured OpenAI v1 base URL to the Chat Completions endpoint.

## Dispatch contract

1. Azure remains an advanced, paid-compatible BYOK lane.
2. Ollama remains the default provider.
3. Selecting `azure` routes browser requests only to the existing protected `/api/ai` route.
4. The server authenticates with the `api-key` header and never returns the key.
5. The configured deployment name is always used as `model`; client model overrides cannot redirect Azure calls to another deployment.
6. Existing token caps, rate limits, Privacy Shield, protected-route policy, and local fallback behavior remain active.
7. Azure can participate in the existing OpenAI-compatible tool loop for the Nexus agent.
8. Phone-token sessions remain local-only and continue to reject every cloud provider, including Azure.

## Failure behavior

- Missing key, endpoint, or deployment: Azure reports unconfigured and is skipped.
- Invalid endpoint: Azure reports unconfigured and no outbound call occurs.
- Azure rejection, timeout, or unavailable deployment: the existing provider error/fallback path handles the failure without exposing response credentials.
- Paid APIs disabled or network isolated: the existing provider policy blocks Azure.

## Benefits

- Converts eligible Azure credit into useful Nexus inference instead of adding unrelated infrastructure.
- Gives demanding research and reasoning tasks an operator-selected high-capability lane.
- Preserves local-first privacy and cost posture because Azure is not the default.
- Keeps secrets server-side and limits Azure calls to the configured resource and deployment.
- Reuses the existing provider, streaming, privacy, health, and agent contracts instead of creating a second AI subsystem.

## Exclusions

- No Azure subscription or resource creation.
- No credit-eligibility, remaining-balance, or hard-spend-stop claim.
- No Provisioned Throughput, fine-tuning, hosted agent, Azure AI Search, storage, or deployment automation.
- No Microsoft Entra credential flow in this tranche; the configured API key is used.
- No direct provider call outside `/api/ai`.
- No secret logging, browser persistence, committed credential, phone/PWA change, or game/RPG work.

## Acceptance

- Azure endpoint normalization accepts both supported Azure host families and rejects unsafe/non-Azure URLs.
- Provider configuration is ready only when key, endpoint, and deployment are all valid.
- `azure` is a normalized advanced provider option and uses the configured deployment.
- Settings, health, status, and diagnostics expose booleans/metadata only.
- Focused validation performs no Azure network call and contains no credential value.
- `npx tsc --noEmit` passes.

## Primary references

- https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure
- https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/completions
