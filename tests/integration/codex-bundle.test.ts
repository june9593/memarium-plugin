import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("committed plugin bundle", () => {
  it("contains and registers the Codex adapter", () => {
    const bundle = readFileSync(
      fileURLToPath(new URL("../../bin/memarium-plugin.js", import.meta.url)),
      "utf8",
    );
    expect(bundle).toContain("CodexAdapter = class");
    expect(bundle).toContain("new CodexAdapter()");
    expect(bundle).toContain('"archived_sessions"');
  });
});
