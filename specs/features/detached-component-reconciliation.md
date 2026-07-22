# Detached Component Reconciliation

## Problem

The first active-component reachability pass proved that 26 non-RPG component files were unreachable from every `app/` root. They were temporarily retained because current validators, feature contracts, or source-parity records still cited them. That evidence is not enough to call a user-facing capability shipped: useful UI must be reachable, while obsolete or duplicate source should leave active maintenance.

## Disposition inventory

| Component                                                    | Disposition | Current seam or replacement                                                                                                           |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `components/alpha/TradeThesisPanel.tsx`                      | Restore     | Open from each live Momentum Scanner result.                                                                                          |
| `components/command/NetworkTopologyPanel.tsx`                | Restore     | Render inside the existing Network Health disclosure using its live targets/results.                                                  |
| `components/intel/ForecastLabReadinessPanel.tsx`             | Restore     | Place in a collapsed INTEL research lane with explicit unknown/error posture.                                                         |
| `components/intel/PapersResearchPanel.tsx`                   | Restore     | Place in the same INTEL research lane with retained results on lookup failure.                                                        |
| `components/ui/AgentPlatformReadinessBadges.tsx`             | Restore     | Shared by the restored forecast-readiness panel; null means unknown, never off.                                                       |
| `components/recon/GeocodingPlaygroundCard.tsx`               | Restore     | Place in the existing RECON OSINT workplane with bounded input and truthful failures.                                                 |
| `components/command/McpBridgeStatusCard.tsx`                 | Retire      | `TrustOperationsRail` already exposes external-tool and MCP bridge posture.                                                           |
| `components/command/OvernightMissionCard.tsx`                | Retire      | `OperatorReadinessLane` already summarizes scheduled-job readiness and review.                                                        |
| `components/command/PrivacyShieldReceiptCard.tsx`            | Retire      | `PrivacyShieldPreviewPanel` and `TrustOperationsRail` expose current shield state.                                                    |
| `components/command/SecurityPostureStrip.tsx`                | Retire      | `TrustOperationsRail` owns session, network, isolation, external-tool, and privacy posture.                                           |
| `components/cyber/CyberGovernanceCards.tsx`                  | Retire      | CYBER triage already exposes governed workflow posture and active AI-exposure review; detached textarea notes were not durable.       |
| `components/home/HomeAmbient.tsx`                            | Retire      | Old HomeChat-only market decoration; current HQ owns its live command context.                                                        |
| `components/home/HomeChat.tsx`                               | Retire      | Duplicated the current `OfficeCommandCenter` assistant shell and its safer receipts/workflows.                                        |
| `components/home/office/AgentPlatformStrip.tsx`              | Retire      | Readiness remains available in the focused INTEL lane instead of another HQ strip.                                                    |
| `components/home/office/CorrectionMemoryProvenanceStrip.tsx` | Retire      | Current HQ run receipts and COMMAND Memory Spine expose applied/approved correction posture.                                          |
| `components/home/office/MementoCycleStrip.tsx`               | Retire      | Current HQ terminal already stages lesson and correction approval directly.                                                           |
| `components/home/office/animations.css`                      | Retire      | Exact legacy keyframes already live in the reachable office configuration.                                                            |
| `components/ops/OpsDensityAlertStrip.tsx`                    | Retire      | Reachable `OpsMap` owns the live density layer.                                                                                       |
| `components/ops/OpsDualViewPanel.tsx`                        | Retire      | Reachable `OpsMap` owns live heading/speed evidence; the detached synthetic dual view is not shipped parity.                          |
| `components/recon/RepoAssimilationQueueCard.tsx`             | Retire      | Reachable `RepoIntelPanel` and VAULT compiled pages already own assimilation history and compare handoffs.                            |
| `components/system/HealthMonitor.tsx`                        | Retire      | Superseded floating chrome; operational lights and trust posture are the current shell contract.                                      |
| `components/ui/AgentStatusBar.tsx`                           | Retire      | Superseded decorative floating chrome.                                                                                                |
| `components/ui/EvolutionImproverActions.tsx`                 | Retire      | Detached localStorage decisions were never reachable; operator-gate parity returns to pending while runtime comparisons stay adapted. |
| `components/ui/SystemStatusFooter.tsx`                       | Retire      | Superseded floating chrome; remove its orphan refresh event bridge too.                                                               |
| `components/ui/TelemetryHUD.tsx`                             | Retire      | Superseded polling ticker; active route modules and operational lights own truthful status.                                           |
| `components/vault/VaultSearch.tsx`                           | Retire      | `SavedArticles` already provides live search, tag filtering, and sorting.                                                             |

## Contract

- The application-root reachability gate tolerates zero reviewed-detached non-RPG components.
- Restored UI must be reachable through an existing route seam and preserve loading, unavailable, retained, and retry posture where network reads are involved.
- Retired component-only helpers and validators leave active source; current source-parity records must cite reachable replacements or explicitly return an unshipped capability to `pending`.
- The focused reconciliation gate must prove every restore path, every retirement, the zero-detached inventory, and the current replacement surfaces.

## Boundaries

- No new route, provider, runtime dependency, external write, or expensive default.
- No phone/PWA implementation and no RPG implementation.
- No mass restoration of cards into always-visible dashboard clutter.
- Historical dated plans remain historical; only current validators, source parity, and authority records are corrected.

## Benefits

- Shipped UI claims point to reachable product behavior rather than file existence.
- Useful tools regain deliberate entry points without widening the top-level navigation.
- Duplicate polling, obsolete floating chrome, and dead support code stop consuming maintenance and verification attention.
- Future detached components fail immediately instead of accumulating behind a permanent allowlist.
