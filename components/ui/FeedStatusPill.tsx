"use client";

import { ShellBadge } from "@/components/ui/shell";
import { timeAgo } from "@/lib/helpers";
import type { FeedStatus } from "@/store/useStore";

function formatRelativeTimestamp(timestamp: number | null): string {
  if (!timestamp) return "Awaiting first sync";
  return timeAgo(new Date(timestamp).toISOString());
}

export default function FeedStatusPill({
  label,
  status,
  internetReachable,
}: {
  label: string;
  status: FeedStatus;
  internetReachable: boolean;
}) {
  const lastFailureIsNewest =
    Boolean(status.lastFailureAt) &&
    (status.lastSuccessAt === null ||
      (status.lastFailureAt ?? 0) > (status.lastSuccessAt ?? 0));

  if (status.lastSuccessAt === null) {
    return <ShellBadge tone="muted">{label}: awaiting first sync</ShellBadge>;
  }

  if (!internetReachable) {
    return (
      <ShellBadge tone="muted">
        {label}: local copy {formatRelativeTimestamp(status.lastSuccessAt)}
      </ShellBadge>
    );
  }

  if (lastFailureIsNewest) {
    return (
      <ShellBadge tone="muted">
        {label}: last good {formatRelativeTimestamp(status.lastSuccessAt)}
      </ShellBadge>
    );
  }

  return (
    <ShellBadge tone="success">
      {label}: fresh {formatRelativeTimestamp(status.lastSuccessAt)}
    </ShellBadge>
  );
}
