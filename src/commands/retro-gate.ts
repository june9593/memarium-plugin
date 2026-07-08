import { readFileSync, existsSync } from "node:fs";

/** The Stop-hook event JSON Claude Code pipes to the hook on stdin. */
export interface StopEvent {
  stop_hook_active?: boolean;
  transcript_path?: string;
}

/** A minimal shape of a transcript JSONL row (Claude Code session log). */
interface Row {
  isMeta?: boolean;
  message?: { role?: string; content?: unknown };
  role?: string;
  content?: unknown;
}

/** Instruction fed back to the agent when we block the stop to force a retro.
 *  Written as a direct instruction — Claude Code surfaces `reason` to the model
 *  as the thing to do before it may stop. Gives an explicit out so the agent is
 *  never forced to write a junk memory. */
export const RETRO_REASON =
  "This turn changed files. Before you stop, capture the ONE reusable insight " +
  "from it into memarium typed memory: invoke the /memarium-retro skill now — " +
  "distill the insight, run the fact-hygiene + memory-query dedup, and write it " +
  "(memory-write for semantic/episodic, memory-propose for gated). If, on " +
  "reflection, nothing here is durably reusable — or you already captured it — " +
  "say so in one line and stop; do not force a low-value memory.";

/** Tool calls that mean "this turn did real work worth a retro". */
const MUTATION_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);

/** True when a tool_use block shows a retro already happened this turn — so we
 *  don't double-nudge (belt-and-suspenders next to the stop_hook_active guard). */
function isRetroSignal(tu: { name?: string; input?: Record<string, unknown> }): boolean {
  if (tu.name === "Skill" && String(tu.input?.skill ?? "").includes("memarium-retro")) return true;
  if (tu.name === "Bash") {
    const c = String(tu.input?.command ?? "");
    if (c.includes("memory-write") || c.includes("memory-propose")) return true;
  }
  return false;
}

/**
 * Pure gate: decide whether the Stop hook should block-and-force a `/memarium-retro`.
 *
 * Smart-gated so we only nudge after substantive work, never on Q&A/chat turns:
 *   - Loop guard: if the stop is itself a continuation from a prior stop-hook
 *     block (`stop_hook_active`), let it stop — never loop.
 *   - Scope to the just-completed turn (assistant activity since the last real
 *     human user message; tool_result-only user records don't count).
 *   - Block iff that turn used a file-mutation tool AND has not already run a
 *     retro.
 */
export function decideRetroGate(evt: StopEvent, rows: Row[]): { block: boolean; reason?: string } {
  if (evt.stop_hook_active) return { block: false };

  let lastUser = -1;
  rows.forEach((m, i) => {
    // isMeta rows are system-injected pseudo-messages (slash-command / skill
    // bodies, command-output replays) that carry role:"user" + text content but
    // are NOT real human turns. The canonical source parser drops them
    // (src/_shared/sources/claude-code.ts) — mirror that, or an injected row
    // would move lastUser past an earlier mutation and misfire the gate.
    if (m.isMeta === true) return;
    const msg = m.message ?? m;
    if (msg.role !== "user") return;
    const c = (msg as { content?: unknown }).content;
    const toolResultOnly =
      Array.isArray(c) && c.length > 0 &&
      c.every((b) => (b as { type?: string })?.type === "tool_result");
    if (!toolResultOnly) lastUser = i;
  });

  let mutated = false;
  let didRetro = false;
  for (const m of rows.slice(lastUser + 1)) {
    if (m.isMeta === true) continue;
    const msg = m.message ?? m;
    if (msg.role !== "assistant") continue;
    const c = (msg as { content?: unknown }).content;
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      const blk = b as { type?: string; name?: string; input?: Record<string, unknown> };
      if (blk.type !== "tool_use") continue;
      if (blk.name && MUTATION_TOOLS.has(blk.name)) mutated = true;
      if (isRetroSignal(blk)) didRetro = true;
    }
  }

  return mutated && !didRetro ? { block: true, reason: RETRO_REASON } : { block: false };
}

/** CLI wrapper backing the Stop hook. Reads the Stop event on stdin, and if the
 *  gate says so, prints `{"decision":"block","reason":...}` to stdout (which
 *  Claude Code feeds back to the agent so it runs /memarium-retro before
 *  stopping). Prints nothing otherwise. NEVER throws — a broken gate must never
 *  wedge the stop flow. */
export async function retroGateCmd(): Promise<void> {
  try {
    // Hooks always pipe JSON; guard against an interactive TTY so a manual run
    // can't hang on a blocking stdin read.
    if (process.stdin.isTTY) return;
    let raw = "";
    try { raw = readFileSync(0, "utf8"); } catch { return; }
    const evt: StopEvent = raw.trim() ? JSON.parse(raw) : {};
    if (evt.stop_hook_active) return;
    const tp = evt.transcript_path;
    if (!tp || !existsSync(tp)) return;
    const rows: Row[] = readFileSync(tp, "utf8")
      .split("\n").filter(Boolean)
      .map((l) => { try { return JSON.parse(l) as Row; } catch { return null; } })
      .filter((x): x is Row => x !== null);
    const decision = decideRetroGate(evt, rows);
    if (decision.block) {
      process.stdout.write(JSON.stringify({ decision: "block", reason: decision.reason }) + "\n");
    }
  } catch {
    /* never break the stop flow */
  }
}
