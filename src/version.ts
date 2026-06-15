import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/** Read the plugin's version from the nearest package.json, walking up from the
 *  module location. Used by BOTH the CLI (`--version`) and the MCP server's
 *  `serverInfo.version` so there is exactly ONE runtime source of truth — no
 *  hardcoded version to sync on release. Returns a sentinel if not found. */
export function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const rel of ["../package.json", "../../package.json", "../../../package.json"]) {
    try {
      return JSON.parse(readFileSync(resolve(here, rel), "utf8")).version as string;
    } catch { /* try next */ }
  }
  return "0.0.0-unknown";
}
