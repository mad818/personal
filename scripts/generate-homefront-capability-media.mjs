import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const [, , heroSourceArg, droneSourceArg] = process.argv;

if (!heroSourceArg || !droneSourceArg) {
  console.error(
    "Usage: node scripts/generate-homefront-capability-media.mjs <hero-source.png> <drone-source.png>",
  );
  process.exit(1);
}

const rootDir = process.cwd();
const imageDir = path.join(rootDir, "public", "images");
const videoDir = path.join(rootDir, "public", "videos");

const heroSource = path.resolve(heroSourceArg);
const droneSource = path.resolve(droneSourceArg);
const heroPath = path.join(imageDir, "homefront-guardian-hero.webp");
const dronePath = path.join(imageDir, "homefront-drone-patrol.webp");
const reelPath = path.join(videoDir, "homefront-capability-reel.webm");

const reelWidth = 1280;
const reelHeight = 720;
const reelFrames = 72;
const reelFps = 12;

await fs.mkdir(imageDir, { recursive: true });
await fs.mkdir(videoDir, { recursive: true });

await sharp(heroSource)
  .resize(1920, 1080, { fit: "cover", position: "center" })
  .webp({ quality: 92, smartSubsample: true })
  .toFile(heroPath);

const droneImage = sharp(droneSource).ensureAlpha();
const droneMetadata = await droneImage.metadata();
const droneBuffer = await droneImage.raw().toBuffer();
const channels = 4;
const droneWidth = droneMetadata.width ?? 0;
const droneHeight = droneMetadata.height ?? 0;

if (!droneWidth || !droneHeight) {
  throw new Error("Drone source did not expose usable dimensions.");
}

for (let offset = 0; offset < droneBuffer.length; offset += channels) {
  const red = droneBuffer[offset] ?? 0;
  const green = droneBuffer[offset + 1] ?? 0;
  const blue = droneBuffer[offset + 2] ?? 0;
  const greenDominance = green - Math.max(red, blue);
  const greenDistance = Math.hypot(red, green - 255, blue);
  const isGreenScreen =
    green > 72 &&
    greenDominance > 16 &&
    green > red * 1.18 &&
    green > blue * 1.08;
  const matte = Math.min(255, Math.max(0, (greenDistance - 128) * 3.2));

  if (isGreenScreen) {
    droneBuffer[offset + 3] = matte;
    droneBuffer[offset + 1] = Math.min(green, Math.max(red, blue) + 20);
  } else if (green > red && green > blue) {
    droneBuffer[offset + 1] = Math.min(green, Math.max(red, blue) + 28);
  }

  if ((droneBuffer[offset + 3] ?? 255) < 170) {
    droneBuffer[offset + 3] = 0;
  }
}

const { data: trimmedDroneBuffer, info: trimmedDroneInfo } = await sharp(
  droneBuffer,
  {
    raw: {
      width: droneWidth,
      height: droneHeight,
      channels,
    },
  },
)
  .trim({ background: { r: 0, g: 255, b: 0, alpha: 0 }, threshold: 18 })
  .extend({
    top: 44,
    bottom: 44,
    left: 54,
    right: 54,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .resize(820, null, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: 92, alphaQuality: 92, smartSubsample: true })
  .toBuffer({ resolveWithObject: true });

await fs.writeFile(dronePath, trimmedDroneBuffer);

const droneReelBuffer = await sharp(trimmedDroneBuffer)
  .resize(250, null, { fit: "inside" })
  .webp({ quality: 86, alphaQuality: 88 })
  .toBuffer();

const frameBuffers = [];
const baseHeroFrame = await sharp(heroPath)
  .resize(reelWidth, reelHeight, { fit: "cover", position: "center" })
  .modulate({ brightness: 0.78, saturation: 1.05 })
  .toBuffer();

for (let frameIndex = 0; frameIndex < reelFrames; frameIndex += 1) {
  const t = frameIndex / reelFrames;
  const sweep = (Math.sin(t * Math.PI * 2) + 1) / 2;
  const pulse = (Math.sin(t * Math.PI * 8) + 1) / 2;
  const droneLeft = Math.round(84 + Math.sin(t * Math.PI * 2) * 30);
  const droneTop = Math.round(38 + Math.cos(t * Math.PI * 2) * 10);

  const overlaySvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${reelWidth}" height="${reelHeight}" viewBox="0 0 ${reelWidth} ${reelHeight}">
      <defs>
        <linearGradient id="shade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#000000" stop-opacity="0.62"/>
          <stop offset="0.45" stop-color="#000000" stop-opacity="0.13"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.72"/>
        </linearGradient>
        <linearGradient id="beam" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#9ceeff" stop-opacity="0"/>
          <stop offset="0.34" stop-color="#9ceeff" stop-opacity="${(0.18 + pulse * 0.11).toFixed(3)}"/>
          <stop offset="1" stop-color="#9ceeff" stop-opacity="0"/>
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="16"/></filter>
        <filter id="textShadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.75"/></filter>
      </defs>
      <rect width="${reelWidth}" height="${reelHeight}" fill="url(#shade)"/>
      <g opacity="0.17">
        ${Array.from({ length: 18 }, (_, index) => {
          const x = (index * 80 + frameIndex * 3) % (reelWidth + 80);
          return `<path d="M${x - 80} 0 V${reelHeight}" stroke="#aaf0ff" stroke-opacity="0.34" stroke-width="1"/>`;
        }).join("")}
        ${Array.from({ length: 10 }, (_, index) => {
          const y = index * 80;
          return `<path d="M0 ${y} H${reelWidth}" stroke="#aaf0ff" stroke-opacity="0.28" stroke-width="1"/>`;
        }).join("")}
      </g>
      <path d="M${190 + sweep * 130} 86 L978 704 L568 712 Z" fill="url(#beam)" filter="url(#soft)"/>
      <ellipse cx="${725 + sweep * 120}" cy="628" rx="340" ry="92" fill="#8cf4ea" opacity="${(0.07 + pulse * 0.055).toFixed(3)}" filter="url(#soft)"/>
      <g fill="none" stroke-linecap="round">
        <path d="M430 492 H590 V584 H430 Z" stroke="#6effcb" stroke-opacity="${(0.24 + pulse * 0.36).toFixed(3)}" stroke-width="2"/>
        <path d="M806 250 H1018 V394 H806 Z" stroke="#ffd280" stroke-opacity="${(0.24 + pulse * 0.28).toFixed(3)}" stroke-width="2"/>
        <path d="M120 610 C288 548 456 560 620 520 C800 477 1016 483 1166 538" stroke="#9ceeff" stroke-opacity="0.18" stroke-width="2" stroke-dasharray="8 14"/>
      </g>
      <g filter="url(#textShadow)" fill="none" stroke-linecap="round">
        <g transform="translate(56 548)" opacity="0.72">
          <rect width="306" height="74" rx="25" fill="rgba(2,6,10,0.38)" stroke="rgba(156,238,255,0.2)"/>
          <path d="M34 38 H254" stroke="rgba(156,238,255,0.22)" stroke-width="2" stroke-dasharray="8 14"/>
          <circle cx="${58 + pulse * 34}" cy="38" r="7" fill="#9ceeff" stroke="none" opacity="${(0.22 + pulse * 0.24).toFixed(3)}"/>
        </g>
        <g transform="translate(414 596)" opacity="0.7">
          <rect width="290" height="72" rx="24" fill="rgba(2,6,10,0.38)" stroke="rgba(110,255,203,0.22)"/>
          <path d="M34 36 C78 20 126 20 172 36 C212 50 238 46 258 34" stroke="rgba(110,255,203,0.23)" stroke-width="2"/>
          <circle cx="${72 + sweep * 140}" cy="36" r="6" fill="#6effcb" stroke="none" opacity="${(0.2 + pulse * 0.3).toFixed(3)}"/>
        </g>
        <g transform="translate(764 414)" opacity="0.74">
          <rect width="304" height="74" rx="25" fill="rgba(2,6,10,0.36)" stroke="rgba(255,210,128,0.22)"/>
          <path d="M38 38 H252" stroke="rgba(255,210,128,0.22)" stroke-width="2"/>
          <path d="M252 38 l-18 -14 M252 38 l-18 14" stroke="rgba(255,210,128,0.22)" stroke-width="2"/>
          <circle cx="${84 + sweep * 130}" cy="38" r="7" fill="#ffd280" stroke="none" opacity="${(0.22 + pulse * 0.28).toFixed(3)}"/>
        </g>
        <g transform="translate(930 568)" opacity="0.68">
          <rect width="300" height="76" rx="26" fill="rgba(2,6,10,0.38)" stroke="rgba(255,210,128,0.22)"/>
          <circle cx="58" cy="38" r="16" stroke="rgba(255,210,128,0.24)" stroke-width="2"/>
          <circle cx="150" cy="38" r="16" stroke="rgba(255,210,128,0.18)" stroke-width="2"/>
          <circle cx="242" cy="38" r="16" stroke="rgba(255,210,128,0.14)" stroke-width="2"/>
        </g>
        <g transform="translate(354 44)" opacity="0.66">
          <rect width="572" height="62" rx="31" fill="rgba(2,6,10,0.34)" stroke="rgba(255,255,255,0.12)"/>
          <path d="M64 34 H508" stroke="rgba(255,255,255,0.16)" stroke-width="2" stroke-dasharray="28 34"/>
          <circle cx="${64 + t * 444}" cy="34" r="6" fill="#7fe7ff" stroke="none" opacity="${(0.28 + pulse * 0.42).toFixed(3)}"/>
        </g>
      </g>
      <rect width="${reelWidth}" height="${reelHeight}" fill="none" stroke="rgba(219,249,255,0.08)" stroke-width="2"/>
    </svg>`,
  );

  const frameWebp = await sharp(baseHeroFrame)
    .composite([
      {
        input: droneReelBuffer,
        left: droneLeft,
        top: droneTop,
      },
      {
        input: overlaySvg,
        left: 0,
        top: 0,
      },
    ])
    .webp({ quality: 80, smartSubsample: true })
    .toBuffer();

  frameBuffers.push(extractVp8Frame(frameWebp));
}

await fs.writeFile(
  reelPath,
  createVp8Webm({
    durationMs: (reelFrames / reelFps) * 1000,
    fps: reelFps,
    frames: frameBuffers,
    height: reelHeight,
    width: reelWidth,
  }),
);

console.log(
  JSON.stringify(
    {
      heroPath,
      dronePath,
      reelPath,
      droneWidth: trimmedDroneInfo.width,
      droneHeight: trimmedDroneInfo.height,
      frameCount: frameBuffers.length,
    },
    null,
    2,
  ),
);

function extractVp8Frame(webpBuffer) {
  if (webpBuffer.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Expected RIFF WebP frame.");
  }

  let offset = 12;
  while (offset + 8 <= webpBuffer.length) {
    const chunkType = webpBuffer.toString("ascii", offset, offset + 4);
    const chunkSize = webpBuffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;

    if (chunkType === "VP8 ") {
      return webpBuffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  throw new Error("No VP8 chunk found in generated WebP frame.");
}

function createVp8Webm({ durationMs, fps, frames, height, width }) {
  const frameStepMs = Math.round(1000 / fps);
  const clusterBlocks = [
    element([0xe7], uintBuffer(0)),
    ...frames.map((frame, index) => {
      const block = Buffer.alloc(4 + frame.length);
      block[0] = 0x81;
      block.writeInt16BE(index * frameStepMs, 1);
      block[3] = 0x80;
      frame.copy(block, 4);
      return element([0xa3], block);
    }),
  ];

  const segmentChildren = [
    element(
      [0x15, 0x49, 0xa9, 0x66],
      Buffer.concat([
        element([0x2a, 0xd7, 0xb1], uintBuffer(1_000_000)),
        element([0x4d, 0x80], stringBuffer("homefront-media")),
        element([0x57, 0x41], stringBuffer("homefront-media")),
        element([0x44, 0x89], float64Buffer(durationMs)),
      ]),
    ),
    element(
      [0x16, 0x54, 0xae, 0x6b],
      element(
        [0xae],
        Buffer.concat([
          element([0xd7], uintBuffer(1)),
          element([0x73, 0xc5], uintBuffer(1)),
          element([0x83], uintBuffer(1)),
          element([0x86], stringBuffer("V_VP8")),
          element(
            [0xe0],
            Buffer.concat([
              element([0xb0], uintBuffer(width)),
              element([0xba], uintBuffer(height)),
            ]),
          ),
        ]),
      ),
    ),
    element([0x1f, 0x43, 0xb6, 0x75], Buffer.concat(clusterBlocks)),
  ];

  return Buffer.concat([
    element(
      [0x1a, 0x45, 0xdf, 0xa3],
      Buffer.concat([
        element([0x42, 0x86], uintBuffer(1)),
        element([0x42, 0xf7], uintBuffer(1)),
        element([0x42, 0xf2], uintBuffer(4)),
        element([0x42, 0xf3], uintBuffer(8)),
        element([0x42, 0x82], stringBuffer("webm")),
        element([0x42, 0x87], uintBuffer(4)),
        element([0x42, 0x85], uintBuffer(2)),
      ]),
    ),
    element([0x18, 0x53, 0x80, 0x67], Buffer.concat(segmentChildren)),
  ]);
}

function element(idBytes, data) {
  return Buffer.concat([Buffer.from(idBytes), vintSize(data.length), data]);
}

function vintSize(size) {
  for (let width = 1; width <= 8; width += 1) {
    const max = 2 ** (7 * width) - 2;
    if (size <= max) {
      const buffer = Buffer.alloc(width);
      let value = size;
      for (let index = width - 1; index >= 0; index -= 1) {
        buffer[index] = value & 0xff;
        value = Math.floor(value / 256);
      }
      buffer[0] |= 1 << (8 - width);
      return buffer;
    }
  }

  throw new Error(`EBML size is too large: ${size}`);
}

function uintBuffer(value) {
  const bytes = [];
  let next = value;
  do {
    bytes.unshift(next & 0xff);
    next = Math.floor(next / 256);
  } while (next > 0);
  return Buffer.from(bytes);
}

function float64Buffer(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeDoubleBE(value, 0);
  return buffer;
}

function stringBuffer(value) {
  return Buffer.from(value, "utf8");
}
