#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildSchedulerAvailabilityInput,
  findSchedulerAvailability,
  parseSchedulerBusyClockRanges,
  recurringDailyCronForSlot,
} from "../lib/schedulerAvailability.ts";

const input = buildSchedulerAvailabilityInput({
  date: "2026-07-27",
  windowStart: "09:00",
  windowEnd: "13:00",
  slotMinutes: 60,
  busyRanges: "10:15-11:30, 11:00-12:00",
});
const slots = findSchedulerAvailability(input);
assert.deepEqual(
  slots.map((slot) => [
    new Date(slot.start).getHours(),
    new Date(slot.end).getHours(),
  ]),
  [
    [9, 10],
    [12, 13],
  ],
);
assert.equal(recurringDailyCronForSlot(slots[0]), "0 9 * * *");
assert.throws(
  () =>
    parseSchedulerBusyClockRanges({
      date: "2026-07-27",
      ranges: "9-10",
    }),
  /09:30-10:15/,
);
assert.throws(
  () =>
    findSchedulerAvailability({
      windowStart: 100,
      windowEnd: 200,
      slotMinutes: 5,
      busy: [],
    }),
  /15 to 240/,
);

console.log(
  `ok scheduler-availability-runtime (slots=${slots.length}; local-only=true; calendar-sync=false)`,
);
