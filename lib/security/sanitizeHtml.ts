/**
 * Lightweight HTML sanitizer for UI-rendered snippets.
 * Removes script/style tags, inline event handlers, and javascript: URIs.
 * This is a defense-in-depth layer for externally sourced text fragments.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}
