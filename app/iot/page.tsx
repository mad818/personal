// ── iot/page ────────────────────────────────────────────────
// IoT tab: sensor dashboard, device registry, automation rules, MQTT status.

"use client";
// Device management, sensor networks, and home automation

import MQTTStatus from "@/components/iot/MQTTStatus";
import SensorDashboard from "@/components/iot/SensorDashboard";
import DeviceRegistry from "@/components/iot/DeviceRegistry";
import AutomationRules from "@/components/iot/AutomationRules";
import SensorGauges from "@/components/iot/SensorGauges";
import WeatherTimeline from "@/components/iot/WeatherTimeline";
import DeviceStatusMatrix from "@/components/iot/DeviceStatusMatrix";
import {
  SectionLabel,
  ShellGrid,
  ShellPage,
  ShellPanel,
  ShellStack,
} from "@/components/ui/shell";

export default function IoTPage() {
  return (
    <ShellPage
      eyebrow="Internal sensor operations"
      surface="iot"
      title="Sensor Desk"
      description="Device health, sensor telemetry, MQTT posture, and automation rules stay inside the same operator-owned Homefront shell."
      width="wide"
      heroDensity="compact"
    >
      <ShellStack gap="16px">
        <ShellPanel tone="hero">
          <SectionLabel detail="Broker and adapter posture">
            MQTT status
          </SectionLabel>
          <MQTTStatus />
        </ShellPanel>

        <ShellGrid columns="minmax(0, 0.9fr) minmax(320px, 1.1fr)" gap="16px">
          <ShellPanel>
            <SectionLabel detail="Live gauge plane">Sensor gauges</SectionLabel>
            <SensorGauges />
          </ShellPanel>
          <ShellPanel>
            <SectionLabel detail="Weather and local context">
              Weather timeline
            </SectionLabel>
            <WeatherTimeline />
          </ShellPanel>
        </ShellGrid>

        <ShellPanel>
          <SectionLabel detail="Device readiness matrix">
            Device status
          </SectionLabel>
          <DeviceStatusMatrix />
        </ShellPanel>

        <ShellGrid columns="minmax(0, 1fr) minmax(0, 1fr)" gap="16px">
          <ShellPanel>
            <SectionLabel detail="Sensor intake">
              Sensor dashboard
            </SectionLabel>
            <SensorDashboard />
          </ShellPanel>
          <ShellPanel>
            <SectionLabel detail="Local device inventory">
              Device registry
            </SectionLabel>
            <DeviceRegistry />
          </ShellPanel>
        </ShellGrid>

        <ShellPanel tone="muted">
          <SectionLabel detail="Review before physical-world automation">
            Automation rules
          </SectionLabel>
          <AutomationRules />
        </ShellPanel>
      </ShellStack>
    </ShellPage>
  );
}
