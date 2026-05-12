// One-time onboarding: tell the user about the optional vibebook npm CLI
// for cross-device sync. Decision tree (constraint #7 = option C):
//   - If we've already nudged once (state.firstRunNudgeShown == true): be silent
//   - If npm `vibebook` is detected on PATH: don't nudge (they already know)
//   - Otherwise: print the nudge once, then mark state so we never repeat
//
// Either way we set firstRunNudgeShown=true after running, so subsequent
// /vibebook invocations are silent regardless.

import { execFileSync } from "node:child_process";
import { loadState, saveState } from "../spool/plugin-state.js";

export async function firstRunCmd(): Promise<void> {
  const state = loadState();
  if (state.firstRunNudgeShown) return; // already nudged once; be quiet forever

  const npmCliInstalled = isNpmVibebookOnPath();
  if (!npmCliInstalled) {
    console.log("vibebook plugin: digest + recall ready.");
    console.log("For cross-device session sync, install the optional vibebook npm CLI:");
    console.log("    npm i -g vibebook");
    console.log("(See https://github.com/june9593/vibebook for details.)");
  }

  saveState({ ...state, firstRunNudgeShown: true });
}

function isNpmVibebookOnPath(): boolean {
  try {
    // `command -v` returns 0 if found. Use /bin/sh -c so we don't depend on bash.
    execFileSync("/bin/sh", ["-c", "command -v vibebook >/dev/null 2>&1"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}
