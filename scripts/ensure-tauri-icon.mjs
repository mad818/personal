import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconPath = resolve(__dirname, "../desktop/src-tauri/icons/icon.ico");

if (!existsSync(iconPath)) {
  mkdirSync(dirname(iconPath), { recursive: true });

  // Minimal 1x1 .ico so tauri-build can generate Windows resources.
  const iconBytes = Buffer.from(
    "00000100010001010000010020003000000016000000280000000100000002000000010020000000000004000000000000000000000000000000000000000080FFFF00000000",
    "hex",
  );

  writeFileSync(iconPath, iconBytes);
  console.log(`[desktop] Created missing icon: ${iconPath}`);
}
