// @sync-from: github.com/june9593/vibebook → src/sources/base.ts
// Keep this file in sync with the canonical version above. If you fix a bug here, also patch it there.

import type { NormalizedSession } from "../types.js";

export interface SourceAdapter {
  name: "claude" | "copilot";
  /** Scan the local filesystem and yield every session found. */
  discover(): AsyncIterable<DiscoveredSession>;
}

export interface DiscoveredSession {
  sourcePath: string;
  sourceMtimeMs: number;
  sourceSha256: string;
  /** Lazy: parse and normalize on demand (keeps memory low for huge corpora). */
  load(): Promise<NormalizedSession>;
}
