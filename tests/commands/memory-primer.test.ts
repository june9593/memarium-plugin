import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryPrimerCmd", () => {
  let fakeHome: string, repo: string, stdout: string[];

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memp-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // session index so cwd resolves to project "code-demo"
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": {
        sessionId: "s1", shortId: "s1", tool: "claude", project: "code-demo",
        projectRaw: "/work/code-demo", startedAt: "2026-01-01T00:00:00Z",
        endedAt: "2026-01-01T00:00:00Z", nameSlug: "x", displayName: "x",
        relativePath: "raw_sessions/claude/code-demo/2026-01-01/x__s1.md",
        sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x" } },
    }));
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "core/g": { id: "core/g", type: "core", scope: "global", project: null,
          title: "never npm publish", summary: "the maintainer OTP", path: "memory/core/_global/g.md",
          status: "active", confidence: 1, importance: 5, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
        "semantic/code-demo/spool": { id: "semantic/code-demo/spool", type: "semantic",
          scope: "project:code-demo", project: "code-demo", title: "Spool single md",
          summary: "since 0.6.0", path: "memory/semantic/code-demo/spool.md",
          status: "active", confidence: 0.9, importance: 4, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: ["spool"],
          trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null },
        "procedural/code-demo/bump": { id: "procedural/code-demo/bump", type: "procedural",
          scope: "project:code-demo", project: "code-demo", title: "Bump and tag workflow",
          summary: "npm run build + vitest + version + tag", path: "memory/procedural/code-demo/bump.md",
          status: "active", confidence: 0.95, importance: 4, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
      },
    }));
    stdout = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      stdout.push(typeof c === "string" ? c : Buffer.from(c).toString()); return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("writes primer markdown to stdout and does NOT write _primer/ to disk", async () => {
    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    // Assert 1: correct header + entry titles
    expect(out).toContain("# Project memory: code-demo");
    expect(out).toContain("never npm publish");
    expect(out).toContain("Spool single md");
    expect(out).toContain("Bump and tag workflow");
    // Assert 2: key read-only assertion — _primer/ must NOT be created
    expect(existsSync(join(repo, "memory", "_primer"))).toBe(false);
  });

  it("returns silently when cwd resolves to no project", async () => {
    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/no/such/project" });
    expect(stdout.join("")).toBe("");
    expect(existsSync(join(repo, "memory", "_primer"))).toBe(false);
  });

  it("ignores a stale _primer file and renders live from the index (P0b)", async () => {
    // A stale/misleading _primer file must NOT be preferred — memory-primer
    // renders live from the (merged) memory view, so it can never serve
    // cross-device memory from a frozen local snapshot.
    const primerDir = join(repo, "memory", "_primer");
    mkdirSync(primerDir, { recursive: true });
    writeFileSync(join(primerDir, "code-demo.md"), "# STALE do not use\n\nold cached primer\n");

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    expect(out).not.toContain("STALE do not use");
    expect(out).toContain("# Project memory: code-demo");
    expect(out).toContain("never npm publish"); // rendered from the index, not the file
  });

  it("includes sibling-device memory from the aggregated overlay (P0b cross-device)", async () => {
    // The npm CLI mounts origin/main at ~/.memarium/aggregated; HOME is stubbed,
    // so write a sibling core memory into the overlay's memory index.
    const ovl = join(fakeHome, ".memarium", "aggregated", ".memarium");
    mkdirSync(ovl, { recursive: true });
    writeFileSync(join(ovl, "index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "core/sibling": { id: "core/sibling", type: "core", scope: "global", project: null,
          title: "sibling-device rule", summary: "from another machine", path: "memory/core/_global/sibling.md",
          status: "active", confidence: 1, importance: 5, createdAt: "2026-06-20",
          updatedAt: "2026-06-20", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: "mac-mini-2", accessCount: 0, lastAccess: null },
      },
    }));
    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    expect(out).toContain("never npm publish");      // local memory
    expect(out).toContain("sibling-device rule");    // overlay (sibling device) memory
  });

  const writeMd = (root: string, id: string, title: string, body: string, persistedId = id) => {
    const [type, scope, slug] = id.split("/");
    const dir = join(root, "memory", type!, scope!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${slug}.md`), `---\nid: ${persistedId}\ntype: ${type}\n---\n\n# ${title}\n\n${body}\n`);
  };

  it("loads core rule bodies from the local store and from the aggregated overlay", async () => {
    writeMd(repo, "core/_global/g", "never npm publish", "LOCAL-BODY-MARKER");
    const overlay = join(fakeHome, ".memarium", "aggregated");
    mkdirSync(join(overlay, ".memarium"), { recursive: true });
    writeFileSync(join(overlay, ".memarium", "index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "core/_global/sibling": { id: "core/_global/sibling", type: "core", scope: "global", project: null,
          title: "sibling-device rule", summary: "from another machine", path: "memory/core/_global/sibling.md",
          status: "active", confidence: 1, importance: 5, createdAt: "2026-06-20",
          updatedAt: "2026-06-20", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: "mac-mini-2", accessCount: 0, lastAccess: null },
      },
    }));
    writeMd(overlay, "core/_global/sibling", "sibling-device rule", "OVERLAY-BODY-MARKER");
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    idx.entries["core/_global/g"] = { ...idx.entries["core/g"], id: "core/_global/g" };
    delete idx.entries["core/g"];
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify(idx));

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    expect(out).toContain("- **never npm publish**\n\n  LOCAL-BODY-MARKER");
    expect(out).toContain("- **sibling-device rule**\n\n  OVERLAY-BODY-MARKER");
  });

  it("keeps the author's own heading and indentation in bodies written by the writer", async () => {
    const { renderMemoryMarkdown } = await import("../../src/memory/render.js");
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    const headed = { ...idx.entries["core/g"], id: "core/_global/g", path: "memory/core/_global/g.md" };
    const coded = { ...headed, id: "core/_global/k", title: "code rule", summary: "code summary", path: "memory/core/_global/k.md" };
    idx.entries = { [headed.id]: headed, [coded.id]: coded };
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify(idx));
    mkdirSync(join(repo, "memory/core/_global"), { recursive: true });
    writeFileSync(join(repo, headed.path), renderMemoryMarkdown(headed, "# Only in rehearsal\n\nUse draft mode."));
    writeFileSync(join(repo, coded.path), renderMemoryMarkdown(coded, "    first --indented\n    second --indented"));

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    expect(out).toContain("- **never npm publish**\n\n  # Only in rehearsal\n\n  Use draft mode.");
    expect(out).toContain("- **code rule**\n\n      first --indented\n      second --indented");
  });

  it("falls back to the summary when an index key disagrees with its entry's id", async () => {
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    idx.entries["core/g"] = { ...idx.entries["core/g"], id: "core/_global/g" };
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify(idx));
    writeMd(repo, "core/_global/g", "never npm publish", "MISMATCHED-KEY-MARKER");

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    expect(out).not.toContain("MISMATCHED-KEY-MARKER");
    expect(out).toContain("**never npm publish** — the maintainer OTP");
  });

  it("reads no core body through the indexed path, a foreign file or a symlinked directory", async () => {
    const outside = mkdtempSync(join(tmpdir(), "vbp-outside-"));
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    const base = idx.entries["core/g"];
    const rule = (id: string, title: string, path: string) =>
      ({ ...base, id, scope: "project:code-demo", project: "code-demo", title, summary: `${title} summary`, path });
    // 1. The canonical file is missing; the indexed path points at a file outside memory/.
    writeFileSync(join(repo, "outside.md"), "---\nid: core/code-demo/indexed\ntype: core\n---\n\nINDEXED-PATH-MARKER\n");
    idx.entries["core/code-demo/indexed"] = rule("core/code-demo/indexed", "indexed rule", "outside.md");
    // 2. The canonical file belongs to another entry.
    writeMd(repo, "core/code-demo/foreign", "foreign rule", "FOREIGN-MARKER", "core/code-demo/someone-else");
    idx.entries["core/code-demo/foreign"] = rule("core/code-demo/foreign", "foreign rule", "memory/core/code-demo/foreign.md");
    // 3. A path component is a symlink out of the store.
    writeMd(outside, "core/linked/via-link", "linked rule", "SYMLINK-MARKER");
    mkdirSync(join(repo, "memory", "core"), { recursive: true });
    symlinkSync(join(outside, "memory", "core", "linked"), join(repo, "memory", "core", "linked"));
    idx.entries["core/linked/via-link"] = { ...rule("core/linked/via-link", "linked rule", "memory/core/linked/via-link.md"),
      scope: "global", project: "linked" };
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify(idx));

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    for (const marker of ["INDEXED-PATH-MARKER", "FOREIGN-MARKER", "SYMLINK-MARKER"]) expect(out).not.toContain(marker);
    expect(out).toContain("**indexed rule** — indexed rule summary");
    expect(out).toContain("**foreign rule** — foreign rule summary");
    expect(out).toContain("**linked rule** — linked rule summary");
    rmSync(outside, { recursive: true, force: true });
  });

  it("keeps the SessionStart primer compact and under the hook ceiling on a large store", async () => {
    const { HOOK_PRIMER_MAX_CHARS, renderPrimer } = await import("../../src/memory/primer.js");
    const long = "这是一条很长的记忆摘要，".repeat(30);
    const entries: Record<string, Record<string, unknown>> = {};
    const add = (id: string, type: string, scope: string, project: string | null, title: string) => {
      entries[id] = { id, type, scope, project, title, summary: `${title} SUMMARY ${long}`, path: `memory/${id}.md`,
        status: "active", confidence: 0.9, importance: 3, createdAt: "2026-06-01", updatedAt: "2026-06-01",
        validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
        entities: [], trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null };
    };
    for (let i = 0; i < 8; i++) add(`core/_global/c${i}`, "core", "global", null, `core rule ${i}`);
    for (let i = 0; i < 30; i++) add(`semantic/code-demo/f${i}`, "semantic", "project:code-demo", "code-demo", `fact ${i}`);
    for (let i = 0; i < 30; i++) add(`procedural/code-demo/p${i}`, "procedural", "project:code-demo", "code-demo", `procedure ${i}`);
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries }));
    // The full-summary primer for this store is far over Claude Code's 10,000-character hook limit.
    expect(renderPrimer("code-demo", Object.values(entries) as never).length).toBeGreaterThan(10_000);

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/code-demo" });
    const out = stdout.join("");
    expect(out.length).toBeLessThanOrEqual(HOOK_PRIMER_MAX_CHARS);
    expect(out).toContain("core rule 0 SUMMARY");
    expect(out).toContain("- **fact 0**");
    expect(out).not.toContain("fact 0 SUMMARY");
    expect(out).toContain("## Procedures & gotchas");
    expect(out).toContain("- **procedure 0**");
  });
});
