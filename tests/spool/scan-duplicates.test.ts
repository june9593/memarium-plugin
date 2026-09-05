import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, utimesSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { scanAndImport } from "../../src/spool/scan-and-import.js";
import { loadIndex, saveIndex } from "../../src/_shared/index-store.js";

describe("duplicate workspace render cleanup", () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "memarium-scan-duplicates-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("MEMARIUM_DIR", join(home, ".memarium"));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(home, { recursive: true, force: true });
  });

  it("preserves the final indexed path after A-B-A discoveries and repeated scans", async () => {
    const base = process.platform === "darwin" ? "Library/Application Support/Code/User/workspaceStorage"
      : process.platform === "win32" ? "AppData/Roaming/Code/User/workspaceStorage"
      : ".config/Code/User/workspaceStorage";
    const storage = join(home, base);
    for (const name of ["workspace-a", "workspace-b", "workspace-c"]) {
      mkdirSync(join(storage, name, "chatSessions"), { recursive: true });
    }
    const id = "12345678-abcd-4000-8000-123456789abc";
    readdirSync(storage).forEach((name, i) => {
      const ws = join(storage, name);
      writeFileSync(join(ws, "workspace.json"), JSON.stringify({
        folder: pathToFileURL(join(home, "projects", i === 1 ? "two" : "one")).href,
      }));
      writeFileSync(join(ws, "chatSessions", `${id}.json`), JSON.stringify({
        version: 3, customTitle: "Shared session title", requests: [{
          requestId: `workspace-${i}`,
          message: { text: "Inspect the configuration loader" },
          response: [{ kind: "markdownContent", content: { value: "The configuration was checked." } }],
          timestamp: Date.parse("2026-09-01T12:00:00Z"),
        }],
      }));
      utimesSync(join(ws, "chatSessions", `${id}.json`), new Date("2026-09-01"), new Date("2026-09-01"));
    });

    for (let pass = 0; pass < 2; pass++) {
      expect((await scanAndImport({ projectFilter: null })).imported).toBe(3);
      const spool = join(home, ".memarium/session-repo");
      const idx = loadIndex(spool);
      expect(Object.keys(idx.entries)).toEqual([`copilot:${id}`]);
      expect(existsSync(join(spool, idx.entries[`copilot:${id}`]!.relativePath))).toBe(true);
    }
  });

  for (const legacyAlias of [false, true]) {
    it(`keeps the render and actual path spelling after a case-only title change (legacy alias: ${legacyAlias})`, async (ctx) => {
      const base = process.platform === "darwin" ? "Library/Application Support/Code/User/workspaceStorage"
        : process.platform === "win32" ? "AppData/Roaming/Code/User/workspaceStorage"
        : ".config/Code/User/workspaceStorage";
      const ws = join(home, base, "workspace");
      mkdirSync(join(ws, "chatSessions"), { recursive: true });
      writeFileSync(join(ws, "workspace.json"), JSON.stringify({ folder: pathToFileURL(join(home, "projects/one")).href }));
      const id = "12345678-abcd-4000-8000-123456789abc";
      const src = join(ws, "chatSessions", `${id}.json`);
      const state = { version: 3, customTitle: "Foo", requests: [{
        message: { text: "Inspect the configuration loader" }, timestamp: Date.parse("2026-09-01T12:00:00Z"), response: [],
      }] };
      writeFileSync(src, JSON.stringify(state));
      await scanAndImport({ projectFilter: null });
      const spool = join(home, ".memarium/session-repo");
      if (legacyAlias) {
        const idx = loadIndex(spool);
        const alias = idx.entries[`copilot:${id}`]!.relativePath.replace("Foo__", "foo__");
        if (!existsSync(join(spool, alias))) {
          vi.unstubAllEnvs();
          rmSync(home, { recursive: true, force: true });
          ctx.skip(); return; // case-sensitive filesystem
        }
        idx.entries[`copilot:${id}`]!.relativePath = alias;
        saveIndex(spool, idx);
      }
      state.customTitle = "foo";
      writeFileSync(src, JSON.stringify(state));
      await scanAndImport({ projectFilter: null });
      const entry = loadIndex(spool).entries[`copilot:${id}`]!;
      expect(entry.displayName).toBe("foo");
      const abs = join(spool, entry.relativePath);
      expect(existsSync(abs)).toBe(true);
      expect(readFileSync(abs, "utf8")).toContain("displayName: foo");
      expect(realpathSync.native(abs)).toBe(join(realpathSync.native(spool), entry.relativePath));
    });
  }
});
