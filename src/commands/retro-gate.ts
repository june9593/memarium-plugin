import { readFileSync, existsSync, openSync, fstatSync, readSync, closeSync } from "node:fs";
import { analyzeBash, type RetroCommand } from "./retro-evidence.js";

/** The Stop-hook event JSON Claude Code pipes to the hook on stdin. */
export interface StopEvent {
  stop_hook_active?: boolean;
  transcript_path?: string;
}

interface Row {
  isMeta?: boolean;
  message?: { role?: string; content?: unknown };
  role?: string;
  content?: unknown;
  toolUseResult?: unknown;
}
interface Call { name: string; input: Record<string, unknown> }
interface Result { error: boolean; content: unknown; meta: Record<string, unknown> }
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** One advisory continuation, not a requirement to persist a memory. */
export const RETRO_REASON =
  "This turn may have changed files. Before you stop, check whether it produced " +
  "ONE reusable insight: invoke the Skill tool with " +
  'skill: "memarium:memarium-retro" and follow its fact-hygiene and dedup steps. ' +
  "If nothing is durably reusable, or it is already captured, say so briefly " +
  "and stop; never manufacture a memory for this hook. Respect any user refusal " +
  "of recall/capture and do not retry a denied operation. Proposals still require human approval.";

const MUTATION_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
const RETRO_SKILL = "memarium:memarium-retro";

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((b) => record(b).text).filter((s) => typeof s === "string").join("\n");
  return "";
}
function outputText(result: Result): string {
  return typeof result.meta.stdout === "string" ? result.meta.stdout : contentText(result.content);
}
function exitCode(result: Result): number | undefined {
  for (const key of ["exitCode", "exit_code", "returnCode", "return_code"]) {
    const value = result.meta[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}
function successful(result: Result): boolean {
  return !result.error && !result.meta.interrupted && !result.meta.error && result.meta.success !== false &&
    !["failed", "error", "cancelled", "canceled"].includes((typeof result.meta.status === "string" ? result.meta.status.toLowerCase() : "")) && (exitCode(result) ?? 0) === 0;
}
function launchOnly(call: Call, result: Result): boolean {
  const terminalState = ["completed", "failed", "cancelled", "canceled"].includes((typeof result.meta.status === "string" ? result.meta.status.toLowerCase() : ""));
  // A launcher's exitCode=0 does not mean its background job has finished.
  if (result.meta.backgroundTaskId) return !terminalState;
  return Boolean(call.input.run_in_background) && !terminalState && exitCode(result) === undefined;
}
function declined(result: Result): boolean {
  if (result.meta.denied === true || result.meta.permissionDenied === true) return true;
  if (!result.error && !result.meta.interrupted) return false;
  const text = [outputText(result), contentText(result.content), result.meta.stderr, result.meta.message].filter((s) => typeof s === "string").join("\n");
  return /user (?:denied|declined|rejected|cancelled|canceled)|user doesn't want to proceed|tool use was rejected|request interrupted by user/i.test(text);
}
function captureReceipt(result: Result, kinds: RetroCommand[]): boolean {
  let report: Record<string, unknown>;
  try { report = record(JSON.parse(outputText(result))); } catch { return false; }
  const strings = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.length > 0);
  if (!strings(report.paths)) return false;
  if (kinds.includes("memory-write") && Number.isSafeInteger(report.written) && Number(report.written) > 0 &&
      Number.isSafeInteger(report.superseded) && Number(report.superseded) >= 0) return true;
  return kinds.includes("memory-propose") && Number.isSafeInteger(report.proposed) && Number(report.proposed) > 0 &&
    strings(report.targetKeys) && strings(report.proposedEntryIds);
}
function committed(result: Result): boolean {
  const commit = record(record(result.meta.gitOperation).commit);
  return commit.kind === "committed" && typeof commit.sha === "string" && /^[a-f0-9]{40,64}$/i.test(commit.sha);
}

/** Pure, bounded, current-turn assessment. Missing result pairs are unknown;
 * successful Skill loading means "already prompted", not "memory saved". */
export function decideRetroGate(evt: StopEvent, rows: Row[]): { block: boolean; reason?: string } {
  if (evt.stop_hook_active) return { block: false };
  let lastUser = -1;
  rows.forEach((row, i) => {
    if (row.isMeta) return;
    const msg = row.message ?? row;
    if (msg.role !== "user") return;
    const c = msg.content;
    const toolResultOnly = Array.isArray(c) && c.length > 0 && c.every((b) => record(b).type === "tool_result");
    if (!toolResultOnly) lastUser = i;
  });

  const calls = new Map<string, Call>();
  const results = new Map<string, Result>();
  for (const row of rows.slice(lastUser + 1)) {
    if (row.isMeta) continue;
    const msg = row.message ?? row;
    if (!Array.isArray(msg.content)) continue;
    const blocks = msg.content.map(record);
    const resultBlocks = blocks.filter((b) => b.type === "tool_result");
    for (const b of blocks) {
      if (msg.role === "assistant" && b.type === "tool_use" && typeof b.id === "string" && typeof b.name === "string") {
        calls.set(b.id, { name: b.name, input: record(b.input) });
      }
      if (msg.role === "user" && b.type === "tool_result" && typeof b.tool_use_id === "string") {
        // Row metadata has no ID of its own. Don't attach it to parallel results.
        results.set(b.tool_use_id, { error: b.is_error === true, content: b.content, meta: resultBlocks.length === 1 ? record(row.toolUseResult) : {} });
      }
    }
  }

  let mutation = false, alreadyPrompted = false, captured = false, captureDeclined = false;
  for (const [id, call] of calls) {
    const result = results.get(id);
    if (!result) continue;
    const isRetro = call.name === "Skill" && call.input.skill === RETRO_SKILL;
    const command = typeof call.input.command === "string" ? call.input.command : "";
    const intent = call.name === "Bash" ? analyzeBash(command, true) : { mutation: false, retro: [] };
    const captureIntent = isRetro || intent.retro.length > 0;
    // Refusal is not a launch/completion state: honor it before that filter.
    if (declined(result) || (captureIntent && result.meta.interrupted)) {
      if (captureIntent) captureDeclined = true;
      continue;
    }
    if (launchOnly(call, result)) continue;
    const ok = successful(result);
    const bash = call.name === "Bash" && !ok ? analyzeBash(command, false) : intent;
    if (MUTATION_TOOLS.has(call.name) && ok) mutation = true;
    if (isRetro && ok) alreadyPrompted = true;
    if (call.name === "Bash") {
      // A commit/write can precede failing tests or a failing push. Overall
      // failure does not erase affirmative receipts or bounded write evidence.
      mutation ||= committed(result) || bash.mutation;
      captured ||= captureReceipt(result, bash.retro);
    }
  }
  return mutation && !alreadyPrompted && !captured && !captureDeclined
    ? { block: true, reason: RETRO_REASON } : { block: false };
}

/** Read at most the last `cap` bytes of a file as complete lines. Bounds the
 *  per-Stop cost to the current turn's tail instead of re-reading the whole
 *  transcript every turn (which is O(total size) per turn, O(n²) over a long
 *  session). Drops the first, possibly-partial, line when the read didn't start
 *  at byte 0. A long turn can exceed the cap; missing call/result pairs remain
 *  unknown rather than making the per-Stop cost grow with the whole session. */
function readTailLines(path: string, cap: number): string[] {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = size > cap ? size - cap : 0;
    const len = size - start;
    if (len <= 0) return [];
    const buf = Buffer.allocUnsafe(len);
    readSync(fd, buf, 0, len, start);
    const lines = buf.toString("utf8").split("\n");
    if (start > 0) lines.shift();
    return lines.filter(Boolean);
  } finally {
    closeSync(fd);
  }
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
    // Tail-read: bound the per-turn cost to ~1 MiB, not the whole transcript.
    const rows: Row[] = readTailLines(tp, 1024 * 1024)
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
