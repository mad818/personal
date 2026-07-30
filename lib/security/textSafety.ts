const BASIC_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  "#39": "'",
  lt: "<",
  gt: ">",
};

const BLOCK_TAGS = new Set([
  "br",
  "div",
  "li",
  "p",
  "table",
  "tbody",
  "thead",
  "tr",
]);

const CELL_TAGS = new Set(["td", "th"]);

export function decodeBasicHtmlEntities(value: string) {
  return value.replace(/&(amp|quot|#39|lt|gt);/g, (entity, name: string) =>
    Object.prototype.hasOwnProperty.call(BASIC_HTML_ENTITIES, name)
      ? BASIC_HTML_ENTITIES[name]!
      : entity,
  );
}

export function trimRepeatedEdgeCharacter(value: string, character: string) {
  if (character.length !== 1 || !value) return value;
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === character) start += 1;
  while (end > start && value[end - 1] === character) end -= 1;
  return value.slice(start, end);
}

export function trimTrailingUrlPunctuation(value: string) {
  const punctuation = new Set([")", ",", ".", ";"]);
  let end = value.length;
  while (end > 0 && punctuation.has(value[end - 1]!)) end -= 1;
  return value.slice(0, end);
}

export function splitOnStandaloneVs(value: string) {
  const tokens = value.trim().split(/\s+/);
  const groups: string[] = [];
  let current: string[] = [];
  for (const token of tokens) {
    if (token.toLowerCase() === "vs") {
      if (current.length > 0) groups.push(current.join(" "));
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) groups.push(current.join(" "));
  return groups;
}

function readTagName(rawTag: string) {
  let index = 0;
  while (index < rawTag.length && /\s/.test(rawTag[index]!)) index += 1;
  if (rawTag[index] === "/") index += 1;
  while (index < rawTag.length && /\s/.test(rawTag[index]!)) index += 1;
  const start = index;
  while (index < rawTag.length && /[a-z0-9]/i.test(rawTag[index]!)) {
    index += 1;
  }
  return rawTag.slice(start, index).toLowerCase();
}

/**
 * Converts bounded HTML-like snippets to plain text without returning any
 * caller-controlled markup. Structural tags become whitespace so tables and
 * line-oriented results remain readable.
 */
export function htmlToPlainText(value: string) {
  let output = "";
  let index = 0;

  while (index < value.length) {
    if (value[index] !== "<") {
      output += value[index];
      index += 1;
      continue;
    }

    const tagEnd = value.indexOf(">", index + 1);
    if (tagEnd === -1) {
      output += "<";
      index += 1;
      continue;
    }

    const rawTag = value.slice(index + 1, tagEnd);
    const tagName = readTagName(rawTag);
    if (tagName === "script" || tagName === "style") {
      const closing = `</${tagName}`;
      const closingStart = value.toLowerCase().indexOf(closing, tagEnd + 1);
      if (closingStart === -1) {
        break;
      }
      const closingEnd = value.indexOf(">", closingStart + closing.length);
      index = closingEnd === -1 ? value.length : closingEnd + 1;
      continue;
    }

    if (BLOCK_TAGS.has(tagName)) output += "\n";
    else if (CELL_TAGS.has(tagName)) output += "\t";
    index = tagEnd + 1;
  }

  return decodeBasicHtmlEntities(output)
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/ *\r?\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
