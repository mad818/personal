# RECON Tab — Feature Spec

**Tab ID:** `recon`  
**Label:** `🕵️ RECON`  
**CSS prefix:** `rc-`  
**Init function:** `initReconTab()`

---

## Purpose

A privacy-first OSINT toolkit built directly into Nexus Prime.  
The browser calls one protected same-origin Nexus route; the server validates the operation, selects each approved provider endpoint, and keeps optional BYOK credentials server-side.
Designed for operators who need fast, passive recon without exposing provider credentials or broad third-party browser access.

---

## Target types (auto-detected)

| Input                   | Detected as | Tools used                                      |
| ----------------------- | ----------- | ----------------------------------------------- |
| `<IP-address>`          | IP          | RDAP, IP Geo, VirusTotal, Shodan                |
| `example.com`           | Domain      | RDAP, DNS, Certs, IP Geo (resolved), VirusTotal |
| `user@email.com`        | Email       | HIBP breach check                               |
| `3a4b5c...` (32-64 hex) | Hash        | VirusTotal                                      |
| `https://...`           | URL         | VirusTotal, DNS                                 |

---

## Data sources

### Free (no key required)

| Source      | Endpoint                                  | Data                    |
| ----------- | ----------------------------------------- | ----------------------- |
| RDAP (IANA) | `rdap.org/domain/{d}`, `rdap.org/ip/{ip}` | WHOIS/registration      |
| DNS         | `dns.google/resolve?name={d}&type={t}`    | A, MX, NS, TXT records  |
| crt.sh      | `crt.sh/?q={d}&output=json`               | TLS cert transparency   |
| ipapi.co    | `ipapi.co/{ip}/json/`                     | Geo, ASN, org           |
| Tor check   | `check.torproject.org/api/ip`             | Tor exit node detection |

### BYOK

| Service              | Server setting   | What it checks                  |
| -------------------- | ---------------- | ------------------------------- |
| Have I Been Pwned v3 | `HIBP_API_KEY`   | Email breaches + pastes         |
| VirusTotal v3        | `VT_API_KEY`     | URL/IP/domain/hash malice score |
| Shodan               | `SHODAN_API_KEY` | Open ports, services, vulns     |

---

## OPSEC Panel (local JS, no network)

- **WebRTC IP Leak** — probes `RTCPeerConnection` for local/public IP exposure
- **Fingerprint Entropy** — estimates bits from UA, screen, timezone, color depth, language, platform, plugins
- **OPSEC Score** — composite 0–100 based on: WebRTC safe (30pt), low entropy (30pt), HTTPS (20pt), no leak APIs active (20pt)

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Target: [__________________________] [SCAN] [CLEAR] │
│  Type: auto-detect  ● Domain  ○ IP  ○ Email  ○ Hash │
├──────────────┬──────────────┬──────────────┬────────┤
│ RDAP/WHOIS   │ DNS Records  │ TLS Certs    │ OPSEC  │
│ (free)       │ (free)       │ crt.sh free  │ Score  │
├──────────────┴──────────────┼──────────────┤  panel │
│ IP Geo & ASN (free)         │ Shodan (BYOK)│        │
├─────────────────────────────┼──────────────┤        │
│ HIBP Breaches (BYOK)        │ VirusTotal   │        │
│                             │ (BYOK)       │        │
└─────────────────────────────┴──────────────┴────────┘
```

---

## File touch points

1. `components/recon/ReconLookup.tsx` — primary lookup orchestration and result presentation
2. `components/recon/PassiveDnsPanel.tsx` — passive DNS and reverse-IP presentation
3. `lib/reconLookupTypes.ts` / `lib/reconLookupContract.ts` — closed request types and same-origin client
4. `lib/reconLookupServer.ts` — target validation, fixed provider selection, bounded upstream execution, and safe errors
5. `app/api/recon/lookup/route.ts` — protected, rate-limited connector route

---

## Non-negotiables

- Browser code calls only `/api/recon/lookup`; provider URLs and credentials are forbidden in client components
- All client and server fetch paths use `try/catch`, response checks, fixed safe failures, and bounded upstream time/size
- Keys are read only from server environment and never logged, returned, or persisted in client state
- HIBP calls include `hibp-api-key` as a server-side header; never in a URL
- WebRTC probe cleaned up immediately after read (connection closed)
- All target input HTML-escaped before rendering
- crt.sh results deduplicated by `common_name`
