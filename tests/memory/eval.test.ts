import { describe, it, expect } from "vitest";
import { recallAtK, precisionAtK, mrr } from "../../src/memory/eval.js";
import { runEvalCase, runEval } from "../../src/memory/eval.js";
import { CORPUS } from "../fixtures/eval/corpus.js";
import { CASES } from "../fixtures/eval/cases.js";

describe("metric helpers", () => {
  it("recallAtK: fraction of gold within top-k", () => {
    expect(recallAtK(["a", "b", "c"], ["a", "c"], 5)).toBe(1);
    expect(recallAtK(["a", "b", "c"], ["a", "z"], 5)).toBe(0.5);
    expect(recallAtK(["x", "y", "a"], ["a"], 2)).toBe(0); // a is at rank 3, outside k=2
  });
  it("recallAtK: empty gold → 0 (abstention sentinel)", () => {
    expect(recallAtK(["a"], [], 5)).toBe(0);
  });
  it("precisionAtK: gold fraction of the top-k actually returned", () => {
    expect(precisionAtK(["a", "b"], ["a"], 5)).toBe(0.5); // 1 gold of 2 returned
    expect(precisionAtK([], ["a"], 5)).toBe(0);
    expect(precisionAtK(["a", "b", "c", "d"], ["a", "b"], 2)).toBe(1);
  });
  it("mrr: reciprocal rank of first gold hit", () => {
    expect(mrr(["a", "b"], ["a"])).toBe(1);
    expect(mrr(["x", "a"], ["a"])).toBe(0.5);
    expect(mrr(["x", "y"], ["a"])).toBe(0); // no hit
    expect(mrr(["a"], [])).toBe(0);
  });
});

describe("eval corpus invariants", () => {
  it("memory titles are unique (primer reverse-lookup requires it)", () => {
    const titles = CORPUS.memory.map((m) => m.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("retrieval eval — per-case hard assertions (CI gate)", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const r = runEvalCase(CORPUS, c);
      expect(r.pass, `${c.name} — ${r.detail}`).toBe(true);
    });
  }
});

describe("runEval aggregate", () => {
  it("reports totals, excludes abstention from means, and computes abstentionAccuracy", () => {
    const report = runEval(CORPUS, CASES);
    expect(report.total).toBe(CASES.length);
    expect(report.passed).toBe(CASES.length);      // all cases pass on the shipped corpus
    expect(report.failed).toBe(0);
    expect(report.abstentionTotal).toBe(2);         // cross-project + abstention cases
    expect(report.abstentionAccuracy).toBe(1);
    expect(report.scoredCases).toBe(CASES.length - 2);
    expect(report.meanRecallAtK).toBeGreaterThan(0);
    console.info("[memory-v5 eval]", JSON.stringify({
      passed: report.passed, total: report.total,
      meanRecallAtK: report.meanRecallAtK, meanMrr: report.meanMrr,
      abstentionAccuracy: report.abstentionAccuracy, byCategory: report.byCategory,
    }, null, 2));
  });
});
