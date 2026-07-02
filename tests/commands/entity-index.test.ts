import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderEntityMarkdown } from "../../src/entity/render.js";
import type { EntityPage } from "../../src/entity/types.js";

function entry(): EntityPage {
  return {
    id: "entity/edge-memvc/spool-writer",
    kind: "symbol",
    scope: "project:edge-memvc",
    project: "edge-memvc",
    title: "SpoolWriter",
    aliases: ["writer", "render"],
    sourceMemoryIds: ["semantic/edge-memvc/spool"],
    sourceSessions: ["session-abc"],
    sourceFiles: ["src/writer.ts"],
    relatedEntities: ["entity/edge-memvc/manifest"],
    path: "memory/entities/edge-memvc/spool-writer.md",
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
  };
}

describe("entityIndexCmd (rebuild from md)", () => {
  let fakeHome: string, repo: string;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-entidx-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));

    // Write a pre-rendered entity md
    const e = entry();
    const abs = join(repo, e.path);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, renderEntityMarkdown(e, "SpoolWriter renders sessions to a single markdown file."));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("rebuilds index from md frontmatter (round-trips renderer)", async () => {
    const { entityIndexCmd } = await import("../../src/commands/entity-index.js");
    const report = await entityIndexCmd();
    expect(report.indexed).toBe(1);

    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.entity.json"), "utf8"));
    const e = idx.entries["entity/edge-memvc/spool-writer"];
    expect(e).toBeDefined();
    expect(e.title).toBe("SpoolWriter");
    expect(e.kind).toBe("symbol");
    expect(e.scope).toBe("project:edge-memvc");
    expect(e.project).toBe("edge-memvc");
    expect(e.aliases).toEqual(["writer", "render"]);
    expect(e.sourceMemoryIds).toEqual(["semantic/edge-memvc/spool"]);
    expect(e.sourceSessions).toEqual(["session-abc"]);
    expect(e.sourceFiles).toEqual(["src/writer.ts"]);
    expect(e.relatedEntities).toEqual(["entity/edge-memvc/manifest"]);
    expect(e.createdAt).toBe("2026-06-09");
    expect(e.updatedAt).toBe("2026-06-09");
    expect(e.path).toBe("memory/entities/edge-memvc/spool-writer.md");
  });

  it("indexed = 0 when memory/entities/ does not exist", async () => {
    // Fresh repo with no entities dir
    const fakeHome2 = mkdtempSync(join(tmpdir(), "vbp-entidx-empty-"));
    const repo2 = join(fakeHome2, ".memarium/session-repo");
    mkdirSync(join(fakeHome2, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome2, ".memarium/config.json"), JSON.stringify({
      repoPath: repo2, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // stub HOME to point to the new empty home
    vi.resetModules();
    vi.stubEnv("HOME", fakeHome2);
    try {
      const { entityIndexCmd } = await import("../../src/commands/entity-index.js");
      const report = await entityIndexCmd();
      expect(report.indexed).toBe(0);
    } finally {
      rmSync(fakeHome2, { recursive: true, force: true });
    }
  });

  it("indexes multiple entity mds across subdirectories", async () => {
    // Add a second entity md in _global
    const globalEntry: EntityPage = {
      id: "entity/_global/typescript",
      kind: "concept",
      scope: "global",
      project: null,
      title: "TypeScript",
      aliases: [],
      sourceMemoryIds: [],
      sourceSessions: [],
      sourceFiles: [],
      relatedEntities: [],
      path: "memory/entities/_global/typescript.md",
      createdAt: "2026-06-01",
      updatedAt: "2026-06-01",
    };
    const abs2 = join(repo, globalEntry.path);
    mkdirSync(join(abs2, ".."), { recursive: true });
    writeFileSync(abs2, renderEntityMarkdown(globalEntry, "Typed superset of JavaScript."));

    const { entityIndexCmd } = await import("../../src/commands/entity-index.js");
    const report = await entityIndexCmd();
    expect(report.indexed).toBe(2);

    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.entity.json"), "utf8"));
    expect(idx.entries["entity/edge-memvc/spool-writer"]).toBeDefined();
    expect(idx.entries["entity/_global/typescript"]).toBeDefined();
    expect(idx.entries["entity/_global/typescript"].project).toBeNull();
  });
});
