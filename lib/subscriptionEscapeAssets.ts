import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const DEFAULT_ASSET_DIR = path.join(
  process.cwd(),
  "data",
  "subscription-escape-assets",
);

const ASSET_DIR =
  process.env.NEXUS_SUBSCRIPTION_ESCAPE_ASSET_DIR ?? DEFAULT_ASSET_DIR;

const MAX_ASSET_BYTES = 5 * 1024 * 1024;

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

type UploadableImage = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name?: string;
  size?: number;
  type?: string;
};

function getSafeExtension(file: UploadableImage) {
  const typeExtension = file.type
    ? EXTENSION_BY_CONTENT_TYPE[file.type.toLowerCase()]
    : undefined;
  if (typeExtension) return typeExtension;

  const nameExtension = path.extname(file.name ?? "").toLowerCase();
  return CONTENT_TYPE_BY_EXTENSION[nameExtension] ? nameExtension : null;
}

function assertSafeAssetFileName(fileName: string) {
  if (!/^asset-[a-f0-9-]+\.(gif|jpe?g|png|webp)$/i.test(fileName)) {
    throw new Error("Unsafe asset filename.");
  }
}

export function getSubscriptionEscapeAssetStoragePath() {
  return ASSET_DIR;
}

export async function saveSubscriptionEscapeAsset(file: UploadableImage) {
  const extension = getSafeExtension(file);
  if (!extension) {
    throw new Error("Only PNG, JPG, GIF, and WebP images are supported.");
  }

  if (typeof file.size === "number" && file.size > MAX_ASSET_BYTES) {
    throw new Error("Image is too large.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_ASSET_BYTES) {
    throw new Error("Image is too large.");
  }

  await mkdir(ASSET_DIR, { recursive: true });
  const fileName = `asset-${randomUUID()}${extension}`;
  const fullPath = path.join(ASSET_DIR, fileName);
  await writeFile(fullPath, buffer);

  return {
    fileName,
    url: `/api/subscription-escape/assets/${fileName}`,
    contentType: CONTENT_TYPE_BY_EXTENSION[extension],
    size: buffer.byteLength,
  };
}

export async function readSubscriptionEscapeAsset(fileName: string) {
  assertSafeAssetFileName(fileName);
  const extension = path.extname(fileName).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
  if (!contentType) {
    throw new Error("Unsupported asset type.");
  }

  const fullPath = path.join(ASSET_DIR, fileName);
  const buffer = await readFile(fullPath);
  return {
    buffer,
    contentType,
  };
}
