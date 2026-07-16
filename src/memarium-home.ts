// The memarium config-dir root, overridable via MEMARIUM_DIR.
//
// All plugin code that needs `~/.memarium` (config, session-repo, aggregated
// overlay, local-proposals queue, usage sidecar, plugin state) MUST route
// through memariumHome() so an eval/test harness can sandbox every side effect
// by exporting MEMARIUM_DIR=<tmp>. Unset → the canonical ~/.memarium, so
// behaviour is unchanged for normal runs.
//
// Lazy (not a module-level const) so it always reflects the current env/HOME —
// important for tests that stub them, and correct for a CLI in general.
//
// (Plugin-only; NOT a @sync-from mirror. The npm CLI has its own config flow.)

import { homedir } from "node:os";
import { join } from "node:path";

export function memariumHome(): string {
  // `||` (not `??`): an empty MEMARIUM_DIR="" means "unset" — a path env var is
  // never legitimately the empty string, and "" would otherwise yield broken
  // root-relative paths.
  return process.env.MEMARIUM_DIR || join(homedir(), ".memarium");
}
