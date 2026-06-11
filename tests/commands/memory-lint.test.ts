import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { memoryLintCmd } from "../../src/commands/memory-lint.js";

let home: string, repo: string, out: string[];
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "mlint-"));
  repo = join(home, ".vibebook", "session-repo");
  mkdirSync(join(repo, ".vibebook"), { recursive: true });
  vi.stubEnv("HOME", home);
  out = [];
  vi.spyOn(process.stdout, "write").mockImplementation((s: string) => { out.push(String(s)); return true; });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

describe("memoryLintCmd", () => {
  it("--json emits a valid LintReport; empty repo → 0 issues; writes NOTHING", async () => {
    const before = readdirSync(repo).sort();
    await memoryLintCmd({ json: true });
    const payload = JSON.parse(out.join(""));
    expect(payload.counts).toEqual({ issues: 0, suggestions: 0 });
    expect(Array.isArray(payload.issues)).toBe(true);
    expect(Array.isArray(payload.suggestions)).toBe(true);
    expect(readdirSync(repo).sort()).toEqual(before); // no new files
  });

  it("detects dangling-supersedes against a real index; human report by default; still no writes", async () => {
    writeFileSync(join(repo, ".vibebook", "index.memory.json"), JSON.stringify({ version: 1, entries: {
      "semantic/p/a": { id: "semantic/p/a", type: "semantic", scope: "project:p", project: "p",
        title: "t", summary: "s", path: "memory/x.md", status: "active", confidence: 1, importance: 1,
        createdAt: "2026-01-01", updatedAt: "2026-06-11", validFrom: null, validTo: null,
        sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: "semantic/p/ghost",
        entities: [], originDevice: null, accessCount: 0, lastAccess: null } } }));
    await memoryLintCmd({});
    const text = out.join("");
    expect(text).toContain("dangling-supersedes");
    // no _primer written
    let primerExists = false;
    try { primerExists = readdirSync(join(repo, "memory")).includes("_primer"); } catch { primerExists = false; }
    expect(primerExists).toBe(false);
  });

  it("Fix3: NaN staleDays falls back to 90 — old episodic (200d ago) still flagged as stale-candidate", async () => {
    // updatedAt well over 90 days before today
    writeFileSync(join(repo, ".vibebook", "index.memory.json"), JSON.stringify({ version: 1, entries: {
      "episodic/p/old": { id: "episodic/p/old", type: "episodic", scope: "project:p", project: "p",
        title: "t", summary: "s", path: "memory/x.md", status: "active", confidence: 0.8, importance: 1,
        createdAt: "2025-01-01", updatedAt: "2025-01-01", validFrom: null, validTo: null,
        sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
        entities: [], originDevice: null, accessCount: 0, lastAccess: null } } }));
    await memoryLintCmd({ json: true, staleDays: NaN });
    const payload = JSON.parse(out.join(""));
    const checks = payload.issues.map((f: { check: string }) => f.check);
    expect(checks).toContain("stale-candidate");
  });

  it("Fix4: corrupt .vibebook/index.json does not crash — emits valid LintReport (project=null fallback)", async () => {
    // Write an invalid JSON to the spool index (not the memory index) to force a throw in resolveProjectFromCwd
    writeFileSync(join(repo, ".vibebook", "index.json"), "{ not json");
    // Should not throw; must emit a valid (possibly empty) LintReport
    await expect(memoryLintCmd({ json: true })).resolves.not.toThrow();
    const payload = JSON.parse(out.join(""));
    expect(Array.isArray(payload.issues)).toBe(true);
    expect(Array.isArray(payload.suggestions)).toBe(true);
    expect(typeof payload.counts.issues).toBe("number");
  });

  it("corrupt-index: invalid JSON in index.memory.json → corrupt-index finding with layer=memory, no throw", async () => {
    writeFileSync(join(repo, ".vibebook", "index.memory.json"), "{ not json");
    await expect(memoryLintCmd({ json: true })).resolves.not.toThrow();
    const payload = JSON.parse(out.join(""));
    const corrupt = payload.issues.filter((f: { check: string }) => f.check === "corrupt-index");
    expect(corrupt.length).toBeGreaterThan(0);
    expect(corrupt[0].layer).toBe("memory");
    expect(corrupt[0].severity).toBe("error");
  });

  it("corrupt-index: wrong-version index.qa.json → corrupt-index finding with layer=qa", async () => {
    writeFileSync(join(repo, ".vibebook", "index.qa.json"), JSON.stringify({ version: 2, entries: {} }));
    await expect(memoryLintCmd({ json: true })).resolves.not.toThrow();
    const payload = JSON.parse(out.join(""));
    const corrupt = payload.issues.filter((f: { check: string }) => f.check === "corrupt-index");
    expect(corrupt.length).toBeGreaterThan(0);
    expect(corrupt[0].layer).toBe("qa");
  });

  it("corrupt-index: valid v1 index file → no corrupt-index finding", async () => {
    writeFileSync(join(repo, ".vibebook", "index.memory.json"), JSON.stringify({ version: 1, entries: {} }));
    await memoryLintCmd({ json: true });
    const payload = JSON.parse(out.join(""));
    const corrupt = payload.issues.filter((f: { check: string }) => f.check === "corrupt-index");
    expect(corrupt.length).toBe(0);
  });

  it("Fix2 (array entries): entries:[] is NOT a valid v1 index → corrupt-index flagged", async () => {
    writeFileSync(join(repo, ".vibebook", "index.memory.json"), JSON.stringify({ version: 1, entries: [] }));
    await memoryLintCmd({ json: true });
    const payload = JSON.parse(out.join(""));
    const corrupt = payload.issues.filter((f: { check: string }) => f.check === "corrupt-index");
    expect(corrupt.length).toBeGreaterThan(0);
    expect(corrupt[0].layer).toBe("memory");
    expect(corrupt[0].severity).toBe("error");
  });

  it("Fix3 (stale clamp): staleDays=-1 falls back to 90 — a today-dated episodic is NOT flagged stale-candidate", async () => {
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(join(repo, ".vibebook", "index.memory.json"), JSON.stringify({ version: 1, entries: {
      "episodic/p/recent": { id: "episodic/p/recent", type: "episodic", scope: "project:p", project: "p",
        title: "recent thing", summary: "happened today", path: "memory/x.md",
        status: "active", confidence: 0.8, importance: 1,
        createdAt: today, updatedAt: today, validFrom: null, validTo: null,
        sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
        entities: [], originDevice: null, accessCount: 0, lastAccess: null } } }));
    await memoryLintCmd({ json: true, staleDays: -1 });
    const payload = JSON.parse(out.join(""));
    const stale = payload.issues.filter((f: { check: string }) => f.check === "stale-candidate");
    expect(stale.length).toBe(0);
  });
});
