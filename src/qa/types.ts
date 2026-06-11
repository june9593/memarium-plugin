export type QaKind = "compound" | "troubleshooting" | "decision" | "operational";

/** "global" | "user" | "project:<slug>" */
export type QaScope = string;

export interface QaEntry {
  id: string;                 // "qa/<project|_global>/<slug>"
  scope: QaScope;
  project: string | null;
  question: string;           // canonical, single-line
  answerSummary: string;      // compact, single-line — scorer input + display
  kind: QaKind;
  tags: string[];
  sources: string[];          // free-text or refs: "chronicle:<id>"/"commit:<sha>"/url
  sourceMemoryIds: string[];  // reverse index → typed memory ids
  sourceSessions: string[];
  relatedEntities: string[];  // entity-id edges (reuse the entity graph)
  path: string;               // "memory/qa/<project|_global>/<slug>.md"
  createdAt: string;          // ISO date
  updatedAt: string;
}

export interface QaIndex { version: 1; entries: Record<string, QaEntry>; }

export function qaKey(e: QaEntry): string { return e.id; }
export function emptyQaIndex(): QaIndex { return { version: 1, entries: {} }; }
