# Ollama + Hugging Face — local stack for Nexus

Nexus Prime uses **Ollama** as the local inference layer. Hugging Face models reach Nexus **through Ollama**, not through the optional `HUGGINGFACE_API_KEY` BYOK lane.

## Baseline secure profile

```env
NEXUS_NETWORK_MODE=isolated
NEXUS_ALLOW_PAID_APIS=false
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_LOCAL_INFERENCE_STRICT=true
```

In the app: **Settings → Preferred AI lane → ollama**, **AI mode → local**.

## Install Ollama

1. Install [Ollama](https://ollama.com) for your OS.
2. Start the daemon:

```bash
ollama serve
```

Default API: `http://localhost:11434`

## Pull models (Ollama library)

Many library models are HF-derived builds:

```bash
ollama pull qwen3:8b
ollama pull qwen2.5-coder:14b
ollama pull nomic-embed-text
ollama pull gemma3:12b
```

List installed tags:

```bash
ollama list
```

## Hugging Face → Ollama (custom)

For a specific HF repo, create a Modelfile:

```dockerfile
FROM hf.co/unsloth/Qwen3-8B-GGUF:Q4_K_M
```

```bash
ollama create my-qwen3 -f Modelfile
ollama run my-qwen3
```

Use the **exact tag** from `ollama list` in Settings → Local Model Name.

No `HUGGINGFACE_API_KEY` is required for this path. Nexus `huggingface_inspect` only reads **public metadata** for research — it does not download weights.

## Map models to Nexus tasks

Edit [`lib/aiModelRouting.ts`](../../lib/aiModelRouting.ts) `TASK_MODELS` to match your installed tags:

| Task | Default tag | Use |
|------|-------------|-----|
| chat / fast | `qwen3:8b` | General assistant |
| code | `qwen2.5-coder:14b` | Agent tool loop |
| vision | `gemma3:12b` | Multimodal |
| reasoning | `deepseek-r1:14b` | Heavy reasoning |
| embed | `nomic-embed-text` | Memory / RAG |

Nexus resolves missing tags via [`lib/ollamaModelResolver.ts`](../../lib/ollamaModelResolver.ts) (active runtime → configured → task match → newest installed).

## Settings

1. **Local LLM Endpoint:** `http://localhost:11434/v1/chat/completions`
2. **Local Model Name:** tag from `ollama list`
3. **Refresh from Ollama** (Settings drawer) — loads `/api/ollama/catalog`

## Proof

```bash
npm run offline:local:check
npm run local-inference:check
npm run ollama:stack:check
```

In HQ/COMMAND: **Check local AI** or Free Local Readiness panel → `ready`, Ollama reachable, paid APIs blocked.

## ~12 GB VRAM notes

- 7B–8B at Q8 or Q4: best daily driver
- 14B at Q4: reasoning/code when it fits
- Keep `nomic-embed-text` for embeddings (small footprint)

See also: [`phone-access-free-local.md`](./phone-access-free-local.md), [`desktop-secured-runbook.md`](./desktop-secured-runbook.md).
