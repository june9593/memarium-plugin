import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isKnownSession, isStaleProvenance, loadKnownSessions, SESSION_ID_PREFIX_MIN } from "../../src/memory/known-sessions.js";

// THE FIXTURES IN THIS FILE DELIBERATELY MIX ID FORMS ACROSS THE TWO SIDES.
//
// The stale-provenance bug (memories with 8-char SHORT sourceSessions matched
// against a spool index of FULL sessionIds → every one read as "evidence gone",
// 31% of a real store queued for automatic archival) survived 40 rounds of review
// for exactly one reason: every fixture used the SAME id form on both sides, so a
// form mismatch was structurally impossible to observe. Any test added here that
// puts the same form on both sides is not testing the thing that broke.

const FULL_A = "652535b6-518c-4f31-b8ad-c0d5354c6e4f";
const FULL_B = "88b5eb49-7323-4908-81e6-abf929a01c97";
const SHORT_A = FULL_A.slice(0, 8); // "652535b6"
const SHORT_B = FULL_B.slice(0, 8); // "88b5eb49"

describe("isKnownSession: id-form tolerance", () => {
  it("matches the SAME form on both sides (full vs full)", () => {
    expect(isKnownSession(FULL_A, new Set([FULL_A, FULL_B]))).toBe(true);
  });

  it("MIXED: memory holds a SHORT id, spool holds the matching FULL sessionId", () => {
    // The actual bug. `new Set([FULL_A]).has(SHORT_A)` is false.
    expect(isKnownSession(SHORT_A, new Set([FULL_A, FULL_B]))).toBe(true);
  });

  it("MIXED (inverse): memory holds a FULL id, spool holds only the SHORT form", () => {
    expect(isKnownSession(FULL_A, new Set([SHORT_A]))).toBe(true);
  });

  it("a SHORT id matching NO known session's prefix is still absent", () => {
    expect(isKnownSession("deadbeef", new Set([FULL_A, FULL_B]))).toBe(false);
  });

  it("a short id must match from the START — a mid-string substring is not a prefix", () => {
    expect(isKnownSession(FULL_A.slice(8, 16), new Set([FULL_A]))).toBe(false);
  });

  it("differing only after the 8-char prefix boundary does NOT match", () => {
    const sibling = SHORT_A + "-ffff-4f31-b8ad-c0d5354c6e4f";
    expect(isKnownSession(sibling, new Set([FULL_A]))).toBe(false);
    expect(isKnownSession(FULL_A, new Set([sibling]))).toBe(false);
  });

  describe("a too-short value cannot match everything", () => {
    const known = new Set([FULL_A, FULL_B]);
    it.each(["", "6", "65", "652", "6525", "65253", "652535", "6525356"])(
      "%j is below the %i-char prefix floor → exact match only",
      (s) => { expect(isKnownSession(s, known)).toBe(false); },
    );

    it("boundary: exactly SESSION_ID_PREFIX_MIN chars DOES prefix-match", () => {
      expect(SHORT_A.length).toBe(SESSION_ID_PREFIX_MIN);
      expect(isKnownSession(SHORT_A, known)).toBe(true);
      expect(isKnownSession(SHORT_A.slice(0, SESSION_ID_PREFIX_MIN - 1), known)).toBe(false);
    });

    it("a too-short value still matches EXACTLY (a legitimately short id is its own evidence)", () => {
      expect(isKnownSession("s1", new Set(["s1"]))).toBe(true);
    });

    it("a too-short KNOWN value cannot prefix-match a long stored value either", () => {
      // The floor applies symmetrically: a 2-char index entry must not vouch for
      // every session id that happens to start with those two characters.
      expect(isKnownSession(FULL_A, new Set(["65"]))).toBe(false);
    });
  });

  it("an empty known set matches nothing", () => {
    expect(isKnownSession(FULL_A, new Set())).toBe(false);
    expect(isKnownSession(SHORT_A, new Set())).toBe(false);
  });

  it("a non-string sourceSession (untrusted index row) is never known", () => {
    const known = new Set([FULL_A]);
    for (const bad of [null, undefined, 42, {}, [FULL_A], true]) {
      expect(isKnownSession(bad, known)).toBe(false);
    }
  });
});

describe("isStaleProvenance", () => {
  it("MIXED: not stale when ONE short sourceSession prefixes a known full id", () => {
    expect(isStaleProvenance(["gone-gone-gone", SHORT_A], new Set([FULL_A]))).toBe(false);
  });

  it("stale when NO sourceSession matches in either direction", () => {
    expect(isStaleProvenance([SHORT_B, "deadbeef"], new Set([FULL_A]))).toBe(true);
  });

  it("stale when every sourceSession is below the prefix floor and absent", () => {
    expect(isStaleProvenance(["s1", "s2"], new Set([FULL_A]))).toBe(true);
  });
});


describe("loadKnownSessions: source-tool allowlist", () => {
  it("trusts a well-formed mixed Claude, Copilot, and Codex spool index", () => {
    const repo = mkdtempSync(join(tmpdir(), "memarium-known-tools-"));
    try {
      mkdirSync(join(repo, ".memarium"), { recursive: true });
      writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
        version: 1,
        entries: {
          "claude:claude-full-id": { tool: "claude", sessionId: "claude-full-id" },
          "copilot:copilot-full-id": { tool: "copilot", sessionId: "copilot-full-id" },
          "codex:codex-full-id": { tool: "codex", sessionId: "codex-full-id" },
        },
      }));
      expect(loadKnownSessions(repo)).toEqual(new Set([
        "claude-full-id",
        "copilot-full-id",
        "codex-full-id",
      ]));
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("still rejects an unknown tool", () => {
    const repo = mkdtempSync(join(tmpdir(), "memarium-unknown-tool-"));
    try {
      mkdirSync(join(repo, ".memarium"), { recursive: true });
      writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
        version: 1,
        entries: { "other:x": { tool: "other", sessionId: "x" } },
      }));
      expect(loadKnownSessions(repo)).toBeUndefined();
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
