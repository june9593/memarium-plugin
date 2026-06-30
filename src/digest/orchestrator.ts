// Plugin autonomy entrypoint. Called by the skill at start of /vibebook
// (Step P0 / G0). Does the "spool warmup":
//   1. ensureSpoolDir() — make sure raw_sessions/ + book/ exist
//   2. scanAndImport()  — copy any new ~/.claude/projects jsonl into spool
// Then prints a JSON status the skill reads to know what to do next.
//
// The actual digest (chronicle + topic writing) is NOT done here — that
// stays in the skill, where in-session Claude has the full conversation
// context and can write naturally. This file is "warmup only".

import { execFileSync } from "node:child_process";
import { ensureSpoolDir } from "../spool/ensure-dir.js";
import { scanAndImport, type ScanResult } from "../spool/scan-and-import.js";
import { cachedProjectSlug } from "../_shared/project-identity.js";

export interface OrchestrateOptions {
  mode: string;
  cwd?: string;
}

export interface OrchestrateOutput {
  mode: "project" | "global";
  project: string | null;
  cwd: string | null;
  scan: ScanResult;
  nextStep: "run-prepare-then-digest" | "run-fanout-then-catalog";
  /** True iff `memex` is on PATH at orchestrate time. Skill reads this
   *  to decide whether to prompt the user about /memex-retro hand-off,
   *  and avoids issuing its own `command -v memex` Bash (which AI tends
   *  to over-generalize into also checking other binaries). */
  memexInstalled: boolean;
}

function isMemexOnPath(): boolean {
  try {
    execFileSync("/bin/sh", ["-c", "command -v memex >/dev/null 2>&1"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

export async function orchestrateCmd(opts: OrchestrateOptions): Promise<void> {
  if (opts.mode !== "project" && opts.mode !== "global") {
    throw new Error(`Invalid mode '${opts.mode}'. Expected 'project' or 'global'.`);
  }

  ensureSpoolDir();
  const memexInstalled = isMemexOnPath();

  let result: OrchestrateOutput;
  if (opts.mode === "project") {
    const cwd = opts.cwd ?? process.cwd();
    const project = cachedProjectSlug(cwd);
    const scan = await scanAndImport({ projectFilter: project });
    result = {
      mode: "project",
      project,
      cwd,
      scan,
      nextStep: "run-prepare-then-digest",
      memexInstalled,
    };
  } else {
    const scan = await scanAndImport({ projectFilter: null });
    result = {
      mode: "global",
      project: null,
      cwd: null,
      scan,
      nextStep: "run-fanout-then-catalog",
      memexInstalled,
    };
  }

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
