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
    // per-category mean excludes abstention (memory has 6 cases incl. 2 abstain → 4 scored, all recall 1)
    expect(report.byCategory.memory.meanRecallAtK).toBe(1);
    expect(report.byCategory.memory.total).toBe(6);
    console.info("[memory-v5 eval]", JSON.stringify({
      passed: report.passed, total: report.total,
      meanRecallAtK: report.meanRecallAtK, meanMrr: report.meanMrr,
      abstentionAccuracy: report.abstentionAccuracy, byCategory: report.byCategory,
    }, null, 2));
  });
});

describe("primer reverse-lookup tolerates the tentative marker", () => {
  it("finds a low-confidence (tentative-marked) primer entry instead of dropping it", () => {
    // confidence < 0.5 renders `- **title** _(tentative)_ — summary`; primerIncludedIds'
    // regex must tolerate the marker or this gold entry is silently missed.
    const entry = {
      id: "semantic/p/shaky", type: "semantic", scope: "project:p", project: "p",
      title: "shaky low-conf fact", summary: "maybe", path: "",
      status: "active", confidence: 0.3, importance: 3,
      createdAt: "2026-01-01", updatedAt: "2026-06-01", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    };
    const corpus = { memory: [entry], qa: [], entity: [] } as unknown as Parameters<typeof runEvalCase>[0];
    const c = {
      name: "t", category: "primer",
      query: { text: "", project: "p", now: "2026-06-10" }, goldIds: ["semantic/p/shaky"],
    } as unknown as Parameters<typeof runEvalCase>[1];
    expect(runEvalCase(corpus, c).recallAtK).toBe(1);
  });
});
