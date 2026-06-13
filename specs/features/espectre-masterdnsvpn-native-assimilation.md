# ESPECTRE-MASTERDNSVPN-NATIVE-ASSIMILATION

## Goal

Assimilate the useful capabilities of ESPectre and MasterDnsVPN into the existing Nexus IoT and legal privacy-route surfaces without vendoring upstream runtimes, weakening security, or making false privacy claims.

## ESPectre Scope

- Extend the existing IoT sensor desk into a WiFi-sensing viewer for authenticated ESPectre telemetry.
- Accept normalized multi-sensor motion state, movement score, threshold, detector, filter, traffic, transport, and calibration posture.
- Support operator-reviewed threshold, detector, filtering, traffic, hit-filter, and recalibration command envelopes.
- Keep a simulated sensor available until real ESP32/ESPHome/MQTT hardware is connected.
- Require an explicit consent declaration before a sensor is considered ready.
- Describe the capability as radio-channel motion/presence sensing, not vision, identity, people counting, vital signs, or guaranteed through-wall detection.
- Keep GPL ESPectre runtime code external to the MIT Nexus repository.

## MasterDnsVPN Scope

- Add a protected local readiness endpoint for an externally managed MasterDnsVPN client.
- Validate only sanitized configuration posture: authorization, delegated domain, resolver count, strong encryption, loopback proxy host/port, local DNS/cache posture, and optional external SOCKS posture.
- Probe only the configured loopback SOCKS/TCP listener.
- Surface readiness inside the existing legal IP-privacy guard.
- Keep Tailscale/VPN/legal proxy as the supported public-link privacy routes.

## Guardrails

- Do not bundle, install, download, configure, launch, or control either upstream runtime.
- Do not create a DNS tunnel, censorship-bypass workflow, traffic-disguise workflow, relay, exit server, open proxy, or public endpoint.
- Do not accept XOR as an approved encryption mode.
- Do not probe public resolvers, external servers, delegated domains, public IPs, or arbitrary hosts.
- Do not claim MasterDnsVPN hides an IP or provides anonymity.
- Do not expose raw CSI frames, communications, credentials, encryption keys, resolver addresses, or private telemetry outside protected local routes.
- Do not add paid services, cloud requirements, new top-level tabs, or RPG work.

## Acceptance

- `lib/espectre.ts` normalizes telemetry, computes consent-aware readiness, and builds bounded control envelopes.
- Protected `/api/espectre` exposes a simulated/read-only snapshot plus authenticated telemetry ingestion and bounded command-envelope creation.
- `components/iot/EspectreWifiViewer.tsx` is mounted inside the existing IoT sensor desk.
- `lib/masterDnsVpn.ts` rejects unsafe hosts, weak encryption, missing authorization, and incomplete server/domain posture.
- Protected `/api/masterdnsvpn/readiness` probes loopback only and returns sanitized readiness.
- `components/resources/MasterDnsVpnReadinessPanel.tsx` is mounted inside the existing secure-link/IP-privacy surface.
- Source parity matrices exhaustively account for useful capabilities and exclusions.
- `npm run network:source-integrations:check`, `npm run type-check`, and `npm run verify` pass.
