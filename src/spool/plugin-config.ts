// Tolerant config reader for plugin commands.
//
// Plugin's "borrowed-tenant" rule (spec §4): plugin must work on a plain
// directory at ~/.vibebook/session-repo/, even when ~/.vibebook/config.json
// does not exist (i.e. user has not run npm `vibebook init`). The shared
// readConfig() throws in that case; this wrapper returns a minimal default
// instead, pointing repoPath at the spool root.
//
// Plugin commands should call readPluginConfig() instead of readConfig().
// Plugin never writes config.json — that's npm vibebook's job (vibebook init).
//
// Note: we recompute the config path on every call (via homedir()) instead of
// caching it at module-load time. This is so vi.stubEnv("HOME", ...) in tests
// works correctly. The shared _shared/config.ts caches CONFIG_PATH at module
// load — we don't reuse its configExists() for that reason.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readConfig, type Config } from "../_shared/config.js";

function configPath(): string {
  return join(homedir(), ".vibebook", "config.json");
}

/** Default config used when ~/.vibebook/config.json doesn't exist. Only the
 *  fields plugin commands actually read are meaningful; the rest are
 *  schema-required placeholders. */
function defaultPluginConfig(): Config {
  return {
    repoPath: join(homedir(), ".vibebook", "session-repo"),
    repoUrl: "",
    deviceBranch: "",
    runner: "claude-cli",
    enableAggregateCI: false,
    includeReasoning: true,
    threadingConcurrency: 4,
    threadingMaxAttempts: 3,
    digestEnabled: true,
  };
}

export function readPluginConfig(): Config {
  if (!existsSync(configPath())) return defaultPluginConfig();
  // configPath() exists. _shared/config.ts caches its CONFIG_PATH at module
  // load though — in tests that's the wrong path. Read + parse the real file
  // directly here too, bypassing readConfig() entirely, so test stubbing
  // works end-to-end.
  try {
    const raw = readFileSync(configPath(), "utf8");
    return JSON.parse(raw) as Config;
  } catch {
    // Corrupt or unreadable config — fall back to default rather than crashing.
    return defaultPluginConfig();
  }
}
