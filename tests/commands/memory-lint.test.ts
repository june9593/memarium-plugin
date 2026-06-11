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
});
