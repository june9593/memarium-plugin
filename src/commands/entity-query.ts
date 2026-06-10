import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadEntityIndex } from "../entity/index-store.js";
import { scoreEntities } from "../entity/score.js";
import type { EntityKind, EntityPage } from "../entity/types.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import type { MemoryEntry } from "../memory/types.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

interface MatchedEntity {
  entry: EntityPage;
  body: string;
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
  // AND return matched entity pages with their body content
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

    // matchedEntities: entity pages whose title or any alias matches <name> case-insensitively,
    // or whose id ends with a matching slug derived from the name
    const nameSlug = entityName.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const matchedEntities: MatchedEntity[] = entries
      .filter((e: EntityPage) => {
        const titleMatch = e.title.toLowerCase() === entityName;
        const aliasMatch = e.aliases.some((a) => a.toLowerCase() === entityName);
        const slugMatch = nameSlug.length > 0 && e.id.toLowerCase().endsWith("/" + nameSlug);
        return titleMatch || aliasMatch || slugMatch;
      })
      .map((e: EntityPage) => {
        const mdPath = join(cfg.repoPath, e.path);
        const body = existsSync(mdPath) ? readFileSync(mdPath, "utf8") : "";
        return { entry: e, body };
      });
    payload.matchedEntities = matchedEntities;
  }

  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
