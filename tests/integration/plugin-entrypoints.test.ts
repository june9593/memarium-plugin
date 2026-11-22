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

  function memoryEntry(type: MemoryType, slug: string, title: string, summary: string, importance: number): MemoryEntry {
    const project = type === "core" ? null : "demo";
    const id = `${type}/${project ?? "_global"}/${slug}`;
    return { id, type, scope: project ? "project:demo" : "global", project, title, summary,
      path: `memory/${id}.md`, status: "active", confidence: 1, importance, createdAt: "2026-06-01",
      updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [],
      sourceFiles: [], supersedes: null, entities: [], trust: "trusted", originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null };
  }
  /** Run the packaged SessionStart hook against a sandboxed store holding `entries`
   *  (and a Markdown body for each id in `bodies`), from a cwd mapped to "demo". */
  function runPrimerHook(entries: MemoryEntry[], bodies: Record<string, string> = {}) {
    const root = realpathSync(home);
    const project = join(root, "work");
    const memHome = join(root, ".memarium");
    const store = join(memHome, "session-repo");
    mkdirSync(project, { recursive: true });
    mkdirSync(join(store, ".memarium"), { recursive: true });
    writeFileSync(join(store, ".memarium/index.json"), JSON.stringify({ version: 1, entries: { "claude:t": {
      sessionId: "t", shortId: "t", tool: "claude", project: "demo", projectRaw: project,
      startedAt: "2026-06-01T00:00:00Z", endedAt: "2026-06-01T00:00:00Z", nameSlug: "x", displayName: "x",
      relativePath: "raw_sessions/claude/demo/2026-06-01/x__t.md", sourcePath: "/t", sourceMtimeMs: 1, sourceSha256: "x" } } }));
    writeFileSync(join(store, ".memarium/index.memory.json"),
      JSON.stringify({ version: 1, entries: Object.fromEntries(entries.map((e) => [e.id, e])) }));
    for (const e of entries) {
      if (bodies[e.id] === undefined) continue;
      const dir = join(store, "memory", e.type, e.project ?? "_global");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${e.id.split("/").pop()}.md`), `---\nid: ${e.id}\ntype: ${e.type}\n---\n\n# ${e.title}\n\n${bodies[e.id]}\n`);
    }
    return spawnSync("bash", [join(repo, "hooks/session-start.sh")], {
      cwd: project, encoding: "utf8", timeout: 10000,
      env: { ...process.env, HOME: root, MEMARIUM_DIR: memHome, CLAUDE_PLUGIN_ROOT: repo },
    });
  }

  it("packaged SessionStart hook loads a core rule's full body", () => {
    const rule = memoryEntry("core", "body-rule", "Body rule", "short summary", 9);
    const run = runPrimerHook([rule, memoryEntry("procedural", "p0", "procedure 0", "PROC-SUMMARY", 5)],
      { [rule.id]: "# Only in rehearsal\n\nCORE-BODY-ONLY-MARKER: use draft mode." });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("- **Body rule**\n\n  # Only in rehearsal\n\n  CORE-BODY-ONLY-MARKER: use draft mode.");
    expect(run.stdout).not.toContain("short summary");
    expect(run.stdout).toContain("- **procedure 0**");
  });

  it("packaged SessionStart hook packs an over-limit store under the host limit and keeps entries that fit", () => {
    const entries = [
      ...Array.from({ length: 3 }, (_, i) => memoryEntry("core", `c${i}`, `core rule ${i}`, "rule detail ".repeat(292), 9 - i)),
      ...Array.from({ length: 12 }, (_, i) => memoryEntry("procedural", `p${i}`, `procedure ${i}`, "PROC-SUMMARY", 5)),
      ...Array.from({ length: 12 }, (_, i) => memoryEntry("semantic", `f${i}`, `fact ${i}`, "FACT-SUMMARY", 5)),
    ];
    // Without the ceiling, even the compact primer is over Claude Code's limit.
    expect(renderPrimer("demo", entries, { compact: true }).length).toBeGreaterThan(10_000);

    const run = runPrimerHook(entries);
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
