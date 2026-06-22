import { z } from "zod";

const toolInputSchema = z.record(z.string(), z.string()).default({});

export const toolsPostBodySchema = z.object({
  tool: z
    .string()
    .trim()
    .min(1, "tool name is required")
    .max(64, "tool name is too long")
    .regex(/^[a-z0-9_]+$/, "tool name must be snake_case"),
  input: toolInputSchema,
});

export type ToolsPostBody = z.infer<typeof toolsPostBodySchema>;

export function parseToolsPostBody(
  value: unknown,
):
  | { ok: true; data: ToolsPostBody }
  | { ok: false; error: string } {
  const parsed = toolsPostBodySchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid tools request body.",
    };
  }
  return { ok: true, data: parsed.data };
}
