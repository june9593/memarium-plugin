import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { symlinkSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertNoSymlinkedComponent } from "../../src/qa/path-guard.js";

describe("assertNoSymlinkedComponent", () => {
  let repo: string;
  let external: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "pg-repo-"));
    external = mkdtempSync(join(tmpdir(), "pg-ext-"));
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(external, { recursive: true, force: true });
  });

  it("does NOT false-early-return for a ..-prefixed in-repo dir name (throws on symlinked component)", () => {
    // Create <repo>/..foo/link -> external  (dir name starts with ".." but is IN repo)
    const dotDotFoo = join(repo, "..foo");
    mkdirSync(dotDotFoo);
    const link = join(dotDotFoo, "link");
    symlinkSync(external, link);
    // The guard must NOT skip because "..foo" starts with ".."; it must reach
    // the "link" component and throw.
    expect(() =>
      assertNoSymlinkedComponent(repo, join(repo, "..foo", "link", "x"), "t")
    ).toThrow(/symlink guard/);
  });

  it("returns without throwing for a genuinely-outside path (parent traversal)", () => {
    // join(repo, "..", "sibling", "x") is outside repoPath
    expect(() =>
      assertNoSymlinkedComponent(repo, join(repo, "..", "sibling", "x"), "t")
    ).not.toThrow();
  });

  it("does NOT throw for normal nested real dirs", () => {
    const a = join(repo, "a");
    const b = join(a, "b");
    mkdirSync(b, { recursive: true });
    expect(() =>
      assertNoSymlinkedComponent(repo, join(repo, "a", "b", "x"), "t")
    ).not.toThrow();
  });

  it("throws when a path component is a symlink to an external dir", () => {
    const a = join(repo, "a");
    symlinkSync(external, a);
    expect(() =>
      assertNoSymlinkedComponent(repo, join(repo, "a", "x"), "t")
    ).toThrow(/symlink guard/);
  });

  it("does NOT throw for nonexistent components (ENOENT early-return)", () => {
    // repo is empty; "nope" does not exist
    expect(() =>
      assertNoSymlinkedComponent(repo, join(repo, "nope", "x"), "t")
    ).not.toThrow();
  });
});
