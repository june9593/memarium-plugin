import { describe, it, expect } from "vitest";
import {
  runColdPass, coldRestoreInstruction, renderColdHints, renderColdNextStep,
  type ColdStorageHit,
} from "../../src/memory/cold-pass.js";
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

const hit = (over: Partial<ColdStorageHit> = {}): ColdStorageHit => ({
  id: "semantic/p/a", title: "Vim keybindings", score: 5, archivedReason: "unused-low-value",
  source: "local", originDevice: null, trust: "trusted", ...over,
});

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
    expect(coldRestoreInstruction(cold[0])).toBe("memory-unarchive semantic/p/a to restore");
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
    expect(coldRestoreInstruction(hit({ source: "local" }))).toBe("memory-unarchive semantic/p/a to restore");
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
      .toMatch(/memory-unarchive semantic\/p\/a to restore/);
  });
});

describe("renderColdNextStep — the bare local command requires an ALL-local set", () => {
  it("all-local → keeps `memory-unarchive <id> to restore`", () => {
    expect(renderColdNextStep([hit({ source: "local" }), hit({ id: "semantic/p/b", source: "local" })]))
      .toMatch(/memory-unarchive <id> to restore/);
  });

  it("all-unknown → NO bare local command; the safe generic instead", () => {
    const s = renderColdNextStep([hit({ id: "semantic/p/u", source: "unknown" })]);
    expect(s).not.toMatch(/memory-unarchive <id> to restore/);
    expect(s).toMatch(/device that archived it/);
  });

  it("all-overlay, one device → names the device (unchanged)", () => {
    const s = renderColdNextStep([hit({ source: "overlay", originDevice: "laptop" })]);
    expect(s).toMatch(/archived on device laptop; restore it there/);
    expect(s).not.toMatch(/memory-unarchive <id> to restore/);
  });

  it("unknown mixed with overlay (nothing established local) → generic, no bare local command", () => {
    const s = renderColdNextStep([
      hit({ id: "semantic/p/u", source: "unknown" }),
      hit({ id: "semantic/p/o", source: "overlay", originDevice: "laptop" }),
    ]);
    expect(s).not.toMatch(/memory-unarchive <id> to restore/);
    expect(s).toMatch(/device that archived it/);
  });

  it("mixed local + non-local → defers to the per-hit paths (never a blanket local command)", () => {
    const s = renderColdNextStep([
      hit({ source: "local" }),
      hit({ id: "semantic/p/u", source: "unknown" }),
    ]);
    expect(s).toMatch(/each hit carries its own restore path/);
    expect(s).not.toMatch(/^No ACTIVE memory matched.*\(memory-unarchive <id> to restore\)\.$/);
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
    expect(s).not.toMatch(/memory-unarchive <id> to restore/);
  });

  it("one hit has NO device → generic wording, and laptop is NOT named", () => {
    const s = renderColdNextStep([ov("semantic/p/a", "laptop"), ov("semantic/p/b", null)]);
    expect(s).not.toMatch(/laptop/);
    expect(s).not.toMatch(/archived on device /);
    expect(s).toMatch(/each is archived on another device; restore it there/);
    expect(s).not.toMatch(/memory-unarchive <id> to restore/);
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
