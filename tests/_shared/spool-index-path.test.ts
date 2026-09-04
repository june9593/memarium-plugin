import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadIndex } from "../../src/_shared/index-store.js";

describe("shared spool index path migration", () => {
  it("normalizes legacy Windows relativePath separators", () => {
    const repo = mkdtempSync(join(tmpdir(), "memarium-spool-path-"));
    try {
      mkdirSync(join(repo, ".memarium"), { recursive: true });
      writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
        version: 1,
        entries: {
          "codex:session": {
            sessionId: "session",
            shortId: "session",
            tool: "codex",
            project: "demo",
            projectRaw: "C:\\demo",
            startedAt: "2026-01-01T00:00:00Z",
            endedAt: "2026-01-01T00:00:01Z",
            nameSlug: "session",
            displayName: "session",
            relativePath: "raw_sessions\\codex\\demo\\2026-01-01\\session.md",
            sourcePath: "C:\\source.jsonl",
            sourceMtimeMs: 1,
            sourceSha256: "sha",
          },
        },
      }));
      expect(loadIndex(repo).entries["codex:session"]!.relativePath)
        .toBe("raw_sessions/codex/demo/2026-01-01/session.md");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
