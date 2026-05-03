import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sheets = [
  {
    id: "original-first-reliquary-enemy-sheet",
    source: "assets/arpg/original/first-reliquary-enemies.svg",
    output: "public/arpg/enemies-first-reliquary.png",
    width: 384,
    height: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
  },
  {
    id: "original-first-reliquary-item-icons",
    source: "assets/arpg/original/first-reliquary-items.svg",
    output: "public/arpg/items-first-reliquary.png",
    width: 192,
    height: 192,
    frameWidth: 48,
    frameHeight: 48,
    frameCount: 16,
  },
  {
    id: "original-first-reliquary-status-icons",
    source: "assets/arpg/original/first-reliquary-status.svg",
    output: "public/arpg/status-effects.png",
    width: 256,
    height: 64,
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 16,
  },
  {
    id: "original-armory-weapon-icons",
    source: "assets/arpg/original/armory-weapon-icons.svg",
    output: "public/arpg/armory-weapon-icons.png",
    width: 336,
    height: 144,
    frameWidth: 48,
    frameHeight: 48,
    frameCount: 21,
  },
  {
    id: "original-economy-material-icons",
    source: "assets/arpg/original/economy-material-icons.svg",
    output: "public/arpg/economy-material-icons.png",
    width: 192,
    height: 192,
    frameWidth: 48,
    frameHeight: 48,
    frameCount: 16,
  },
  {
    id: "original-player-character-sprites",
    source: "assets/arpg/original/player-character-sprites.svg",
    output: "public/arpg/player-character-sprites.png",
    width: 384,
    height: 256,
    frameWidth: 96,
    frameHeight: 128,
    frameCount: 8,
    palette: false,
  },
  {
    id: "original-armor-cosmetic-icons",
    source: "assets/arpg/original/armor-cosmetic-icons.svg",
    output: "public/arpg/armor-cosmetic-icons.png",
    width: 256,
    height: 192,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 12,
    palette: false,
  },
];

function assertSheetShape(sheet, metadata, label) {
  if (metadata.width !== sheet.width || metadata.height !== sheet.height) {
    throw new Error(
      `${sheet.id}: ${label} dimensions drifted. Expected ${sheet.width}x${sheet.height}, received ${metadata.width}x${metadata.height}.`,
    );
  }

  const columns = Math.floor(sheet.width / sheet.frameWidth);
  const rows = Math.floor(sheet.height / sheet.frameHeight);
  if (columns * rows < sheet.frameCount) {
    throw new Error(`${sheet.id}: frame grid cannot hold ${sheet.frameCount} frames.`);
  }
}

for (const sheet of sheets) {
  const sourcePath = path.join(repoRoot, sheet.source);
  const outputPath = path.join(repoRoot, sheet.output);
  await fs.access(sourcePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const sourceMetadata = await sharp(sourcePath).metadata();
  assertSheetShape(sheet, sourceMetadata, "source");

  await sharp(sourcePath)
    .png({
      compressionLevel: 9,
      palette: sheet.palette ?? true,
      effort: 10,
    })
    .toFile(outputPath);

  const outputMetadata = await sharp(outputPath).metadata();
  assertSheetShape(sheet, outputMetadata, "output");
  console.log(
    `${sheet.id}: ${sheet.source} -> ${sheet.output} (${sheet.frameCount} frames, ${sheet.frameWidth}x${sheet.frameHeight})`,
  );
}
