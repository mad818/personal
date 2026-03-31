"use client";

// ── AgentAvatar.tsx ───────────────────────────────────────────────────────────
// Full agent card rendered for each of the five agents in the office grid.
// Stacks vertically: speech bubble → sprite (clipped at waist) → desk.
// Two independent animation layers:
//   outer div  — driven by outerAnim (whole-card movement: nod, fury, task-get)
//   inner div  — driven by innerAnim (just the sprite: typing, bobbing, walking)
// The desk includes a mini SVG monitor + keyboard that light up when active.
// Speech bubbles: sharp-corner style for action agents, dashed teal cloud for R1.

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Sprite } from "./palette";
import {
  AGENTS,
  DESK_DECO,
  IDLE_ANIM,
  IDLE_SPRITE_ANIM,
  TOOL_ICON,
} from "./constants";
import type { AvatarProps } from "./types";

export function AgentAvatar({
  id,
  active,
  routing,
  dispatched,
  dispatch,
  activeTool,
  isReasoning,
}: AvatarProps) {
  // Alternates between frame 0 and 1 at a rate that reflects urgency
  const [frame, setFrame] = useState(0);

  const cfg = AGENTS[id]; // name, role, colour, frames
  const isLive = routing || dispatched || active; // true when doing anything
  const agentStats = useStore((s) => s.agentStats[id]); // last confidence + task count

  // Frame flip interval — faster when dispatched/routing, slower when idle
  useEffect(() => {
    const ms = routing || dispatched ? 150 : active ? 250 : 850;
    const timer = setInterval(() => setFrame((f) => (f + 1) % 2), ms);
    return () => clearInterval(timer);
  }, [routing, active, dispatched]);

  // ── Status indicator text and colour ──────────────────────────────────────
  const statusColor = routing
    ? "#f59e0b"
    : dispatched
      ? cfg.color
      : active
        ? cfg.color
        : "#353c5e";
  const statusText = routing
    ? "routing…"
    : dispatched
      ? "on it!"
      : active
        ? "working"
        : "standby";

  // ── Animation selection ───────────────────────────────────────────────────
  // Outer wrapper — controls whole-card movement
  const outerAnim = dispatched
    ? "taskGet .8s ease-out forwards"
    : active
      ? `workFury ${id === "flux" ? "0.4s" : "0.55s"} ease-in-out infinite`
      : routing
        ? "routePulse 0.45s ease-in-out infinite"
        : IDLE_ANIM[id]; // each agent has its own idle personality

  // Inner sprite — drives just the character body
  const innerAnim =
    dispatched || active
      ? `spriteType ${dispatched ? "0.25s" : "0.45s"} ease-in-out infinite`
      : routing
        ? "agentWalk 0.3s ease-in-out infinite alternate"
        : IDLE_SPRITE_ANIM[id];

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // CSS variable consumed by deskGlow @keyframe in animations.css
        // NOTE: no animation here — animating the root would lift the desk too.
        // outerAnim is applied to the character-group wrapper below.
        ["--agent-color" as string]: cfg.color,
      }}
    >
      {/* ── Character group — everything that should animate lives here ────────
           The desk and status bar are rendered OUTSIDE this wrapper so they
           stay pinned to their layout position regardless of any transform. ── */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: outerAnim,
        }}
      >
        {/* ── JANSKY dispatch speech bubble ── */}
        {/* Only shown for JANSKY (dispatch prop is null for all others) */}
        {dispatch && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 4px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--surf)",
              border: `1px solid ${cfg.color}66`,
              borderRadius: "8px",
              padding: "5px 10px",
              fontSize: "9px",
              fontWeight: 700,
              color: cfg.color,
              whiteSpace: "nowrap",
              zIndex: 20,
              animation: "bubbleUp .2s ease",
              boxShadow: "0 4px 12px rgba(0,0,0,.5)",
            }}
          >
            {dispatch}
            {/* Triangle tail pointing down */}
            <div
              style={{
                position: "absolute",
                bottom: "-5px",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: `5px solid ${cfg.color}66`,
              }}
            />
          </div>
        )}

        {/* ── Tool speech bubble ── */}
        {/* Only shown when this agent is active and calling a tool */}
        {activeTool && active && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 25,
              animation: "bubbleUp .2s ease",
              pointerEvents: "none",
            }}
          >
            {isReasoning ? (
              // R1 thought-cloud — dashed teal border, dots prefix
              <div
                style={{
                  background: "rgba(20,184,166,0.12)",
                  border: "1px dashed #14b8a688",
                  borderRadius: "10px",
                  padding: "4px 8px",
                  fontSize: "7px",
                  fontFamily: "'VT323', monospace",
                  color: "#14b8a6",
                  letterSpacing: "1px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 10px rgba(20,184,166,0.2)",
                }}
              >
                ◦ ◦ ◦ {activeTool.toUpperCase()}
              </div>
            ) : (
              // Action agents — sharp-corner bubble in agent's brand colour
              <div
                style={{
                  background: `${cfg.color}18`,
                  border: `1px solid ${cfg.color}66`,
                  borderRadius: "6px 6px 6px 0px",
                  padding: "4px 8px",
                  fontSize: "7px",
                  fontFamily: "'VT323', monospace",
                  color: cfg.color,
                  letterSpacing: "1px",
                  whiteSpace: "nowrap",
                  boxShadow: `0 0 8px ${cfg.color}28`,
                }}
              >
                {TOOL_ICON[activeTool] ?? "⚙"}{" "}
                {activeTool.replace(/_/g, " ").toUpperCase()}
                {/* Triangle tail — bottom-left corner for the "speech" direction */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-5px",
                    left: "8px",
                    width: 0,
                    height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: `5px solid ${cfg.color}66`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Dispatch ring ── */}
        {/* Expanding ring pulse shown for 700 ms when agent receives a task */}
        {dispatched && (
          <div
            style={{
              position: "absolute",
              inset: "-4px",
              borderRadius: "10px",
              border: `2px solid ${cfg.color}`,
              animation: "dispatchRing .6s ease-out infinite",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}

        {/* ── Status text (ROUTING / TASKED / WORKING) ── */}
        {isLive && (
          <div
            style={{
              fontSize: "6px",
              fontFamily: "'VT323', monospace",
              letterSpacing: "2px",
              color: cfg.color + "cc",
              marginBottom: "1px",
              animation: "statusPip 1.2s ease-in-out infinite",
            }}
          >
            {routing
              ? "◉ ROUTING"
              : dispatched
                ? "◉ TASKED"
                : active
                  ? "◉ WORKING"
                  : ""}
          </div>
        )}

        {/* ── Name + role badge + live pip ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "3px",
            marginBottom: "2px",
          }}
        >
          <span style={{ fontSize: "8px" }}>{DESK_DECO[id]}</span>
          <span
            style={{
              fontSize: "7px",
              fontWeight: 900,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: `${cfg.color}${isLive ? "dd" : "55"}`,
            }}
          >
            {cfg.name}
          </span>
          {/* Dot glows when live, dark when idle */}
          <span
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              display: "inline-block",
              background: isLive ? cfg.color : "#1A2040",
              boxShadow: isLive ? `0 0 8px ${cfg.color}` : "none",
              animation: isLive
                ? "statusPip 1.5s ease-in-out infinite"
                : "none",
              transition: "background .4s, box-shadow .4s",
            }}
          />
        </div>

        {/* ── Sprite — clipped at waist so the desk sits flush below ── */}
        <div
          style={{
            overflow: "hidden",
            height: "47px",
            display: "flex",
            justifyContent: "center",
            position: "relative",
            width: "100%",
          }}
        >
          {/* Radial glow behind the sprite when the agent is live */}
          {isLive && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(ellipse at 50% 80%, ${cfg.color}28 0%, transparent 65%)`,
                pointerEvents: "none",
                animation: "ambientGlow 2s ease-in-out infinite",
              }}
            />
          )}
          {/* Sprite body — driven by innerAnim */}
          <div style={{ animation: innerAnim }}>
            <Sprite rows={cfg.frames[frame]} scale={1.3} />
          </div>
        </div>
      </div>
      {/* end character-group */}

      {/* ── Status + confidence bar ── */}
      <div
        style={{
          marginTop: "3px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1px",
        }}
      >
        <div style={{ fontSize: "7px", color: statusColor, fontWeight: 700 }}>
          {statusText}
        </div>
        {/* Confidence bar — filled based on last task's confidence score (0–100) */}
        {agentStats && (
          <div
            style={{
              width: "56px",
              height: "2px",
              background: "#0D1220",
              border: "1px solid #1A2040",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${agentStats.lastConfidence}%`,
                background:
                  agentStats.lastConfidence >= 80
                    ? "#00FF66"
                    : agentStats.lastConfidence >= 50
                      ? "#00DDFF"
                      : "#f59e0b",
                borderRadius: "2px",
                transition: "width .6s ease",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
