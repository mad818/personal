// ── components/recon/MetadataExtractor ──────────────────────
// Client-side EXIF and metadata extraction from images and PDFs.
// Nothing is uploaded — all processing happens in the browser.

"use client";

import { useCallback, useRef, useState } from "react";
import { takeSelectedFile } from "@/components/ui/fileInput";

interface MetaRow {
  key: string;
  value: string;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Read EXIF from JPEG via DataView — no external lib needed
function readJpegExif(buf: ArrayBuffer): MetaRow[] {
  const view = new DataView(buf);
  const rows: MetaRow[] = [];

  // Check JPEG SOI marker
  if (view.getUint16(0) !== 0xffd8) return [];

  // Walk JPEG segments looking for APP1 (EXIF)
  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);
    offset += 2;
    if (marker === 0xffe1) {
      // APP1 — check for "Exif\0\0"
      const segLen = view.getUint16(offset);
      const exifHeader = String.fromCharCode(
        view.getUint8(offset + 2),
        view.getUint8(offset + 3),
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
      );
      if (exifHeader === "Exif") {
        // Found EXIF — parse basic IFD0 tags
        const tiffOffset = offset + 8;
        const littleEndian = view.getUint16(tiffOffset) === 0x4949;
        const getU16 = (o: number) => view.getUint16(o, littleEndian);
        const getU32 = (o: number) => view.getUint32(o, littleEndian);

        const ifd0 = tiffOffset + getU32(tiffOffset + 4);
        const entries = getU16(ifd0);

        const TAG_NAMES: Record<number, string> = {
          0x010f: "Camera Make",
          0x0110: "Camera Model",
          0x0131: "Software",
          0x0132: "DateTime",
          0x013b: "Artist",
          0x8769: "EXIF IFD",
          0x013e: "WhitePoint",
          0x0112: "Orientation",
          0x011a: "X Resolution",
          0x011b: "Y Resolution",
          0x0213: "YCbCr Positioning",
        };

        for (let i = 0; i < Math.min(entries, 30); i++) {
          const entryOffset = ifd0 + 2 + i * 12;
          const tag = getU16(entryOffset);
          const type = getU16(entryOffset + 2);
          const count = getU32(entryOffset + 4);
          const name = TAG_NAMES[tag];
          if (!name) continue;

          // ASCII string (type 2)
          if (type === 2 && count > 0) {
            const valueOffset =
              count <= 4
                ? entryOffset + 8
                : tiffOffset + getU32(entryOffset + 8);
            let str = "";
            for (let j = 0; j < count - 1 && j < 64; j++) {
              const ch = view.getUint8(valueOffset + j);
              if (ch === 0) break;
              str += String.fromCharCode(ch);
            }
            if (str) rows.push({ key: name, value: str.trim() });
          }
        }
      }
      offset += segLen;
    } else if ((marker & 0xff00) === 0xff00) {
      const segLen = view.getUint16(offset);
      offset += segLen;
    } else break;
  }
  return rows;
}

function readPngMeta(buf: ArrayBuffer): MetaRow[] {
  const view = new DataView(buf);
  const rows: MetaRow[] = [];
  // PNG signature: 8 bytes
  let offset = 8;
  const decoder = new TextDecoder();
  while (offset < view.byteLength - 12) {
    const length = view.getUint32(offset);
    const type = decoder.decode(new Uint8Array(buf, offset + 4, 4));
    if (type === "tEXt") {
      const data = new Uint8Array(buf, offset + 8, length);
      const nullIdx = data.indexOf(0);
      if (nullIdx > 0) {
        const key = decoder.decode(data.slice(0, nullIdx));
        const val = decoder.decode(data.slice(nullIdx + 1));
        rows.push({ key: esc(key), value: esc(val) });
      }
    }
    if (type === "IEND") break;
    offset += 12 + length;
  }
  return rows;
}

function genericMeta(file: File): MetaRow[] {
  const rows: MetaRow[] = [
    { key: "Filename", value: file.name },
    { key: "Type", value: file.type || "unknown" },
    { key: "Size", value: `${(file.size / 1024).toFixed(1)} KB` },
    {
      key: "Modified",
      value: new Date(file.lastModified)
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),
    },
  ];
  return rows;
}

export default function MetadataExtractor() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingInFlightRef = useRef(false);
  const [rows, setRows] = useState<MetaRow[]>([]);
  const [fname, setFname] = useState("");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const process = useCallback(async (file: File) => {
    if (processingInFlightRef.current) return;
    processingInFlightRef.current = true;
    setProcessing(true);
    setError("");
    setFname(file.name);
    const base = genericMeta(file);

    try {
      const buf = await file.arrayBuffer();
      let extra: MetaRow[] = [];

      if (
        file.type === "image/jpeg" ||
        file.name.toLowerCase().endsWith(".jpg") ||
        file.name.toLowerCase().endsWith(".jpeg")
      ) {
        extra = readJpegExif(buf);
      } else if (
        file.type === "image/png" ||
        file.name.toLowerCase().endsWith(".png")
      ) {
        extra = readPngMeta(buf);
      }

      setRows([...base, ...extra]);
    } catch (e) {
      setRows(base);
      setError(`Could not parse metadata: ${String(e)}`);
    } finally {
      processingInFlightRef.current = false;
      setProcessing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void process(file);
    },
    [process],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = takeSelectedFile(e.currentTarget);
      if (file) void process(file);
    },
    [process],
  );

  return (
    <div>
      {/* Drop zone */}
      <button
        type="button"
        aria-busy={processing}
        disabled={processing}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "28px",
          borderRadius: "10px",
          color: "inherit",
          cursor: processing ? "progress" : "pointer",
          font: "inherit",
          opacity: processing ? 0.78 : 1,
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          background: dragging ? "rgba(79,110,247,0.06)" : "var(--surf2)",
          transition: "all 0.15s",
          marginBottom: "14px",
          textAlign: "center",
          width: "100%",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: "24px" }}>
          📎
        </span>
        <span
          style={{ fontSize: "12px", color: "var(--text)", fontWeight: 700 }}
        >
          {processing
            ? "Reading metadata locally"
            : "Choose or drop an image or PDF"}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text3)" }}>
          Nothing is uploaded; all processing stays in this browser.
        </span>
      </button>
      <input
        aria-label="Choose an image or PDF for local metadata extraction"
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        style={{ display: "none" }}
        onChange={onFile}
      />

      {processing && (
        <div
          role="status"
          aria-live="polite"
          style={{
            color: "var(--text3)",
            fontSize: "11px",
            marginBottom: "10px",
          }}
        >
          Reading file metadata locally…
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            color: "var(--fmd)",
            fontSize: "11px",
            marginBottom: "10px",
          }}
        >
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "8px",
            }}
          >
            {fname}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              aria-label={`Metadata for ${fname}`}
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
              }}
            >
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <th
                      scope="row"
                      style={{
                        padding: "5px 10px 5px 0",
                        color: "var(--text3)",
                        fontWeight: 600,
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        verticalAlign: "top",
                        width: "140px",
                      }}
                    >
                      {r.key}
                    </th>
                    <td
                      style={{
                        padding: "5px 0",
                        color: "var(--text)",
                        wordBreak: "break-all",
                      }}
                    >
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length <= 4 && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--text3)",
                marginTop: "8px",
              }}
            >
              No EXIF metadata found — file may have been stripped.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
