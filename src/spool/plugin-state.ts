// Plugin's own persistent state. Lives OUTSIDE the spool root so we don't
// pollute the sync-owned ~/.memarium/session-repo/ tree.
//
// Path: ~/.memarium/.plugin-state.json
//
// Schema is intentionally minimal — anything we add becomes a backwards-compat
// concern. Boolean flags only; never put data here that the user would
// notice losing if they rm -rf ~/.memarium/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { memariumHome } from "../memarium-home.js";

// NOTE: lazy function (not top-level const) so vi.stubEnv("HOME", ...) in
// tests is honored — homedir() must be re-evaluated per call.
function statePath(): string {
  return join(memariumHome(), ".plugin-state.json");
}

export interface PluginState {
  /** True once the first-run npm-CLI nudge has been shown. */
  firstRunNudgeShown?: boolean;
}

export function loadState(): PluginState {
  const p = statePath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as PluginState;
  } catch {
    // Corrupt file → treat as empty. Don't crash the plugin over a state file.
    return {};
  }
}

export function saveState(state: PluginState): void {
  const p = statePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(state, null, 2) + "\n");
}
