import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadEntityIndex } from "../entity/index-store.js";
import { scoreEntities } from "../entity/score.js";
import type { EntityKind } from "../entity/types.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import type { MemoryEntry } from "../memory/types.js";

export interface EntityQueryOptions {
  cwd?: string;
  q?: string;
  kind?: string;
  entity?: string;
}

function isKind(s: string | undefined): EntityKind | null {
  const ok: EntityKind[] = ["file", "symbol", "api", "concept", "person"];
  return s && ok.includes(s as EntityKind) ? (s as EntityKind) : null;
}

interface ReferencingMemory {
  id: string;
  title: string;
  type: string;
  sourceSessions: string[];
}

export async function entityQueryCmd(opts: EntityQueryOptions): Promise<void> {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadEntityIndex(cfg.repoPath);
  const entries = Object.values(idx.entries);
  const now = new Date().toISOString().slice(0, 10);

  const scored = scoreEntities(entries, {
    project,
    text: opts.q ?? "",
    kind: isKind(opts.kind),
    now,
  });

  const payload: Record<string, unknown> = {
    project,
    entities: scored,
  };

  // Reverse lookup: when --entity is passed, find memories that reference it
  if (opts.entity) {
    const entityName = opts.entity.toLowerCase();
    const memIdx = loadMemoryIndex(cfg.repoPath);
    const referencingMemories: ReferencingMemory[] = Object.values(memIdx.entries)
      .filter((m: MemoryEntry) => {
        // Check m.entities[] (case-insensitive) — defensive: treat missing/non-array as []
        const inEntities = (Array.isArray(m.entities) ? m.entities : []).some((e) => e.toLowerCase() === entityName);
        // Check m.title contains entity name (case-insensitive)
        const inTitle = m.title.toLowerCase().includes(entityName);
        return inEntities || inTitle;
      })
      .map((m: MemoryEntry) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        sourceSessions: m.sourceSessions,
      }));
    payload.referencingMemories = referencingMemories;
  }

  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
