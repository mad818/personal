import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, "../desktop/src-tauri/icons");
const icoPath = resolve(iconsDir, "icon.ico");
const pngPath = resolve(iconsDir, "icon.png");
const publicIcoPath = resolve(__dirname, "../public/favicon.ico");
const publicPngPath = resolve(__dirname, "../public/apple-touch-icon.png");

mkdirSync(iconsDir, { recursive: true });

if (!existsSync(icoPath)) {
  if (existsSync(publicIcoPath)) {
    copyFileSync(publicIcoPath, icoPath);
  } else {
    // Minimal 1x1 .ico so tauri-build can generate Windows resources.
    const iconBytes = Buffer.from(
      "00000100010001010000010020003000000016000000280000000100000002000000010020000000000004000000000000000000000000000000000000000080FFFF00000000",
      "hex",
    );

    writeFileSync(icoPath, iconBytes);
  }

  console.log(`[desktop] Created missing icon: ${icoPath}`);
}

if (!existsSync(pngPath)) {
  if (existsSync(publicPngPath)) {
    copyFileSync(publicPngPath, pngPath);
  } else {
    // Minimal 1x1 transparent PNG fallback.
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7n2QAAAAASUVORK5CYII=",
      "base64",
    );

    writeFileSync(pngPath, pngBytes);
  }

  console.log(`[desktop] Created missing icon: ${pngPath}`);
}
