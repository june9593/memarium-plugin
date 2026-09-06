import { describe, it, expect } from "vitest";
import { decideRetroGate, RETRO_REASON } from "../../src/commands/retro-gate.js";

const user = (text = "fix the sample") => ({ message: { role: "user", content: [{ type: "text", text }] } });
const call = (id: string, name: string, input: Record<string, unknown> = {}) => ({
  message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] },
});
const result = (id: string, opts: { error?: boolean; stdout?: string; meta?: unknown } = {}) => ({
  message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, is_error: opts.error ?? false, content: opts.stdout ?? "ok" }] },
  toolUseResult: opts.meta ?? { stdout: opts.stdout ?? "ok", stderr: "", interrupted: false },
});
const edit = () => [call("edit", "Edit", { file_path: "sample.ts" }), result("edit")];
const bash = (command: string, opts: Parameters<typeof result>[1] = {}) => [call("bash", "Bash", { command }), result("bash", opts)];
const block = (rows: any[], event = {}) => decideRetroGate(event, rows).block;
const receipt = JSON.stringify({ written: 1, superseded: 0, paths: ["memory/semantic/demo/example.md"] });

describe("decideRetroGate", () => {
  it("keeps the loop guard and exact qualified skill instruction", () => {
    expect(block([user(), ...edit()], { stop_hook_active: true })).toBe(false);
    expect(decideRetroGate({}, [user(), ...edit()]).reason).toBe(RETRO_REASON);
    expect(RETRO_REASON).toContain('skill: "memarium:memarium-retro"');
    expect(RETRO_REASON).not.toContain('skill: "memarium-retro"');
  });
  it.each(["Edit", "Write", "NotebookEdit", "MultiEdit"])("counts completed %s", (name) => {
    expect(block([user(), call("e", name), result("e")])).toBe(true);
  });
  it.each(["Edit", "Write", "NotebookEdit", "MultiEdit"])("does not count failed %s", (name) => {
    expect(block([user(), call("e", name), result("e", { error: true })])).toBe(false);
  });
  it("does not infer completion from a missing or unrelated result", () => {
    expect(block([user(), call("e", "Edit")])).toBe(false);
    expect(block([user(), call("e", "Edit"), result("other")])).toBe(false);
  });
  it("correlates parallel results by id instead of position", () => {
    const rows = [user(), call("read", "Read"), call("e", "Edit"), result("e", { error: true }), result("read")];
    expect(block(rows)).toBe(false);
    expect(block([...rows, result("e")])).toBe(true);
  });
  it("skips read-only, empty, and prior-turn activity", () => {
    expect(block([])).toBe(false);
    expect(block([user(), ...bash("git status --short")])).toBe(false);
    expect(block([user(), ...edit(), user("explain this"), call("r", "Read"), result("r")])).toBe(false);
  });
  it("ignores isMeta pseudo-turns and preserves mutations across tool results", () => {
    expect(block([user(), ...edit(), { ...user("skill body"), isMeta: true }, ...bash("npm test")])).toBe(true);
    expect(block([user(), { ...call("e", "Edit"), isMeta: true }, result("e")])).toBe(false);
  });
  it.each([
    "git -C /tmp/demo commit -m fix",
    "cat > sample.ts <<'EOF'\nnew content\nEOF",
    "sed -i '' 's/old/new/' sample.ts",
    "python3 - <<'PY'\nfrom pathlib import Path\nfor p in [Path('a.ts'), Path('b.ts')]:\n    s = p.read_text().replace('old', 'new')\n    p.write_text(s)\nPY",
  ])("nudges on completed Bash mutation evidence: %s", (command) => {
    expect(block([user(), ...bash(command)])).toBe(true);
  });
  it("does not lose a possible write when later tests fail", () => {
    expect(block([user(), ...bash("python3 -c \"open('x', 'w').write('new')\"\nnpm test", { error: true })])).toBe(true);
    expect(block([user(), ...bash("npm test && python3 -c \"open('x', 'w').write('new')\"", { error: true })])).toBe(false);
    expect(block([user(), ...bash("npm test", { error: true })])).toBe(false);
  });
  it("uses optional confirmed commit metadata even after a later failure", () => {
    const meta = { interrupted: false, gitOperation: { commit: { kind: "committed", sha: "a".repeat(40), branch: "work" } } };
    expect(block([user(), ...bash("git commit -m fix && git push", { error: true, meta })])).toBe(true);
  });
  it("never treats a background launch as completed work", () => {
    expect(block([user(), ...bash("cat > sample.ts", { meta: { backgroundTaskId: "task-1", stdout: "launched" } })])).toBe(false);
    expect(block([user(), call("bash", "Bash", { command: "cat > sample.ts", run_in_background: true })])).toBe(false);
  });
  it("does not attach ambiguous row metadata to multiple results", () => {
    const both = { message: { role: "user", content: [
      { type: "tool_result", tool_use_id: "r", is_error: false, content: "ok" },
      { type: "tool_result", tool_use_id: "b", is_error: false, content: "ok" },
    ] }, toolUseResult: { gitOperation: { commit: { kind: "committed", sha: "a".repeat(40) } } } };
    expect(block([user(), call("r", "Read"), call("b", "Bash", { command: "npm test" }), both])).toBe(false);
  });
  it("counts successful exact retro loading as prompted, not forced persistence", () => {
    expect(block([user(), ...edit(), call("s", "Skill", { skill: "memarium:memarium-retro" }), result("s", { meta: { success: true, commandName: "memarium:memarium-retro" } })])).toBe(false);
  });
  it("does not suppress for failed, unfinished, or similarly named skills", () => {
    expect(block([user(), ...edit(), call("s", "Skill", { skill: "memarium:memarium-retro" })])).toBe(true);
    expect(block([user(), ...edit(), call("s", "Skill", { skill: "memarium:memarium-retro" }), result("s", { error: true, meta: { success: false } })])).toBe(true);
    expect(block([user(), ...edit(), call("s", "Skill", { skill: "other:memarium-retro-example" }), result("s")])).toBe(true);
  });
  it("honors explicit user refusal instead of automatically retrying retro", () => {
    for (const [name, input] of [
      ["Skill", { skill: "memarium:memarium-retro" }],
      ["Bash", { command: '"$VBP" memory-write --input draft.json' }],
    ] as const) {
      expect(block([user(), ...edit(), call("s", name, input), result("s", { error: true, stdout: "The user doesn't want to proceed with this tool use. The tool use was rejected." })])).toBe(false);
    }
    expect(block([user(), ...bash("cat > x", { error: true, stdout: "User denied this tool use." })])).toBe(false);
  });
  it("requires an actual writer invocation plus a positive receipt", () => {
    expect(block([user(), ...edit(), ...bash('node "$VBP" memory-write --input draft.json', { stdout: receipt })])).toBe(false);
    expect(block([user(), ...edit(), ...bash('"$VBP" memory-propose --input draft.json', { stdout: JSON.stringify({ proposed: 1, paths: ["queue/x.json"], targetKeys: ["semantic:demo:x"], proposedEntryIds: ["semantic/demo/x"] }) })])).toBe(false);
    expect(block([user(), ...edit(), ...bash('"$VBP" memory-write --input draft.json; false', { error: true, stdout: receipt })])).toBe(false);
  });
  it.each([
    ['grep "memory-write" source.ts', receipt],
    ['echo memory-propose', "ok"],
    ['"$VBP" memory-write --help', receipt],
    ['"$VBP" memory-write --input draft.json', JSON.stringify({ written: 0, paths: [] })],
    ['"$VBP" memory-write --input draft.json', "use memory-propose instead"],
  ])("does not accept mentions/help/empty reports as capture: %s", (command, stdout) => {
    expect(block([user(), ...edit(), ...bash(command, { stdout })])).toBe(true);
  });
  it("does not mistake a launcher exit code for background job completion", () => {
    expect(block([user(), ...bash("cat > x", { meta: { backgroundTaskId: "task-1", exitCode: 0 } })])).toBe(false);
    expect(block([user(), call("b", "Bash", { command: "cat > x", run_in_background: true }), result("b", { meta: { backgroundTaskId: "task-1" } }), result("b", { meta: { exitCode: 0 } })])).toBe(true);
  });
  it("recognizes user denial in a text-block result even when stdout is empty", () => {
    const denial = { message: { role: "user", content: [{ type: "tool_result", tool_use_id: "s", is_error: true, content: [{ type: "text", text: "User denied this tool use." }] }] }, toolUseResult: { stdout: "" } };
    expect(block([user(), ...edit(), call("s", "Skill", { skill: "memarium:memarium-retro" }), denial])).toBe(false);
  });

  it("respects capture refusal even when the requested command was backgrounded", () => {
    const denied = result("capture", { error: true, stdout: "The tool use was rejected. User denied this tool use." });
    expect(block([user(), ...edit(), call("capture", "Bash", { command: '"$VBP" memory-write --input draft.json', run_in_background: true }), denied])).toBe(false);
  });

});
