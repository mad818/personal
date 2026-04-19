"use client";

const HQ_PROMPT_QUEUE_KEY = "nexus-hq-queued-prompt-v1";

export function queueHQPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  const trimmed = prompt.trim();
  if (!trimmed) return;
  try {
    window.localStorage.setItem(HQ_PROMPT_QUEUE_KEY, trimmed);
  } catch {
    // silent fail
  }
}

export function consumeQueuedHQPrompt() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(HQ_PROMPT_QUEUE_KEY);
    if (!value) return null;
    window.localStorage.removeItem(HQ_PROMPT_QUEUE_KEY);
    return value;
  } catch {
    return null;
  }
}
