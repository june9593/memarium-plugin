import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { scoreMemories, type ScoredMemory } from "../memory/score.js";
import { renderPrimer } from "../memory/primer.js";
import type { MemoryEntry, MemoryType } from "../memory/types.js";

export interface MemoryQueryOptions { cwd?: string; type?: string; q?: string; }

function isType(s: string | undefined): MemoryType | null {
  const ok = ["core", "semantic", "episodic", "procedural", "working", "artifact"];
  return s && ok.includes(s) ? (s as MemoryType) : null;
}

export async function buildMemoryQueryPayload(opts: MemoryQueryOptions) {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadMemoryIndex(cfg.repoPath);
  const entries = Object.values(idx.entries);
  const now = new Date().toISOString().slice(0, 10);

  const scored = scoreMemories(entries, {
    project, text: opts.q ?? "", type: isType(opts.type), now,
  });

  const byType = (t: MemoryType): ScoredMemory[] => scored.filter((s) => s.entry.type === t);

  // primer: refresh on query so it always reflects current memory
  let primer = "";
  if (project) {
    primer = renderPrimer(project, entries);
    const abs = join(cfg.repoPath, "memory", "_primer", `${project}.md`);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, primer);
  }

  const conflicts = entries
    .filter((e) => e.status === "superseded" || e.supersedes !== null || e.validTo !== null)
    .map((e) => ({
      entry: e,
      score: 0,
      whyRecalled:
        e.status === "superseded" ? "superseded"
        : e.supersedes !== null ? "supersedes-other"
        : "time-bounded",
    }));

  return {
    project,
    primer,
    core: byType("core"),
    procedures: byType("procedural"),
    semantic: byType("semantic"),
    episodes: byType("episodic"),
    working: byType("working"),
    conflicts,
    artifacts: byType("artifact"),
    meta: { total: scored.length, project },
  };
}

export async function memoryQueryCmd(opts: MemoryQueryOptions): Promise<void> {
  const payload = await buildMemoryQueryPayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
