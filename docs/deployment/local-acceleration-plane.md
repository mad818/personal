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
runtime only for explicitly confirmed proof and benchmark commands.

## Topology

```text
MacBook or desktop Nexus
  -> protected /api/local-acceleration
     -> loopback companion bridge
        -> TurboVec Python package + local Ollama or private hash embeddings
        -> separately installed TurboQuant proof and benchmark commands
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
| POST | `/turboquant/proof` | Upstream A/B proof |
| POST | `/turboquant/benchmark` | Approved local benchmark |

TurboQuant inference uses its normal OpenAI-compatible vLLM endpoint separately.

## Start The Companion Bridge

The bridge requires Python. It uses a tested standard-library HTTP backend when
FastAPI and Uvicorn are absent, and automatically discovers the repo-local
virtual environment, `.venv`, or the bundled Codex Python runtime. TurboVec is
optional: the default `auto` vector backend uses TurboVec when installed and a
dependency-free exact-search local fallback otherwise.

```powershell
python -m venv .nexus\local-acceleration-venv
.\.nexus\local-acceleration-venv\Scripts\Activate.ps1
python -m pip install turbovec
npm run local:acceleration:service
```

On macOS, activate the environment with:

```bash
source .nexus/local-acceleration-venv/bin/activate
npm run local:acceleration:service
```

### Install A Reviewed Local TurboVec Wheel

When package registries are unavailable, place a reviewed TurboVec wheel on the
machine and run the explicit local-only installer:

```powershell
npm run local:acceleration:turbovec:install -- --wheel "C:\reviewed\turbovec.whl" --sha256 "<exact-wheel-sha256>" --confirmation INSTALL_VERIFIED_TURBOVEC_LOCAL_WHEEL
```

The command verifies a regular non-symlink `turbovec*.whl`, requires its exact
SHA-256 and confirmation phrase, creates the ignored private environment under
`.nexus/local-acceleration-venv`, and installs with `pip --no-index --no-deps`.
It never downloads a wheel or dependencies. Run optional upstream-runtime
readiness acceptance after installation.

The bridge:

- refuses non-loopback bind hosts;
- sends embeddings only to a loopback Ollama endpoint and falls back to
  deterministic private hash embeddings in the default `auto` mode;
- keeps VAULT semantic retrieval operational with a clearly reported
  dependency-free exact-search fallback when TurboVec is unavailable;
- stores the private rebuild ledger and optional TurboVec binary index under
  ignored `.nexus/local-acceleration/`;
- maps Nexus string IDs to collision-checked unsigned 64-bit TurboVec IDs and
  sends filtered candidate IDs into TurboVec's native allowlist search;
- permits concurrent searches while serializing index mutations;
- returns IDs, scores, metadata, counts, timing, and command-output hashes, but
  never returns embeddings, document text, or captured command output;
- never installs packages, downloads models, launches vLLM, or uses a shell
  command runner.

For higher-quality embeddings, start Ollama and make the configured embedding
model available before enabling TurboVec. The default model is
`nomic-embed-text`. Set `NEXUS_LOCAL_ACCELERATION_EMBED_MODE=ollama` to require
that model, or `hash` to stay dependency-free and fully offline.

## Configure

Add only the runtimes you have started to `.env.local`:

```dotenv
NEXUS_TURBOVEC_ENABLED=true
NEXUS_TURBOVEC_ENDPOINT=http://127.0.0.1:5052
NEXUS_TURBOVEC_BIT_WIDTH=4
NEXUS_LOCAL_ACCELERATION_EMBED_MODE=auto
NEXUS_LOCAL_ACCELERATION_VECTOR_BACKEND=auto

NEXUS_TURBOQUANT_ENABLED=true
NEXUS_TURBOQUANT_ENDPOINT=http://127.0.0.1:5052
NEXUS_TURBOQUANT_OPENAI_ENDPOINT=http://127.0.0.1:8000/v1/chat/completions
NEXUS_TURBOQUANT_MODEL=your-local-vllm-model
NEXUS_TURBOQUANT_MODE=hybrid
NEXUS_TURBOQUANT_KEY_BITS=3
NEXUS_TURBOQUANT_VALUE_BITS=4
```

Use `capture_only` while validating a TurboQuant model without changing the
serving path. Use `hybrid` only after the reviewed checkout, proof, benchmark,
and serving results are accepted. Keep `valueBits=4` for quality-sensitive
work.

TurboQuant serving remains the responsibility of the separately installed
upstream runtime. The bridge does not start or supervise vLLM.

Audit a reviewed local TurboQuant checkout before enabling execution:

```powershell
git -C "D:\reviewed\turboquant" checkout --detach 7ac9b8d165a3f7d5e6df33b0450bc1f88ec0d4d5
npm run local:acceleration:turboquant:audit -- --root "D:\reviewed\turboquant"
```

The audit executes no source code. It requires the exact reviewed Git commit, a
clean worktree with no modified, untracked, or ignored files, and the actual
upstream package modules, `proof.py`, `benchmark.py`, `setup.py`, README, and
GPL-3 license surfaces as regular non-symlink files/directories before the
acceptance runner recognizes the checkout.

The reviewed commit's README advertises `validate_paper.py`, `audit_claims.py`,
`test_modular.py`, `test_turboquant.py`, and several profiling scripts that are
not present in that commit. Nexus records that upstream documentation/source
mismatch and does not expose command labels for files that do not exist.

## Reviewed TurboQuant Commands

Proof and benchmark controls are double-gated. Set these in the shell that
starts the companion bridge only after reviewing the separate TurboQuant
checkout:

```powershell
$env:NEXUS_TURBOQUANT_ROOT="D:\reviewed\turboquant"
$env:NEXUS_LOCAL_ACCELERATION_ALLOW_EXEC="true"
npm run local:acceleration:service
```

Each protected Nexus request must also contain:

```json
{
  "operation": "turboquant.proof",
  "confirmation": "RUN_TURBOQUANT_LOCAL_COMMAND"
}
```

The bridge runs only the fixed upstream `proof.py` and `benchmark.py` commands
with `shell=False`, a bounded timeout, and the configured runtime root as its
working directory. It returns the result code, duration, byte count, and
SHA-256 digest instead of command output.

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

The repository proof includes the dependency-free live companion-service
check, Python launcher discovery, protected runtime fixtures, completion
scoring, and artifact-publication safety.

Run the sanitized Nexus integration and optional upstream-readiness report:

```powershell
npm run local:acceleration:acceptance
```

This writes `docs/metrics/local-acceleration-acceptance.json` without hostnames,
paths, model names, command output, documents, embeddings, or secrets. It
reports separate completion percentages for Nexus-owned implementation,
offline operational lifecycle, aligned Nexus integration acceptance, optional
upstream-runtime readiness, and upstream source capability parity. Unavailable
optional runtimes never block Nexus integration completion and never appear
live.

After checking out the reviewed TurboQuant commit and enabling command
execution, run its actual proof and benchmark scripts plus serving-endpoint
acceptance with:

```powershell
node --no-warnings --experimental-strip-types scripts/local-acceleration-acceptance.mjs --static-verified --write --execute-turboquant
```

Use the required Nexus integration completion gate:

```powershell
npm run local:acceleration:acceptance:require-complete
```

This gate requires complete useful Nexus adaptation, source parity, protected
static checks, and the full offline fallback lifecycle. It does not require
installing or reproducing either optional upstream project.

Operators who install both upstream runtimes can invoke the separate strict
readiness gate:

```powershell
npm run local:acceleration:acceptance:require-upstream-runtime
```

Optional upstream readiness verifies health, a temporary real-TurboVec
ingest/search fixture, native allowlist filtering, prepare, persistence,
reload, rebuild, and cleanup. TurboQuant readiness additionally requires the
exact reviewed source checkout, successful upstream proof and benchmark
scripts, and an available OpenAI-compatible serving endpoint.
