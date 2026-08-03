import { describe, it, expect } from "vitest";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import type { MemoryEntry } from "../../src/memory/types.js";

const base = (over: Partial<MemoryEntry>): MemoryEntry => ({
  id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p",
  title: "T", summary: "s", path: "memory/semantic/p/x.md", status: "active",
  confidence: 0.5, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
  validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
  supersedes: null, entities: [], trust: "trusted", originDevice: null,
  accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null, ...over,
});

it("round-trips archived status + archivedAt/archivedReason", () => {
  const e = base({ status: "archived", archivedAt: "2026-07-24", archivedReason: "unused-low-value" });
  const md = renderMemoryMarkdown(e, "body");
  expect(md).toContain("status: archived");
  expect(md).toContain("archivedAt: 2026-07-24");
  expect(md).toContain("archivedReason: unused-low-value");
  const p = parseMemoryMarkdown(md);
  expect(p!.status).toBe("archived");
  expect(p!.archivedAt).toBe("2026-07-24");
  expect(p!.archivedReason).toBe("unused-low-value");
});

it("legacy md without archived fields parses them as null", () => {
  const e = base({});
  const md = renderMemoryMarkdown(e, "body")
    .replace(/archivedAt: .*\n/, "").replace(/archivedReason: .*\n/, "");
  const p = parseMemoryMarkdown(md);
  expect(p!.archivedAt).toBeNull();
  expect(p!.archivedReason).toBeNull();
});
