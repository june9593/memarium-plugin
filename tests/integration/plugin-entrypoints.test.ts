import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const skills = ["memarium", "memarium-context", "memarium-recall", "memarium-retro"];
const skillText = (name: string) => readFileSync(join(repo, "skills", name, "SKILL.md"), "utf8");

describe("plugin skill entrypoints", () => {
  let home: string;
  beforeEach(() => { home = mkdtempSync(join(tmpdir(), "memarium-skill-contract-")); });
  afterEach(() => { rmSync(home, { recursive: true, force: true }); });
  function binary(root: string) {
    const path = join(root, "bin", "memarium-plugin.js");
    mkdirSync(join(root, "bin"), { recursive: true });
    writeFileSync(path, "#!/bin/sh\nprintf 'fixture-version\\n'\n", { mode: 0o755 });
    return path;
  }
  function discover(name: string, args: string[], root?: string, raw = false) {
    const text = skillText(name);
    let script = text.match(/```bash\n([\s\S]*?)```/)![1]!;
    if (!raw) script = script.replaceAll("${CLAUDE_PLUGIN_ROOT}", root ?? "").replace(/\$(\d+)\b/g, (_, n) => args[Number(n)] ?? "");
    const env = { ...process.env, HOME: home, MEMARIUM_DIR: join(home, "memory-home") };
    delete env.CLAUDE_PLUGIN_ROOT; delete env.VBP;
    const run = spawnSync("bash", ["--noprofile", "--norc", "-c", script + '\nprintf "\\nBIN:%s\\n" "$VBP"'], { env, encoding: "utf8", timeout: 5000 });
    expect(run.error).toBeUndefined();
    return run.stdout.match(/\nBIN:(.*)/)?.[1] ?? "";
  }
  it("registers each canonical skill once, without a self-forwarding command", () => {
    const commands = join(repo, "commands");
    const names = existsSync(commands) ? readdirSync(commands).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)) : [];
    expect(names.filter((n) => skills.includes(n))).toEqual([]);
    expect(JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).files).not.toContain("commands/");
    for (const name of skills) {
      expect(skillText(name)).toContain(`name: ${name}\n`);
      expect(skillText(name)).not.toMatch(/(?<!\\)\$\d+\b/);
    }
  });
  for (const name of skills) {
    it(`${name}: prefers the rendered plugin root over newer cache versions`, () => {
      const selected = join(home, "selected plugin");
      const expected = binary(selected);
      binary(join(home, ".claude/plugins/cache/z-market/memarium/99.0.0"));
      expect(discover(name, ["Diagnose", "test"], selected)).toBe(expected);
    });
    it(`${name}: fallback survives arguments, empty args and raw source`, () => {
      binary(join(home, ".claude/plugins/cache/z-market/memarium/0.9.0"));
      const expected = binary(join(home, ".claude/plugins/cache/a market/memarium/0.22.0"));
      expect(discover(name, ["Diagnose"])).toBe(expected);
      expect(discover(name, [])).toBe(expected);
      expect(discover(name, [], undefined, true)).toBe(expected);
    });
    it(`${name}: no install does not resolve an unrelated executable`, () => {
      expect(discover(name, ["Diagnose"])).toBe("");
    });
  }
  it("emits qualified Skill IDs from the automatic primer hook", () => {
    const selected = join(home, "selected plugin");
    binary(selected);
    const run = spawnSync("bash", [join(repo, "hooks/session-start.sh")], {
      cwd: home, encoding: "utf8", timeout: 5000,
      env: { ...process.env, HOME: home, MEMARIUM_DIR: join(home, "memory-home"), CLAUDE_PLUGIN_ROOT: selected },
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('skill: "memarium:memarium-recall"');
    expect(run.stdout).toContain('skill: "memarium:memarium-context"');
  });

});
