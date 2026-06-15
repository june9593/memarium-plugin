import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadEntityIndex } from "../entity/index-store.js";
import { scoreEntities } from "../entity/score.js";
import type { EntityKind, EntityPage } from "../entity/types.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import type { MemoryEntry } from "../memory/types.js";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";

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

/** Mirror of score.ts isEligible — filters by status, expiry, and scope. */
function isEligibleMemory(m: MemoryEntry, now: string, project: string | null): boolean {
  if (m.status === "superseded") return false;
  if (m.validTo !== null && m.validTo <= now) return false;
  if (m.scope === "global" || m.scope === "user") return true;
  if (project && m.scope === `project:${project}`) return true;
  // project-scoped entries from other projects are excluded when cwd project is set
  return project === null;
}

/** Mirror of score.ts isEligible (scope-only) for EntityPage — no kind filter here. */
function isEligibleEntity(e: EntityPage, project: string | null): boolean {
  if (e.scope === "global" || e.scope === "user") return true;
  if (project && e.scope === `project:${project}`) return true;
  // project-scoped entities from other projects are excluded when cwd project is set
  return project === null;
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

export async function buildEntityQueryPayload(opts: EntityQueryOptions) {
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
        // Apply same eligibility predicate as score.ts isEligible
        if (!isEligibleMemory(m, now, project)) return false;
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
    // or whose id ends with a matching slug derived from the name.
    // First narrow to scope-eligible entities (mirrors score.ts isEligible) so we never
    // return pages from other projects when a cwd project is resolved.
    const nameSlug = entityName.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const entRoot = resolve(join(cfg.repoPath, "memory", "entities"));
    const matchedEntities: MatchedEntity[] = entries
      .filter((e: EntityPage) => isEligibleEntity(e, project))
      .filter((e: EntityPage) => {
        const titleMatch = e.title.toLowerCase() === entityName;
        const aliasMatch = (Array.isArray(e.aliases) ? e.aliases : []).some((a) => typeof a === "string" && a.toLowerCase() === entityName);
        const slugMatch = nameSlug.length > 0 && e.id.toLowerCase().endsWith("/" + nameSlug);
        return titleMatch || aliasMatch || slugMatch;
      })
      .map((e: EntityPage) => {
        const abs = resolve(join(cfg.repoPath, e.path));
        // path-guard (string prefix): only read files under <repoPath>/memory/entities/
        const inRoot = abs === entRoot || abs.startsWith(entRoot + sep);
        let body = "";
        if (inRoot && existsSync(abs)) {
          // symlink-safe guard: use realpath to prevent reading via symlinked paths
          const realRoot = existsSync(entRoot) ? realpathSync(entRoot) : entRoot;
          const real = realpathSync(abs);
          if (real === realRoot || real.startsWith(realRoot + sep)) {
            body = readFileSync(abs, "utf8");
          }
        }
        return { entry: e, body };
      });
    payload.matchedEntities = matchedEntities;
  }

  return payload;
}

export async function entityQueryCmd(opts: EntityQueryOptions): Promise<void> {
  const payload = await buildEntityQueryPayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
