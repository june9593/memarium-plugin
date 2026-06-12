import { describe, it, expect } from "vitest";
import { recallAtK, precisionAtK, mrr } from "../../src/memory/eval.js";

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
