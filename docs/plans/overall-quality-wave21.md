# Overall Quality — Wave 21

Status: complete  
Date: 2026-06-20

**Goal:** Daily-use improvements — faster/safer intel loading, leaner agent prompts, and visible platform posture on HQ.

## Pillars

| Pillar | Wave 21 slice | Why |
|--------|---------------|-----|
| News security | Guardian via `/api/news` server proxy | Key no longer exposed in browser network tab |
| Prompt efficiency | Compact live context for short queries (≤10 words) | Skips news block; smaller system prompts |
| Repo intel | `correction_hints` on `compare_repos` | Parity with assimilate_repo P1.3 |
| HQ UX | `AgentPlatformStrip` on HQ terminal | BYOK lane posture at point of use |

## Proof

`npm run nexus:complete:check` chains wave21 → wave20 → …
