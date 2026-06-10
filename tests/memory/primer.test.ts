import { describe, it, expect } from "vitest";
import { renderPrimer } from "../../src/memory/primer.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function e(over: Partial<MemoryEntry>): MemoryEntry {
  return { id: over.id ?? "x", type: over.type ?? "semantic", scope: over.scope ?? "project:p",
    project: over.project ?? "p", title: over.title ?? "t", summary: over.summary ?? "s",
    path: "memory/x.md", status: over.status ?? "active", confidence: 0.8, importance: over.importance ?? 1,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
    entities: [], originDevice: null, accessCount: 0, lastAccess: null };
}

describe("renderPrimer", () => {
  it("groups core/semantic/procedural under headings, importance-sorted, skips superseded", () => {
    const md = renderPrimer("p", [
      e({ id: "core/g", type: "core", scope: "global", project: null, title: "never npm publish", summary: "Yue does OTP" }),
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

  it("defaults to MAX_PER_SECTION (12) when no cap passed", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      e({ id: `semantic/p/${i}`, type: "semantic", title: `fact ${i}`, summary: "s", importance: i }),
    );
    const md = renderPrimer("p", many);
    const bulletCount = (md.match(/^- \*\*/gm) ?? []).length;
    expect(bulletCount).toBe(12);
  });
});
