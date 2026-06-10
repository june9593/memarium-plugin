import type { MemoryEntry, MemoryType } from "./types.js";

/** Per-section entry cap so a huge project can't blow the session-start token
 *  budget. Sections render their top-N by importance. */
export const MAX_PER_SECTION = 12;

function pick(entries: MemoryEntry[], type: MemoryType, project: string, max: number): MemoryEntry[] {
  return entries
    .filter((e) => e.status !== "superseded" && e.type === type)
    .filter((e) => e.scope === "global" || e.scope === "user" || e.project === project)
    .sort((a, b) => b.importance - a.importance || a.title.localeCompare(b.title))
    .slice(0, max);
}

function section(title: string, items: MemoryEntry[]): string {
  if (items.length === 0) return "";
  const lines = items.map((e) => `- **${e.title}** — ${e.summary}`);
  return `## ${title}\n\n${lines.join("\n")}\n`;
}

/** Compact per-project rollup loaded at session start. Each section caps at
 *  `maxPerSection` (default 12) top entries by importance for token control. */
export function renderPrimer(
  project: string,
  entries: MemoryEntry[],
  opts: { maxPerSection?: number } = {},
): string {
  const raw = opts.maxPerSection ?? MAX_PER_SECTION;
  const max = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : MAX_PER_SECTION;
  const head = `# Project memory: ${project}\n\n> Auto-generated primer. The agent should treat this as already-known project context.\n`;
  const parts = [
    head,
    section("Core rules", pick(entries, "core", project, max)),
    section("Project facts", pick(entries, "semantic", project, max)),
    section("Procedures & gotchas", pick(entries, "procedural", project, max)),
  ].filter(Boolean);
  return parts.join("\n");
}
