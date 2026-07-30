// ── components/iot/DeviceRegistry ──────────────────────────
// IoT device registry: add, remove, configure sensors and actuators.

"use client";
// status indicators and honest session-only device inventory actions.

import { type FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActionDialog } from "@/components/ui/ActionDialog";
import { toast } from "@/components/ui/Toast";
import { useActionDialog } from "@/hooks/useActionDialog";
import { useModalDialog } from "@/hooks/useModalDialog";

type Protocol = "MQTT" | "HTTP" | "BLE" | "Zigbee";
type DevStatus = "Online" | "Offline" | "Error";

interface Device {
  id: string;
  name: string;
  type: string;
  protocol: Protocol;
  status: DevStatus;
  ip: string;
  lastSeen: string;
  firmware: string;
  location: string;
  extra: string;
}

interface DeviceDraft {
  name: string;
  type: string;
  protocol: Protocol;
  ip: string;
  location: string;
}

const EMPTY_DEVICE_DRAFT: DeviceDraft = {
  name: "",
  type: "",
  protocol: "MQTT",
  ip: "",
  location: "",
};

const DEVICE_TEXT_FIELDS: Array<{
  key: Exclude<keyof DeviceDraft, "protocol">;
  label: string;
  placeholder: string;
}> = [
  {
    key: "name",
    label: "Device Name",
    placeholder: "e.g. ESP32-Sensor-D",
  },
  {
    key: "type",
    label: "Device Type",
    placeholder: "e.g. Temperature Sensor",
  },
  {
    key: "ip",
    label: "IP Address",
    placeholder: "192.168.1.x",
  },
  {
    key: "location",
    label: "Location",
    placeholder: "e.g. Server Room",
  },
];

const DEVICES: Device[] = [
  {
    id: "d1",
    name: "ESP32-Sensor-A",
    type: "Environmental Sensor",
    protocol: "MQTT",
    status: "Online",
    ip: "<LAN-IP>-101",
    lastSeen: "2s ago",
    firmware: "v2.1.4",
    location: "Lab Room",
    extra: "Temp: 22.4°C · Humidity: 58%",
  },
  {
    id: "d2",
    name: "PiCam-01",
    type: "IP Camera (Pi Zero)",
    protocol: "HTTP",
    status: "Online",
    ip: "<LAN-IP>-102",
    lastSeen: "1s ago",
    firmware: "v3.0.1",
    location: "Front Gate",
    extra: "1080p · 15fps · H.264",
  },
  {
    id: "d3",
    name: "SmartPlug-01",
    type: "Smart Plug",
    protocol: "Zigbee",
    status: "Online",
    ip: "<LAN-IP>-103",
    lastSeen: "12s ago",
    firmware: "v1.8.0",
    location: "Server Room",
    extra: "Power: 42W · Voltage: 120V",
  },
  {
    id: "d4",
    name: "ESP32-Door-B",
    type: "Door/Window Sensor",
    protocol: "MQTT",
    status: "Offline",
    ip: "<LAN-IP>-104",
    lastSeen: "4m ago",
    firmware: "v2.0.9",
    location: "East Entrance",
    extra: "Last state: Closed",
  },
  {
    id: "d5",
    name: "PiCam-02",
    type: "IP Camera (Pi 4)",
    protocol: "HTTP",
    status: "Error",
    ip: "<LAN-IP>-105",
    lastSeen: "32s ago",
    firmware: "v3.0.1",
    location: "Rear Compound",
    extra: "Error: RTSP timeout · Reconnecting…",
  },
  {
    id: "d6",
    name: "ESP32-Air-C",
    type: "Air Quality Monitor",
    protocol: "MQTT",
    status: "Online",
    ip: "<LAN-IP>-106",
    lastSeen: "3s ago",
    firmware: "v2.3.0",
    location: "Office Area",
    extra: "CO2: 420ppm · VOC: 0.12mg/m³",
  },
];

const STATUS_COLOR: Record<DevStatus, string> = {
  Online: "#10b981",
  Offline: "#6b7280",
  Error: "#f59e0b",
};

const PROTO_COLOR: Record<Protocol, string> = {
  MQTT: "#818cf8",
  HTTP: "#10b981",
  BLE: "#60a5fa",
  Zigbee: "#f472b6",
};

function DeviceEditorModal({
  device,
  onClose,
  onSave,
}: {
  device: Device | null;
  onClose: () => void;
  onSave: (draft: DeviceDraft) => void;
}) {
  const dialogRef = useModalDialog({ open: true, onClose });
  const [draft, setDraft] = useState<DeviceDraft>(() =>
    device
      ? {
          name: device.name,
          type: device.type,
          protocol: device.protocol,
          ip: device.ip,
          location: device.location,
        }
      : EMPTY_DEVICE_DRAFT,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !draft.name.trim() ||
      !draft.type.trim() ||
      !draft.ip.trim() ||
      !draft.location.trim()
    ) {
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      type: draft.type.trim(),
      ip: draft.ip.trim(),
      location: draft.location.trim(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nexus-device-editor-title"
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surf)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "24px",
          width: "360px",
          maxWidth: "90vw",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              id="nexus-device-editor-title"
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {device ? "Configure Session Device" : "Add Session Device"}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close device editor"
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text2)",
                fontSize: "18px",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              marginBottom: "16px",
              color: "var(--text3)",
              fontSize: "10px",
              lineHeight: 1.45,
            }}
          >
            Session-only inventory. This does not provision hardware, test
            connectivity, or write a durable device record.
          </div>

          {DEVICE_TEXT_FIELDS.map((field, index) => (
            <div key={field.key} style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                {field.label}
              </div>
              <input
                data-dialog-initial-focus={index === 0 ? "true" : undefined}
                aria-label={field.label}
                required
                value={draft[field.key]}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                placeholder={field.placeholder}
                style={{
                  width: "100%",
                  background: "var(--surf2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--rs)",
                  padding: "7px 10px",
                  fontSize: "12px",
                  color: "var(--text)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "4px",
              }}
            >
              Protocol
            </div>
            <select
              aria-label="Device protocol"
              value={draft.protocol}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  protocol: event.target.value as Protocol,
                }))
              }
              style={{
                width: "100%",
                background: "var(--surf2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--rs)",
                padding: "7px 10px",
                fontSize: "12px",
                color: "var(--text)",
                outline: "none",
                boxSizing: "border-box" as const,
              }}
            >
              <option>MQTT</option>
              <option>HTTP</option>
              <option>BLE</option>
              <option>Zigbee</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "var(--rs)",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text2)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: "8px",
                borderRadius: "var(--rs)",
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              {device ? "Save Session Changes" : "Add Session Device"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function DeviceRegistry() {
  const [devices, setDevices] = useState<Device[]>(() => DEVICES);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const actionDialog = useActionDialog();

  const openAdd = () => {
    setEditingDevice(null);
    setShowEditor(true);
  };

  const openConfigure = (device: Device) => {
    setEditingDevice(device);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingDevice(null);
  };

  const saveDevice = (draft: DeviceDraft) => {
    if (editingDevice) {
      setDevices((current) =>
        current.map((device) =>
          device.id === editingDevice.id ? { ...device, ...draft } : device,
        ),
      );
      toast({
        title: "Session device updated",
        message: `${draft.name} changed in this browser session only.`,
        severity: "low",
      });
    } else {
      const device: Device = {
        ...draft,
        id: `session-${Date.now()}`,
        status: "Offline",
        lastSeen: "Not checked",
        firmware: "Unreported",
        extra: "Session reference · No live telemetry",
      };
      setDevices((current) => [...current, device]);
      setExpanded(device.id);
      toast({
        title: "Session device added",
        message: `${device.name} was added locally; no hardware was provisioned.`,
        severity: "low",
      });
    }
    closeEditor();
  };

  const removeDevice = async (device: Device) => {
    const confirmed = await actionDialog.requestActionDialog({
      eyebrow: "Session inventory",
      title: `Remove ${device.name}?`,
      description:
        "This removes only the current browser-session entry. Reloading restores the seeded reference inventory.",
      confirmLabel: "Remove session entry",
      cancelLabel: "Keep entry",
      tone: "danger",
    });
    if (!confirmed) return;

    setDevices((current) => current.filter((item) => item.id !== device.id));
    setExpanded((current) => (current === device.id ? null : current));
    toast({
      title: "Session device removed",
      message: `${device.name} was removed from the local session inventory.`,
      severity: "medium",
    });
  };

  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Device Registry — {devices.length} Session Entries
        </div>
        <button
          onClick={openAdd}
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: "var(--rs)",
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          + Add Session Device
        </button>
      </div>

      <div
        style={{
          marginBottom: "10px",
          fontSize: "9px",
          color: "var(--text3)",
          lineHeight: 1.4,
        }}
      >
        Session-only reference inventory · no discovery, provisioning, or
        connectivity checks
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {devices.map((dev) => {
          const isExp = expanded === dev.id;
          return (
            <div
              key={dev.id}
              style={{
                background: "var(--surf2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--rs)",
                overflow: "hidden",
              }}
            >
              {/* Main row */}
              <button
                type="button"
                onClick={() => setExpanded(isExp ? null : dev.id)}
                aria-expanded={isExp}
                aria-label={`${isExp ? "Collapse" : "Expand"} ${dev.name} device details`}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "none",
                  background: "transparent",
                  color: "inherit",
                  font: "inherit",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                {/* Status dot */}
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: STATUS_COLOR[dev.status],
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />

                {/* Name + type */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {dev.name}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text3)" }}>
                    {dev.type}
                  </div>
                </div>

                {/* Protocol badge */}
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: `${PROTO_COLOR[dev.protocol]}22`,
                    color: PROTO_COLOR[dev.protocol],
                  }}
                >
                  {dev.protocol}
                </span>

                {/* Status text */}
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: STATUS_COLOR[dev.status],
                  }}
                >
                  {dev.status}
                </span>

                {/* IP */}
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--text3)",
                    fontFamily: "monospace",
                    display: "none",
                  }}
                >
                  {dev.ip}
                </span>

                {/* Last seen */}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "9px",
                    color: "var(--text3)",
                  }}
                >
                  {dev.lastSeen}
                </span>

                {/* Expand chevron */}
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    transform: isExp ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                >
                  ›
                </span>
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      overflow: "hidden",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {[
                        { label: "IP Address", value: dev.ip },
                        { label: "Firmware", value: dev.firmware },
                        { label: "Location", value: dev.location },
                      ].map((m) => (
                        <div key={m.label}>
                          <div
                            style={{
                              fontSize: "8px",
                              color: "var(--text3)",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              marginBottom: "2px",
                            }}
                          >
                            {m.label}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--text)",
                              fontFamily: "monospace",
                            }}
                          >
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text2)",
                        background: "var(--surf3)",
                        margin: "0 12px 10px",
                        borderRadius: "var(--rs)",
                        padding: "7px 10px",
                      }}
                    >
                      {dev.extra}
                    </div>
                    <div
                      style={{
                        padding: "0 12px 10px",
                        display: "flex",
                        gap: "6px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openConfigure(dev)}
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "4px",
                          border: "none",
                          background: "var(--surf)",
                          color: "var(--text2)",
                          cursor: "pointer",
                          borderColor: "var(--border)",
                        }}
                      >
                        Configure
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeDevice(dev)}
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "4px",
                          border: "none",
                          background: "rgba(239,68,68,0.15)",
                          color: "#ef4444",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showEditor && (
          <DeviceEditorModal
            key={editingDevice?.id ?? "new-device"}
            device={editingDevice}
            onClose={closeEditor}
            onSave={saveDevice}
          />
        )}
      </AnimatePresence>
      <ActionDialog controller={actionDialog} />
    </div>
  );
}
