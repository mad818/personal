"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { toast } from "@/components/ui/Toast";

const TOAST_DURATION_MS: Record<string, number> = {
  critical: 9000,
  high: 7000,
  medium: 5000,
  low: 4000,
};

export default function NotificationToastBridge() {
  const notifications = useStore((s) => s.notifications);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const notification of notifications) {
      if (seenIdsRef.current.has(notification.id)) continue;
      seenIdsRef.current.add(notification.id);
      toast({
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        duration: TOAST_DURATION_MS[notification.severity] ?? 5000,
      });
    }
  }, [notifications]);

  return null;
}
