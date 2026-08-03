import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync,
  chmodSync, statSync, existsSync, symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { writeFileAtomicSync } from "../../src/_shared/atomic-write.js";

/** ROUND-40 (PR #65) — the round-39 atomic write is a CREATE-then-RENAME, and a
 *  freshly created file gets the PROCESS DEFAULT mode (umask-derived, 0644 under
 *  the usual 022). The non-atomic `writeFileSync` it replaced TRUNCATED the
 *  existing file in place and therefore PRESERVED its mode. So a user who had
 *  deliberately locked their memory index or usage sidecar down
 *  (`chmod 600 ~/.memarium/session-repo/.memarium/index.memory.json`) silently
 *  lost that restriction on the very next save: personal memory content became
 *  world-readable, with no error and nothing in any log.
 *
 *  The fix reads the target's mode and re-applies it to the temp file BEFORE the
 *  rename, and creates BRAND-NEW files 0600 rather than at the umask default.
 *
 *  These tests use the REAL fs (no `node:fs` mock) so the assertions are about
 *  actual on-disk permission bits. `mode & 0o777` masks off the file-type bits. */
const perms = (p: string) => statSync(p).mode & 0o777;

/** Guard rail: some filesystems (a FAT/exFAT volume, some CI container mounts)
 *  ignore chmod entirely, which would make every "mode preserved" assertion pass
 *  vacuously. Prove chmod actually sticks in THIS sandbox before trusting it. */
function assertChmodIsHonored(dir: string): void {
  const probe = join(dir, ".chmod-probe");
  writeFileSync(probe, "x");
  chmodSync(probe, 0o600);
  const got = perms(probe);
  rmSync(probe, { force: true });
  if (got !== 0o600) {
    throw new Error(
      `this filesystem ignores chmod (0o600 read back as 0o${got.toString(8)}) — ` +
      `mode assertions here would pass vacuously; run the suite on a POSIX fs`,
    );
  }
}

describe("writeFileAtomicSync — file mode survives the atomic replace (round-40)", () => {
  let dir: string;
  const target = () => join(dir, "data.json");
  /** Anything in the dir that is NOT the target = temp litter. */
  const litter = () => readdirSync(dir).filter((f) => f !== "data.json");

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "vbp-atomic-mode-"));
    assertChmodIsHonored(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("a target restricted to 0600 is STILL 0600 after a save", () => {
    writeFileSync(target(), "old");
    chmodSync(target(), 0o600);

    writeFileAtomicSync(target(), "new");

    // Pre-fix this was 0644 (umask default on the temp) — the regression.
    expect(perms(target())).toBe(0o600);
    expect(readFileSync(target(), "utf8")).toBe("new");
  });

  it("preserves in BOTH directions: a 0644 target stays 0644, not force-tightened", () => {
    writeFileSync(target(), "old");
    chmodSync(target(), 0o644);

    writeFileAtomicSync(target(), "new");

    expect(perms(target())).toBe(0o644);
  });

  it("preserves an unusual mode verbatim (0640 group-readable)", () => {
    writeFileSync(target(), "old");
    chmodSync(target(), 0o640);

    writeFileAtomicSync(target(), "new");

    expect(perms(target())).toBe(0o640);
  });

  it("a repeat save keeps preserving (the mode is re-read, not captured once)", () => {
    writeFileAtomicSync(target(), "a");        // new → 0600
    chmodSync(target(), 0o604);
    writeFileAtomicSync(target(), "b");
    expect(perms(target())).toBe(0o604);
    writeFileAtomicSync(target(), "c");
    expect(perms(target())).toBe(0o604);
  });

  it("a NEW file is created 0600, not at the umask default", () => {
    expect(existsSync(target())).toBe(false);

    writeFileAtomicSync(target(), "fresh");

    // Deliberate behaviour CHANGE vs pre-round-40: new index/sidecar files are
    // owner-only rather than 0644. Personal memory content — strictly safer.
    expect(perms(target())).toBe(0o600);
    expect(readFileSync(target(), "utf8")).toBe("fresh");
  });

  it("a stat failure on the target degrades to the restrictive default, never throws", () => {
    // A dangling symlink: `existsSync`/`statSync` both fail to resolve it, but
    // the write must still succeed (the rename replaces the link itself).
    const t = target();
    symlinkSync(join(dir, "nowhere-at-all"), t);

    expect(() => writeFileAtomicSync(t, "fresh")).not.toThrow();
    expect(perms(t)).toBe(0o600);
    expect(readFileSync(t, "utf8")).toBe("fresh");
  });

  it("control: the success path still leaves no temp file behind", () => {
    writeFileAtomicSync(target(), "a");
    expect(litter()).toEqual([]);
    writeFileAtomicSync(target(), "b");
    expect(litter()).toEqual([]);
    expect(readFileSync(target(), "utf8")).toBe("b");
  });
});

describe("saveMemoryIndex / saveUsage — both callers preserve mode (round-40)", () => {
  let home: string;
  const repo = "/work/code-demo";

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-mode-callers-"));
    assertChmodIsHonored(home);
    vi.stubEnv("HOME", home);
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(home, { recursive: true, force: true });
  });

  it("saveMemoryIndex: a 0600 index stays 0600 across a save", async () => {
    const { saveMemoryIndex, MEMORY_INDEX_REL } = await import("../../src/memory/index-store.js");
    const repoRoot = join(home, "session-repo");
    const idxPath = join(repoRoot, MEMORY_INDEX_REL);

    saveMemoryIndex(repoRoot, { version: 1, entries: {} });
    expect(perms(idxPath)).toBe(0o600);          // new file → restrictive

    chmodSync(idxPath, 0o600);
    saveMemoryIndex(repoRoot, { version: 1, entries: {} });
    expect(perms(idxPath)).toBe(0o600);          // pre-fix: 0644

    chmodSync(idxPath, 0o644);
    saveMemoryIndex(repoRoot, { version: 1, entries: {} });
    expect(perms(idxPath)).toBe(0o644);          // and preserved the other way
  });

  it("saveUsage (via bumpUsage): the local sidecar keeps its mode", async () => {
    const { bumpUsage, usageDir } = await import("../../src/memory/usage-store.js");
    const file = join(usageDir(repo), "access.json");

    bumpUsage(repo, ["semantic/p/x"], "2026-08-03");
    expect(perms(file)).toBe(0o600);             // new file → restrictive

    chmodSync(file, 0o600);
    bumpUsage(repo, ["semantic/p/x"], "2026-08-04");
    expect(perms(file)).toBe(0o600);             // pre-fix: 0644

    chmodSync(file, 0o644);
    bumpUsage(repo, ["semantic/p/x"], "2026-08-05");
    expect(perms(file)).toBe(0o644);
  });

  it("saveMemoryIndex: a fresh index is not world-readable even under a lax umask", async () => {
    const { saveMemoryIndex, MEMORY_INDEX_REL } = await import("../../src/memory/index-store.js");
    const repoRoot = join(home, "session-repo");
    const prev = process.umask(0o000);           // lax umask: 0666 by default
    try {
      saveMemoryIndex(repoRoot, { version: 1, entries: {} });
    } finally {
      process.umask(prev);
    }
    const mode = perms(join(repoRoot, MEMORY_INDEX_REL));
    expect(mode & 0o077).toBe(0);                // no group/other bits at all
    expect(mode).toBe(0o600);
  });
});

/** The round-40 chmod must not weaken any round-39 guarantee. The dedicated
 *  regression locks for those live in `tests/memory/index-store-temp-exclusive.test.ts`
 *  (symlink/collision at the temp path) and `tests/memory/index-store-atomic.test.ts`
 *  (a failed save leaves the previous file byte-identical); both mock `node:fs`,
 *  which is why they are separate files. What is asserted HERE is the property
 *  that needs the REAL fs: that the mode is applied to a temp we created
 *  EXCLUSIVELY, and that the directory is clean afterwards. */
describe("round-39 properties still hold under the round-40 chmod", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "vbp-atomic-r39-"));
    assertChmodIsHonored(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("the temp sibling is still a unique <name>.tmp-<pid>-... path in the target's dir", () => {
    const seen: string[] = [];
    const target = join(dir, "sub", "data.json");
    mkdirSync(dirname(target), { recursive: true });
    for (let i = 0; i < 2; i++) {
      writeFileAtomicSync(target, `v${i}`);
      seen.push(...readdirSync(dirname(target)).filter((f) => f.includes(".tmp-")));
    }
    expect(seen).toEqual([]);                    // none survive a successful save
    expect(readFileSync(target, "utf8")).toBe("v1");
  });

  it("a file pre-planted at a temp path is untouched — the chmod never reaches it", () => {
    // We cannot predict the random temp name, so plant one that MATCHES the
    // shape and assert it is neither chmod'ed nor truncated by an unrelated save.
    const target = join(dir, "data.json");
    const decoy = join(dir, `data.json.tmp-${process.pid}-zzz-deadbeef`);
    writeFileSync(decoy, "SOMEONE ELSE'S IN-FLIGHT DATA");
    chmodSync(decoy, 0o644);

    writeFileSync(target, "old");
    chmodSync(target, 0o600);
    writeFileAtomicSync(target, "new");

    expect(readFileSync(decoy, "utf8")).toBe("SOMEONE ELSE'S IN-FLIGHT DATA");
    expect(perms(decoy)).toBe(0o644);
    expect(perms(target)).toBe(0o600);
  });
});
