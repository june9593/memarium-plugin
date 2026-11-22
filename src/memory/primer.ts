import type { MemoryEntry, MemoryType } from "./types.js";
import { isArchived } from "./score.js";
import { calendarDate } from "./dates.js";

/** Per-section entry cap so a huge project can't blow the session-start token
 *  budget. Sections render their top-N; the overflow is surfaced (not silent). */
export const MAX_PER_SECTION = 12;

/** Claude Code saves hook output over 10,000 characters to a file and shows the
 *  model only a short preview (anthropics/claude-code#51537, #91614), so a longer
 *  SessionStart primer silently loses everything after its first section. The
 *  hook wraps the primer in well under 1,000 characters of header/footer; this
 *  ceiling keeps the whole hook output below the host limit. It is a hard
 *  ceiling, not a target. Counted as JS string length (UTF-16 code units), which
 *  is never fewer than Unicode characters. */
export const HOOK_PRIMER_MAX_CHARS = 8000;

/** Entries below this confidence are marked tentative in the primer so the agent
 *  can calibrate trust (a 0.3 guess shouldn't read like a 1.0 verified fact). */
export const TENTATIVE_BELOW = 0.5;

function num(v: unknown, dflt: number): number {
  return typeof v === "number" && isFinite(v) ? v : dflt;
}

/** Eligible entries for a section, ranked. Ranking is BLENDED, not purely the
 *  subjective LLM `importance` integer: importance, then confidence, then
 *  recency (updatedAt), then title — so a shaky or stale entry can't crowd out a
 *  solid one near the truncation cap (issues #19/#21). */
function eligible(entries: MemoryEntry[], type: MemoryType, project: string, now: string): MemoryEntry[] {
  // Round-24: expiry compares CALENDAR DATES through the shared helper, so a
  // same-day ISO TIMESTAMP validTo is expired here exactly as it is to
  // planArchival / memory-lint / recall (raw strings sorted it AFTER the plain
  // `YYYY-MM-DD` now and kept it in the primer). An unparseable validTo yields
  // null and is KEPT — it can't be proven past.
  const nowDate = calendarDate(now) ?? now;
  return entries
    .filter((e) => e.status !== "superseded" && !isArchived(e) && e.type === type)
    .filter((e) => { const v = calendarDate(e.validTo); return v === null || v > nowDate; })
    .filter((e) => e.scope === "global" || e.scope === "user" || e.project === project)
    // Trust gate (#23): only `trusted` semantic auto-injects into the primer.
    // untrusted/unknown semantic (possible prompt-injection from external content
    // the digest read) is withheld — it surfaces only in explicit /memarium-context,
    // flagged. core/procedural are unaffected (the v4 review gate protects them).
    .filter((e) => type !== "semantic" || (e.trust ?? "unknown") === "trusted")
    .sort((a, b) =>
      num(b.importance, 0) - num(a.importance, 0) ||
      num(b.confidence, 0.5) - num(a.confidence, 0.5) ||
      (b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0) ||
      a.title.localeCompare(b.title));
}

interface Section { title: string; all: MemoryEntry[]; shown: number; withSummary: boolean }

function bullet(e: MemoryEntry, withSummary: boolean): string {
  const tentative = typeof e.confidence === "number" && e.confidence < TENTATIVE_BELOW ? " _(tentative)_" : "";
  return withSummary ? `- **${e.title}**${tentative} — ${e.summary}` : `- **${e.title}**${tentative}`;
}

function renderSection(s: Section): string {
  if (s.all.length === 0) return "";
  const lines = s.all.slice(0, s.shown).map((e) => bullet(e, s.withSummary));
  // Surface the truncated tail so the agent KNOWS it's seeing a partial view —
  // the silent `.slice()` was the failure mode the product exists to prevent (#19).
  const hidden = s.all.length - s.shown;
  if (hidden > 0) lines.push(`- _…and ${hidden} more (run \`/memarium-context\`)_`);
  return `## ${s.title}\n\n${lines.join("\n")}\n`;
}

const CLIPPED = "\n…(primer truncated)\n";

/** Last-resort cut at `limit` characters that never ends on half a surrogate pair. */
function clip(text: string, limit: number): string {
  if (limit <= CLIPPED.length) return "";
  let cut = limit - CLIPPED.length;
  const code = text.charCodeAt(cut - 1);
  if (code >= 0xd800 && code <= 0xdbff) cut--;
  return text.slice(0, cut) + CLIPPED;
}

/** Compact per-project rollup loaded at session start. Each section caps at
 *  `maxPerSection` (default 12) top entries (blended rank) for token control,
 *  with a "+N more" footer when truncated. `compact` lists facts and procedures
 *  by title only (core rules keep their summary); `maxChars` is a hard ceiling
 *  on the returned text. */
export function renderPrimer(
  project: string,
  entries: MemoryEntry[],
  opts: { maxPerSection?: number; now?: string; compact?: boolean; maxChars?: number } = {},
): string {
  const raw = opts.maxPerSection ?? MAX_PER_SECTION;
  const max = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : MAX_PER_SECTION;
  const now = opts.now ?? new Date().toISOString().slice(0, 10);
  const compact = opts.compact === true;
  const head = `# Project memory: ${project}\n\n> Auto-generated primer. The agent should treat this as already-known project context.\n`;
  const make = (title: string, type: MemoryType, withSummary: boolean): Section => {
    const all = eligible(entries, type, project, now);
    return { title, all, shown: Math.min(max, all.length), withSummary };
  };
  const core = make("Core rules", "core", true);
  const facts = make("Project facts", "semantic", !compact);
  const procedures = make("Procedures & gotchas", "procedural", !compact);
  // Silent when there's no eligible memory for this project — so memory-primer
  // (and the SessionStart hook) emit nothing rather than a bare header block.
  if (core.all.length + facts.all.length + procedures.all.length === 0) return "";
  const render = () => [head, ...[core, facts, procedures].map(renderSection).filter(Boolean)].join("\n");
  let out = render();
  const limit = opts.maxChars;
  if (limit === undefined || !Number.isFinite(limit) || limit < 0) return out;
  // Over the ceiling: drop facts first, then procedures, then core rules. Footers
  // keep counting what was left out, so the cut is visible rather than silent.
  for (const s of [facts, procedures, core]) {
    while (out.length > limit && s.shown > 0) { s.shown--; out = render(); }
  }
  return out.length > limit ? clip(out, Math.floor(limit)) : out;
}
