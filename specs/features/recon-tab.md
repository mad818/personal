# RECON Tab — Feature Spec

**Tab ID:** `recon`  
**Label:** `🕵️ RECON`  
**CSS prefix:** `rc-`  
**Init function:** `initReconTab()`  

---

## Purpose

A privacy-first OSINT toolkit built directly into Nexus Prime.  
All tools run from the browser — no intermediary server. BYOK for paid APIs.  
Designed for operators who need fast, passive recon without leaving a footprint.

---

## Target types (auto-detected)

| Input | Detected as | Tools used |
|-------|-------------|-----------|
| `192.168.1.1` | IP | RDAP, IP Geo, VirusTotal, Shodan |
| `example.com` | Domain | RDAP, DNS, Certs, IP Geo (resolved), VirusTotal |
| `user@email.com` | Email | HIBP breach check |
| `3a4b5c...` (32-64 hex) | Hash | VirusTotal |
| `https://...` | URL | VirusTotal, DNS |

---

## Data sources

### Free (no key required)
| Source | Endpoint | Data |
|--------|----------|------|
| RDAP (IANA) | `rdap.org/domain/{d}`, `rdap.org/ip/{ip}` | WHOIS/registration |
| DNS | `dns.google/resolve?name={d}&type={t}` | A, MX, NS, TXT records |
| crt.sh | `crt.sh/?q={d}&output=json` | TLS cert transparency |
| ipapi.co | `ipapi.co/{ip}/json/` | Geo, ASN, org |
| Tor check | `check.torproject.org/api/ip` | Tor exit node detection |

### BYOK
| Service | Key setting | What it checks |
|---------|-------------|----------------|
| Have I Been Pwned v3 | `hibpKey` | Email breaches + pastes |
| VirusTotal v3 | `vtKey` | URL/IP/domain/hash malice score |
| Shodan | `shodanKey` | Open ports, services, vulns |

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

1. `nexus-final.html` — nav button, HTML panel, CSS, JS init + all lookup fns, switchTab, DEFAULT_CFG, settings panel, loadSettings, saveSettings
2. `tasks/todo.md` — add completed items
3. `CLAUDE.md` — update tab map

---

## Non-negotiables

- All fetch calls wrapped in `try/catch` — silent failure, show "—" on error
- Keys never logged to console
- HIBP calls include `hibp-api-key` header; never in URL
- WebRTC probe cleaned up immediately after read (connection closed)
- All target input HTML-escaped before rendering
- crt.sh results deduplicated by `common_name`
