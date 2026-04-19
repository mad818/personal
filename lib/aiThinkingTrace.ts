export interface ThinkingTraceExtraction {
  visibleText: string;
  thinkingBlocks: string[];
  hasThinking: boolean;
}

function normalizeBlockText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractThinkingTrace(raw: string): ThinkingTraceExtraction {
  const source = typeof raw === "string" ? raw : "";
  if (!source.includes("<think>")) {
    return {
      visibleText: normalizeBlockText(source),
      thinkingBlocks: [],
      hasThinking: false,
    };
  }

  const visibleParts: string[] = [];
  const thinkingBlocks: string[] = [];
  let remaining = source;

  while (remaining.length > 0) {
    const lower = remaining.toLowerCase();
    const start = lower.indexOf("<think>");
    if (start === -1) {
      visibleParts.push(remaining);
      break;
    }

    if (start > 0) {
      visibleParts.push(remaining.slice(0, start));
    }

    const afterStart = remaining.slice(start + 7);
    const afterStartLower = afterStart.toLowerCase();
    const end = afterStartLower.indexOf("</think>");

    if (end === -1) {
      const block = normalizeBlockText(afterStart);
      if (block) thinkingBlocks.push(block);
      remaining = "";
      break;
    }

    const block = normalizeBlockText(afterStart.slice(0, end));
    if (block) thinkingBlocks.push(block);
    remaining = afterStart.slice(end + 8);
  }

  const visibleText = normalizeBlockText(visibleParts.join(""));
  return {
    visibleText:
      visibleText ||
      normalizeBlockText(source.replace(/<\/?think>/gi, " ")),
    thinkingBlocks,
    hasThinking: thinkingBlocks.length > 0,
  };
}

export function buildInternalThinkingSummary(blocks: string[]): string {
  if (blocks.length <= 1) {
    return "Internal reasoning stayed inside the agent runtime. Chronicle shows the final answer only.";
  }

  return `Internal reasoning stayed inside the agent runtime across ${blocks.length} passes. Chronicle shows the final answer only.`;
}
