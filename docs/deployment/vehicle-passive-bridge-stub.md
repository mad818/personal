# Vehicle Passive Bridge Stub

This runbook prepares the future F450/Pixhawk arrival day without giving Nexus flight authority.

Core contract:

- Nexus does not arm, steer, or mode-switch the aircraft.
- The bridge is a local read-only observer that posts normalized telemetry into `/api/vehicle/telemetry`.
- Mission Planner or QGroundControl must prove heartbeat and sensor posture before Nexus watches the feed.
- Props stay off for first hardware-day bridge validation.
- Any bad mapping, stale link, or weird orientation sends the operator back to the native ground station first.

## Dry Run

From the repo root:

```powershell
$env:NEXUS_VEHICLE_BRIDGE_ID='pixhawk-passive-bridge'
$env:NEXUS_VEHICLE_BRIDGE_LABEL='Pixhawk passive bridge'
$env:NEXUS_VEHICLE_BRIDGE_AUTHORITY='read_only'
$env:NEXUS_VEHICLE_TRANSPORT='usb_serial'
$env:NEXUS_VEHICLE_BAUD_RATE='57600'
$env:NEXUS_VEHICLE_PORT_HINT='COM7 / /dev/ttyACM0'
node scripts/vehicle-bridge-stub.mjs
```

The default command prints the payload only. It does not touch hardware and does not call the app.

## Optional Local Post

Only after the browser session/runtime is ready:

```powershell
$env:NEXUS_RELEASE_BASE_URL='http://127.0.0.1:3100'
$env:NEXUS_TOKEN='<same local token used by the app, if auth is enabled>'
node scripts/vehicle-bridge-stub.mjs --post
```

Expected result:

- `POST /api/vehicle/telemetry` accepts one passive frame.
- Vehicle Lab switches from simulation fallback to fresh live bridge until the frame ages out.
- The UI still labels authority as passive/advisory and keeps all actions review-first.

## First Hardware Day

1. Remove props and keep them off.
2. Confirm power restraint, FC orientation, compass, RC mapping, mode switches, GPS, home point, and failsafes.
3. Confirm Mission Planner or QGroundControl sees heartbeat before Nexus.
4. Start the bridge as a read-only observer.
5. Watch the first 60 seconds without any command path from Nexus.
6. Export the session bundle and file it in Vault before changing tuning or assumptions.

## Payload Shape

The stub sends:

- `bridgeId`, `bridgeLabel`, `authority`, `transport`, `baudRate`, and `portHint`
- `safety.mode = dry_run_read_only`
- one normalized `frame` matching the Vehicle Lab telemetry contract

Rejected states:

- missing normalized telemetry frame
- non-JSON payload
- route unavailable or unauthenticated local session

This is readiness and artifact packaging only. It is not a flight controller, not a mission-command bridge, and not a substitute for native autopilot tooling.
