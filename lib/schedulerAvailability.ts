export interface SchedulerBusyInterval {
  start: number;
  end: number;
}

export interface SchedulerAvailabilitySlot {
  start: number;
  end: number;
}

export interface SchedulerAvailabilityInput {
  windowStart: number;
  windowEnd: number;
  slotMinutes: number;
  busy: readonly SchedulerBusyInterval[];
  maxSlots?: number;
}

const MAX_WINDOW_MS = 24 * 60 * 60 * 1_000;
const MIN_SLOT_MINUTES = 15;
const MAX_SLOT_MINUTES = 4 * 60;

function assertFiniteTimestamp(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
}

function normalizeBusyIntervals(
  busy: readonly SchedulerBusyInterval[],
  windowStart: number,
  windowEnd: number,
): SchedulerBusyInterval[] {
  const bounded = busy
    .map((interval, index) => {
      assertFiniteTimestamp(interval.start, `Busy interval ${index + 1} start`);
      assertFiniteTimestamp(interval.end, `Busy interval ${index + 1} end`);
      if (interval.end <= interval.start) {
        throw new Error(`Busy interval ${index + 1} must end after it starts.`);
      }
      return {
        start: Math.max(windowStart, interval.start),
        end: Math.min(windowEnd, interval.end),
      };
    })
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);

  const merged: SchedulerBusyInterval[] = [];
  for (const interval of bounded) {
    const prior = merged.at(-1);
    if (!prior || interval.start > prior.end) {
      merged.push({ ...interval });
      continue;
    }
    prior.end = Math.max(prior.end, interval.end);
  }
  return merged;
}

export function findSchedulerAvailability(
  input: SchedulerAvailabilityInput,
): SchedulerAvailabilitySlot[] {
  assertFiniteTimestamp(input.windowStart, "Availability window start");
  assertFiniteTimestamp(input.windowEnd, "Availability window end");
  if (
    input.windowEnd <= input.windowStart ||
    input.windowEnd - input.windowStart > MAX_WINDOW_MS
  ) {
    throw new Error(
      "Availability window must span more than zero and no more than 24 hours.",
    );
  }
  if (
    !Number.isInteger(input.slotMinutes) ||
    input.slotMinutes < MIN_SLOT_MINUTES ||
    input.slotMinutes > MAX_SLOT_MINUTES
  ) {
    throw new Error(
      "Slot length must be a whole number from 15 to 240 minutes.",
    );
  }

  const maxSlots = Math.min(Math.max(input.maxSlots ?? 24, 1), 48);
  const slotMs = input.slotMinutes * 60_000;
  const busy = normalizeBusyIntervals(
    input.busy,
    input.windowStart,
    input.windowEnd,
  );
  const slots: SchedulerAvailabilitySlot[] = [];

  for (
    let start = input.windowStart;
    start + slotMs <= input.windowEnd && slots.length < maxSlots;
    start += slotMs
  ) {
    const end = start + slotMs;
    if (busy.some((interval) => start < interval.end && end > interval.start)) {
      continue;
    }
    slots.push({ start, end });
  }
  return slots;
}

function parseLocalDateTime(date: string, time: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error(`${label} must use a valid local date and 24-hour time.`);
  }
  const parsed = new Date(`${date}T${time}:00`);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${label} is not a valid local date and time.`);
  }
  return parsed.getTime();
}

export function parseSchedulerBusyClockRanges(input: {
  date: string;
  ranges: string;
}): SchedulerBusyInterval[] {
  const ranges = input.ranges
    .split(",")
    .map((range) => range.trim())
    .filter(Boolean);
  if (ranges.length > 24) {
    throw new Error("Busy ranges are limited to 24 entries.");
  }
  return ranges.map((range, index) => {
    const match = range.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) {
      throw new Error(`Busy range ${index + 1} must look like 09:30-10:15.`);
    }
    return {
      start: parseLocalDateTime(
        input.date,
        match[1],
        `Busy range ${index + 1} start`,
      ),
      end: parseLocalDateTime(
        input.date,
        match[2],
        `Busy range ${index + 1} end`,
      ),
    };
  });
}

export function buildSchedulerAvailabilityInput(input: {
  date: string;
  windowStart: string;
  windowEnd: string;
  slotMinutes: number;
  busyRanges: string;
}): SchedulerAvailabilityInput {
  return {
    windowStart: parseLocalDateTime(
      input.date,
      input.windowStart,
      "Availability window start",
    ),
    windowEnd: parseLocalDateTime(
      input.date,
      input.windowEnd,
      "Availability window end",
    ),
    slotMinutes: input.slotMinutes,
    busy: parseSchedulerBusyClockRanges({
      date: input.date,
      ranges: input.busyRanges,
    }),
  };
}

export function recurringDailyCronForSlot(slot: SchedulerAvailabilitySlot) {
  const date = new Date(slot.start);
  return `${date.getMinutes()} ${date.getHours()} * * *`;
}
