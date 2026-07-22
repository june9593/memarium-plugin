export type MemoryType =
  | "core" | "semantic" | "episodic" | "procedural";

/** Provenance trust. Governs whether a `semantic` memory may be AUTO-injected
 *  into the SessionStart primer (only `trusted` is). Orthogonal to the v4 gate
 *  (which governs whether a change can be written live). `unknown` = not
 *  determinable / not set → treated as untrusted for auto-injection. */
export type MemoryTrust = "trusted" | "untrusted" | "unknown";

/** "global" | "user" | "project:<slug>" */
export type MemoryScope = string;

export interface MemoryEntry {
  id: string;                 // stable globally-unique slug, e.g. "core/user-workflow" or "semantic/code-demo/spool-format"
  type: MemoryType;
  scope: MemoryScope;         // "global" | "user" | "project:<slug>"
  project: string | null;    // slug, or null for global/user
  title: string;
  summary: string;           // one-line, used in scoring + listing
  path: string;              // repo-relative: memory/<type>/<project|_global>/<slug>.md
  status: "active" | "superseded" | "pinned";
  confidence: number;        // 0..1
  importance: number;        // 0..N
  createdAt: string;         // ISO
  updatedAt: string;
  validFrom: string | null;
  validTo: string | null;    // null = still valid
  sourceSessions: string[];
  sourceCommits: string[];
  sourceFiles: string[];
  supersedes: string | null; // id of the memory this replaces
  entities: string[];        // file/symbol/API/person/project tokens
  trust?: MemoryTrust;       // provenance trust; only `trusted` semantic auto-injects into the primer (absent/unknown → excluded). parse/apply always set a concrete value; optional only for back-compat with pre-feature literals.
  originDevice: string | null;
  accessCount: number;
  lastAccess: string | null;
}

export interface MemoryIndex {
  version: 1;
  entries: Record<string, MemoryEntry>;  // keyed by id
}

export function memoryKey(entry: MemoryEntry): string {
  return entry.id;
}

export function emptyMemoryIndex(): MemoryIndex {
  return { version: 1, entries: {} };
}
