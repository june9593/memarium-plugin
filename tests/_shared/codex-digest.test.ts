import { describe, expect, it } from "vitest";
import { extractManifest } from "../../src/_shared/digest/manifest.js";
import { buildTocEntries } from "../../src/_shared/digest/toc.js";
import type { SessionMessage } from "../../src/_shared/types.js";

const toolUse = (name: string, input: unknown) => ({ type: "tool_use" as const, name, input });

describe("Codex digest metadata", () => {
  it("reads local-shell command arrays and both sides of an apply_patch rename", () => {
    const message: SessionMessage = {
      role: "assistant",
      text: "",
      contentBlocks: [
        toolUse("local_shell", { command: ["/bin/zsh", "-lc", 'git commit -m "fix review"'] }),
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
  });
});
