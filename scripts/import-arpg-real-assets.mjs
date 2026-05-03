import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workRoot = path.join(repoRoot, "assets", "arpg", "intake", "work");
const outputRoot = path.join(repoRoot, "public", "arpg", "imported");
const candidatePath = path.join(repoRoot, "lib", "arpgAssetCandidateSources.json");
const candidates = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const candidateIds = new Set(candidates.map((candidate) => candidate.id));
const errors = [];
const warnings = [];
const imported = [];
const args = new Set(process.argv.slice(2));

const allowedExtensions = new Set([
  ".bin",
  ".glb",
  ".gltf",
  ".jpg",
  ".jpeg",
  ".ktx2",
  ".png",
  ".webp",
]);
const rejectedExtensions = new Set([".7z", ".rar", ".tar", ".gz", ".zip"]);
const maxModelBytes = 20 * 1024 * 1024;
const maxTextureBytes = 8 * 1024 * 1024;

function fail(message) {
  errors.push(message);
}

function ensureInsideRoot(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function collectFiles(rootPath) {
  if (!fs.existsSync(rootPath)) return [];
  const files = [];
  const stack = [rootPath];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function assertGltfReadable(filePath, relativePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension !== ".glb" && extension !== ".gltf") return;

  let gltf;
  try {
    if (extension === ".glb") {
      const buffer = fs.readFileSync(filePath);
      const magic = buffer.subarray(0, 4).toString("utf8");
      if (magic !== "glTF") {
        fail(`${relativePath}: GLB is missing glTF binary magic header`);
        return;
      }
      if (buffer.readUInt32LE(4) !== 2) {
        fail(`${relativePath}: GLB must use glTF version 2`);
        return;
      }
      const jsonChunkLength = buffer.readUInt32LE(12);
      const jsonChunkType = buffer.subarray(16, 20).toString("utf8");
      if (jsonChunkType !== "JSON") {
        fail(`${relativePath}: GLB must start with a JSON chunk`);
        return;
      }
      const jsonChunk = buffer
        .subarray(20, 20 + jsonChunkLength)
        .toString("utf8")
        .replace(/\0+$/g, "")
        .trim();
      gltf = JSON.parse(jsonChunk);
    } else {
      gltf = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (error) {
    fail(`${relativePath}: glTF/GLB JSON could not be parsed (${error instanceof Error ? error.message : String(error)})`);
    return;
  }

  if (!gltf.asset || gltf.asset.version !== "2.0") {
    fail(`${relativePath}: glTF must declare asset.version 2.0`);
  }

  for (const field of ["scenes", "nodes", "meshes", "materials"]) {
    if (!Array.isArray(gltf[field]) || gltf[field].length === 0) {
      fail(`${relativePath}: glTF must include non-empty ${field}`);
    }
  }
}

function copyImportedFile(filePath) {
  const relative = path.relative(workRoot, filePath);
  const parts = relative.split(path.sep);
  const candidateId = parts[0];
  const extension = path.extname(filePath).toLowerCase();
  const size = fs.statSync(filePath).size;

  if (!candidateIds.has(candidateId)) {
    fail(`${relative}: first work folder segment must match a known asset candidate id`);
    return;
  }

  if (rejectedExtensions.has(extension)) {
    fail(`${relative}: raw archives belong in assets/arpg/intake/raw/, not work/`);
    return;
  }

  if (!allowedExtensions.has(extension)) {
    warnings.push(`${relative}: skipped unsupported runtime extension ${extension || "(none)"}`);
    return;
  }

  if ((extension === ".glb" || extension === ".gltf") && size > maxModelBytes) {
    fail(`${relative}: model exceeds ${Math.round(maxModelBytes / 1024 / 1024)}MB browser intake budget`);
    return;
  }

  if ([".jpg", ".jpeg", ".ktx2", ".png", ".webp"].includes(extension) && size > maxTextureBytes) {
    fail(`${relative}: texture/preview exceeds ${Math.round(maxTextureBytes / 1024 / 1024)}MB browser intake budget`);
    return;
  }

  assertGltfReadable(filePath, relative);

  const destination = path.join(outputRoot, candidateId, ...parts.slice(1));
  if (!ensureInsideRoot(destination, outputRoot)) {
    fail(`${relative}: destination would escape public/arpg/imported`);
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(filePath, destination);
  imported.push({
    candidateId,
    source: path.relative(repoRoot, filePath).replaceAll("\\", "/"),
    output: path.relative(repoRoot, destination).replaceAll("\\", "/"),
    bytes: size,
  });
}

fs.mkdirSync(workRoot, { recursive: true });
fs.mkdirSync(outputRoot, { recursive: true });

const files = collectFiles(workRoot);
for (const file of files) copyImportedFile(file);

if (errors.length) {
  console.error("ARPG real asset import failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const report = [
  "# Aether Reliquary Real Asset Import Report",
  "",
  `Work folder: assets/arpg/intake/work/`,
  `Runtime folder: public/arpg/imported/`,
  `Imported files: ${imported.length}`,
  "",
  imported.length
    ? imported.map((entry) => `- ${entry.output} (${entry.candidateId}, ${entry.bytes} bytes)`).join("\n")
    : "- No work files were found. Place extracted official CC0 pack files under assets/arpg/intake/work/<candidate-id>/ and rerun.",
  "",
  warnings.length ? "## Warnings\n\n" + warnings.map((warning) => `- ${warning}`).join("\n") : "",
].filter(Boolean).join("\n");

if (args.has("--write-report")) {
  const reportDir = path.join(repoRoot, "docs", "game", "aether-reliquary", "import-reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest-real-asset-intake.md"), `${report}\n`);
}

console.log(report);
