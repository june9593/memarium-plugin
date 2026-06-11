import { describe, it, expect } from "vitest";
import { normalizeSingleLine, qaSlug, qaId } from "../../src/qa/id.js";

describe("normalizeSingleLine", () => {
  it("collapses newlines and whitespace runs to single spaces, trims", () => {
    expect(normalizeSingleLine("  how   do\nI\tbuild?  ")).toBe("how do I build?");
  });
});

describe("qaSlug / qaId", () => {
  it("is deterministic for the same canonical question", () => {
    const a = qaSlug("How do I build the project?");
    const b = qaSlug("how  do I   build the project?  ");
    expect(a).toBe(b);
  });
  it("differs for different questions (hash differs)", () => {
    expect(qaSlug("How do I build?")).not.toBe(qaSlug("How do I test?"));
  });
  it("slug = kebab prefix + 8-hex hash", () => {
    const s = qaSlug("How do I build the project?");
    expect(s).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/);
  });
  it("qaId composes scope dir + slug; _global when project null", () => {
    expect(qaId("project:edge-memvc", "edge-memvc", "How do I build?"))
      .toBe(`qa/edge-memvc/${qaSlug("How do I build?")}`);
    expect(qaId("global", null, "How do I build?"))
      .toBe(`qa/_global/${qaSlug("How do I build?")}`);
  });
  it("falls back to q-<hash> when the question has no slug-able chars", () => {
    expect(qaSlug("???")).toMatch(/^q-[0-9a-f]{8}$/);
  });
});
