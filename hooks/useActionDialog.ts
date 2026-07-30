"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ActionDialogTone = "default" | "danger";

export interface ActionDialogRequest {
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  tone?: ActionDialogTone;
}

export interface ActionDialogController {
  dialog: ActionDialogRequest | null;
  requestActionDialog: (request: ActionDialogRequest) => Promise<boolean>;
  confirmDialog: () => void;
  cancelDialog: () => void;
}

export function useActionDialog(): ActionDialogController {
  const [dialog, setDialog] = useState<ActionDialogRequest | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const requestActionDialog = useCallback(
    (request: ActionDialogRequest) =>
      new Promise<boolean>((resolve) => {
        const previousResolver = resolverRef.current;
        resolverRef.current = resolve;
        setDialog(request);
        previousResolver?.(false);
      }),
    [],
  );

  const resolveDialog = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolver?.(confirmed);
  }, []);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    [],
  );

  const confirmDialog = useCallback(() => resolveDialog(true), [resolveDialog]);
  const cancelDialog = useCallback(() => resolveDialog(false), [resolveDialog]);

  return {
    dialog,
    requestActionDialog,
    confirmDialog,
    cancelDialog,
  };
}
