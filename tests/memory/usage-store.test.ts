import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MemoryEntry } from "../../src/memory/types.js";

function mk(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p",
    title: "t", summary: "s", path: "", status: "active", confidence: 0.9, importance: 3,
    createdAt: "2026-06-01", updatedAt: "2026-06-01", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("usage-store", () => {
  let home: string;
  const repo = "/work/edge-memvc";
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-usage-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("usageDir lives under ~/.vibebook/usage/, OUTSIDE any session-repo", async () => {
    const { usageDir } = await import("../../src/memory/usage-store.js");
    const dir = usageDir(repo);
    expect(dir.startsWith(join(home, ".vibebook", "usage"))).toBe(true);
    expect(dir.includes("session-repo")).toBe(false);
  });

  it("bump increments count + sets lastAccess; second bump → 2", async () => {
    const { bumpUsage, loadUsage } = await import("../../src/memory/usage-store.js");
    bumpUsage(repo, ["semantic/p/x"], "2026-06-18");
    bumpUsage(repo, ["semantic/p/x"], "2026-06-19");
    const u = loadUsage(repo);
    expect(u["semantic/p/x"]).toEqual({ count: 2, lastAccess: "2026-06-19" });
  });

  it("bump dedups within one call (same id twice → +1)", async () => {
    const { bumpUsage, loadUsage } = await import("../../src/memory/usage-store.js");
    bumpUsage(repo, ["semantic/p/x", "semantic/p/x"], "2026-06-18");
    expect(loadUsage(repo)["semantic/p/x"].count).toBe(1);
  });

  it("bump with empty ids is a no-op (writes nothing)", async () => {
    const { bumpUsage, usageDir } = await import("../../src/memory/usage-store.js");
    bumpUsage(repo, [], "2026-06-18");
    expect(existsSync(usageDir(repo))).toBe(false);
  });

  it("writes atomically (valid JSON, no leftover .tmp file)", async () => {
    const { bumpUsage, usageDir } = await import("../../src/memory/usage-store.js");
    bumpUsage(repo, ["semantic/p/x"], "2026-06-18");
    const dir = usageDir(repo);
    const files = readdirSync(dir);
    expect(files).toContain("access.json");
    expect(files.some((f) => f.includes(".tmp"))).toBe(false);
    expect(() => JSON.parse(readFileSync(join(dir, "access.json"), "utf8"))).not.toThrow();
  });

  it("loadUsage is corrupt-safe: malformed JSON → {} (never throws)", async () => {
    const { usageDir, loadUsage } = await import("../../src/memory/usage-store.js");
    const dir = usageDir(repo);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "access.json"), "{ this is not json ::::");
    expect(loadUsage(repo)).toEqual({});
  });

  it("loadUsage drops malformed records but keeps valid ones", async () => {
    const { usageDir, loadUsage } = await import("../../src/memory/usage-store.js");
    const dir = usageDir(repo);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "access.json"), JSON.stringify({
      "good": { count: 3, lastAccess: "2026-06-18" },
      "bad-count": { count: "NaN-ish", lastAccess: "x" },
      "bad-shape": 42,
    }));
    expect(loadUsage(repo)).toEqual({ good: { count: 3, lastAccess: "2026-06-18" } });
  });

  it("loadUsage clamps count to a non-negative integer (negative would demote)", async () => {
    const { usageDir, loadUsage } = await import("../../src/memory/usage-store.js");
    const dir = usageDir(repo);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "access.json"), JSON.stringify({
      "neg": { count: -5, lastAccess: "x" },     // negative → 0, must not demote
      "frac": { count: 3.9, lastAccess: "x" },   // fractional → floored to 3
    }));
    const u = loadUsage(repo);
    expect(u["neg"].count).toBe(0);
    expect(u["frac"].count).toBe(3);
  });

  it("overlayUsage mutates entries in memory only (accessCount/lastAccess)", async () => {
    const { overlayUsage } = await import("../../src/memory/usage-store.js");
    const e = mk({ id: "semantic/p/x", accessCount: 0, lastAccess: null });
    overlayUsage([e], { "semantic/p/x": { count: 4, lastAccess: "2026-06-18" } });
    expect(e.accessCount).toBe(4);
    expect(e.lastAccess).toBe("2026-06-18");
  });

  it("overlay raises ranking via the scorer, capped at 5", async () => {
    const { overlayUsage } = await import("../../src/memory/usage-store.js");
    const { scoreMemories } = await import("../../src/memory/score.js");
    const hot = mk({ id: "hot", title: "same" });
    const cold = mk({ id: "cold", title: "same" });
    overlayUsage([hot], { hot: { count: 3, lastAccess: "2026-06-18" } });
    const q = { project: "p", text: "", type: null, now: "2026-06-18" };
    const r = scoreMemories([cold, hot], q);
    expect(r[0].entry.id).toBe("hot"); // higher accessCount ranks first
    // cap: count 100 scores the same as count 5
    const cap5 = mk({ id: "c5" }), cap100 = mk({ id: "c100" });
    overlayUsage([cap5], { c5: { count: 5, lastAccess: "x" } });
    overlayUsage([cap100], { c100: { count: 100, lastAccess: "x" } });
    const s5 = scoreMemories([cap5], q)[0].score;
    const s100 = scoreMemories([cap100], q)[0].score;
    expect(s100).toBe(s5);
  });

  it("refuses to write through a symlinked usage dir (guard)", async () => {
    const { bumpUsage, usageDir } = await import("../../src/memory/usage-store.js");
    const dir = usageDir(repo);
    mkdirSync(join(home, ".vibebook", "usage"), { recursive: true });
    const elsewhere = join(home, "elsewhere");
    mkdirSync(elsewhere, { recursive: true });
    symlinkSync(elsewhere, dir); // <repoHash> dir is a symlink
    expect(() => bumpUsage(repo, ["semantic/p/x"], "2026-06-18")).toThrow();
  });
});
