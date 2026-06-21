import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  applyRateLimitHeaders,
  checkRateLimit,
} from "@/lib/security/rateLimit";
import { protectedJson } from "@/lib/protectedApi";
import {
  buildIdeaLinkIntakeItem,
  mergeIdeaLinkIntakeItems,
  parseIdeaLinksFromText,
  summarizeIdeaLinkIntake,
  type IdeaLinkIntakeQueue,
} from "@/lib/ideaLinkIntake";

export const dynamic = "force-dynamic";

const QUEUE_PATH = path.join(process.cwd(), "docs", "ideas", "pending-links.json");
const RATE_LIMIT = {
  bucket: "api-ideas-intake",
  windowMs: 60_000,
  maxAttempts: 12,
  includeBearerToken: false,
} as const;

async function readQueue(): Promise<IdeaLinkIntakeQueue> {
  try {
    const raw = await fs.readFile(QUEUE_PATH, "utf8");
    return JSON.parse(raw) as IdeaLinkIntakeQueue;
  } catch {
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }
}

async function writeQueue(queue: IdeaLinkIntakeQueue) {
  queue.updatedAt = new Date().toISOString();
  await fs.writeFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}

async function writeStubMatrix(targetMatrix: string, source: string, id: string) {
  const matrixPath = path.join(process.cwd(), targetMatrix);
  try {
    await fs.access(matrixPath);
    return false;
  } catch {
    /* create stub */
  }
  await fs.mkdir(path.dirname(matrixPath), { recursive: true });
  const stub = {
    schemaVersion: 1,
    id,
    name: id,
    status: "foundation",
    source: {
      url: source,
      version: "pending-review",
      reviewedAt: new Date().toISOString().slice(0, 10),
      license: "unknown",
      primaryEvidence: [source],
    },
    capabilities: [
      {
        id: "inventory-pending",
        title: "Exhaustive capability inventory not started",
        sourceEvidence: source,
        disposition: "pending",
        reason: "Batch-registered — capability inventory not started.",
        proof: ["docs/ideas/link-intake.md"],
      },
    ],
  };
  await fs.writeFile(matrixPath, `${JSON.stringify(stub, null, 2)}\n`, "utf8");
  return true;
}

export async function GET(req: NextRequest) {
  const rate = checkRateLimit(req, RATE_LIMIT);
  if (!rate.ok) {
    const response = protectedJson(
      { ok: false, error: "Rate limited." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT, rate.retryAfterSec);
    return response;
  }
  const queue = await readQueue();
  const response = protectedJson({
    ok: true,
    queue,
    summary: summarizeIdeaLinkIntake(queue),
  });
  applyRateLimitHeaders(response, RATE_LIMIT);
  return response;
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, RATE_LIMIT);
  if (!rate.ok) {
    const response = protectedJson(
      { ok: false, error: "Rate limited." },
      { status: 429 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT, rate.retryAfterSec);
    return response;
  }

  try {
    const body = (await req.json()) as { text?: string; urls?: string[] };
    const urls = [
      ...(Array.isArray(body.urls) ? body.urls : []),
      ...parseIdeaLinksFromText(body.text ?? ""),
    ];
    if (!urls.length) {
      const response = protectedJson(
        { ok: false, error: "No valid URLs found." },
        { status: 400 },
      );
      applyRateLimitHeaders(response, RATE_LIMIT);
      return response;
    }

    const queue = await readQueue();
    const incoming = urls.map((url) => buildIdeaLinkIntakeItem(url));
    const { merged, added } = mergeIdeaLinkIntakeItems(queue.items ?? [], incoming);
    queue.items = merged;
    await writeQueue(queue);

    let matricesCreated = 0;
    for (const item of added) {
      if (item.targetMatrix) {
        const created = await writeStubMatrix(
          item.targetMatrix,
          item.source,
          item.id,
        );
        if (created) matricesCreated++;
      }
    }

    const response = protectedJson({
      ok: true,
      added: added.map((item) => ({
        id: item.id,
        source: item.source,
        kind: item.kind,
        targetMatrix: item.targetMatrix,
      })),
      matricesCreated,
      summary: summarizeIdeaLinkIntake(queue),
    });
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  } catch {
    const response = protectedJson(
      { ok: false, error: "Register failed." },
      { status: 500 },
    );
    applyRateLimitHeaders(response, RATE_LIMIT);
    return response;
  }
}
