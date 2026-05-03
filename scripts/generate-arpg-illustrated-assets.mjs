import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sheets = [
  {
    id: "illustrated-character-portrait-seeds",
    source: "assets/arpg/illustrated/source/character-portraits.svg",
    output: "public/arpg/illustrated/character-portraits.png",
    width: 768,
    height: 256,
    frameWidth: 256,
    frameHeight: 256,
    frameCount: 3,
  },
  {
    id: "illustrated-enemy-card-seeds",
    source: "assets/arpg/illustrated/source/enemy-cards.svg",
    output: "public/arpg/illustrated/enemy-cards.png",
    width: 1280,
    height: 448,
    frameWidth: 320,
    frameHeight: 448,
    frameCount: 4,
  },
  {
    id: "enemy-boss-hifi-cards",
    mode: "grid-extract",
    source: "assets/arpg/illustrated/generated-source/enemy-boss-hifi-cards.png",
    output: "public/arpg/illustrated/enemy-boss-hifi-cards.png",
    sourceWidth: 1536,
    sourceHeight: 1024,
    gridColumns: 4,
    gridRows: 2,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameWidth: 320,
    frameHeight: 448,
    frameCount: 8,
    pngPalette: true,
  },
  {
    id: "illustrated-location-card-seeds",
    source: "assets/arpg/illustrated/source/location-cards.svg",
    output: "public/arpg/illustrated/location-cards.png",
    width: 960,
    height: 192,
    frameWidth: 320,
    frameHeight: 192,
    frameCount: 3,
  },
  {
    id: "illustrated-gear-icon-seeds",
    source: "assets/arpg/illustrated/source/gear-icons.svg",
    output: "public/arpg/illustrated/gear-icons.png",
    width: 512,
    height: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 8,
  },
  {
    id: "illustrated-skill-vfx-icon-seeds",
    source: "assets/arpg/illustrated/source/skill-vfx-icons.svg",
    output: "public/arpg/illustrated/skill-vfx-icons.png",
    width: 384,
    height: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
  },
  {
    id: "hero-kit-character-portraits",
    mode: "grid-extract",
    source: "assets/arpg/illustrated/generated-source/hero-kit-portraits-outfits.png",
    output: "public/arpg/illustrated/hero-kit-character-portraits.png",
    sourceWidth: 1536,
    sourceHeight: 1024,
    gridColumns: 3,
    gridRows: 2,
    frames: [0, 1, 2],
    frameWidth: 256,
    frameHeight: 256,
    frameCount: 3,
  },
  {
    id: "hero-kit-class-outfits",
    mode: "grid-extract",
    source: "assets/arpg/illustrated/generated-source/hero-kit-portraits-outfits.png",
    output: "public/arpg/illustrated/hero-kit-class-outfits.png",
    sourceWidth: 1536,
    sourceHeight: 1024,
    gridColumns: 3,
    gridRows: 2,
    frames: [3, 4, 5],
    frameWidth: 256,
    frameHeight: 384,
    frameCount: 3,
  },
  {
    id: "hero-kit-weapons-items",
    mode: "grid-extract",
    source: "assets/arpg/illustrated/generated-source/hero-kit-weapons-items.png",
    output: "public/arpg/illustrated/hero-kit-weapons-items.png",
    sourceWidth: 1536,
    sourceHeight: 1024,
    gridColumns: 4,
    gridRows: 3,
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 12,
  },
  {
    id: "hero-kit-armor-equipment",
    mode: "grid-extract",
    source: "assets/arpg/illustrated/generated-source/hero-kit-armor-equipment.png",
    output: "public/arpg/illustrated/hero-kit-armor-equipment.png",
    sourceWidth: 1536,
    sourceHeight: 1024,
    gridColumns: 4,
    gridRows: 2,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 8,
  },
  {
    id: "arsenal-weapon-family-icons",
    source: "assets/arpg/illustrated/source/arsenal-weapon-icons.svg",
    output: "public/arpg/illustrated/arsenal-weapon-icons.png",
    width: 2016,
    height: 96,
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 21,
  },
  {
    id: "arsenal-quality-overlays",
    source: "assets/arpg/illustrated/source/arsenal-quality-overlays.svg",
    output: "public/arpg/illustrated/arsenal-quality-overlays.png",
    width: 672,
    height: 96,
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 7,
  },
  {
    id: "arsenal-named-weapon-cards",
    source: "assets/arpg/illustrated/source/arsenal-named-weapon-cards.svg",
    output: "public/arpg/illustrated/arsenal-named-weapon-cards.png",
    width: 2048,
    height: 384,
    frameWidth: 256,
    frameHeight: 384,
    frameCount: 8,
  },
  {
    id: "arsenal-vfx-drops",
    source: "assets/arpg/illustrated/source/arsenal-vfx-drops.svg",
    output: "public/arpg/illustrated/arsenal-vfx-drops.png",
    width: 1536,
    height: 128,
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 12,
  },
  {
    id: "prologue-location-cards",
    source: "assets/arpg/illustrated/source/prologue-location-cards.svg",
    output: "public/arpg/illustrated/prologue-location-cards.png",
    width: 640,
    height: 192,
    frameWidth: 320,
    frameHeight: 192,
    frameCount: 2,
  },
  {
    id: "prologue-companion-portraits",
    source: "assets/arpg/illustrated/source/prologue-companion-portraits.svg",
    output: "public/arpg/illustrated/prologue-companion-portraits.png",
    width: 512,
    height: 256,
    frameWidth: 256,
    frameHeight: 256,
    frameCount: 2,
  },
  {
    id: "prologue-story-prop-icons",
    source: "assets/arpg/illustrated/source/prologue-story-props.svg",
    output: "public/arpg/illustrated/prologue-story-props.png",
    width: 576,
    height: 96,
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 6,
  },
];

function assertSheetShape(sheet, metadata, label) {
  const expectedWidth = sheet.width ?? sheet.frameWidth * sheet.frameCount;
  const expectedHeight = sheet.height ?? sheet.frameHeight;
  if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(
      `${sheet.id}: ${label} dimensions drifted. Expected ${expectedWidth}x${expectedHeight}, received ${metadata.width}x${metadata.height}.`,
    );
  }

  const capacity =
    Math.floor(expectedWidth / sheet.frameWidth) *
    Math.floor(expectedHeight / sheet.frameHeight);
  if (capacity < sheet.frameCount) {
    throw new Error(`${sheet.id}: frame grid cannot hold ${sheet.frameCount} frames.`);
  }
}

function assertSourceShape(sheet, metadata) {
  const expectedWidth = sheet.sourceWidth ?? sheet.width;
  const expectedHeight = sheet.sourceHeight ?? sheet.height;
  if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(
      `${sheet.id}: source dimensions drifted. Expected ${expectedWidth}x${expectedHeight}, received ${metadata.width}x${metadata.height}.`,
    );
  }
}

function gridRect(sheet, frameIndex) {
  const column = frameIndex % sheet.gridColumns;
  const row = Math.floor(frameIndex / sheet.gridColumns);
  const left = Math.round((column * sheet.sourceWidth) / sheet.gridColumns);
  const top = Math.round((row * sheet.sourceHeight) / sheet.gridRows);
  const right = Math.round(((column + 1) * sheet.sourceWidth) / sheet.gridColumns);
  const bottom = Math.round(((row + 1) * sheet.sourceHeight) / sheet.gridRows);
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

async function writeGridExtractedSheet(sheet, sourcePath, outputPath) {
  const pngOptions = {
    compressionLevel: 9,
    effort: 10,
    palette: Boolean(sheet.pngPalette),
  };
  const frames = await Promise.all(
    sheet.frames.map((frameIndex) =>
      sharp(sourcePath)
        .extract(gridRect(sheet, frameIndex))
        .resize(sheet.frameWidth, sheet.frameHeight, {
          fit: "cover",
          position: "center",
        })
        .png(pngOptions)
        .toBuffer(),
    ),
  );

  await sharp({
    create: {
      width: sheet.frameWidth * sheet.frameCount,
      height: sheet.frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames.map((input, index) => ({ input, left: index * sheet.frameWidth, top: 0 })))
    .png(pngOptions)
    .toFile(outputPath);
}

for (const sheet of sheets) {
  const sourcePath = path.join(repoRoot, sheet.source);
  const outputPath = path.join(repoRoot, sheet.output);
  await fs.access(sourcePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const sourceMetadata = await sharp(sourcePath).metadata();
  assertSourceShape(sheet, sourceMetadata);

  if (sheet.mode === "grid-extract") {
    await writeGridExtractedSheet(sheet, sourcePath, outputPath);
  } else {
    await sharp(sourcePath)
      .png({
        compressionLevel: 9,
        effort: 10,
        palette: false,
      })
      .toFile(outputPath);
  }

  const outputMetadata = await sharp(outputPath).metadata();
  assertSheetShape(sheet, outputMetadata, "output");

  const stats = await fs.stat(outputPath);
  if (stats.size > 2 * 1024 * 1024) {
    throw new Error(`${sheet.id}: ${sheet.output} exceeds the 2MB illustrated asset budget.`);
  }

  console.log(
    `${sheet.id}: ${sheet.source} -> ${sheet.output} (${sheet.frameCount} frames, ${sheet.frameWidth}x${sheet.frameHeight})`,
  );
}
