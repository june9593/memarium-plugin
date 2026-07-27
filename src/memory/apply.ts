import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { loadMemoryIndex, saveMemoryIndex, upsertMemory } from "./index-store.js";
import { renderMemoryMarkdown } from "./render.js";
import { canonicalMemoryPath, isSafePathSegment, supersedesId } from "./gate.js";
import { assertNoBlockingLeak } from "./leak-scan.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import type { MemoryEntry } from "./types.js";

export interface MemoryApplyItem { entry: MemoryEntry; body: string; }
export interface MemoryApplyReport { written: number; superseded: number; paths: string[]; }

function normalizeRel(p: string): string {
  return p.split("\\").join("/");
}

/** Recover a memory's body (the prose after the `# title` heading) from its
 *  persisted .md, so a metadata-only rewrite (archive/unarchive) preserves
 *  content. STRICT: this feeds `writeMemoryEntryFile`, which re-renders
 *  frontmatter + this recovered body over the SAME file — so an inexact recovery
 *  would destroy the entry. If the .md is missing/unreadable, or lacks BOTH a
 *  valid frontmatter block (`---\n…\n---`) AND a `# heading`, THROW so the caller
 *  aborts BEFORE any write — never clobbering the entry with a bodyless/nested
 *  document, and never hiding store corruption. Also asserts IDENTITY: the
 *  persisted frontmatter `id` (and `type`, when present) must match `expect` —
 *  a structurally-valid .md belonging to a DIFFERENT entry sitting at this
 *  canonical path would otherwise be silently overwritten with the wrong index
 *  row, turning store corruption into cross-entry data loss during automatic
 *  archival. (The lint reader in memory-lint.ts keeps its own lenient copy: it
 *  only scans, it never rewrites.) */
function readMemoryBody(abs: string, expect: { id: string; type: string }): string {
  let md: string;
  try {
    // Normalize CRLF first (Windows checkouts), matching parseMemoryMarkdown's
    // idiom — without it the `^---\n...\n---` strip won't match a CRLF file, so
    // the whole old frontmatter + "# Title" heading would leak into the new body.
    md = readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
  } catch (err) {
    throw new Error(
      `memory rewrite: cannot recover body from ${abs} — .md missing or unreadable ` +
      `(${(err as Error).message}); aborting so a metadata-only rewrite never destroys the entry body`,
    );
  }
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) {
    throw new Error(
      `memory rewrite: cannot recover body from ${abs} — no valid frontmatter block; ` +
      `aborting so a metadata-only rewrite never clobbers the entry body`,
    );
  }
  // Identity guard: the persisted .md at this canonical path must be the SAME
  // entry we're about to overwrite. A different id/type here means store
  // corruption (or a path collision) — abort BEFORE any write rather than stamp
  // this index row over someone else's record. id is compared unconditionally
  // (a missing id line can't verify identity → treat as a mismatch); type only
  // when the persisted line is present, so an odd-but-valid file isn't rejected
  // for a merely absent type.
  const fm = fmMatch[1];
  const persistedId = (fm.match(/^id:[ \t]*(.*)$/m)?.[1] ?? "").trim();
  if (persistedId !== expect.id) {
    throw new Error(
      `memory rewrite: identity mismatch at ${abs} — persisted id ${JSON.stringify(persistedId)} ` +
      `!= entry id ${JSON.stringify(expect.id)} (a different entry's .md sits at this canonical path); ` +
      `aborting so the rewrite never clobbers another entry's record`,
    );
  }
  const persistedType = fm.match(/^type:[ \t]*(.*)$/m)?.[1]?.trim();
  if (persistedType !== undefined && persistedType !== "" && persistedType !== expect.type) {
    throw new Error(
      `memory rewrite: identity mismatch at ${abs} — persisted type ${JSON.stringify(persistedType)} ` +
      `!= entry type ${JSON.stringify(expect.type)}; aborting so the rewrite never clobbers another entry's record`,
    );
  }
  const afterFm = md.replace(/^---\n[\s\S]*?\n---\n?/, ""); // drop frontmatter
  if (!/^\n*# [^\n]*/.test(afterFm)) {
    throw new Error(
      `memory rewrite: cannot recover body from ${abs} — no "# heading" after frontmatter; ` +
      `aborting so a metadata-only rewrite never clobbers the entry body`,
    );
  }
  // Drop the leading "# Title" heading, then strip only structural leading/
  // trailing NEWLINES — NOT `.trim()`, which also eats HORIZONTAL whitespace and
  // would silently de-indent a body that opens with an indented Markdown code
  // block, corrupting content on a metadata-only archive/unarchive rewrite. This
  // mirrors exactly what renderMemoryMarkdown does to the body it re-emits
  // (`.replace(/^\n+/,"").replace(/\n+$/,"")`), so a round-trip is byte-stable.
  // The heading match requires an H1 `# ` (hash + space) as the FIRST content line
  // (only newlines may precede it) — `\s*#` would span newlines and accept a later
  // `##` body heading, passing a title-less file and then deleting that body heading.
  return afterFm.replace(/^\n*# [^\n]*\n*/, "").replace(/\n+$/, "");
}

/** The 4 MemoryType values, as a runtime set for validating an untrusted index row. */
const REWRITABLE_TYPES: ReadonlySet<string> = new Set(["core", "semantic", "episodic", "procedural"]);

/** The `MemoryEntry["status"]` union, spelled once as DATA so it can be checked
 *  at runtime against an untrusted index row. The `satisfies` clause makes the
 *  key set EXHAUSTIVE in both directions — a 5th status added to `types.ts`
 *  fails to compile here until it is classified, and a key that is not a real
 *  status is rejected as an excess property — so this set cannot silently drift
 *  from the type it mirrors. */
const MEMORY_STATUSES = {
  active: true, superseded: true, pinned: true, archived: true,
} satisfies Record<MemoryEntry["status"], true>;
const REWRITABLE_STATUSES: ReadonlySet<string> = new Set(Object.keys(MEMORY_STATUSES));

/** True when `v` is one of the four real `MemoryEntry["status"]` values. Shared
 *  by the rewrite gate below and by `memory-unarchive`, which BRANCHES on status
 *  before the gate runs and so must recognize a corrupt one on its own. */
export function isMemoryStatus(v: unknown): v is MemoryEntry["status"] {
  return typeof v === "string" && REWRITABLE_STATUSES.has(v);
}

/** The COLLECTION fields `renderMemoryMarkdown` serializes through its `arr()`
 *  helper (`xs ?? []` then `.join(", ")`). `arr` coerces an UNSET value
 *  (undefined/null) to `[]`, so an omitted field renders fine — but a PRESENT
 *  non-array value reaches `.join()` and THROWS (`sourceSessions: "s1"` →
 *  "a.join is not a function"), or, for a value whose `.length` happens to be 0
 *  (`""`), silently renders `[]` and drops content. Validated below. */
const REWRITE_COLLECTION_FIELDS = ["sourceSessions", "sourceCommits", "sourceFiles", "entities"] as const;

/** Row-shape gate for the METADATA-ONLY REWRITE path (`writeMemoryEntryFile`),
 *  shared by BOTH write paths that use it: `memory-archive --apply` and
 *  `memory-unarchive`.
 *
 *  `validEntryExists` only proves a row is a non-null, non-array OBJECT filed
 *  under its own id — it does NOT prove the row is well-formed. A partial row
 *  like `{ id: "semantic/p/bad", type: "semantic", project: "p", status: "archived" }`
 *  passes that check and then reaches the rewriter, where the renderer serializes
 *  the missing fields as the LITERAL string "undefined" (`title: undefined`,
 *  `scope: undefined`, and a `# undefined` heading) — degrading a record the
 *  command was only supposed to stamp a status onto. (Missing `type` is worse
 *  still: `canonicalMemoryPath` throws, which for archive means aborting the
 *  automatic digest consolidation.)
 *
 *  So the required set is the union of what the archival PLAN reads
 *  (`status` / `type` / `updatedAt` / `importance`), what the canonical-path
 *  derivation needs (`id` / `type` / `project`) and what a FAITHFUL re-render
 *  needs on top of those (`title` / `scope`, plus the COLLECTION fields the
 *  renderer joins).
 *  Requiring title/scope is a strict improvement for archive too: such a row was
 *  never archivable without corrupting itself, and it is already reported in
 *  archive's "skipped malformed index row(s)" count.
 *
 *  Round-16: validating only the SCALAR fields still let a MALFORMED COLLECTION
 *  through — a row with `sourceSessions: "s1"` (a STRING) passed, got planned,
 *  and then `renderMemoryMarkdown` called `.join()` on that string, THROWING
 *  inside the automatic digest consolidation (`memory-archive --apply` runs with
 *  no human in the loop). Each collection field must therefore be an ARRAY, or
 *  genuinely unset — `arr()` maps undefined/null to `[]`, so an omitted field
 *  renders faithfully and must not be rejected.
 *
 *  Round-22: even a row whose every scalar is a non-empty string and whose every
 *  collection is an array can still be UN-REWRITABLE, because those fields are
 *  only INGREDIENTS for the canonical path the rewriter derives from them. A row
 *  with `project: "../x"`, or an `id` whose slug segment is `..`, passed every
 *  check above, was PLANNED by `memory-archive`, and then threw out of
 *  `canonicalMemoryPath` inside `assertMemoryBodyRecoverable`'s whole-plan
 *  preflight — aborting the entire UNATTENDED digest consolidation. So the gate
 *  also derives the path (pure string work, no I/O) and rejects the row when the
 *  derivation fails or yields anything that isn't a plain path under `memory/`.
 *
 *  Round-23: `importance` was NOT in the required set even though the PLAN reads
 *  it — planArchival's near-duplicate pass RANKS a pair by it. With `undefined`
 *  on one side, `undefined !== 5` is TRUE while `undefined < 5` is FALSE, so the
 *  loser came out as the HEALTHY, higher-importance entry and IT got archived
 *  while the malformed row stayed hot — a single corrupt row demoting a good
 *  record, the same victim-clobbering class as the earlier key/id bug. It matters
 *  on the rewrite side too: `req(undefined, "0")` silently invents
 *  `importance: 0` in the .md while the index row keeps no usable value, a quiet
 *  divergence on a command that only meant to stamp a status. So importance must
 *  be a FINITE number; absent is reported as missing, present-but-unusable
 *  (a string, NaN, Infinity) as unsafe.
 *
 *  Round-27: `status` was only checked to be a STRING, not to be one of the four
 *  `MemoryEntry["status"]` values. So a parseable-but-malformed row carrying
 *  `status: "blocked"` passed the gate and reached `planArchival`, whose
 *  `archivable()` only excludes `pinned` and `archived` — meaning the unknown
 *  status counted as archivable and the expired / unused-low-value rules would
 *  automatically FLIP that corrupt row to `archived`, mutating a record this
 *  command's fail-closed policy says must be SKIPPED and COUNTED. The status is
 *  now validated against the union (see `MEMORY_STATUSES`).
 *
 *  Returns the name of the FIRST missing/invalid field, or null when the row is
 *  complete — so `memory-unarchive` can name it in its abort message while
 *  `memory-archive` just filters on the boolean. A field that is PRESENT but
 *  unusable is reported as `"unsafe <field>"` so callers don't describe it as
 *  missing; run the result through `describeRewriteDefect` to render it. */
export function missingRewriteField(entry: MemoryEntry): string | null {
  const e = entry as unknown as Record<string, unknown>;
  const filled = (v: unknown): boolean => typeof v === "string" && v.length > 0;
  if (!filled(e.id)) return "id";
  if (!filled(e.type) || !REWRITABLE_TYPES.has(e.type as string)) return "type";
  if (!filled(e.scope)) return "scope";
  if (!(e.project === null || typeof e.project === "string")) return "project";
  if (!filled(e.title)) return "title";
  // status: the field BOTH archival commands branch on, so it must be a real
  // member of the union, not merely a string (see the round-27 note above).
  // Absent → "missing status"; present-but-not-a-status → "unsafe status", so
  // memory-unarchive never claims a field is missing when it is malformed.
  if (e.status === undefined || e.status === null) return "status";
  if (!isMemoryStatus(e.status)) return "unsafe status";
  if (typeof e.updatedAt !== "string") return "updatedAt";
  // importance: read by the archival plan (near-duplicate ranking + the
  // unused-low-value threshold), so it must be a real, finite number.
  if (e.importance === undefined || e.importance === null) return "importance";
  if (typeof e.importance !== "number" || !Number.isFinite(e.importance)) return "unsafe importance";
  for (const field of REWRITE_COLLECTION_FIELDS) {
    const v = e[field];
    if (v === undefined || v === null) continue; // unset → the renderer emits []
    if (!Array.isArray(v)) return field;
  }
  // Canonical-path derivability (see the round-22 note above). Mirrors
  // canonicalMemoryPath's own segment rules so we can NAME the bad ingredient
  // instead of surfacing its raw throw.
  if (!isSafePathSegment((e.project as string | null) ?? "_global")) return "unsafe project segment";
  const id = e.id as string;
  if (!isSafePathSegment(id.split("/").pop() ?? id)) return "unsafe id segment";
  let canonical: string;
  try {
    canonical = canonicalMemoryPath(entry);
  } catch {
    return "unsafe canonical path"; // derivation rejected something the checks above didn't model
  }
  // Belt and braces: whatever came back must be a plain path under memory/ with
  // no empty or traversing segment, so `assertWritableMemoryTarget` can't throw
  // on a row this predicate just approved.
  const segs = canonical.split("/");
  if (segs.length < 2 || segs[0] !== "memory" || segs.some((s) => s === "" || s === "." || s === "..")) {
    return "unsafe canonical path";
  }
  return null;
}

/** Render `missingRewriteField`'s result as a human clause. A plain field name
 *  means the field is ABSENT ("missing title"); an `"unsafe …"` marker means the
 *  field is present but unusable, and must NOT be described as missing. Keeps
 *  that convention in one place instead of leaking it into every caller. */
export function describeRewriteDefect(defect: string): string {
  return defect.startsWith("unsafe ") ? defect : `missing ${defect}`;
}

/** Boolean form of `missingRewriteField` — a row this rejects must never be fed
 *  to `writeMemoryEntryFile`. */
export const isRewritableEntry = (entry: MemoryEntry): boolean => missingRewriteField(entry) === null;

/** Preflight-only guard for a metadata-only rewrite: derive the CANONICAL path
 *  from {type,project,id} (untrusted entry.path is ignored), assert it stays
 *  under memory/, and reject a symlinked path component — WITHOUT reading or
 *  writing anything. Returns the canonical repo-relative path. Callers that
 *  rewrite a batch (e.g. memory-archive --apply) run this over EVERY planned
 *  target first, so one bad row can't leave earlier .md rewritten with the index
 *  unsaved. `writeMemoryEntryFile` funnels through the same guard. */
export function assertWritableMemoryTarget(repoPath: string, entry: MemoryEntry): string {
  const memRoot = resolve(join(repoPath, "memory"));
  const canonical = canonicalMemoryPath(entry);
  const abs = resolve(join(repoPath, canonical));
  if (abs !== memRoot && !abs.startsWith(memRoot + sep)) {
    throw new Error(`memory write: refusing to write outside memory/: ${canonical}`);
  }
  assertNoSymlinkedComponent(repoPath, abs, "memory write");
  return canonical;
}

/** Guarded single-entry rewriter for a metadata-only flip (e.g. the archive
 *  command flipping status→archived + archivedAt/archivedReason). Reads the
 *  entry's existing body from its CANONICAL .md (derived, never trusted from
 *  entry.path), re-renders frontmatter+body, and writes it back THROUGH the same
 *  memory/-containment + symlink guard `applyMemoryItems` uses (now factored into
 *  assertWritableMemoryTarget) — so a crafted type/project/slug can't traverse
 *  out of memory/, and a symlinked component can't redirect the write.
 *
 *  Deliberately does NOT run applyMemoryItems' status/field normalization (the
 *  {active,superseded,pinned} allowlist that coerces every other status back to
 *  "active"). That coercion is correct for AUTHORED writes that routinely omit
 *  status, but it would silently un-archive a caller-set status:"archived". The
 *  caller owns the entry's fields here; we only persist them faithfully. */
export function writeMemoryEntryFile(repoPath: string, entry: MemoryEntry): void {
  const canonical = assertWritableMemoryTarget(repoPath, entry);
  const abs = resolve(join(repoPath, canonical));
  const body = readMemoryBody(abs, { id: entry.id, type: entry.type }); // strict: throws on a missing/corrupt/foreign .md
  entry.path = canonical;
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, renderMemoryMarkdown(entry, body));
}

/** Whole-plan preflight for a BATCH metadata-only rewrite (memory-archive
 *  --apply): assert the entry's canonical path is safe (via
 *  assertWritableMemoryTarget) AND that its existing body is recoverable —
 *  WITHOUT writing anything. Reuses the SAME strict reader writeMemoryEntryFile
 *  uses, so a mid-batch corrupt/missing .md aborts BEFORE the first write (index
 *  never saved, no .md rewritten) — the same all-or-nothing discipline the path
 *  preflight already enforces, extended to body recovery so a bodyless rewrite
 *  can't land on any earlier entry. */
export function assertMemoryBodyRecoverable(repoPath: string, entry: MemoryEntry): void {
  const canonical = assertWritableMemoryTarget(repoPath, entry);
  readMemoryBody(resolve(join(repoPath, canonical)), { id: entry.id, type: entry.type }); // throws on missing/corrupt/foreign md
}

/** A captured copy of one memory .md, taken BEFORE a metadata-only rewrite. */
export interface MemoryFileSnapshot {
  /** Absolute canonical .md path this snapshot restores. */
  abs: string;
  /** Repo-relative canonical path — what we NAME in a partial-rollback error. */
  canonical: string;
  /** Original bytes, or null when the file did not exist before the rewrite. */
  bytes: Buffer | null;
}

/** Capture an entry's canonical .md bytes so a LATER failure can undo the
 *  rewrite. Round-17: the archival commands persist to TWO stores and the .md
 *  rewrite(s) land FIRST, so a `saveMemoryIndex` that throws afterwards leaves
 *  the .md and the index disagreeing — and memory-archive's batch path diverges
 *  N files at once. The whole-plan preflight can't cover this: it runs before any
 *  write, while this is the complementary POST-write guard.
 *
 *  Round-18 completes the pair: this restores only the .md side, so it returns
 *  the pair to a CONSISTENT pre-run state only because `saveMemoryIndex` is
 *  atomic (temp file + rename) and therefore leaves the whole OLD index in place
 *  when it throws. While the index was written in place, a failed save could
 *  truncate it, and rolling the .md back landed us on a CORRUPT index instead of
 *  the pre-run state. Don't make the index save non-atomic again.
 *
 *  Derives the path through the same containment/symlink guard the writer uses,
 *  so a snapshot can only ever name a file the writer could legitimately touch. */
export function snapshotMemoryEntryFile(repoPath: string, entry: MemoryEntry): MemoryFileSnapshot {
  const canonical = assertWritableMemoryTarget(repoPath, entry);
  const abs = resolve(join(repoPath, canonical));
  return { abs, canonical, bytes: existsSync(abs) ? readFileSync(abs) : null };
}

/** Restore captured .md bytes byte-for-byte. NEVER throws: it returns the
 *  canonical paths it could NOT restore, so the caller can surface a PARTIAL
 *  rollback (a real, remaining divergence) instead of hiding it behind the
 *  original error. A snapshot of a file that did not exist is undone by deleting
 *  the file the rewrite created. */
function restoreMemoryEntryFiles(snaps: readonly MemoryFileSnapshot[]): string[] {
  const failed: string[] = [];
  for (const s of snaps) {
    try {
      if (s.bytes === null) {
        if (existsSync(s.abs)) rmSync(s.abs);
      } else {
        mkdirSync(dirname(s.abs), { recursive: true });
        writeFileSync(s.abs, s.bytes);
      }
    } catch {
      failed.push(s.canonical);
    }
  }
  return failed;
}

/** Undo a set of .md rewrites and rethrow `cause` wrapped with rollback context.
 *  NEVER returns. `context` is the caller's own prefix (e.g.
 *  `unarchive semantic/p/x: index save failed`). The original error is preserved
 *  both in the message tail and as `cause`, so nothing is swallowed; a rollback
 *  that itself failed is called out explicitly as a PARTIAL ROLLBACK.
 *
 *  Scope note (round-18): this restores the .md side ONLY. It is paired with an
 *  ATOMIC `saveMemoryIndex`, which leaves the complete old index behind when it
 *  throws — together the two put BOTH stores back exactly as they were. */
export function rollbackMemoryWrites(
  context: string,
  snaps: readonly MemoryFileSnapshot[],
  cause: unknown,
): never {
  const failed = restoreMemoryEntryFiles(snaps);
  const restored = snaps.length - failed.length;
  const partial = failed.length
    ? ` — PARTIAL ROLLBACK: ${failed.length} file(s) could NOT be restored and now disagree with the index: ${failed.join(", ")}`
    : "";
  const original = cause instanceof Error ? cause.message : String(cause);
  throw new Error(
    `${context} — rolled back ${restored} .md rewrite(s)${partial}: ${original}`,
    { cause },
  );
}

/** Set ONE frontmatter scalar in a memory `.md`, without re-rendering the file
 *  (the body and every other field stay byte-identical). Replaces the existing
 *  `key: …` line when present, otherwise APPENDS it to the frontmatter block —
 *  so a field the machine just recorded in the index can't silently go missing
 *  from the .md, which a later rebuild-from-md would read back as `null`.
 *
 *  Scoped to the frontmatter block on purpose: a naive `/^key: .*$/m` replace
 *  over the whole document would patch a look-alike BODY line whenever the
 *  frontmatter happened not to carry the field. A document with no frontmatter
 *  block at all is returned unchanged — there is nothing safe to patch. */
function setFrontmatterField(md: string, key: string, value: string): string {
  const m = md.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return md;
  const [whole, open, fm, close] = m;
  const line = new RegExp(`^${key}: .*$`, "m");
  const patched = line.test(fm) ? fm.replace(line, `${key}: ${value}`) : `${fm}\n${key}: ${value}`;
  return `${open}${patched}${close}${md.slice(whole.length)}`;
}

interface PlannedItem {
  entry: MemoryEntry;
  body: string;
  canonical: string;
  abs: string;
  // The id this supersedes (live OR an earlier same-batch item), plus the md to
  // flip to status:superseded (null when that path isn't safely under memory/).
  // `target` is the plan-time row, kept ONLY so the pre-write snapshot can derive
  // its canonical .md through the same guard; the write phase deliberately reads
  // the LIVE `idx.entries[targetId]` instead.
  supersede: { targetId: string; mdPath: string | null; target: MemoryEntry } | null;
}

/** Gate-agnostic write primitive. Validates EVERYTHING up front — each new
 *  entry's path AND each supersede target's path — BEFORE any write, so a bad
 *  item or corrupt supersede target can't leave earlier items written but
 *  missing from the index. Preflight is order-aware: an item may supersede an
 *  entry created earlier in the same batch. Paths are derived, never trusted.
 *  Knows NOTHING about the gate. */
export function applyMemoryItems(repoPath: string, items: MemoryApplyItem[]): MemoryApplyReport {
  const idx = loadMemoryIndex(repoPath);

  // Fail-closed leak guard at the shared apply sink: this is the ONE chokepoint
  // both memory-write and memory-approve funnel through, so enforcing here also
  // blocks a leak that entered via a hand-edited or pre-filter proposal being
  // approved — not just fresh writes. memory-propose keeps its own queue-time
  // check so leaks are rejected early, before they ever reach the queue.
  //
  // Merge-aware: scan the EFFECTIVE sourceFiles that will actually be persisted —
  // the item's own values UNION the prior same-id entry's sourceFiles, which the
  // continuation-upsert below (`uni(entry.sourceFiles, prior.sourceFiles)`) folds
  // back in. Otherwise a clean update could re-absorb a pre-filter leaky path
  // from the prior entry and persist it.
  assertNoBlockingLeak(
    items.map(({ entry, body }) => {
      const prior = idx.entries[entry.id];
      const priorFiles = prior && Array.isArray(prior.sourceFiles) ? prior.sourceFiles : [];
      const ownFiles = Array.isArray(entry.sourceFiles) ? entry.sourceFiles : [];
      return {
        entry: { id: entry.id, title: entry.title, summary: entry.summary, entities: entry.entities, sourceFiles: [...ownFiles, ...priorFiles] },
        body,
      };
    }),
    "memory-apply",
  );

  const memRoot = resolve(join(repoPath, "memory"));

  // Entries that will exist as we go: live index + earlier same-batch items.
  const willExist: Record<string, MemoryEntry> = { ...idx.entries };
  const planned: PlannedItem[] = [];
  for (const { entry, body } of items) {
    const canonical = canonicalMemoryPath(entry);
    if (entry.path && normalizeRel(entry.path) !== canonical) {
      throw new Error(
        `memory apply: entry.path "${entry.path}" does not match canonical path for ${entry.id} ("${canonical}")`,
      );
    }
    const abs = resolve(join(repoPath, canonical));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep)) {
      throw new Error(`memory apply: refusing to write outside memory/: ${canonical}`);
    }
    assertNoSymlinkedComponent(repoPath, abs, "memory apply");

    let supersede: { targetId: string; mdPath: string | null; target: MemoryEntry } | null = null;
    const sup = supersedesId(entry);
    if (sup && willExist[sup]) {
      const target = willExist[sup];
      const tabs = resolve(join(repoPath, canonicalMemoryPath(target))); // may throw here (preflight)
      let mdPath: string | null = null;
      if (tabs === memRoot || tabs.startsWith(memRoot + sep)) {
        assertNoSymlinkedComponent(repoPath, tabs, "memory apply");
        mdPath = tabs;
      }
      supersede = { targetId: sup, mdPath, target };
    }

    planned.push({ entry, body, canonical, abs, supersede });
    willExist[entry.id] = entry; // visible to later items in this batch
  }

  // Round-26: capture the ORIGINAL bytes of every .md this call will touch, BEFORE
  // the first write — the same snapshot+rollback discipline round-17 gave
  // memory-archive / memory-unarchive, now extended to the shared apply sink.
  //
  // Why it became necessary here: applyMemoryItems persists to TWO stores and all
  // its .md writes land BEFORE the single saveMemoryIndex, so a failure in a later
  // write (or in the save) left the files ahead of the index. Round-18's ATOMIC
  // index save means the index on disk is still the intact PRE-run one, so undoing
  // the .md side is exactly what restores the pair. That divergence used to be
  // merely a content-drift annoyance, but round-25 made it LIFECYCLE-critical: an
  // item superseding an ARCHIVED target now patches that target's .md with
  // `archivedReason: superseded-cleanup` (+ archivedAt/updatedAt), and a stranded
  // patch permanently disagrees with an index that still says `unused-low-value` —
  // which is precisely the field memory-unarchive and the cold valve read.
  //
  // Snapshots go through `snapshotMemoryEntryFile`, so each one can only ever name
  // a file the writer could legitimately touch (same containment + symlink guard).
  // Deduped by absolute path: an id can appear as both an entry write and another
  // item's supersede target, and every capture happens before any write, so the
  // first capture is the true pre-run state and a second would only inflate the
  // rolled-back count. A target whose mdPath is null is never patched → never
  // snapshotted.
  const snapshots: MemoryFileSnapshot[] = [];
  const snapped = new Set<string>();
  const capture = (e: MemoryEntry): void => {
    const s = snapshotMemoryEntryFile(repoPath, e);
    if (snapped.has(s.abs)) return;
    snapped.add(s.abs);
    snapshots.push(s);
  };
  for (const p of planned) {
    capture(p.entry);
    if (p.supersede && p.supersede.mdPath) capture(p.supersede.target);
  }

  // Write phase (every path validated above; no canonical-path computation here).
  let written = 0, superseded = 0;
  const paths: string[] = [];
  try {
    for (const { entry, body, canonical, abs, supersede } of planned) {
      entry.path = canonical;
      // Normalize runtime-optional usage fields. Authored entries (from
      // memory-write / propose JSON) routinely omit accessCount / lastAccess, so
      // without this the LIVE index stores `accessCount: undefined` while a
      // memory-index rebuild heals it to 0 — a divergence that poisons the scorer
      // (Math.min(undefined,5)=NaN). Write the same defaults parse.ts produces.
      if (typeof entry.accessCount !== "number" || !isFinite(entry.accessCount)) entry.accessCount = 0;
      if (entry.lastAccess === undefined) entry.lastAccess = null;
      // createdAt/updatedAt: authored entries (memory-write / propose JSON) often
      // omit them, and the renderer serialized `undefined` as the literal string
      // "undefined" — which breaks every temporal consumer (sort, lint staleness,
      // supersession). Default to a real YYYY-MM-DD date (the entry's validFrom if
      // it set one, else today), matching the format used everywhere else. Only
      // fill when missing/invalid, so an author-set timestamp is preserved.
      const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
      const fallbackDate = isDate(entry.validFrom) ? entry.validFrom.slice(0, 10) : new Date().toISOString().slice(0, 10);
      if (!isDate(entry.createdAt)) entry.createdAt = fallbackDate;
      if (!isDate(entry.updatedAt)) entry.updatedAt = fallbackDate;
      // trust: a new entry that didn't set it (or set garbage) defaults to "unknown"
      // — never auto-promote to trusted (#23 decision #3). unknown stays out of the primer.
      if (entry.trust !== "trusted" && entry.trust !== "untrusted") entry.trust = "unknown";
      // The LIVE index row this write updates, if any. Read BEFORE any
      // normalization: the archival rules just below key off the EXISTING status,
      // and the continuation upsert further down unions its provenance arrays.
      const prior = idx.entries[entry.id];

      // Status + archival lifecycle. `archivedAt` / `archivedReason` are
      // MACHINE-MAINTAINED: only `memory-archive` sets them and only
      // `memory-unarchive` clears them (both write through writeMemoryEntryFile,
      // which deliberately bypasses this normalization). The AUTHORED path
      // (memory-write, and memory-propose → memory-approve) may therefore neither
      // SET nor CLEAR archival lifecycle state. The rule is SYMMETRIC:
      //
      //  • existing row NOT archived (or brand new) → the status allowlist coerces
      //    anything outside {active,superseded,pinned} back to "active" (authored
      //    entries routinely omit status; never let it reach the renderer as
      //    undefined → the literal "undefined" string, #54), and BOTH lifecycle
      //    fields are forced to null. Otherwise a payload could smuggle
      //    archivedAt/archivedReason onto an ACTIVE entry — e.g. a bogus
      //    `superseded-cleanup` reason that memory-unarchive's restore logic and
      //    the cold valve's NON_RESURRECTABLE filter would later misread. (This
      //    also covers the plain undefined → null normalization that keeps a live
      //    write equal to a rebuild-from-md.)
      //
      //  • existing row IS archived → PRESERVE status:"archived" plus the existing
      //    archivedAt/archivedReason verbatim, and update only the entry's CONTENT.
      //    Round-19: the clears used to run unconditionally, so an authored write
      //    (or a proposal queued before the archive and approved after it) that
      //    touched an id archived in the meantime got status-normalized to "active"
      //    and SILENTLY REACTIVATED — restoring an archived memory without any of
      //    the checks that make restoring safe. Restoring is `memory-unarchive`'s
      //    job, deliberately: only it applies the cross-device overlay conflict
      //    guard, the row-completeness gate, and the pre-archive status logic that
      //    puts a `superseded-cleanup` archive back to `superseded` rather than
      //    `active`.
      if (prior && prior.status === "archived") {
        entry.status = "archived";
        entry.archivedAt = prior.archivedAt ?? null;
        entry.archivedReason = prior.archivedReason ?? null;
      } else {
        if (entry.status !== "active" && entry.status !== "superseded" && entry.status !== "pinned") {
          entry.status = "active";
        }
        entry.archivedAt = null;
        entry.archivedReason = null;
      }
      // Optional nullable fields: normalize undefined → null so the persisted md and
      // the live index agree (the renderer emits `null`, and a rebuild would too). #54.
      if (entry.supersedes === undefined) entry.supersedes = null;
      if (entry.validFrom === undefined) entry.validFrom = null;
      if (entry.validTo === undefined) entry.validTo = null;
      if (entry.originDevice === undefined) entry.originDevice = null;
      if (entry.project === undefined) entry.project = null;
      // Numeric fields: match the render/parse defaults so the LIVE index equals a
      // rebuild (an omitted key would otherwise be dropped from the live JSON, and
      // the scorer would read it as its own default — drift). confidence→0.5 (the
      // scorer's neutral default), importance→0. #54/#55.
      if (typeof entry.confidence !== "number" || !isFinite(entry.confidence)) entry.confidence = 0.5;
      if (typeof entry.importance !== "number" || !isFinite(entry.importance)) entry.importance = 0;
      // Provenance arrays + summary are de-facto required but routinely omitted in
      // authored JSON (#37). Default them so render() never hits undefined.length and
      // the persisted md/index stay consistent (no live-vs-rebuild drift).
      if (typeof entry.summary !== "string") entry.summary = "";
      if (!Array.isArray(entry.sourceSessions)) entry.sourceSessions = [];
      if (!Array.isArray(entry.sourceCommits)) entry.sourceCommits = [];
      if (!Array.isArray(entry.sourceFiles)) entry.sourceFiles = [];
      if (!Array.isArray(entry.entities)) entry.entities = [];

      // Continuation upsert: if this id already exists, UNION the provenance arrays
      // with the prior entry so an agent re-writing a thread with only its NEW
      // sessions can't erase the old receipt — which would make those raw sessions
      // "pending" again and re-digest forever. (A supersede targets a DIFFERENT id;
      // this is the plain create/update-of-same-id path.) `prior` was captured at
      // the top of this iteration, before any normalization.
      if (prior) {
        // Tolerate a malformed prior entry (a prior sourceSessions:{} would make the
        // spread throw and break memory-write → the digest). Non-array prev → [].
        const uni = (next: string[], prev: unknown) =>
          Array.from(new Set([...(Array.isArray(prev) ? prev : []), ...next]));
        entry.sourceSessions = uni(entry.sourceSessions, prior.sourceSessions);
        entry.sourceFiles = uni(entry.sourceFiles, prior.sourceFiles);
        entry.sourceCommits = uni(entry.sourceCommits, prior.sourceCommits);
      }

      // Supersede-target flip — ARCHIVAL-AWARE (round-20/25). Same symmetric rule
      // as the status/lifecycle block above, now applied to the OTHER id this item
      // can touch: the AUTHORED path may neither SET nor CLEAR archival lifecycle
      // state. An unconditional flip broke that in a subtler way — it stamped
      // status:"superseded" onto an ARCHIVED target while LEAVING its non-null
      // archivedAt/archivedReason in place, producing an incoherent row
      // (superseded, yet carrying archival metadata) that `memory-unarchive`
      // (whose pre-archive-status logic keys off archivedReason ===
      // "superseded-cleanup") and the cold valve's NON_RESURRECTABLE filter both
      // misread.
      //
      // An ARCHIVED target is therefore NOT flipped: archived already hides it from
      // recall, its lifecycle is machine-maintained, and clearing the archival
      // fields would be the authored path CLEARING machine state (round-19 forbids
      // that). It is not counted in `superseded` either — that count means "rows
      // flipped to status:superseded". Lint is satisfied either way:
      // `superseded-conflict` only fires when a supersede target is still `active`.
      //
      // ROUND-25: but leaving it entirely untouched was ALSO wrong. `archivedReason`
      // is not decoration — it drives two downstream behaviors:
      //   • the cold valve resurfaces every archive EXCEPT `superseded-cleanup`, so
      //     a target still reading `unused-low-value` keeps being advertised as
      //     RESTORABLE even though its replacement is now live; and
      //   • `memory-unarchive` derives the restored status FROM it —
      //     `superseded-cleanup` → `superseded`, anything else → `active`.
      // Together those let an archived-then-superseded entry be restored to ACTIVE
      // alongside its live replacement: exactly the resurrection the round-8
      // superseded-cleanup rule exists to prevent. So we RECORD the transition —
      // reason := "superseded-cleanup" (+ a fresh archivedAt, since the two fields
      // are one stamp: memory-archive always writes them together, and a new reason
      // paired with the OLD date describes a transition that never happened) — while
      // the status stays `archived`. This is the MACHINE recording a lifecycle
      // transition it just caused, the same category as the flip-to-superseded
      // below; the authored item's OWN supplied archivedAt/archivedReason are still
      // ignored/nulled by the block above. Skipped when the reason is ALREADY
      // `superseded-cleanup`, so re-running a digest is idempotent instead of
      // restamping archivedAt (which reads as cross-device divergence).
      //
      // ROUND-26: the transition must also ADVANCE the target's `updatedAt`.
      // Cross-device resolution picks between two copies of an id by `updatedAt` —
      // latest wins, in BOTH `resolveMemoryView` (plugin read side) and the npm CI
      // aggregator `merge-books.mjs`. Recording the new reason while leaving
      // `updatedAt` at its old value means a sibling device's copy — still carrying
      // the OLD reason but a later timestamp — WINS the merge, so the obsolete entry
      // stays advertised as restorable (and restorable to `active`) everywhere else:
      // the round-25 fix would hold only on the device that made the write. Stamping
      // it is also what the other lifecycle writers already do — `memory-archive`
      // and `memory-unarchive` both set `updatedAt: now` whenever they change status
      // — so this keeps the machine-maintained lifecycle consistent across all three
      // writers. It stays inside the idempotence guard, so a re-run never churns
      // `updatedAt` (which would itself read as cross-device divergence).
      if (supersede) {
        const target = idx.entries[supersede.targetId];
        const patchMd = (fields: Array<[string, string]>) => {
          if (!supersede.mdPath || !existsSync(supersede.mdPath)) return;
          let md = readFileSync(supersede.mdPath, "utf8");
          for (const [k, v] of fields) md = setFrontmatterField(md, k, v);
          writeFileSync(supersede.mdPath, md);
        };
        if (target && target.status === "archived") {
          if (target.archivedReason !== "superseded-cleanup") {
            const at = new Date().toISOString().slice(0, 10); // same plain calendar date memory-archive stamps
            target.archivedReason = "superseded-cleanup";
            target.archivedAt = at;
            target.updatedAt = at; // make the transition WIN latest-wins resolution
            patchMd([
              ["archivedReason", "superseded-cleanup"],
              ["archivedAt", at],
              ["updatedAt", at],
            ]);
          }
        } else if (target) {
          target.status = "superseded";
          superseded++;
          patchMd([["status", "superseded"]]);
        }
      }

      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, renderMemoryMarkdown(entry, body));
      upsertMemory(idx, entry);
      written++;
      paths.push(canonical);
    }
  } catch (err) {
    // A write (or a supersede-target patch) blew up mid-batch: every .md already
    // touched by this call is ahead of an index that was never saved. Put them all
    // back and rethrow with context — a rollback that itself failed is surfaced as
    // a PARTIAL ROLLBACK rather than swallowed.
    rollbackMemoryWrites("applyMemoryItems: a .md write failed mid-batch", snapshots, err);
  }
  try {
    saveMemoryIndex(repoPath, idx);
  } catch (err) {
    // The .md side has fully landed and the index has not. The save is ATOMIC
    // (round-18), so the intact PRE-run index is still on disk — undoing the .md
    // writes therefore returns BOTH stores to exactly their pre-run state.
    rollbackMemoryWrites("applyMemoryItems: index save failed", snapshots, err);
  }
  return { written, superseded, paths };
}
