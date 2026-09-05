import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { scanAndImport } from "../../src/spool/scan-and-import.js";
import { loadIndex } from "../../src/_shared/index-store.js";

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
          message: { text: "Inspect the configuration loader" },
          response: [{ kind: "markdownContent", content: { value: "The configuration was checked." } }],
          timestamp: Date.parse("2026-09-01T12:00:00Z"),
        }],
      }));
    });

    for (let pass = 0; pass < 2; pass++) {
      await scanAndImport({ projectFilter: null });
      const spool = join(home, ".memarium/session-repo");
      const idx = loadIndex(spool);
      expect(Object.keys(idx.entries)).toEqual([`copilot:${id}`]);
      expect(existsSync(join(spool, idx.entries[`copilot:${id}`]!.relativePath))).toBe(true);
    }
  });
});
