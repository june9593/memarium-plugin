import { describe, it, expect } from "vitest";
import { lintMemory, type LintFinding } from "../../src/memory/lint.js";
import { emptyMemoryIndex } from "../../src/memory/types.js";
import { emptyEntityIndex } from "../../src/entity/types.js";
import { emptyQaIndex } from "../../src/qa/types.js";

const NOW = "2026-06-11";
const opts = { now: NOW, staleDays: 90, project: null as string | null };

describe("lintMemory", () => {
  it("empty indexes → empty report", () => {
    const r = lintMemory(emptyMemoryIndex(), emptyEntityIndex(), emptyQaIndex(), opts);
    expect(r.counts).toEqual({ issues: 0, suggestions: 0 });
    expect(r.issues).toEqual([]);
    expect(r.suggestions).toEqual([]);
    expect(typeof r.generatedAt).toBe("string");
  });
});
