import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSkips, saveSkips, upsertSkips, SKIP_INDEX_REL } from "../../src/spool/skip-store.js";

describe("skip-store", () => {
  let repo: string;
  beforeEach(() => { repo = mkdtempSync(join(tmpdir(), "vbp-skip-")); mkdirSync(join(repo, ".memarium"), { recursive: true }); });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  it("loadSkips returns an empty ledger when the file is absent", () => {
    expect(loadSkips(repo)).toEqual({ version: 1, sessions: {} });
  });

  it("upsert → save → load round-trips; is idempotent; preserves the first-skip timestamp", () => {
    const idx = loadSkips(repo);
    expect(upsertSkips(idx, [{ sessionId: "s1", reason: "meta" }, { sessionId: "s2" }], "2026-07-13")).toBe(2);
    saveSkips(repo, idx);
    const reloaded = loadSkips(repo);
    expect(Object.keys(reloaded.sessions).sort()).toEqual(["s1", "s2"]);
    expect(reloaded.sessions.s1).toEqual({ reason: "meta", at: "2026-07-13" });
    expect(reloaded.sessions.s2.reason).toBe("skipped");
    // re-upsert s1 with a later date + NO reason → NOT newly added; original `at`
    // AND original reason preserved (a later upsert must not clobber the reason)
    expect(upsertSkips(reloaded, [{ sessionId: "s1" }], "2026-08-01")).toBe(0);
    expect(reloaded.sessions.s1.at).toBe("2026-07-13");
    expect(reloaded.sessions.s1.reason).toBe("meta");
  });

  it("ignores blank/whitespace sessionIds", () => {
    const idx = loadSkips(repo);
    expect(upsertSkips(idx, [{ sessionId: "" }, { sessionId: "  " }], "2026-07-13")).toBe(0);
    expect(Object.keys(idx.sessions)).toEqual([]);
  });

  it("a corrupt ledger file degrades to empty (never throws — must not break a digest)", () => {
    writeFileSync(join(repo, SKIP_INDEX_REL), "{ not json");
    expect(loadSkips(repo)).toEqual({ version: 1, sessions: {} });
  });
});
