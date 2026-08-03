import { describe, it, expect } from "vitest";
import { readFrontmatterBlock } from "../../src/_shared/frontmatter.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
import type { MemoryEntry } from "../../src/memory/types.js";

/**
 * ROUND-36 / FINDING A — a legacy value that injects an early standalone `---`
 * truncates the frontmatter block, because the block match is NON-GREEDY. The
 * duplicate-key rule (round-34/35) never fires — the truncated block holds each
 * key at most once — so every field BELOW the injected delimiter silently takes
 * its PARSE DEFAULT. For `status` that default is `active`: the entry is
 * UN-ARCHIVED by reading it.
 */
describe("readFrontmatterBlock — truncated/injected frontmatter block (round-36)", () => {
  // Exactly what the PRE-hardening serializer emitted for an entry whose `title`
  // carried the payload `x\n---`. The entry really is archived — `status:
  // archived` is right there in the bytes — but it lands BELOW the injected
  // delimiter. Before the fix this parsed cleanly with status "active".
  const truncated = [
    "---",
    "id: semantic/proj/e",
    "type: semantic",
    "scope: global",
    "project: null",
    "title: x",
    "---", // <- injected by the legacy `title` value, accepted as the closing delimiter
    "summary: s",
    "status: archived",
    "archivedAt: 2026-07-01",
    "archivedReason: unused-low-value",
    "trust: unknown",
    "---", // <- the renderer's REAL closing delimiter
    "",
    "# x ---",
    "",
    "the body",
    "",
  ].join("\n");

  it("REFUSES the document rather than reading the truncated block", () => {
    // Sanity: the archival state really is in the file, so a null here is a
    // refusal and not just a document that never said "archived".
    expect(truncated).toContain("status: archived");
    // Pre-fix this returned {id, type, scope, project, title} and NOTHING else,
    // and parseMemoryMarkdown defaulted the missing status to "active".
    expect(readFrontmatterBlock(truncated)).toBeNull();
    expect(parseMemoryMarkdown(truncated)).toBeNull();
  });

  it("also refuses the variant that drags a `# ` heading INSIDE the block", () => {
    // payload `x\n# forged\n---`: only ONE standalone `---` sits before the first
    // heading, but the heading is inside the frontmatter region.
    const md = [
      "---",
      "id: semantic/proj/e",
      "type: semantic",
      "title: x",
      "# forged",
      "---",
      "status: archived",
      "trust: unknown",
      "---",
      "",
      "# x",
      "",
      "body",
      "",
    ].join("\n");
    expect(md).toContain("status: archived");
    expect(parseMemoryMarkdown(md)).toBeNull();
  });

  it("a `---` HORIZONTAL RULE in the BODY still parses, and round-trips byte-identically", () => {
    const entry: MemoryEntry = {
      id: "semantic/proj/hr", type: "semantic", scope: "global", project: null,
      title: "has an hr", summary: "s", path: "", status: "archived",
      confidence: 0.5, importance: 0, createdAt: "2026-07-01", updatedAt: "2026-07-02",
      validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "unknown", originDevice: null,
      accessCount: 0, lastAccess: null,
      archivedAt: "2026-07-02", archivedReason: "unused-low-value",
    };
    const body = "before the rule\n\n---\n\nafter the rule";
    const md = renderMemoryMarkdown(entry, body);
    expect(md).toContain("\n---\n\nafter the rule"); // the HR really is in there

    const parsed = parseMemoryMarkdown(md);
    expect(parsed).not.toBeNull();
    expect(parsed!.status).toBe("archived"); // NOT silently un-archived
    expect(parsed!.archivedReason).toBe("unused-low-value");
    // Byte-identical round trip: parse → render reproduces the exact document.
    expect(renderMemoryMarkdown(parsed!, body)).toBe(md);
  });

  it("still refuses a DUPLICATE frontmatter key (round-34/35 regression lock)", () => {
    const dup = [
      "---",
      "id: semantic/proj/e",
      "type: semantic",
      "title: x",
      "status: active",
      "status: archived",
      "trust: unknown",
      "---",
      "",
      "# x",
      "",
      "body",
      "",
    ].join("\n");
    expect(readFrontmatterBlock(dup)).toBeNull();
    expect(parseMemoryMarkdown(dup)).toBeNull();
  });
});
