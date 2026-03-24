import { describe, it, expect } from "vitest";
import {
  sanitizeFileName,
  sanitizeLabel,
  isValidSampleId,
  isValidDataset,
  isValidPopulationLabel,
  isValidProvider,
  validatePopulationLabels,
} from "@/lib/sanitize";

// ── sanitizeFileName ─────────────────────────────────────────────────

describe("sanitizeFileName", () => {
  it("accepts valid filenames", () => {
    expect(sanitizeFileName("myfile.txt")).toBe("myfile.txt");
    expect(sanitizeFileName("data_2024.csv")).toBe("data_2024.csv");
  });

  it("strips path separators", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFileName("foo/bar\\baz")).toBe("foobarbaz");
  });

  it("strips dangerous characters", () => {
    expect(sanitizeFileName('file<script>"test"</script>.txt')).toBe("filescripttestscript.txt");
    expect(sanitizeFileName("file:zone|alt.txt")).toBe("filezonealt.txt");
  });

  it("strips double dots", () => {
    expect(sanitizeFileName("..file..name..")).toBe("filename");
  });

  it("rejects empty after cleaning", () => {
    expect(sanitizeFileName("")).toBeNull();
    expect(sanitizeFileName("   ")).toBeNull();
    expect(sanitizeFileName("/../..")).toBeNull();
  });

  it("rejects filenames exceeding 100 chars", () => {
    expect(sanitizeFileName("a".repeat(100))).toBe("a".repeat(100));
    expect(sanitizeFileName("a".repeat(101))).toBeNull();
  });

  it("handles null bytes", () => {
    const result = sanitizeFileName("file\x00.txt");
    // Null bytes should either be stripped or cause rejection
    expect(result === null || !result.includes("\x00")).toBe(true);
  });
});

// ── sanitizeLabel ────────────────────────────────────────────────────

describe("sanitizeLabel", () => {
  it("accepts valid labels", () => {
    expect(sanitizeLabel("MySample_Italian")).toBe("MySample_Italian");
    expect(sanitizeLabel("test-label.1")).toBe("test-label.1");
    expect(sanitizeLabel("label with spaces")).toBe("label with spaces");
  });

  it("trims whitespace", () => {
    expect(sanitizeLabel("  trimmed  ")).toBe("trimmed");
  });

  it("rejects empty labels", () => {
    expect(sanitizeLabel("")).toBeNull();
    expect(sanitizeLabel("   ")).toBeNull();
  });

  it("rejects labels exceeding 50 chars", () => {
    expect(sanitizeLabel("a".repeat(50))).toBe("a".repeat(50));
    expect(sanitizeLabel("a".repeat(51))).toBeNull();
  });

  it("rejects shell injection characters", () => {
    expect(sanitizeLabel("label; rm -rf /")).toBeNull();
    expect(sanitizeLabel("label$(whoami)")).toBeNull();
    expect(sanitizeLabel("label`id`")).toBeNull();
    expect(sanitizeLabel("label|cat /etc/passwd")).toBeNull();
  });

  it("rejects XSS payloads", () => {
    expect(sanitizeLabel("<script>alert(1)</script>")).toBeNull();
    expect(sanitizeLabel("label&amp;")).toBeNull();
  });
});

// ── isValidPopulationLabel ───────────────────────────────────────────

describe("isValidPopulationLabel", () => {
  it("accepts valid population labels", () => {
    expect(isValidPopulationLabel("Yamnaya_RUS")).toBe(true);
    expect(isValidPopulationLabel("WHG")).toBe(true);
    expect(isValidPopulationLabel("Iran_ShahrISokhta_BA2.AG")).toBe(true);
    expect(isValidPopulationLabel("pop:subgroup")).toBe(true);
  });

  it("rejects spaces (unlike sanitizeLabel)", () => {
    expect(isValidPopulationLabel("has space")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isValidPopulationLabel("")).toBe(false);
  });

  it("rejects labels exceeding 100 chars", () => {
    expect(isValidPopulationLabel("a".repeat(100))).toBe(true);
    expect(isValidPopulationLabel("a".repeat(101))).toBe(false);
  });

  it("rejects shell metacharacters", () => {
    expect(isValidPopulationLabel("pop;rm -rf /")).toBe(false);
    expect(isValidPopulationLabel("pop$(cmd)")).toBe(false);
    expect(isValidPopulationLabel("pop`id`")).toBe(false);
    expect(isValidPopulationLabel("pop|pipe")).toBe(false);
    expect(isValidPopulationLabel("pop\nnewline")).toBe(false);
    expect(isValidPopulationLabel("pop\ttab")).toBe(false);
    expect(isValidPopulationLabel("pop&bg")).toBe(false);
    expect(isValidPopulationLabel("pop>out")).toBe(false);
    expect(isValidPopulationLabel("pop<in")).toBe(false);
  });

  it("rejects non-string types", () => {
    expect(isValidPopulationLabel(123 as unknown as string)).toBe(false);
    expect(isValidPopulationLabel(null as unknown as string)).toBe(false);
    expect(isValidPopulationLabel(undefined as unknown as string)).toBe(false);
  });
});

// ── validatePopulationLabels ─────────────────────────────────────────

describe("validatePopulationLabels", () => {
  it("returns null for valid arrays", () => {
    expect(validatePopulationLabels(["Yamnaya_RUS", "WHG", "EHG"])).toBeNull();
  });

  it("returns error for invalid label in array", () => {
    const result = validatePopulationLabels(["valid", "invalid;shell", "also_valid"]);
    expect(result).toContain("invalid;shell");
  });
});

// ── isValidSampleId ──────────────────────────────────────────────────

describe("isValidSampleId", () => {
  it("accepts valid sample IDs", () => {
    expect(isValidSampleId("f458f448_1")).toBe(true);
    expect(isValidSampleId("abcdef01_2")).toBe(true);
    expect(isValidSampleId("00000000_3")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidSampleId("f458f448_4")).toBe(false); // slot 4 doesn't exist
    expect(isValidSampleId("f458f448_0")).toBe(false);
    expect(isValidSampleId("F458F448_1")).toBe(false); // uppercase
    expect(isValidSampleId("short_1")).toBe(false);
    expect(isValidSampleId("f458f448_1_extra")).toBe(false);
    expect(isValidSampleId("")).toBe(false);
    expect(isValidSampleId("../../../_1")).toBe(false);
  });

  it("rejects non-string types", () => {
    expect(isValidSampleId(123 as unknown as string)).toBe(false);
  });
});

// ── isValidDataset ───────────────────────────────────────────────────

describe("isValidDataset", () => {
  it("accepts valid datasets", () => {
    expect(isValidDataset("1240K")).toBe(true);
    expect(isValidDataset("HO")).toBe(true);
  });

  it("rejects invalid datasets", () => {
    expect(isValidDataset("invalid")).toBe(false);
    expect(isValidDataset("")).toBe(false);
    expect(isValidDataset("1240k")).toBe(false); // case-sensitive
  });
});

// ── isValidProvider ──────────────────────────────────────────────────

describe("isValidProvider", () => {
  it("accepts valid providers", () => {
    expect(isValidProvider("23andme")).toBe(true);
    expect(isValidProvider("ancestry")).toBe(true);
    expect(isValidProvider("ftdna")).toBe(true);
    expect(isValidProvider("myheritage")).toBe(true);
    expect(isValidProvider("livingdna")).toBe(true);
  });

  it("rejects invalid providers", () => {
    expect(isValidProvider("unknown")).toBe(false);
    expect(isValidProvider("")).toBe(false);
    expect(isValidProvider("23andMe")).toBe(false); // case-sensitive
  });
});
