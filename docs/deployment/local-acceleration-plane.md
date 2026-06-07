# Local Acceleration Plane

The local acceleration plane connects Nexus to two optional runtimes:

- [TurboVec](https://github.com/RyanCodrai/turbovec) for compressed local
  semantic retrieval.
- [TurboQuant](https://github.com/0xSero/turboquant) for compressed KV-cache
  local inference through vLLM.

Neither runtime is installed, downloaded, launched, or exposed publicly by
Nexus. Both are free/local and disabled by default.

Nexus includes `scripts/local-acceleration-service.py`, a loopback-only
companion bridge that implements the control contract below. The bridge does
not vendor either upstream project. It imports TurboVec only when its MIT
Python package is installed, and reaches a separately installed TurboQuant GPL
runtime only for explicitly confirmed validation commands.

## Topology

```text
MacBook or desktop Nexus
  -> protected /api/local-acceleration
     -> loopback companion bridge
        -> TurboVec Python package + Ollama embeddings
        -> separately installed TurboQuant validation commands
  -> protected /api/ai
     -> TurboQuant OpenAI-compatible vLLM endpoint

iPad
  -> Tailscale
  -> Nexus on the MacBook or desktop
  -> host-local acceleration runtimes
```

The iPad never connects directly to either acceleration runtime. Nexus remains
the authentication, policy, privacy, and rate-limit boundary.

## Endpoint Contract

The companion bridge serves both control namespaces from one loopback port.
TurboVec control service:

| Method | Path | Purpose |
|---|---|---|
| GET | `/turbovec/health` | Engine availability |
| GET | `/turbovec/stats` | Vector count, bit width, compression, latency |
| POST | `/turbovec/upsert` | Online stable-ID document ingest |
| POST | `/turbovec/search` | Semantic or allowlist-filtered search |
| POST | `/turbovec/remove` | Stable-ID deletion |
| POST | `/turbovec/prepare` | Warm rotation/codebook/SIMD caches |
| POST | `/turbovec/persist` | Write the local index |
| POST | `/turbovec/reload` | Reload the local index |
| POST | `/turbovec/rebuild` | Rebuild from the service's local document ledger |

TurboQuant control service:

| Method | Path | Purpose |
|---|---|---|
| GET | `/turboquant/health` | Runtime availability |
| GET | `/turboquant/stats` | Sanitized KV, throughput, latency, quality posture |
| GET | `/turboquant/capabilities` | Dense/MoE/model/GPU support |
| GET | `/turboquant/limitations` | Honest upstream limitations |
| POST | `/turboquant/validate` | Paper theorem validation |
| POST | `/turboquant/audit` | Adversarial claim audit |
| POST | `/turboquant/test` | Modular/core test suite |
| POST | `/turboquant/benchmark` | Approved local benchmark |

TurboQuant inference uses its normal OpenAI-compatible vLLM endpoint separately.

## Start The Companion Bridge

The bridge requires Python, FastAPI, and Uvicorn. TurboVec is optional until
semantic indexing is enabled.

```powershell
python -m venv .nexus\local-acceleration-venv
.\.nexus\local-acceleration-venv\Scripts\Activate.ps1
python -m pip install fastapi uvicorn turbovec
npm run local:acceleration:service
```

On macOS, activate the environment with:

```bash
source .nexus/local-acceleration-venv/bin/activate
npm run local:acceleration:service
```

The bridge:

- refuses non-loopback bind hosts;
- sends embeddings only to a loopback Ollama endpoint;
- stores the private rebuild ledger and optional TurboVec binary index under
  ignored `.nexus/local-acceleration/`;
- maps Nexus string IDs to collision-checked unsigned 64-bit TurboVec IDs and
  sends filtered candidate IDs into TurboVec's native allowlist search;
- permits concurrent searches while serializing index mutations;
- returns IDs, scores, metadata, counts, timing, and command-output hashes, but
  never returns embeddings, document text, or captured command output;
- never installs packages, downloads models, launches vLLM, or uses a shell
  command runner.

Start Ollama and make the configured embedding model available before enabling
TurboVec. The default is `nomic-embed-text`.

## Configure

Add only the runtimes you have started to `.env.local`:

```dotenv
NEXUS_TURBOVEC_ENABLED=true
NEXUS_TURBOVEC_ENDPOINT=http://127.0.0.1:5052
NEXUS_TURBOVEC_BIT_WIDTH=4

NEXUS_TURBOQUANT_ENABLED=true
NEXUS_TURBOQUANT_ENDPOINT=http://127.0.0.1:5052
NEXUS_TURBOQUANT_OPENAI_ENDPOINT=http://127.0.0.1:8000/v1/chat/completions
NEXUS_TURBOQUANT_MODEL=your-local-vllm-model
NEXUS_TURBOQUANT_MODE=hybrid
NEXUS_TURBOQUANT_KEY_BITS=3
NEXUS_TURBOQUANT_VALUE_BITS=4
```

Use `capture_only` while validating a TurboQuant model without changing the
serving path. Use `hybrid` only after validation, audit, tests, and benchmark
results are accepted. Keep `valueBits=4` for quality-sensitive work.

TurboQuant serving remains the responsibility of the separately installed
upstream runtime. The bridge does not start or supervise vLLM.

## Reviewed TurboQuant Commands

Validation, audit, tests, and benchmark controls are double-gated. Set these in
the shell that starts the companion bridge only after reviewing the separate
TurboQuant checkout:

```powershell
$env:NEXUS_TURBOQUANT_ROOT="D:\reviewed\turboquant"
$env:NEXUS_LOCAL_ACCELERATION_ALLOW_EXEC="true"
npm run local:acceleration:service
```

Each protected Nexus request must also contain:

```json
{
  "operation": "turboquant.validate",
  "confirmation": "RUN_TURBOQUANT_LOCAL_COMMAND"
}
```

The bridge runs only fixed, reviewed commands with `shell=False`, a bounded
timeout, and the configured runtime root as its working directory. It returns
the result code, duration, byte count, and SHA-256 digest instead of command
output. Benchmark defaults to upstream `proof.py`; override only with a
reviewed relative `.py` path through `NEXUS_TURBOQUANT_BENCHMARK_SCRIPT`.

## Tailscale

Keep runtimes on loopback whenever Nexus and the runtime share a machine. If a
MacBook-hosted Nexus must reach a desktop GPU runtime over Tailscale:

```dotenv
NEXUS_LOCAL_ACCELERATION_ALLOW_TAILNET=true
NEXUS_TURBOQUANT_ENDPOINT=https://desktop-name.tailnet-name.ts.net
NEXUS_TURBOQUANT_OPENAI_ENDPOINT=https://desktop-name.tailnet-name.ts.net/v1/chat/completions
```

Only `.ts.net` hosts are accepted by this opt-in. Do not expose either runtime
through a public tunnel.

Prefer running Nexus and the companion bridge on the always-on MacBook. When
the desktop GPU is needed, keep the TurboQuant control bridge and vLLM on the
desktop and reach them through a reviewed Tailscale Serve mapping. The iPad
still connects only to Nexus.

## Operations

Check the protected status:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/local-acceleration
```

Run repository proof:

```powershell
npm run local:acceleration:check
npm run source:parity:check
```

Real-runtime acceptance remains separate: start each upstream runtime, verify
health/stats, ingest and search a fixture, persist/reload it, then run
TurboQuant validation, audit, tests, and an approved GPU benchmark.
