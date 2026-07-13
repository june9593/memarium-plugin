// Plugin "borrowed-tenant" invariant enforcement:
//   - We MAY create raw_sessions/ inside ~/.memarium/session-repo/
//   - We MAY NOT create or modify .git/ or .memarium/index.* (sync CLI owns those)
//   - On a sync-managed spool we coexist; on a plugin-only machine we operate
//     against a plain directory that just happens to live under that path.

import { mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const SPOOL_REL_PATH = ".memarium/session-repo";

export interface EnsureResult {
  spoolRoot: string;
  rawSessionsDir: string;
  /** True if the call actually created the spool root for the first time. */
  created: boolean;
}

export function ensureSpoolDir(): EnsureResult {
  const spoolRoot = join(homedir(), SPOOL_REL_PATH);
  const created = !existsSync(spoolRoot);

  const rawSessionsDir = join(spoolRoot, "raw_sessions");

  mkdirSync(rawSessionsDir, { recursive: true });
  // Note: we deliberately do NOT mkdir .git or .memarium here. If sync CLI
  // is installed and has run init, those already exist. If not, they stay
  // absent and that is correct.

  return { spoolRoot, rawSessionsDir, created };
}
