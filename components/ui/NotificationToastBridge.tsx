"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { toast } from "@/components/ui/Toast";

const TOAST_DURATION_MS: Record<string, number> = {
  critical: 9000,
  high: 7000,
  medium: 5000,
  low: 4000,
};

type PersistApiShape = {
  hasHydrated?: () => boolean;
  onFinishHydration?: (callback: () => void) => () => void;
};

const storePersist = (
  useStore as typeof useStore & {
    persist?: PersistApiShape;
  }
).persist;

export default function NotificationToastBridge() {
  const notifications = useStore((s) => s.notifications);
  const [hydrated, setHydrated] = useState(
    () => storePersist?.hasHydrated?.() ?? true,
  );
  const seenIdsRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);

  useEffect(() => {
    if (hydrated || !storePersist?.onFinishHydration) return;
    return storePersist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    if (!seededRef.current) {
      seenIdsRef.current = new Set(
        notifications.map((notification) => notification.id),
      );
      seededRef.current = true;
      return;
    }

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
  }, [hydrated, notifications]);

  return null;
}
