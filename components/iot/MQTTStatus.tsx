// ── components/iot/MQTTStatus ──────────────────────────────
// MQTT broker status and metrics: connection, message rate, topic subscriptions.

"use client";
// active topics, connected devices, and animated data-flow indicator.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function MQTTStatus() {
  const [msgPerSec, setMsgPerSec] = useState(0);
  const [connected, setConnected] = useState(false);
  const [topicsCount, setTopicsCount] = useState(0);
  const [devicesCount, setDevicesCount] = useState(0);

  // Live MQTT SSE feed (currently simulated server-side, but real-time).
  useEffect(() => {
    let es: EventSource | null = null;
    let tickId: number | null = null;

    const topics = new Set<string>();
    const devices = new Set<string>();
    let countThisSecond = 0;

    const start = () => {
      try {
        es = new EventSource("/api/mqtt?topics=home/#");
      } catch {
        setConnected(false);
        return;
      }

      setConnected(true);

      es.onmessage = (evt) => {
        countThisSecond++;
        try {
          const msg = JSON.parse(evt.data);
          if (typeof msg?.topic === "string") topics.add(msg.topic);
          const payload = msg?.payload;
          if (payload && typeof payload === "object") {
            const id = (payload as any).deviceId;
            if (typeof id === "string") devices.add(id);
          }
          setTopicsCount(topics.size);
          setDevicesCount(devices.size);
        } catch {
          // ignore malformed SSE line
        }
      };

      es.onerror = () => {
        setConnected(false);
      };

      // Compute msg/s
      tickId = window.setInterval(() => {
        setMsgPerSec(countThisSecond);
        countThisSecond = 0;
      }, 1000);
    };

    start();

    return () => {
      try {
        es?.close();
      } catch {
        /* ignore */
      }
      if (tickId != null) window.clearInterval(tickId);
    };
  }, []);

  return (
    <div
      style={{
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--rs)",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        flexWrap: "wrap",
        marginBottom: "14px",
      }}
    >
      {/* Broker status */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <motion.span
          animate={{ opacity: connected ? [1, 0.4, 1] : 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: connected ? "#10b981" : "#ef4444",
            display: "inline-block",
          }}
        />
        <span
          style={{ fontSize: "10px", fontWeight: 700, color: "var(--text)" }}
        >
          MQTT Broker
        </span>
        <span
          style={{
            fontSize: "9px",
            color: connected ? "#10b981" : "#ef4444",
            fontWeight: 700,
          }}
        >
          {connected ? "CONNECTED" : "DISCONNECTED"}
        </span>
        <span
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            fontFamily: "monospace",
          }}
        >
          broker.local:1883
        </span>
      </div>

      <div
        style={{
          width: "1px",
          height: "16px",
          background: "var(--border)",
          flexShrink: 0,
        }}
      />

      {/* Messages/sec */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <span
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          msg/s
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 900,
            color: "var(--accent2)",
            fontFamily: "monospace",
          }}
        >
          {msgPerSec}
        </span>
        {/* Animated data-flow dots */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          width: "1px",
          height: "16px",
          background: "var(--border)",
          flexShrink: 0,
        }}
      />

      {/* Active topics */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <span
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Topics
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 900,
            color: "var(--text)",
            fontFamily: "monospace",
          }}
        >
          {topicsCount}
        </span>
      </div>

      <div
        style={{
          width: "1px",
          height: "16px",
          background: "var(--border)",
          flexShrink: 0,
        }}
      />

      {/* Connected devices */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <span
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Devices
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 900,
            color: "var(--text)",
            fontFamily: "monospace",
          }}
        >
          {devicesCount}
        </span>
        <span style={{ fontSize: "9px", color: "var(--text3)" }}>online</span>
      </div>

      {/* Status tag */}
      <span
        style={{
          marginLeft: "auto",
          fontSize: "9px",
          fontWeight: 700,
          padding: "3px 10px",
          borderRadius: "4px",
          background: connected
            ? "rgba(16,185,129,0.15)"
            : "rgba(239,68,68,0.15)",
          color: connected ? "#10b981" : "#ef4444",
        }}
      >
        {connected ? "LIVE" : "OFFLINE"}
      </span>
    </div>
  );
}
