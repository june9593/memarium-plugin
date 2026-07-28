import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EntityPage } from "../../src/entity/types.js";

function makeEntry(overrides: Partial<EntityPage> = {}): EntityPage {
  return {
    id: "entity/code-demo/spool-writer",
    kind: "symbol",
    scope: "project:code-demo",
    project: "code-demo",
    title: "SpoolWriter",
    aliases: ["writer", "render"],
    sourceMemoryIds: ["semantic/code-demo/spool"],
    sourceSessions: ["session-abc"],
    sourceFiles: ["src/writer.ts"],
    relatedEntities: ["entity/code-demo/manifest"],
    path: "",
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
    ...overrides,
  };
}

describe("entityWriteCmd", () => {
  let fakeHome: string;
  let repo: string;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-entw-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("writes md + updates index.entity.json", async () => {
    const entry = makeEntry();
    const input = join(fakeHome, "entities.json");
    writeFileSync(input, JSON.stringify([{ entry, body: "SpoolWriter renders sessions to md." }]));

    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const report = await entityWriteCmd({ inputPath: input });

    expect(report.written).toBe(1);
    expect(report.paths).toHaveLength(1);

    const mdPath = join(repo, "memory/entities/code-demo/spool-writer.md");
    expect(existsSync(mdPath)).toBe(true);
    const md = readFileSync(mdPath, "utf8");
    expect(md).toContain("title: SpoolWriter");
    expect(md).toContain("kind: symbol");
    expect(md).toContain("SpoolWriter renders sessions to md.");

    const idxPath = join(repo, ".memarium/index.entity.json");
    expect(existsSync(idxPath)).toBe(true);
    const idx = JSON.parse(readFileSync(idxPath, "utf8"));
    expect(idx.entries["entity/code-demo/spool-writer"]).toBeDefined();
    expect(idx.entries["entity/code-demo/spool-writer"].path)
      .toBe("memory/entities/code-demo/spool-writer.md");
  });

  it("fills in path automatically when not provided", async () => {
    const entry = makeEntry({ path: "" });
    const input = join(fakeHome, "entities2.json");
    writeFileSync(input, JSON.stringify([{ entry, body: "auto path test" }]));

    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const report = await entityWriteCmd({ inputPath: input });

    expect(report.paths[0]).toBe("memory/entities/code-demo/spool-writer.md");
  });

  it("global scope uses _global scopeDir", async () => {
    const entry = makeEntry({
      id: "entity/_global/typescript",
      kind: "concept",
      scope: "global",
      project: null,
      title: "TypeScript",
      path: "",
    });
    const input = join(fakeHome, "entities3.json");
    writeFileSync(input, JSON.stringify([{ entry, body: "Typed superset of JS." }]));

    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const report = await entityWriteCmd({ inputPath: input });

    expect(report.paths[0]).toBe("memory/entities/_global/typescript.md");
    const mdPath = join(repo, "memory/entities/_global/typescript.md");
    expect(existsSync(mdPath)).toBe(true);
  });

  // Round-38: `path` is always DERIVED, so traversal can no longer be injected
  // through the payload's `path` (see the "ignores a caller-supplied path" test
  // below). The remaining caller-controlled path component is `project`, which
  // `entityPath` uses verbatim as the scope DIRECTORY — so that is the vector
  // this guard has to catch, and the one this test now exercises.
  it("throws on path traversal attempt (via project)", async () => {
    const entry = makeEntry({ project: "../../..", path: "" });
    const input = join(fakeHome, "evil.json");
    writeFileSync(input, JSON.stringify([{ entry, body: "bad" }]));

    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    await expect(entityWriteCmd({ inputPath: input }))
      .rejects.toThrow("entity-write: refusing to write outside memory/entities/");

    // `memory/entities/../../../spool-writer.md` resolves to the repo's PARENT
    // directory — that is the file the guard has to prevent.
    expect(existsSync(join(repo, "..", "spool-writer.md"))).toBe(false);
  });

  it("ignores a caller-supplied path — no escape, index keeps the canonical path", async () => {
    const entry = makeEntry({ path: "../../escape.md" });
    const input = join(fakeHome, "supplied-path.json");
    writeFileSync(input, JSON.stringify([{ entry, body: "supplied path is inert" }]));

    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const report = await entityWriteCmd({ inputPath: input });

    expect(report.paths[0]).toBe("memory/entities/code-demo/spool-writer.md");
    expect(existsSync(join(repo, "../../escape.md"))).toBe(false);
    expect(existsSync(join(repo, "memory/entities/code-demo/spool-writer.md"))).toBe(true);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.entity.json"), "utf8"));
    expect(idx.entries["entity/code-demo/spool-writer"].path)
      .toBe("memory/entities/code-demo/spool-writer.md");
  });

  it("throws when --input JSON not found", async () => {
    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    await expect(entityWriteCmd({ inputPath: "/nonexistent/entities.json" }))
      .rejects.toThrow("entity-write: --input JSON not found");
  });

  // Fix 3: symlink-safe write guard
  it("throws when entry path resolves via a symlinked dir pointing outside memory/entities/", async () => {
    const { symlinkSync, mkdirSync: fsMkdir } = await import("node:fs");

    // Create a directory outside the repo that simulates an attacker-controlled target
    const outsideDir = join(fakeHome, "outside-dir");
    fsMkdir(outsideDir, { recursive: true });

    // Create memory/entities/ dir, then place a symlink subdirectory inside it
    fsMkdir(join(repo, "memory/entities"), { recursive: true });
    const symlinkSubdir = join(repo, "memory/entities/evil-link");
    try {
      symlinkSync(outsideDir, symlinkSubdir);
    } catch {
      // skip if symlinks not supported in this environment
      return;
    }

    // Round-38: the path is derived, so the symlinked dir is reached through the
    // scope directory (`project`), not through a payload `path`.
    const entry = makeEntry({ project: "evil-link", id: "entity/code-demo/injected", path: "" });
    const input = join(fakeHome, "symlink-attack.json");
    writeFileSync(input, JSON.stringify([{ entry, body: "injected content" }]));

    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    await expect(entityWriteCmd({ inputPath: input }))
      .rejects.toThrow(/refusing to write outside memory\/entities\//);

    // confirm nothing was written outside
    expect(existsSync(join(outsideDir, "injected.md"))).toBe(false);
  });
});
