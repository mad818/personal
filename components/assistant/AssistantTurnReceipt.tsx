"use client";

import { useEffect, useRef } from "react";
import type { AssistantChatActionModel } from "@/lib/assistantChatActions";
import {
  markPhoneAssistantReceipt,
  phoneAssistantReceiptKey,
} from "@/lib/phoneAssistantReceiptBridge";

export default function AssistantTurnReceipt({
  actionModel,
  compact = false,
}: {
  actionModel: AssistantChatActionModel | null | undefined;
  compact?: boolean;
}) {
  const lastMarkedKeyRef = useRef<string | null>(null);
  const markerKey = phoneAssistantReceiptKey(actionModel);

  useEffect(() => {
    if (!markerKey || lastMarkedKeyRef.current === markerKey) return;
    lastMarkedKeyRef.current = markerKey;
    void markPhoneAssistantReceipt(actionModel);
  }, [actionModel, markerKey]);

  if (!actionModel?.receiptItems?.length) return null;

  return (
    <div
      data-testid="assistant-turn-receipt"
      className={`nexus-assistant-turn-receipt${
        compact ? " nexus-assistant-turn-receipt--compact" : ""
      }`}
      aria-label={actionModel.receiptTitle ?? "Assistant turn receipt"}
    >
      {actionModel.receiptItems.map((item) => (
        <span
          className="nexus-assistant-turn-receipt__item"
          key={`${item.label}-${item.value}`}
        >
          <em className="nexus-assistant-turn-receipt__label">{item.label}</em>
          <strong
            className="nexus-assistant-turn-receipt__value"
            title={item.value}
          >
            {item.value}
          </strong>
        </span>
      ))}
    </div>
  );
}
