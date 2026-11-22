import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { HOOK_PRIMER_MAX_CHARS, renderPrimer } from "../../src/memory/primer.js";
import type { MemoryEntry, MemoryType } from "../../src/memory/types.js";

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

  it("packaged SessionStart hook packs an over-limit store under the host limit and keeps entries that fit", () => {
    const root = realpathSync(home);
    const project = join(root, "work");
    const memHome = join(root, ".memarium");
    const store = join(memHome, "session-repo");
    mkdirSync(project);
    mkdirSync(join(store, ".memarium"), { recursive: true });
    writeFileSync(join(store, ".memarium/index.json"), JSON.stringify({ version: 1, entries: { "claude:t": {
      sessionId: "t", shortId: "t", tool: "claude", project: "demo", projectRaw: project,
      startedAt: "2026-06-01T00:00:00Z", endedAt: "2026-06-01T00:00:00Z", nameSlug: "x", displayName: "x",
      relativePath: "raw_sessions/claude/demo/2026-06-01/x__t.md", sourcePath: "/t", sourceMtimeMs: 1, sourceSha256: "x" } } }));
    const entries: Record<string, MemoryEntry> = {};
    const add = (type: MemoryType, slug: string, title: string, summary: string, importance: number) => {
      const project_ = type === "core" ? null : "demo";
      const id = `${type}/${project_ ?? "_global"}/${slug}`;
      entries[id] = { id, type, scope: project_ ? "project:demo" : "global", project: project_, title, summary,
        path: `memory/${id}.md`, status: "active", confidence: 1, importance, createdAt: "2026-06-01",
        updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [],
        sourceFiles: [], supersedes: null, entities: [], trust: "trusted", originDevice: null,
        accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null };
    };
    for (let i = 0; i < 3; i++) add("core", `c${i}`, `core rule ${i}`, "rule detail ".repeat(292), 9 - i);
    for (let i = 0; i < 12; i++) add("procedural", `p${i}`, `procedure ${i}`, "PROC-SUMMARY", 5);
    for (let i = 0; i < 12; i++) add("semantic", `f${i}`, `fact ${i}`, "FACT-SUMMARY", 5);
    writeFileSync(join(store, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries }));
    // Without the ceiling, even the compact primer is over Claude Code's limit.
    expect(renderPrimer("demo", Object.values(entries), { compact: true }).length).toBeGreaterThan(10_000);

    const run = spawnSync("bash", [join(repo, "hooks/session-start.sh")], {
      cwd: project, encoding: "utf8", timeout: 10000,
      env: { ...process.env, HOME: root, MEMARIUM_DIR: memHome, CLAUDE_PLUGIN_ROOT: repo },
    });
    expect(run.status).toBe(0);
    expect(run.stdout.length).toBeLessThanOrEqual(10_000);
    for (let i = 0; i < 3; i++) expect(run.stdout).toContain(`**core rule ${i}**`);
    expect(run.stdout).toContain("- **procedure 0**");
    expect(run.stdout).toContain("- **fact 0**");
  });

  it("keeps the whole SessionStart hook output under Claude Code's 10,000-character limit at the primer ceiling", () => {
    const root = join(home, "budget plugin");
    mkdirSync(join(root, "bin"), { recursive: true });
    writeFileSync(join(root, "bin", "memarium-plugin.js"),
      `#!/bin/sh\nhead -c ${HOOK_PRIMER_MAX_CHARS} /dev/zero | tr '\\0' x\n`, { mode: 0o755 });
    const run = spawnSync("bash", [join(repo, "hooks/session-start.sh")], {
      cwd: home, encoding: "utf8", timeout: 5000,
      env: { ...process.env, HOME: home, MEMARIUM_DIR: join(home, "memory-home"), CLAUDE_PLUGIN_ROOT: root },
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("x".repeat(HOOK_PRIMER_MAX_CHARS));
    expect(run.stdout.length).toBeLessThanOrEqual(10_000);
  });

});
