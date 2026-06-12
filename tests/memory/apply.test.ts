import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MemoryEntry } from "../../src/memory/types.js";

function mk(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "core/yue-workflow", type: "core", scope: "global", project: null,
    title: "t", summary: "s", path: "", status: "active", confidence: 0.9, importance: 5,
    createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("applyMemoryItems", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-apply-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".vibebook/session-repo");
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("writes md at the canonical path + upserts index, ignoring a missing path", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const r = applyMemoryItems(repo, [{ entry: mk({ path: "" }), body: "b" }]);
    expect(r.written).toBe(1);
    expect(existsSync(join(repo, "memory/core/_global/yue-workflow.md"))).toBe(true);
    const idx = JSON.parse(readFileSync(join(repo, ".vibebook/index.memory.json"), "utf8"));
    expect(idx.entries["core/yue-workflow"].path).toBe("memory/core/_global/yue-workflow.md");
  });

  it("rejects a supplied path that does not match the canonical path", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    expect(() => applyMemoryItems(repo, [{
      entry: mk({ id: "semantic/p/z", type: "semantic", project: "p", path: "memory/core/_global/yue-workflow.md" }),
      body: "evil",
    }])).toThrow(/does not match canonical/);
    expect(existsSync(join(repo, "memory/core/_global/yue-workflow.md"))).toBe(false);
  });

  it("flips the supersede target to superseded (v3 behavior preserved)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    applyMemoryItems(repo, [{ entry: mk({ id: "core/old", title: "old" }), body: "old" }]);
    applyMemoryItems(repo, [{ entry: mk({ id: "core/new", title: "new", supersedes: "core/old" }), body: "new" }]);
    const idx = JSON.parse(readFileSync(join(repo, ".vibebook/index.memory.json"), "utf8"));
    expect(idx.entries["core/old"].status).toBe("superseded");
    const oldMd = readFileSync(join(repo, "memory/core/_global/old.md"), "utf8");
    expect(oldMd).toMatch(/^status: superseded$/m);
  });

  it("preflight: a bad item aborts the batch before ANY item is written", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    expect(() => applyMemoryItems(repo, [
      { entry: mk({ id: "core/good", title: "g" }), body: "g" },
      { entry: mk({ id: "semantic/p/bad", type: "semantic", project: "p", path: "memory/core/_global/evil.md" }), body: "x" },
    ])).toThrow(/does not match canonical/);
    // the good (first) item must NOT have been written — validation precedes writes
    expect(existsSync(join(repo, "memory/core/_global/good.md"))).toBe(false);
  });

  it("traversal guard fires when the canonical path escapes memory/ (untrusted type)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    // A malicious `type` makes canonicalMemoryPath itself escape memory/, so the
    // canonical-path check passes (no supplied path) and the under-memory/
    // traversal guard is the layer that must catch it.
    const evil = mk({ id: "x/pwn", type: "../../etc" as unknown as MemoryEntry["type"], project: null, path: "" });
    expect(() => applyMemoryItems(repo, [{ entry: evil, body: "b" }]))
      .toThrow(/refusing to write outside memory\//);
  });
});
