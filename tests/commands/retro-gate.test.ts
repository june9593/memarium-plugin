import { describe, it, expect } from "vitest";
import { decideRetroGate, RETRO_REASON } from "../../src/commands/retro-gate.js";

// Transcript-row helpers (mirror the Claude Code session JSONL shape).
const userText = (t: string) => ({ message: { role: "user", content: [{ type: "text", text: t }] } });
const toolResult = () => ({ message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } });
const toolUse = (name: string, input: Record<string, unknown> = {}) => ({
  message: { role: "assistant", content: [{ type: "tool_use", name, input }] },
});
const asstText = (t: string) => ({ message: { role: "assistant", content: [{ type: "text", text: t }] } });

describe("decideRetroGate", () => {
  it("loop guard: never blocks when stop_hook_active is true", () => {
    const rows = [userText("do a thing"), toolUse("Edit", { file_path: "a.ts" })];
    expect(decideRetroGate({ stop_hook_active: true }, rows).block).toBe(false);
  });

  it("blocks + returns the retro reason when the turn used a mutation tool", () => {
    const rows = [userText("fix the bug"), toolUse("Edit", { file_path: "a.ts" }), asstText("done")];
    const d = decideRetroGate({}, rows);
    expect(d.block).toBe(true);
    expect(d.reason).toBe(RETRO_REASON);
  });

  // Regression lock: the reason is fed to the model as the thing to DO, so it must
  // name the skill exactly as the Skill tool registers it. Plugin skills register
  // as `<plugin>:<skill>`, so instructing the BARE name made every agent that
  // followed this nudge fail with `Unknown skill: memarium-retro`.
  //
  // Check the two prohibited forms EXPLICITLY rather than with a clever regex: the
  // first version of this test used a negative lookahead `(?!")` that skipped the
  // very form it claimed to forbid (`skill: "memarium-retro"` — the id IS followed
  // by a quote), so that assertion was dead while the test still went green. Each
  // assertion below is verified to fail on its own violating input.
  it("names the plugin-prefixed skill id, never the bare name", () => {
    expect(RETRO_REASON).toContain('skill: "memarium:memarium-retro"');
    // bare quoted id — what an agent would copy into the Skill tool and fail with
    expect(RETRO_REASON).not.toContain('skill: "memarium-retro"');
    // slash form — a valid SLASH COMMAND but not a valid Skill-tool id, so naming
    // it here leaves the agent guessing which mechanism is meant
    expect(RETRO_REASON).not.toContain("/memarium-retro");
  });

  it("blocks on Write / NotebookEdit / MultiEdit too", () => {
    for (const tool of ["Write", "NotebookEdit", "MultiEdit"]) {
      const rows = [userText("q"), toolUse(tool, { file_path: "x" })];
      expect(decideRetroGate({}, rows).block).toBe(true);
    }
  });

  it("does NOT block a pure Q&A / read-only turn (no mutation)", () => {
    const rows = [userText("how does X work?"), toolUse("Read", { file_path: "a.ts" }), asstText("it works like...")];
    expect(decideRetroGate({}, rows).block).toBe(false);
  });

  it("does NOT block when a retro already ran this turn (Skill memarium-retro)", () => {
    const rows = [
      userText("fix + capture"),
      toolUse("Edit", { file_path: "a.ts" }),
      toolUse("Skill", { skill: "memarium:memarium-retro" }),
    ];
    expect(decideRetroGate({}, rows).block).toBe(false);
  });

  it("does NOT block when memory-write / memory-propose already ran this turn", () => {
    for (const cmd of ["node $VBP memory-write --input /tmp/x.json", "$VBP memory-propose --input /tmp/y.json"]) {
      const rows = [userText("fix + capture"), toolUse("Edit", { file_path: "a.ts" }), toolUse("Bash", { command: cmd })];
      expect(decideRetroGate({}, rows).block).toBe(false);
    }
  });

  it("scopes to the CURRENT turn: a mutation in a PRIOR turn does not count", () => {
    const rows = [
      userText("turn 1: edit"),
      toolUse("Edit", { file_path: "a.ts" }),   // prior turn's work
      asstText("edited"),
      userText("turn 2: just a question"),        // new human turn
      toolUse("Read", { file_path: "a.ts" }),
      asstText("here's the answer"),
    ];
    expect(decideRetroGate({}, rows).block).toBe(false);
  });

  it("counts mutations even across tool_result-only user records within the turn", () => {
    const rows = [
      userText("fix it"),
      toolUse("Bash", { command: "npm test" }),
      toolResult(),                                // tool_result-only user record — NOT a new turn
      toolUse("Edit", { file_path: "a.ts" }),
    ];
    expect(decideRetroGate({}, rows).block).toBe(true);
  });

  it("no rows / no user message → no block", () => {
    expect(decideRetroGate({}, []).block).toBe(false);
  });

  it("ignores isMeta pseudo-user rows so an injected skill body can't move the turn boundary past a mutation", () => {
    // Real turn: user asks → agent edits → a skill fires, injecting its body as
    // an isMeta role:"user" row. That injected row must NOT be treated as a new
    // human turn, or the earlier Edit falls outside the scanned slice.
    const injectedSkillBody = {
      isMeta: true,
      message: { role: "user", content: [{ type: "text", text: "Invoke the ... skill via the Skill tool ..." }] },
    };
    const rows = [
      userText("fix the bug and note it"),
      toolUse("Edit", { file_path: "a.ts" }),
      injectedSkillBody,
      toolUse("Bash", { command: "some-other-skill-cli run" }),
    ];
    expect(decideRetroGate({}, rows).block).toBe(true);
  });
});
