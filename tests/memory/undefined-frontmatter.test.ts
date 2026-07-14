import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import { renderEntityMarkdown } from "../../src/entity/render.js";
import { parseEntityMarkdown } from "../../src/entity/parse.js";
import { renderQaMarkdown } from "../../src/qa/render.js";
import { parseQaMarkdown } from "../../src/qa/parse.js";
import { healUndefinedFrontmatter } from "../../src/_shared/heal-frontmatter.js";
import { lintMemory } from "../../src/memory/lint.js";
import { emptyEntityIndex } from "../../src/entity/types.js";
import { emptyQaIndex } from "../../src/qa/types.js";
import type { MemoryEntry } from "../../src/memory/types.js";

// An "authored" entry as the LLM produces it: optional fields simply absent.
// Cast through unknown so TypeScript lets us omit them (mirrors runtime JSON).
function authored(over: Record<string, unknown> = {}): MemoryEntry {
  return {
    id: "episodic/edge-memvc/thread-x", type: "episodic",
    scope: "project:edge-memvc", project: "edge-memvc",
    title: "Thread X", summary: "did a thing",
    confidence: 0.8, importance: 3,
    sourceSessions: ["sess-1-uuid"], sourceCommits: [], sourceFiles: [], entities: [],
    ...over,
  } as unknown as MemoryEntry;
}

describe("#54 — render never serializes the literal \"undefined\"", () => {
  it("memory: unset optional scalars → null (not \"undefined\")", () => {
    const md = renderMemoryMarkdown(authored({
      supersedes: undefined, validFrom: undefined, validTo: undefined,
      originDevice: undefined, project: undefined,
    }), "body");
    expect(md).not.toContain("undefined");
    expect(md).toContain("supersedes: null");
    expect(md).toContain("validFrom: null");
    expect(md).toContain("validTo: null");
    expect(md).toContain("originDevice: null");
    expect(md).toContain("project: null");
  });

  it("memory: unset status/createdAt/updatedAt never serialize \"undefined\"", () => {
    const md = renderMemoryMarkdown(authored({
      status: undefined, createdAt: undefined, updatedAt: undefined,
      confidence: undefined, importance: undefined,
    }), "body");
    expect(md).not.toContain("undefined");
    expect(md).toContain("status: active");
    expect(md).toContain("confidence: 0.5");
    expect(md).toContain("importance: 0");
  });

  it("entity + qa: unset project/dates never serialize \"undefined\"", () => {
    const ent = renderEntityMarkdown({
      id: "edge-memvc/Tab", kind: "class", scope: "project:edge-memvc",
      project: undefined, title: "Tab", aliases: [], sourceMemoryIds: [],
      sourceSessions: [], sourceFiles: [], relatedEntities: [],
      path: "", createdAt: undefined, updatedAt: undefined,
    } as unknown as Parameters<typeof renderEntityMarkdown>[0], "body");
    expect(ent).not.toContain("undefined");
    expect(ent).toContain("project: null");

    const qa = renderQaMarkdown({
      id: "qa/edge-memvc/how", scope: "project:edge-memvc", project: undefined,
      question: "How?", answerSummary: "Like so", kind: "howto", tags: [],
      sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      path: "", createdAt: undefined, updatedAt: undefined,
    } as unknown as Parameters<typeof renderQaMarkdown>[0], "body");
    expect(qa).not.toContain("undefined");
    expect(qa).toContain("project: null");
  });
});

describe("#54 — parse coerces a legacy literal \"undefined\" back to absent", () => {
  it("memory: supersedes/validTo/originDevice/project \"undefined\" → null; status → active; dates → \"\"", () => {
    const md = [
      "---", "id: episodic/p/x", "type: episodic", "scope: project:p", "project: undefined",
      "title: X", "summary: s", "status: undefined", "confidence: 0.8", "importance: 3",
      "createdAt: undefined", "updatedAt: undefined", "validFrom: undefined", "validTo: undefined",
      "supersedes: undefined", "originDevice: undefined",
      "sourceSessions: [s1]", "sourceCommits: []", "sourceFiles: []", "entities: []", "trust: untrusted",
      "---", "", "# X", "body",
    ].join("\n");
    const e = parseMemoryMarkdown(md)!;
    expect(e.supersedes).toBeNull();
    expect(e.validTo).toBeNull();
    expect(e.validFrom).toBeNull();
    expect(e.originDevice).toBeNull();
    expect(e.project).toBeNull();
    expect(e.status).toBe("active");
    expect(e.createdAt).toBe("");
    expect(Number.isFinite(e.confidence)).toBe(true);
  });

  it("round-trips: authored-with-undefined → render → parse yields nulls", () => {
    const back = parseMemoryMarkdown(renderMemoryMarkdown(authored({ supersedes: undefined, validTo: undefined }), "b"))!;
    expect(back.supersedes).toBeNull();
    expect(back.validTo).toBeNull();
  });
});

describe("#54 — apply persists no \"undefined\" and lints clean (the issue repro)", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-u54-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("a minimal authored episodic writes clean md + trips no lint error", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    applyMemoryItems(repo, [{ entry: authored(), body: "the arc" }]);

    const md = readFileSync(join(repo, "memory/episodic/edge-memvc/thread-x.md"), "utf8");
    expect(md).not.toContain("undefined");
    expect(md).toContain("supersedes: null");
    expect(md).toContain("status: active");

    const idx = loadMemoryIndex(repo);
    const findings = lintMemory(idx, emptyEntityIndex(), emptyQaIndex(), { now: "2026-07-14", project: null }).issues;
    const checks = findings.map((f) => f.check);
    expect(checks).not.toContain("dangling-supersedes");
    expect(checks).not.toContain("malformed-date");
    expect(checks).not.toContain("malformed-entry");
  });

  it("live index == a parse-of-md rebuild for omitted confidence/importance (no drift, #55)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    applyMemoryItems(repo, [{ entry: authored({ confidence: undefined, importance: undefined }), body: "b" }]);
    // LIVE index carries the render/parse defaults (not undefined → dropped-key).
    const live = loadMemoryIndex(repo).entries["episodic/edge-memvc/thread-x"];
    expect(live.confidence).toBe(0.5);   // the scorer's neutral default
    expect(live.importance).toBe(0);
    // A rebuild (parse of the persisted md) yields the SAME values → no drift.
    const rebuilt = parseMemoryMarkdown(readFileSync(join(repo, "memory/episodic/edge-memvc/thread-x.md"), "utf8"))!;
    expect(rebuilt.confidence).toBe(live.confidence);
    expect(rebuilt.importance).toBe(live.importance);
  });
});

describe("#54 — reindex self-heals legacy \"undefined\" md text + index", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-u54r-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
    // Legacy 0.13.x-shaped md with literal "undefined" in every optional field.
    const legacy = [
      "---", "id: episodic/edge-memvc/legacy", "type: episodic", "scope: project:edge-memvc",
      "project: edge-memvc", "title: Legacy", "summary: s", "status: undefined",
      "confidence: undefined", "importance: undefined", "createdAt: undefined", "updatedAt: undefined",
      "validFrom: undefined", "validTo: undefined", "supersedes: undefined", "originDevice: undefined",
      "sourceSessions: [s1]", "sourceCommits: []", "sourceFiles: []", "entities: []", "trust: untrusted",
      "---", "", "# Legacy", "", "the body — MUST survive byte-for-byte", "",
    ].join("\n");
    const abs = join(repo, "memory/episodic/edge-memvc/legacy.md");
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, legacy);
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("memoryIndexCmd rewrites the md (no \"undefined\", real dates) + rebuilds a clean index that lints clean", async () => {
    const { memoryIndexCmd } = await import("../../src/commands/memory-index.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    const report = await memoryIndexCmd();
    expect(report.indexed).toBe(1);
    expect(report.healed).toBe(1);

    const abs = join(repo, "memory/episodic/edge-memvc/legacy.md");
    const md = readFileSync(abs, "utf8");
    expect(md).not.toContain("undefined");
    expect(md).toContain("supersedes: null");
    expect(md).toContain("status: active");
    expect(md).toContain("confidence: 0.5");
    expect(md).toContain("importance: 0");
    expect(md).toMatch(/createdAt: \d{4}-\d{2}-\d{2}/);      // backfilled from mtime
    expect(md).toContain("the body — MUST survive byte-for-byte"); // body intact

    const idx = loadMemoryIndex(repo);
    const findings = lintMemory(idx, emptyEntityIndex(), emptyQaIndex(), { now: "2026-07-14", project: null }).issues;
    expect(findings.map((f) => f.check)).not.toContain("dangling-supersedes");
    expect(findings.map((f) => f.check)).not.toContain("malformed-date");
  });

  it("a second reindex is idempotent — nothing left to heal", async () => {
    const { memoryIndexCmd } = await import("../../src/commands/memory-index.js");
    await memoryIndexCmd();
    const second = await memoryIndexCmd();
    expect(second.healed).toBe(0);
  });
});

describe("#54 — healUndefinedFrontmatter helper", () => {
  it("fixes only frontmatter, leaves body byte-identical, returns null for clean md", () => {
    const dirty = "---\nid: x\nsupersedes: undefined\nstatus: undefined\nconfidence: undefined\nimportance: undefined\ncreatedAt: undefined\n---\n\n# x\n\nbody: undefined stays in body\n";
    const healed = healUndefinedFrontmatter(dirty, "2026-07-14")!;
    expect(healed).toContain("supersedes: null");
    expect(healed).toContain("status: active");
    expect(healed).toContain("confidence: 0.5");
    expect(healed).toContain("importance: 0");
    expect(healed).toContain("createdAt: 2026-07-14");
    // the word "undefined" INSIDE the body is untouched
    expect(healed).toContain("body: undefined stays in body");
    // a clean md returns null (no churn)
    const clean = "---\nid: x\nsupersedes: null\nstatus: active\nconfidence: 0.8\ncreatedAt: 2026-07-14\n---\n\n# x\n\nbody\n";
    expect(healUndefinedFrontmatter(clean, "2026-07-14")).toBeNull();
  });

  it("does NOT treat a fresh empty date as legacy corruption (#55)", () => {
    // The entity/qa renderers can emit `createdAt: ` (blank) for an omitted date;
    // the heal must not rewrite that to a bogus mtime (only the literal counts).
    const freshBlank = "---\nid: x\ncreatedAt: \nupdatedAt: \n---\n\n# x\n\nbody\n";
    expect(healUndefinedFrontmatter(freshBlank, "2026-07-14")).toBeNull();
  });
});
