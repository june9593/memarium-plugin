export type EntityKind = "file" | "symbol" | "api" | "concept" | "person";

/** "global" | "user" | "project:<slug>" */
export type EntityScope = string;

export interface EntityPage {
  id: string;                 // "entity/<project|_global>/<slug>"
  kind: EntityKind;
  scope: EntityScope;         // "global" | "user" | "project:<slug>"
  project: string | null;
  title: string;              // entity display name
  aliases: string[];
  sourceMemoryIds: string[];  // reverse index → typed memory ids
  sourceSessions: string[];
  sourceFiles: string[];
  relatedEntities: string[];  // entity-id graph edges
  path: string;               // "memory/entities/<project|_global>/<slug>.md"
  createdAt: string;          // ISO
  updatedAt: string;
}

export interface EntityIndex { version: 1; entries: Record<string, EntityPage>; }

export function entityKey(e: EntityPage): string { return e.id; }
export function emptyEntityIndex(): EntityIndex { return { version: 1, entries: {} }; }
