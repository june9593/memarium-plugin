import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { ensureSpoolDir, SPOOL_REL_PATH } from "../../src/spool/ensure-dir.js";

describe("ensureSpoolDir", () => {
  let fakeHome: string;
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-test-"));
    vi.stubEnv("HOME", fakeHome);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("creates raw_sessions/ and book/ when spool root is absent", () => {
    const result = ensureSpoolDir();
    expect(existsSync(join(fakeHome, ".memarium/session-repo/raw_sessions"))).toBe(true);
    expect(existsSync(join(fakeHome, ".memarium/session-repo/book"))).toBe(true);
    expect(result.spoolRoot).toBe(join(fakeHome, ".memarium/session-repo"));
    expect(result.created).toBe(true);
  });

  it("is idempotent — calling twice does not error", () => {
    ensureSpoolDir();
    expect(() => ensureSpoolDir()).not.toThrow();
  });

  it("does NOT create .git or .memarium subdirs (sync CLI owns those)", () => {
    ensureSpoolDir();
    expect(existsSync(join(fakeHome, ".memarium/session-repo/.git"))).toBe(false);
    expect(existsSync(join(fakeHome, ".memarium/session-repo/.memarium"))).toBe(false);
  });

  it("does NOT touch existing .git/ or .memarium/ if a sync-managed spool is already there", () => {
    const spool = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(spool, ".git"), { recursive: true });
    mkdirSync(join(spool, ".memarium"), { recursive: true });
    writeFileSync(join(spool, ".memarium/index.json"), '{"version":1,"entries":{}}');

    ensureSpoolDir();

    expect(existsSync(join(spool, ".git"))).toBe(true);
    expect(existsSync(join(spool, ".memarium/index.json"))).toBe(true);
    // raw_sessions/ + book/ were also added next to existing dirs
    expect(existsSync(join(spool, "raw_sessions"))).toBe(true);
    expect(existsSync(join(spool, "book"))).toBe(true);
  });

  it("returns created=false on second call", () => {
    ensureSpoolDir();
    const result = ensureSpoolDir();
    expect(result.created).toBe(false);
  });
});
