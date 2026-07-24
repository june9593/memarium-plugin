import { describe, it, expect } from "vitest";
import { renderPrimer } from "../../src/memory/primer.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function e(over: Partial<MemoryEntry>): MemoryEntry {
  return { id: over.id ?? "x", type: over.type ?? "semantic", scope: over.scope ?? "project:p",
    project: over.project ?? "p", title: over.title ?? "t", summary: over.summary ?? "s",
    path: "memory/x.md", status: over.status ?? "active", confidence: over.confidence ?? 0.8, importance: over.importance ?? 1,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", validFrom: null, validTo: over.validTo ?? null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
    entities: [], trust: over.trust ?? "trusted", originDevice: null, accessCount: 0, lastAccess: null };
}

describe("renderPrimer", () => {
  it("groups core/semantic/procedural under headings, importance-sorted, skips superseded", () => {
    const md = renderPrimer("p", [
      e({ id: "core/g", type: "core", scope: "global", project: null, title: "never npm publish", summary: "the maintainer does OTP" }),
      e({ id: "semantic/p/a", type: "semantic", title: "Spool format", summary: "single .md", importance: 4 }),
      e({ id: "semantic/p/b", type: "semantic", title: "Minor fact", summary: "x", importance: 1 }),
      e({ id: "proc/p/c", type: "procedural", title: "Add adapter", summary: "extend Tool union" }),
      e({ id: "dead", type: "semantic", title: "old", summary: "x", status: "superseded" }),
    ]);
    expect(md).toContain("# Project memory: p");
    expect(md).toContain("## Core rules");
    expect(md).toContain("never npm publish");
    expect(md).toContain("## Project facts");
    expect(md.indexOf("Spool format")).toBeLessThan(md.indexOf("Minor fact"));
    expect(md).toContain("## Procedures & gotchas");
    expect(md).toContain("Add adapter");
    expect(md).not.toContain("old");  // superseded skipped
  });

  it("includes global core rules even though project differs", () => {
    const md = renderPrimer("p", [
      e({ id: "core/g", type: "core", scope: "global", project: null, title: "rule", summary: "always X" }),
    ]);
    expect(md).toContain("rule");
  });

  it("caps each section at maxPerSection top entries (by importance) for token control", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      e({ id: `semantic/p/${i}`, type: "semantic", title: `fact ${String(i).padStart(2, "0")}`, summary: "s", importance: i }),
    );
    const md = renderPrimer("p", many, { maxPerSection: 5 });
    // top-5 by importance = facts 19..15; fact 14 and below excluded
    expect(md).toContain("fact 19");
    expect(md).toContain("fact 15");
    expect(md).not.toContain("fact 14");
    const bulletCount = (md.match(/^- \*\*/gm) ?? []).length;
    expect(bulletCount).toBe(5);
  });

  it("clamps negative maxPerSection to MAX_PER_SECTION (does not return all-but-last)", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      e({ id: `semantic/p/${i}`, type: "semantic", title: `fact ${i}`, summary: "s", importance: i }),
    );
    const md = renderPrimer("p", many, { maxPerSection: -1 });
    const bulletCount = (md.match(/^- \*\*/gm) ?? []).length;
    // -1 should fall back to MAX_PER_SECTION (12), NOT slice(0,-1) = 19
    expect(bulletCount).toBeLessThanOrEqual(12);
    expect(bulletCount).toBe(12);
  });

  it("returns empty string when there is no eligible memory (silent, no bare header)", () => {
    expect(renderPrimer("p", [])).toBe("");
    // entries that are all ineligible for project "p" (other project, no global) → still empty
    const otherProj = e({ id: "semantic/q/x", type: "semantic", scope: "project:q", project: "q", title: "x" });
    expect(renderPrimer("p", [otherProj])).toBe("");
  });

  it("excludes entries whose validTo is in the past when now is provided", () => {
    const expired = e({ id: "semantic/p/expired", type: "semantic", title: "expired fact", summary: "gone", validTo: "2000-01-01" });
    const nullExp = e({ id: "semantic/p/null-exp", type: "semantic", title: "null-exp fact", summary: "valid", validTo: null });
    const futureExp = e({ id: "semantic/p/future", type: "semantic", title: "future fact", summary: "valid", validTo: "2099-12-31" });

    const md = renderPrimer("p", [expired, nullExp, futureExp], { now: "2026-06-10" });

    expect(md).not.toContain("expired fact");
    expect(md).toContain("null-exp fact");
    expect(md).toContain("future fact");
  });

  it("includes entries with validTo equal to now (boundary: expired on that day, strictly <)", () => {
    // validTo <= now means expired, so validTo === now is expired
    const sameDay = e({ id: "semantic/p/same", type: "semantic", title: "same-day", summary: "boundary", validTo: "2026-06-10" });
    const md = renderPrimer("p", [sameDay], { now: "2026-06-10" });
    // validTo <= now → excluded (2026-06-10 <= 2026-06-10 is true)
    expect(md).not.toContain("same-day");
  });

  it("surfaces a +N more footer when a section is truncated (not silent) — #19", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      e({ id: `semantic/p/${i}`, type: "semantic", title: `fact ${i}`, summary: "s", importance: i }));
    const md = renderPrimer("p", many, { maxPerSection: 5 });
    expect(md).toContain("15 more (run");
    // the footer is not counted as a content bullet
    expect((md.match(/^- \*\*/gm) ?? []).length).toBe(5);
  });

  it("no footer when nothing is truncated", () => {
    const md = renderPrimer("p", [e({ id: "semantic/p/a", type: "semantic", title: "only", summary: "s" })]);
    expect(md).not.toContain("more (run");
  });

  it("marks low-confidence entries tentative; confident ones are unmarked — #21", () => {
    const shaky = { ...e({ id: "semantic/p/shaky", type: "semantic", title: "shaky guess", summary: "maybe" }), confidence: 0.3 };
    const solid = { ...e({ id: "semantic/p/solid", type: "semantic", title: "solid fact", summary: "verified" }), confidence: 0.9 };
    const md = renderPrimer("p", [shaky, solid]);
    expect(md).toContain("**shaky guess** _(tentative)_");
    expect(md).not.toContain("**solid fact** _(tentative)_");
  });

  it("breaks importance ties by confidence (blended ranking, not pure importance)", () => {
    const hi = { ...e({ id: "semantic/p/hi", type: "semantic", title: "high conf", summary: "s", importance: 5 }), confidence: 0.9 };
    const lo = { ...e({ id: "semantic/p/lo", type: "semantic", title: "low conf", summary: "s", importance: 5 }), confidence: 0.6 };
    const md = renderPrimer("p", [lo, hi]);
    expect(md.indexOf("high conf")).toBeLessThan(md.indexOf("low conf"));
  });

  it("only auto-injects trusted semantic; untrusted/unknown withheld (#23)", () => {
    const md = renderPrimer("p", [
      e({ id: "semantic/p/t", type: "semantic", title: "trusted fact", trust: "trusted" }),
      e({ id: "semantic/p/u", type: "semantic", title: "untrusted fact", trust: "untrusted" }),
      e({ id: "semantic/p/k", type: "semantic", title: "unknown fact", trust: "unknown" }),
    ]);
    expect(md).toContain("trusted fact");
    expect(md).not.toContain("untrusted fact");
    expect(md).not.toContain("unknown fact");
  });

  it("trust filter does NOT apply to core/procedural (v4 gate protects them) — #23", () => {
    const md = renderPrimer("p", [
      e({ id: "core/g", type: "core", scope: "global", project: null, title: "core rule", trust: "unknown" }),
      e({ id: "proc/p/x", type: "procedural", title: "proc step", trust: "untrusted" }),
    ]);
    expect(md).toContain("core rule"); // injected regardless of trust
    expect(md).toContain("proc step");
  });

  it("primer excludes archived entries", () => {
    const entries = [
      e({ id: "semantic/_global/a", type: "semantic", scope: "global", project: null, status: "active", trust: "trusted", title: "live global fact", summary: "keep me" }),
      e({ id: "semantic/_global/b", type: "semantic", scope: "global", project: null, status: "archived", trust: "trusted", title: "cold global fact", summary: "hide me" }),
    ];
    const out = renderPrimer("p", entries, { now: "2026-07-24" });
    expect(out).toContain("live global fact");
    expect(out).not.toContain("cold global fact");
  });
});

