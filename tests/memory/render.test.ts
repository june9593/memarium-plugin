import { describe, it, expect } from "vitest";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function entry(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "procedural/code-demo/add-source-adapter", type: "procedural",
    scope: "project:code-demo", project: "code-demo",
    title: "Add a source adapter", summary: "extend Tool union, register, write parser",
    path: "memory/procedural/code-demo/add-source-adapter.md",
    status: "active", confidence: 0.9, importance: 4,
    createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
    sourceSessions: ["abc12345"], sourceCommits: [], sourceFiles: ["src/sources/base.ts"],
    supersedes: null, entities: ["Tool", "SourceAdapter"], originDevice: "mac", accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("renderMemoryMarkdown", () => {
  it("renders YAML frontmatter + body", () => {
    const md = renderMemoryMarkdown(entry(), "Writer needs zero changes.");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("id: procedural/code-demo/add-source-adapter");
    expect(md).toContain("type: procedural");
    expect(md).toContain("scope: project:code-demo");
    expect(md).toContain("status: active");
    expect(md).toContain("entities: [Tool, SourceAdapter]");
    expect(md).toContain("sourceSessions: [abc12345]");
    expect(md).toContain("sourceFiles: [src/sources/base.ts]");
    expect(md).toContain("\n---\n\n# Add a source adapter\n");
    expect(md.trimEnd().endsWith("Writer needs zero changes.")).toBe(true);
  });

  it("emits empty arrays as []", () => {
    const md = renderMemoryMarkdown(entry({ entities: [], sourceSessions: [] }), "body");
    expect(md).toContain("entities: []");
    expect(md).toContain("sourceSessions: []");
  });

  it("omits null optional scalars cleanly (validTo, supersedes)", () => {
    const md = renderMemoryMarkdown(entry({ validTo: null, supersedes: null }), "body");
    expect(md).toContain("validTo: null");
    expect(md).toContain("supersedes: null");
  });

  it("renders trust; absent → unknown (#23)", () => {
    expect(renderMemoryMarkdown(entry({ trust: "untrusted" }), "body")).toContain("trust: untrusted");
    expect(renderMemoryMarkdown(entry({ trust: undefined }), "body")).toContain("trust: unknown");
  });

  it("does not throw when array fields are undefined; renders [] (#37)", () => {
    for (const f of ["sourceSessions", "sourceCommits", "sourceFiles", "entities"] as const) {
      const md = renderMemoryMarkdown(entry({ [f]: undefined }), "body");
      expect(md).toContain(`${f}: []`);
    }
    // all arrays + summary undefined at once → still renders, no undefined.length throw
    const thin = renderMemoryMarkdown(
      entry({ sourceSessions: undefined, sourceCommits: undefined, sourceFiles: undefined, entities: undefined, summary: undefined }),
      "body",
    );
    expect(thin).toContain("sourceSessions: []");
    expect(thin).toContain("entities: []");
    expect(thin).toContain("summary: \n"); // empty summary, no "undefined"
    expect(thin).not.toContain("undefined");
  });
});

describe("trust round-trip + legacy derivation (#23)", () => {
  it("round-trips an explicit trust value through render → parse", () => {
    for (const t of ["trusted", "untrusted", "unknown"] as const) {
      const back = parseMemoryMarkdown(renderMemoryMarkdown(entry({ trust: t }), "body"));
      expect(back?.trust).toBe(t);
    }
  });

  it("legacy md with NO trust line: own-provenance + project-scoped → derived trusted", () => {
    // Hand-authored legacy frontmatter (pre-feature: no `trust:` line) with a sourceSession.
    const md = [
      "---", "id: semantic/p/legacy", "type: semantic", "scope: project:p", "project: p",
      "title: Legacy fact", "summary: s", "sourceSessions: [s1]", "---", "", "# Legacy fact", "body",
    ].join("\n");
    expect(parseMemoryMarkdown(md)?.trust).toBe("trusted");
  });

  it("legacy md with NO trust line and NO provenance → unknown", () => {
    const md = [
      "---", "id: semantic/p/orphan", "type: semantic", "scope: project:p", "project: p",
      "title: Orphan fact", "summary: s", "sourceSessions: []", "sourceCommits: []", "---", "", "# Orphan", "body",
    ].join("\n");
    expect(parseMemoryMarkdown(md)?.trust).toBe("unknown");
  });
});

describe("renderMemoryMarkdown — round-32 (SECURITY): frontmatter is LINE-ORIENTED", () => {
  // Defense in depth for the round-32 gate fix. YAML frontmatter here is emitted
  // as plain `key: value` LINES, so a CONTROL CHARACTER — above all a NEWLINE —
  // inside a scalar emits EXTRA lines that `parseMemoryMarkdown` reads back as
  // REAL FIELDS. A crafted id like `semantic/p\nstatus: active` therefore FORGES
  // frontmatter (e.g. silently un-archiving an entry). The archival rewrite gate
  // now rejects such a row before it can get here, but the renderer is the
  // serialization boundary EVERY caller shares — `applyMemoryItems`
  // (memory-write / memory-approve) derives the .md path from the id's SLUG and
  // never validated the whole id either — so it refuses on its own too.
  //
  // SCOPE: the IDENTIFIER-ish scalars only — id / type / scope / status /
  // project. Those are schema-constrained (an id is `<type>/<project>/<slug>`, a
  // status is one of four literals, a project is a single path segment), so a
  // control character in them is always corruption. `title` / `summary` are free
  // prose and are deliberately NOT touched: refusing or rewriting them would
  // change behavior for legitimate authored content.
  const IDENT_FIELDS = ["id", "type", "scope", "status", "project"] as const;

  it("refuses a NEWLINE in any identifier field instead of forging a frontmatter line", () => {
    for (const field of IDENT_FIELDS) {
      const poisoned = entry({ [field]: `${String(entry()[field])}\nforged: value` } as Partial<MemoryEntry>);
      expect(() => renderMemoryMarkdown(poisoned, "body")).toThrow(/control character|refusing/i);
    }
  });

  it("refuses CR / NUL / other control characters too (character-class rule, not just \\n)", () => {
    for (const ch of ["\r", "\u0000", "\u0007", "\u001f", "\u007f"]) {
      expect(() => renderMemoryMarkdown(entry({ id: `semantic/p${ch}x/y` }), "body")).toThrow(/control character|refusing/i);
    }
  });

  it("the forged line never reaches the document — nothing is emitted at all", () => {
    const poisoned = entry({ id: "semantic/p\nstatus: active/safe" });
    let md: string | null = null;
    try { md = renderMemoryMarkdown(poisoned, "body"); } catch { md = null; }
    expect(md).toBeNull(); // refused outright — no document, so no forged key
  });

  it("legitimate entries — multi-line BODY, dotted segments, null project — still render (regression lock)", () => {
    const md = renderMemoryMarkdown(
      entry({ project: "my.proj-1", id: "semantic/my.proj-1/a.b-c" }),
      "line 1\nline 2\n\nline 3",
    );
    expect(md).toContain("id: semantic/my.proj-1/a.b-c");
    expect(md).toContain("project: my.proj-1");
    expect(md).toContain("line 1\nline 2");
    expect(parseMemoryMarkdown(md)?.id).toBe("semantic/my.proj-1/a.b-c");
    // a null project (global entries) still serializes as the YAML literal null
    expect(renderMemoryMarkdown(entry({ project: null }), "b")).toContain("project: null");
  });
});

describe("renderMemoryMarkdown — round-34 (SECURITY): NO frontmatter value can inject a line", () => {
  // Round-32 hardened only the IDENTIFIER-ish scalars (id/type/scope/status/
  // project) and deliberately left `title`/`summary` alone as "free prose".
  // That reasoning was wrong, because the damage is not to the poisoned field —
  // it is to a DIFFERENT one. A newline in ANY raw value opens a second
  // `key: value` line, and the pre-fix parser kept the LATER duplicate, so
  // `title: "x\nid: semantic/p/other"` handed the attacker the parsed `id`
  // despite the id itself being fully validated. The whole frontmatter block is
  // one shared line-oriented namespace: every value written into it has to be
  // structurally incapable of ending its own line.
  //
  // Two layers, both asserted here: the serializer NEUTRALIZES control chars in
  // free-text/other values (never throws — a legitimate authored title must not
  // hard-fail a write), and the parser REFUSES any document that carries a
  // duplicate key at all (round-35 — see the describe below for why picking an
  // occurrence was unsound).

  /** Frontmatter lines that declare `key` (start of line, `key: `). */
  function fmLines(md: string, key: string): string[] {
    const fm = md.match(/^---\n([\s\S]*?)\n---/)![1];
    return fm.split("\n").filter((l) => l.startsWith(`${key}:`));
  }

  it("a NEWLINE in `title` cannot forge a second `id:` line, and the parsed id stays the real one", () => {
    const md = renderMemoryMarkdown(entry({ title: "x\nid: semantic/p/other" }), "body");
    expect(fmLines(md, "id")).toHaveLength(1);
    expect(parseMemoryMarkdown(md)?.id).toBe("procedural/code-demo/add-source-adapter");
  });

  it("a NEWLINE in `summary` cannot forge a second `status:` line (un-archiving by injection)", () => {
    const md = renderMemoryMarkdown(
      entry({ status: "archived", summary: "s\nstatus: active" }), "body",
    );
    expect(fmLines(md, "status")).toEqual(["status: archived"]);
    expect(parseMemoryMarkdown(md)?.status).toBe("archived");
  });

  it("a NEWLINE in a NULLABLE scalar (archivedReason) cannot forge a line either", () => {
    const md = renderMemoryMarkdown(
      entry({ status: "archived", archivedAt: "2026-05-01", archivedReason: "stale\nstatus: active" }),
      "body",
    );
    expect(fmLines(md, "status")).toEqual(["status: archived"]);
    expect(fmLines(md, "archivedReason")).toHaveLength(1);
    expect(parseMemoryMarkdown(md)?.status).toBe("archived");
  });

  it("a NEWLINE in an ARRAY ELEMENT cannot forge a line (elements are joined onto one)", () => {
    const md = renderMemoryMarkdown(
      entry({ status: "archived", entities: ["a\nstatus: active", "b"] }), "body",
    );
    expect(fmLines(md, "status")).toEqual(["status: archived"]);
    expect(fmLines(md, "entities")).toHaveLength(1);
    expect(parseMemoryMarkdown(md)?.status).toBe("archived");
  });

  it("neutralizes the whole control-char class in free text, not just \\n", () => {
    for (const ch of ["\n", "\r", "\u0000", "\u0007", "\u001f", "\u007f", "\u009f"]) {
      const md = renderMemoryMarkdown(entry({ title: `a${ch}b`, summary: `c${ch}d` }), "body");
      const lines = md.match(/^---\n([\s\S]*?)\n---/)![1].split("\n");
      expect(fmLines(md, "title")).toHaveLength(1);
      expect(fmLines(md, "summary")).toHaveLength(1);
      // exactly the 22 keys the renderer emits — no forged extra line
      expect(lines).toHaveLength(22);
      // and no line carries any of the class gate.ts hasControlChars detects
      for (const l of lines) expect(l).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);
    }
  });

  it("the IDENTIFIER fields still THROW rather than neutralize (round-32 lock stays)", () => {
    for (const field of ["id", "type", "scope", "status", "project"] as const) {
      const poisoned = entry({ [field]: `${String(entry()[field])}\nforged: value` } as Partial<MemoryEntry>);
      expect(() => renderMemoryMarkdown(poisoned, "body")).toThrow(/control character|refusing/i);
    }
  });

  it("a clean entry is byte-identical before and after the fix (no gratuitous format change)", () => {
    const e = entry();
    const md = renderMemoryMarkdown(e, "Writer needs zero changes.");
    // exact expected serialization — a format drift would break every existing .md
    expect(md).toBe([
      "---",
      "id: procedural/code-demo/add-source-adapter",
      "type: procedural",
      "scope: project:code-demo",
      "project: code-demo",
      "title: Add a source adapter",
      "summary: extend Tool union, register, write parser",
      "status: active",
      "confidence: 0.9",
      "importance: 4",
      "createdAt: 2026-06-09",
      "updatedAt: 2026-06-09",
      "validFrom: null",
      "validTo: null",
      "supersedes: null",
      "originDevice: mac",
      "archivedAt: null",
      "archivedReason: null",
      "sourceSessions: [abc12345]",
      "sourceCommits: []",
      "sourceFiles: [src/sources/base.ts]",
      "entities: [Tool, SourceAdapter]",
      "trust: unknown",
      "---",
      "",
      "# Add a source adapter",
      "",
      "Writer needs zero changes.",
      "",
    ].join("\n"));
    // and it survives a render → parse → render round trip unchanged
    const back = parseMemoryMarkdown(md)!;
    expect(renderMemoryMarkdown({ ...back, path: e.path }, "Writer needs zero changes.")).toBe(md);
  });
});

describe("parseMemoryMarkdown — a duplicate frontmatter key REJECTS the document (round-35)", () => {
  // Round-34 made the parser keep the FIRST occurrence and called that an
  // anti-injection rule. It is not one. The renderer emits the keys in a FIXED
  // ORDER, so a payload carried by an EARLY field forges its line ABOVE the real
  // line of any LATER field — and first-wins then keeps the FORGED value. The
  // round-34 test only passed because its payload targeted `id`, which happens to
  // be emitted first. POSITION CANNOT TELL forged from legitimate: which
  // occurrence wins depends on which field carried the payload versus which field
  // was targeted. The sound rule is that the renderer emits each key EXACTLY
  // ONCE, so a duplicate is corruption or injection either way — refuse the
  // document instead of choosing an occurrence.

  /** All frontmatter keys, in order, including duplicates. */
  function fmKeys(md: string): string[] {
    const fm = md.match(/^---\n([\s\S]*?)\n---/)![1];
    return fm.split("\n").map((l) => l.slice(0, l.indexOf(":")).trim()).filter(Boolean);
  }

  it("rejects a legacy doc where an EARLY field's payload forged a LATER key (first-wins kept the FORGED value)", () => {
    // The shape a pre-fix `title` carrying "\nstatus: active" actually produces:
    // the forged status lands ABOVE the renderer's real `status: archived`.
    const md = [
      "---",
      "id: semantic/p/real", "type: semantic", "scope: project:p", "project: p",
      "title: x", "status: active",
      "summary: s", "status: archived",
      "---", "", "# x", "body",
    ].join("\n");
    expect(parseMemoryMarkdown(md)).toBeNull();
  });

  it("rejects the mirror case too — a forged key duplicated AFTER the real one", () => {
    const md = [
      "---",
      "id: semantic/p/real", "type: semantic", "scope: project:p", "project: p",
      "title: t", "summary: s", "status: archived",
      "id: semantic/p/forged", "status: active", "project: other",
      "---", "", "# t", "body",
    ].join("\n");
    expect(parseMemoryMarkdown(md)).toBeNull();
  });

  it("rejects on the duplicate alone — even when both occurrences carry the SAME value", () => {
    const md = [
      "---",
      "id: semantic/p/real", "type: semantic", "scope: project:p", "project: p",
      "title: t", "summary: s", "status: active", "status: active",
      "---", "", "# t", "body",
    ].join("\n");
    expect(parseMemoryMarkdown(md)).toBeNull();
  });

  it("a normal, singly-keyed document still parses and round-trips byte-identically", () => {
    const e = entry();
    const md = renderMemoryMarkdown(e, "Regression lock.");
    expect(new Set(fmKeys(md)).size).toBe(fmKeys(md).length); // no duplicates
    const back = parseMemoryMarkdown(md);
    expect(back).not.toBeNull();
    expect(back!.id).toBe(e.id);
    expect(back!.status).toBe("active");
    expect(renderMemoryMarkdown({ ...back!, path: e.path }, "Regression lock.")).toBe(md);
  });

  it("PAIRING: the round-32/34 serializer means a NEW file can never hit this rejection", () => {
    // A control character in title / summary / an array element is neutralized at
    // write time, so the document has NO duplicate key and still parses — the
    // parser rejection is purely the backstop for LEGACY files.
    const md = renderMemoryMarkdown(
      entry({
        status: "archived",
        title: "x\nstatus: active",
        summary: "s\rid: semantic/p/forged",
        entities: ["a project: other", "b"],
      }),
      "body",
    );
    const keys = fmKeys(md);
    expect(new Set(keys).size).toBe(keys.length);
    const back = parseMemoryMarkdown(md);
    expect(back).not.toBeNull();
    // every targeted field kept its REAL value; the payload survives only as
    // neutralized one-line prose inside the field that carried it
    expect(back!.status).toBe("archived");
    expect(back!.id).toBe("procedural/code-demo/add-source-adapter");
    expect(back!.project).toBe("code-demo");
    expect(back!.title).toBe("x status: active");
    expect(back!.summary).toBe("s id: semantic/p/forged");
  });
});
