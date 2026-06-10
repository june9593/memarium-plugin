import type { MemoryEntry, MemoryType } from "./types.js";

function pick(entries: MemoryEntry[], type: MemoryType, project: string): MemoryEntry[] {
  return entries
    .filter((e) => e.status !== "superseded" && e.type === type)
    .filter((e) => e.scope === "global" || e.scope === "user" || e.project === project)
    .sort((a, b) => b.importance - a.importance || a.title.localeCompare(b.title));
}

function section(title: string, items: MemoryEntry[]): string {
  if (items.length === 0) return "";
  const lines = items.map((e) => `- **${e.title}** — ${e.summary}`);
  return `## ${title}\n\n${lines.join("\n")}\n`;
}

/** Compact per-project rollup loaded at session start. */
export function renderPrimer(project: string, entries: MemoryEntry[]): string {
  const head = `# Project memory: ${project}\n\n> Auto-generated primer. The agent should treat this as already-known project context.\n`;
  const parts = [
    head,
    section("Core rules", pick(entries, "core", project)),
    section("Project facts", pick(entries, "semantic", project)),
    section("Procedures & gotchas", pick(entries, "procedural", project)),
  ].filter(Boolean);
  return parts.join("\n");
}
