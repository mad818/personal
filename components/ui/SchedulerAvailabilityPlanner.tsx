"use client";

import { useMemo, useState } from "react";
import {
  buildSchedulerAvailabilityInput,
  findSchedulerAvailability,
  recurringDailyCronForSlot,
} from "@/lib/schedulerAvailability";

function localDateInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatSlot(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchedulerAvailabilityPlanner({
  onCronChange,
}: {
  onCronChange: (value: string) => void;
}) {
  const [date, setDate] = useState(localDateInputValue);
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [busyRanges, setBusyRanges] = useState("12:00-13:00");

  const result = useMemo(() => {
    try {
      const slots = findSchedulerAvailability(
        buildSchedulerAvailabilityInput({
          date,
          windowStart,
          windowEnd,
          slotMinutes,
          busyRanges,
        }),
      );
      return { slots, error: "" };
    } catch (error) {
      return {
        slots: [],
        error:
          error instanceof Error
            ? error.message
            : "Availability could not be calculated.",
      };
    }
  }, [busyRanges, date, slotMinutes, windowEnd, windowStart]);

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "browser local time";

  return (
    <section
      aria-label="Local availability planner"
      style={{
        display: "grid",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(0,221,255,.2)",
        background: "rgba(8, 13, 24, .82)",
      }}
    >
      <div>
        <div style={{ color: "#7ee9ff", fontSize: 11, fontWeight: 800 }}>
          LOCAL AVAILABILITY
        </div>
        <div style={{ color: "#6875a0", fontSize: 10, lineHeight: 1.45 }}>
          Find open time from operator-entered ranges in {timezone}. No calendar
          account is read or synchronized.
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr repeat(3, minmax(0, .8fr))",
          gap: 8,
        }}
      >
        <input
          aria-label="Availability date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          style={inputStyle}
        />
        <input
          aria-label="Availability start time"
          type="time"
          value={windowStart}
          onChange={(event) => setWindowStart(event.target.value)}
          style={inputStyle}
        />
        <input
          aria-label="Availability end time"
          type="time"
          value={windowEnd}
          onChange={(event) => setWindowEnd(event.target.value)}
          style={inputStyle}
        />
        <select
          aria-label="Availability slot length"
          value={slotMinutes}
          onChange={(event) => setSlotMinutes(Number(event.target.value))}
          style={inputStyle}
        >
          {[15, 30, 45, 60, 90, 120].map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min
            </option>
          ))}
        </select>
      </div>
      <input
        aria-label="Busy time ranges"
        value={busyRanges}
        onChange={(event) => setBusyRanges(event.target.value)}
        placeholder="Busy ranges, e.g. 09:30-10:15, 13:00-14:00"
        style={inputStyle}
      />
      {result.error ? (
        <div role="alert" style={{ color: "#ef7f8d", fontSize: 10 }}>
          {result.error}
        </div>
      ) : (
        <div
          aria-live="polite"
          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {result.slots.slice(0, 10).map((slot) => (
            <button
              key={slot.start}
              type="button"
              title="Use this start time as a recurring daily cron"
              onClick={() => onCronChange(recurringDailyCronForSlot(slot))}
              style={{
                border: "1px solid rgba(0,221,255,.24)",
                borderRadius: 999,
                background: "rgba(0,221,255,.08)",
                color: "#9befff",
                padding: "4px 8px",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              {formatSlot(slot.start)}–{formatSlot(slot.end)}
            </button>
          ))}
          {result.slots.length === 0 ? (
            <span style={{ color: "#6875a0", fontSize: 10 }}>
              No complete slot fits this window.
            </span>
          ) : null}
        </div>
      )}
      <div style={{ color: "#6875a0", fontSize: 9, lineHeight: 1.4 }}>
        Selecting a slot only fills a recurring daily cron. Review the
        recurrence before adding the job.
      </div>
    </section>
  );
}

const inputStyle = {
  background: "#080d18",
  border: "1px solid #1A2040",
  borderRadius: 6,
  color: "#ccd6f6",
  padding: "7px 10px",
} as const;
