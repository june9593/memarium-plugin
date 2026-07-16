import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { memariumHome } from "../src/memarium-home.js";
import { proposalsDir } from "../src/memory/proposal-store.js";
import { usageDir } from "../src/memory/usage-store.js";
import { aggregatedOverlayPath } from "../src/memory/source-resolver.js";

describe("memariumHome — MEMARIUM_DIR override", () => {
  let home: string, dir: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-mh-home-"));
    dir = mkdtempSync(join(tmpdir(), "vbp-mh-dir-"));
    vi.stubEnv("HOME", home); vi.resetModules();
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); rmSync(dir, { recursive: true, force: true }); });

  it("MEMARIUM_DIR set → returns it verbatim; empty or unset → homedir()/.memarium", () => {
    vi.stubEnv("MEMARIUM_DIR", dir);
    expect(memariumHome()).toBe(dir);
    vi.stubEnv("MEMARIUM_DIR", "");                 // empty string is treated as unset (|| fallback)
    expect(memariumHome()).toBe(join(home, ".memarium"));
    vi.unstubAllEnvs(); vi.stubEnv("HOME", home);   // clear MEMARIUM_DIR entirely
    expect(memariumHome()).toBe(join(home, ".memarium"));
  });

  it("routed consumers land under MEMARIUM_DIR (centralization proof)", () => {
    vi.stubEnv("MEMARIUM_DIR", dir);
    // proposalsDir / usageDir are <memariumHome>/local-proposals|usage/<repoHash>
    expect(proposalsDir("/some/repo").startsWith(join(dir, "local-proposals"))).toBe(true);
    expect(usageDir("/some/repo").startsWith(join(dir, "usage"))).toBe(true);
    expect(aggregatedOverlayPath()).toBe(join(dir, "aggregated"));
  });

  it("routed consumers fall back to ~/.memarium when MEMARIUM_DIR unset", () => {
    expect(aggregatedOverlayPath()).toBe(join(home, ".memarium", "aggregated"));
    expect(proposalsDir("/some/repo").startsWith(join(home, ".memarium", "local-proposals"))).toBe(true);
  });
});
