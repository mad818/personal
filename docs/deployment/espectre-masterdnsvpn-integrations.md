# ESPectre And MasterDnsVPN Integrations

These integrations keep both upstream runtimes external to Nexus. Nexus provides a protected local control and readiness plane; it does not install, launch, or silently operate either runtime.

## ESPectre

ESPectre is a GPL-3.0 ESP32 WiFi CSI motion-sensing runtime. Keep its firmware, ESPHome component, MicroPython tools, MQTT broker, and Home Assistant setup outside this MIT repository.

### Nexus behavior

- `/iot` includes the existing sensor desk plus an ESPectre WiFi-sensing viewer.
- Protected `GET /api/espectre` returns sanitized multi-sensor posture.
- Protected `POST /api/espectre` accepts normalized telemetry with `action: "ingest"`.
- Threshold, detector, traffic, hit-filter, filter, consent, and calibration actions create review-required command envelopes.
- An operator-managed bridge can poll `GET /api/espectre?commandsFor=<sensorId>`, apply reviewed commands, and remove each completed command with `POST /api/espectre` using `action: "acknowledge"`, `sensorId`, and `commandId`.
- Nexus stores and displays no raw CSI frames, communications, images, audio, or identity data.
- The built-in simulated sensor keeps the viewer usable before hardware is connected.

### External bridge contract

An operator-managed ESPHome, Home Assistant, MQTT, or small local bridge may send normalized JSON to Nexus using the same `NEXUS_TOKEN` protection as other private APIs:

```json
{
  "action": "ingest",
  "telemetry": {
    "sensorId": "espectre-living-room",
    "name": "Living room motion",
    "zone": "Living room",
    "motionState": "idle",
    "movementScore": 18.4,
    "threshold": 42,
    "detector": "mvs",
    "trafficMode": "ping",
    "transport": "mqtt",
    "motionOnHits": 3,
    "motionOffHits": 5,
    "calibrated": true,
    "consentConfirmed": true,
    "nbviEnabled": true,
    "hampelEnabled": true,
    "lowPassEnabled": false,
    "gainLocked": true,
    "fftLocked": true,
    "simulated": false,
    "lastSeenAt": "2026-06-13T00:00:00.000Z"
  }
}
```

Everyone who can be sensed in a zone must consent. Treat ESPectre as generic motion/presence sensing, not vision, person identification, people counting, vital-sign monitoring, or guaranteed through-wall detection.

## MasterDnsVPN

MasterDnsVPN is an external DNS-tunneling transport. It is not a normal privacy VPN and does not hide your IP, provide anonymity, or unlock public links inside Nexus.

Nexus does not create a DNS tunnel, configure DNS delegation, contact resolvers, contact an exit server, disguise traffic, start a client, or run a server. The protected readiness route only validates sanitized environment posture and probes an already-running loopback client listener.

### Optional readiness configuration

All settings remain disabled by default:

```dotenv
NEXUS_MASTERDNSVPN_AUTHORIZED=false
NEXUS_MASTERDNSVPN_DELEGATED_DOMAIN_CONFIGURED=false
NEXUS_MASTERDNSVPN_RESOLVER_COUNT=0
NEXUS_MASTERDNSVPN_ENCRYPTION=chacha20
NEXUS_MASTERDNSVPN_PROXY_HOST=127.0.0.1
NEXUS_MASTERDNSVPN_PROXY_PORT=1080
NEXUS_MASTERDNSVPN_LOCAL_DNS_ENABLED=false
NEXUS_MASTERDNSVPN_CACHE_ENABLED=false
NEXUS_MASTERDNSVPN_COMPRESSION_ENABLED=false
NEXUS_MASTERDNSVPN_REQUEST_PACKING_ENABLED=false
NEXUS_MASTERDNSVPN_EXTERNAL_SOCKS_CONFIGURED=false
```

Only `127.0.0.1`, `localhost`, or `::1` listeners are accepted. AES or ChaCha20 is required; XOR is rejected. The readiness endpoint returns no key, domain, resolver address, server address, or public IP.

Keep Tailscale as the primary private-access layer. Use an authorized OS VPN, Tailscale exit node, or legal proxy as the explicit public-link privacy route.
