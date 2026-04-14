import { describe, expect, it } from "vitest";
import {
  buildReverseEngineeringBriefDraft,
  buildReverseEngineeringContinuityIdentity,
  buildReverseEngineeringContinuityTag,
  buildBinaryTriageNotes,
  computeByteEntropy,
  detectBinaryFormat,
  extractIocCandidates,
  extractPrintableStrings,
} from "@/lib/binaryTriage";

describe("binary triage helpers", () => {
  it("detects a PE executable from the MZ signature", () => {
    const sample = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const format = detectBinaryFormat(sample, "sample.exe", "application/octet-stream");

    expect(format.id).toBe("pe");
    expect(format.category).toBe("executable");
  });

  it("extracts printable strings and IOC candidates from sampled bytes", () => {
    const encoder = new TextEncoder();
    const sample = encoder.encode(
      "powershell https://mal.example/path beacon.domain.tld 10.0.0.5 operator@example.com",
    );

    const strings = extractPrintableStrings(sample, 4, 20);
    const iocs = extractIocCandidates(strings);

    expect(strings.length).toBeGreaterThan(0);
    expect(iocs.urls).toContain("https://mal.example/path");
    expect(iocs.domains).toContain("beacon.domain.tld");
    expect(iocs.ipv4).toContain("10.0.0.5");
    expect(iocs.emails).toContain("operator@example.com");
  });

  it("flags high-entropy executables as worth deeper reverse engineering", () => {
    const sample = new Uint8Array(Array.from({ length: 256 }, (_, index) => index));
    const entropy = computeByteEntropy(sample);
    const notes = buildBinaryTriageNotes({
      format: {
        id: "pe",
        label: "Portable Executable (PE)",
        category: "executable",
        detail: "Windows executable",
      },
      entropy,
      printableStringCount: 2,
      iocs: { urls: [], domains: [], ipv4: [], emails: [] },
      sampleBytes: sample.length,
      totalBytes: sample.length * 2,
    });

    expect(entropy).toBeGreaterThan(7);
    expect(notes.some((note) => note.includes("packing") || note.includes("obfuscation"))).toBe(true);
  });

  it("promotes a binary triage note into a deterministic reverse-engineering brief", () => {
    const source = {
      title: "Binary triage · suspicious-sample.exe",
      summary: "Portable Executable (PE) · 12.3 KB · entropy 7.92 · 3 IOC hints",
      tags: ["binary-triage", "reverse-engineering-prep", "pe", "executable", "network-iocs"],
      content: [
        "# Binary triage · suspicious-sample.exe",
        "",
        "## Summary",
        "- Format: Portable Executable (PE)",
        "- Category: executable",
        "- Size: 12.3 KB",
        "- Entropy: 7.92 / 8.00",
        "",
        "## Hashes",
        "- SHA-256: deadbeef",
        "",
        "## Analyst notes",
        "- High-entropy executable sample; packing or obfuscation is plausible.",
        "",
        "## IOC candidates",
        "- URLs: https://example.test",
        "- Domains: beacon.example.test",
      ].join("\n"),
    };
    const draft = buildReverseEngineeringBriefDraft(source);

    expect(draft.title).toBe("Reverse-engineering brief · suspicious-sample.exe");
    expect(draft.tags).toContain("reverse-engineering-brief");
    expect(draft.tags).not.toContain("binary-triage");
    expect(draft.tags).toContain(buildReverseEngineeringContinuityTag(source));
    expect(draft.content).toContain("## Analyst assessment");
    expect(draft.content).toContain("## Recommended next steps");
    expect(draft.content).toContain("https://example.test");
  });

  it("builds stable continuity identities from hashes before sample names", () => {
    const source = {
      title: "Binary triage · suspicious-sample.exe",
      summary: "Portable Executable (PE) · 12.3 KB",
      tags: ["binary-triage", "reverse-engineering-prep", "pe"],
      content: [
        "# Binary triage · suspicious-sample.exe",
        "",
        "## Hashes",
        "- SHA-256: DEADBEEF1234",
        "- SHA-1: CAFE1234",
      ].join("\n"),
    };

    expect(buildReverseEngineeringContinuityIdentity(source)).toBe("deadbeef1234");
  });
});
