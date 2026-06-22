#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sheet = {
  id: "prologue-hifi-story-pack",
  source: "assets/arpg/illustrated/generated-source/prologue-hifi-story-pack.png",
  output: "public/arpg/illustrated/prologue-hifi-story-pack.png",
  sourceWidth: 1600,
  sourceHeight: 640,
  gridColumns: 5,
  gridRows: 2,
  frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  frameWidth: 320,
  frameHeight: 320,
  frameCount: 10,
  pngPalette: true,
};

function gridRect(frameIndex) {
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

async function main() {
  const sourcePath = path.join(repoRoot, sheet.source);
  const outputPath = path.join(repoRoot, sheet.output);

  try {
    await fs.access(sourcePath);
  } catch {
    console.error(
      [
        "Prologue high-fidelity source sheet is missing.",
        `Place operator-approved art at ${sheet.source}.`,
        "Use docs/game/aether-reliquary/generation-records/next-prologue-hifi-story-pack.md for the prompt contract.",
        "Then rerun npm run arpg:prologue-hifi:generate.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const sourceMetadata = await sharp(sourcePath).metadata();
  if (
    sourceMetadata.width !== sheet.sourceWidth ||
    sourceMetadata.height !== sheet.sourceHeight
  ) {
    throw new Error(
      `${sheet.id}: source dimensions drifted. Expected ${sheet.sourceWidth}x${sheet.sourceHeight}, received ${sourceMetadata.width}x${sourceMetadata.height}.`,
    );
  }

  const pngOptions = {
    compressionLevel: 9,
    effort: 10,
    palette: Boolean(sheet.pngPalette),
  };

  const frames = await Promise.all(
    sheet.frames.map((frameIndex) =>
      sharp(sourcePath)
        .extract(gridRect(frameIndex))
        .resize(sheet.frameWidth, sheet.frameHeight, {
          fit: "cover",
          position: "center",
        })
        .png(pngOptions)
        .toBuffer(),
    ),
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
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

  const outputMetadata = await sharp(outputPath).metadata();
  const expectedWidth = sheet.frameWidth * sheet.frameCount;
  const expectedHeight = sheet.frameHeight;
  if (outputMetadata.width !== expectedWidth || outputMetadata.height !== expectedHeight) {
    throw new Error(
      `${sheet.id}: output dimensions drifted. Expected ${expectedWidth}x${expectedHeight}, received ${outputMetadata.width}x${outputMetadata.height}.`,
    );
  }

  const stats = await fs.stat(outputPath);
  if (stats.size > 2 * 1024 * 1024) {
    throw new Error(`${sheet.id}: ${sheet.output} exceeds the 2MB illustrated asset budget.`);
  }

  console.log(
    `${sheet.id}: ${sheet.source} -> ${sheet.output} (${sheet.frameCount} frames, ${sheet.frameWidth}x${sheet.frameHeight})`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
