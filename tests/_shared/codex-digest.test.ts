import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractManifest } from "../../src/_shared/digest/manifest.js";
import { buildTocEntries } from "../../src/_shared/digest/toc.js";
import type { NormalizedSession, SessionMessage } from "../../src/_shared/types.js";
import { writeSession } from "../../src/spool/writer.js";

const toolUse = (name: string, input: unknown) => ({ type: "tool_use" as const, name, input });

describe("Codex digest metadata", () => {
  it("reads local-shell command arrays and both sides of an apply_patch rename", () => {
    const message: SessionMessage = {
      role: "assistant",
      text: "",
      contentBlocks: [
        toolUse("local_shell", { command: ["git", "commit", "-m", "fix review"] }),
        toolUse("apply_patch", { patch: [
          "*** Update File: src/old.ts",
          "*** Move to: src/new.ts",
        ].join("\n") }),
      ],
    };

    const manifest = extractManifest([message], [42]);
    expect(manifest.commits).toEqual([{ sha: "", msg: "fix review", line: 42 }]);
    expect(manifest.files_touched).toEqual(["src/old.ts", "src/new.ts"]);

    const toc = buildTocEntries([message], [42]);
    expect(toc).toHaveLength(1);
    expect(toc[0]).toMatchObject({ markers: "💾✏️", line: 42 });
    expect(toc[0]!.preview).toContain('git commit -m "fix review"');
  });

  it("uses full Codex ids when two display shortIds collide", () => {
    const repo = mkdtempSync(join(tmpdir(), "memarium-codex-writer-"));
    try {
      const first: NormalizedSession = {
        tool: "codex",
        sessionId: "019f0000-1111-7000-8000-0000aaaabbbb",
        shortId: "aaaabbbb",
        project: "code-demo",
        projectRaw: "/tmp/code-demo",
        startedAt: "2026-01-01T00:00:00Z",
        endedAt: "2026-01-01T00:00:01Z",
        nameSlug: "same-title",
        displayName: "same title",
        messages: [{ role: "user", text: "first session" }],
        sourcePath: "/tmp/first.jsonl",
      };
      const second = {
        ...first,
        sessionId: "019f0000-2222-7000-8000-0000aaaabbbb",
      };
      const firstPath = writeSession(repo, first).md;
      const secondPath = writeSession(repo, second).md;
      expect(firstPath).not.toBe(secondPath);
      expect(firstPath).not.toContain("\\");
      expect(secondPath).not.toContain("\\");
      expect(existsSync(join(repo, firstPath))).toBe(true);
      expect(existsSync(join(repo, secondPath))).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
