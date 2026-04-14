# Vehicle Passive Bridge Stub

This is the future-hardware-day bridge harness for Vehicle Lab.

It does **not** make Nexus flight-critical. It only posts normalized passive telemetry into the
existing local route:

- `POST /api/vehicle/telemetry`
- `GET /api/vehicle/telemetry`

The goal is simple:

1. make arrival day boring
2. prove the Nexus ingest contract before wiring real serial / MAVLink data
3. keep ArduPilot / Pixhawk as the flight authority

## When to use it

- before the drone arrives, to prove Vehicle Lab’s live-bridge lane locally
- on the first hardware day, to confirm the operator workflow and bundle export path
- while building the real MAVLink / serial bridge, as a fallback contract reference

## Start it

From the repo root:

```powershell
npm run vehicle:bridge:stub
```

Or with explicit local overrides:

```powershell
$env:NEXUS_VEHICLE_BRIDGE_ID='pixhawk-passive-bridge'
$env:NEXUS_VEHICLE_BRIDGE_LABEL='Pixhawk passive bridge'
$env:NEXUS_VEHICLE_BRIDGE_AUTHORITY='read_only'
$env:NEXUS_VEHICLE_TRANSPORT='usb_serial'
$env:NEXUS_VEHICLE_BAUD_RATE='57600'
$env:NEXUS_VEHICLE_PORT_HINT='COM7 / /dev/ttyACM0'
node scripts/vehicle-bridge-stub.mjs
```

## What it simulates

- heartbeat and mode
- GPS / heading / speed
- battery and link quality
- mission posture
- passive companion label
- periodic warning events for recovery-flow testing

## What the real bridge should later do

Replace the stub’s synthetic frame with normalized serial / MAVLink data, but keep the same
payload boundary:

```json
{
  "bridgeId": "pixhawk-passive-bridge",
  "bridgeLabel": "Pixhawk passive bridge",
  "authority": "read_only",
  "frame": {
    "timestamp": 0,
    "vehicleId": "future-f450",
    "heartbeat": {
      "online": true,
      "armed": false,
      "mode": "LOITER",
      "linkState": "online",
      "health": "nominal"
    }
  }
}
```

## Arrival-day order of operations

1. Keep props off.
2. Confirm Mission Planner / QGroundControl sees the autopilot first.
3. Match the saved port hint and baud in Vehicle Lab.
4. Start the passive bridge in `read_only`.
5. Watch the first minute without issuing commands from Nexus.
6. Export the first session bundle and file the summary into Vault.

## Safety boundary

- Nexus is an operator console only.
- Do not add arming, stabilization, or mode-change authority to this stub.
- If the bridge output disagrees with the ground station, trust the autopilot tools first and stop
  the bridge session.
