import type { MemoryEntry, MemoryType } from "./types.js";

/** Per-section entry cap so a huge project can't blow the session-start token
 *  budget. Sections render their top-N; the overflow is surfaced (not silent). */
export const MAX_PER_SECTION = 12;

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
  return entries
    .filter((e) => e.status !== "superseded" && e.type === type)
    .filter((e) => e.validTo === null || e.validTo > now)
    .filter((e) => e.scope === "global" || e.scope === "user" || e.project === project)
    .sort((a, b) =>
      num(b.importance, 0) - num(a.importance, 0) ||
      num(b.confidence, 0.5) - num(a.confidence, 0.5) ||
      (b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0) ||
      a.title.localeCompare(b.title));
}

function section(title: string, all: MemoryEntry[], max: number): string {
  if (all.length === 0) return "";
  const shown = all.slice(0, max);
  const lines = shown.map((e) => {
    const tentative = typeof e.confidence === "number" && e.confidence < TENTATIVE_BELOW ? " _(tentative)_" : "";
    return `- **${e.title}**${tentative} — ${e.summary}`;
  });
  // Surface the truncated tail so the agent KNOWS it's seeing a partial view —
  // the silent `.slice()` was the failure mode the product exists to prevent (#19).
  const hidden = all.length - shown.length;
  const footer = hidden > 0 ? `\n- _…and ${hidden} more (run \`/vibebook-context\`)_` : "";
  return `## ${title}\n\n${lines.join("\n")}${footer}\n`;
}

/** Compact per-project rollup loaded at session start. Each section caps at
 *  `maxPerSection` (default 12) top entries (blended rank) for token control,
 *  with a "+N more" footer when truncated. */
export function renderPrimer(
  project: string,
  entries: MemoryEntry[],
  opts: { maxPerSection?: number; now?: string } = {},
): string {
  const raw = opts.maxPerSection ?? MAX_PER_SECTION;
  const max = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : MAX_PER_SECTION;
  const now = opts.now ?? new Date().toISOString().slice(0, 10);
  const head = `# Project memory: ${project}\n\n> Auto-generated primer. The agent should treat this as already-known project context.\n`;
  const sections = [
    section("Core rules", eligible(entries, "core", project, now), max),
    section("Project facts", eligible(entries, "semantic", project, now), max),
    section("Procedures & gotchas", eligible(entries, "procedural", project, now), max),
  ].filter(Boolean);
  // Silent when there's no eligible memory for this project — so memory-primer
  // (and the SessionStart hook) emit nothing rather than a bare header block.
  if (sections.length === 0) return "";
  return [head, ...sections].join("\n");
}
