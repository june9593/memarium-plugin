#!/usr/bin/env node
// Plugin-internal CLI. NOT installed on user PATH; invoked by skills via
//   ${CLAUDE_PLUGIN_ROOT}/bin/memarium-plugin.js <subcommand>
//
// The shape mirrors the subcommands the /memarium and /memarium-recall skills
// used to call on the npm `memarium` binary, so SKILL.md changes are minimal
// (T6 just rewrites the binary name + path).

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const rel of ["../package.json", "../../package.json", "../../../package.json"]) {
    try {
      return JSON.parse(readFileSync(resolve(here, rel), "utf8")).version as string;
    } catch { /* try next */ }
  }
  return "0.0.0-unknown";
}

export async function run(argv: string[]) {
  const program = new Command();
  program
    .name("memarium-plugin")
    .description("Memarium Claude Code plugin internal CLI (invoked by skills, not by users)")
    .version(readPackageVersion(), "-v, --version", "print the installed plugin version");

  program
    .command("list-projects")
    .description("List projects with pending sessions in the spool. Used by /memarium to detect mode.")
    .action(async () => {
      const { listProjectsCmd } = await import("./commands/list-projects.js");
      await listProjectsCmd();
    });

  program
    .command("status")
    .description("Digest coverage: synced sessions vs digested vs pending, plus episode + memory (typed / entities / Q&A) layer counts.")
    .action(async () => {
      const { statusCmd } = await import("./commands/status.js");
      await statusCmd();
    });

  program
    .command("prepare")
    .description("Emit the JSON payload of new sessions for the /memarium skill to digest.")
    .option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())")
    .option("--project <slug>", "force a specific project slug")
    .action(async (opts: { cwd?: string; project?: string }) => {
      const { prepareCmd } = await import("./commands/prepare.js");
      await prepareCmd({ cwd: opts.cwd, project: opts.project });
    });

  program.command("finalize")
    .description("Ensure the session-repo is a git repo, commit all plugin-written paths (raw_sessions/memory/index), and push if a remote is configured. Never stages foreign files.")
    .option("--no-push", "commit locally only; never push even if a remote is configured")
    .action(async (o: { push?: boolean }) => {
      const { finalizeCmd } = await import("./commands/finalize.js");
      const r = await finalizeCmd({ noPush: o.push === false });
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    });

  program
    .command("memory-write")
    .description("Write typed-memory .md files + update the memory index from an agent JSON payload.")
    .option("--input <path>", "path to memory entries JSON")
    .action(async (opts: { input?: string }) => {
      const { memoryWriteCmd } = await import("./commands/memory-write.js");
      const report = await memoryWriteCmd({ inputPath: opts.input });
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    });

  program
    .command("memory-index")
    .description("Rebuild .memarium/index.memory.json from the memory/ markdown files.")
    .action(async () => {
      const { memoryIndexCmd } = await import("./commands/memory-index.js");
      const report = await memoryIndexCmd();
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    });

  program
    .command("skip-write")
    .description("Record intentionally-not-digested sessions in the local skip ledger (.memarium/index.skips.json) so the digest doesn't re-propose them. --input JSON: [{sessionId,reason?}] or {sessions:[...]}.")
    .requiredOption("--input <path>", "path to skip entries JSON (required)")
    .action(async (opts: { input?: string }) => {
      const { skipWriteCmd } = await import("./commands/skip-write.js");
      const report = await skipWriteCmd({ inputPath: opts.input });
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    });

  program
    .command("memory-query")
    .description("Load typed memory for the cwd's project and emit layered context (Core/Procedures/Semantic/Episodes/Conflicts) + primer.")
    .option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())")
    .option("--type <type>", "filter by memory type")
    .option("--q <text>", "free-text query")
    .action(async (opts: { cwd?: string; type?: string; q?: string }) => {
      const { memoryQueryCmd } = await import("./commands/memory-query.js");
      await memoryQueryCmd({ cwd: opts.cwd, type: opts.type, q: opts.q });
    });

  program
    .command("memory-primer")
    .description("Read-only: print the cwd project's primer markdown (used by the SessionStart hook). Never writes, always exits 0.")
    .option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())")
    .action(async (opts: { cwd?: string }) => {
      const { memoryPrimerCmd } = await import("./commands/memory-primer.js");
      await memoryPrimerCmd({ cwd: opts.cwd });
    });

  program
    .command("retro-gate")
    .description("Read-only: reads the Stop-hook event JSON on stdin and, only when the just-finished turn changed files (and hasn't already retro'd), prints a {decision:block} JSON that makes the agent run /memarium-retro before stopping. Backs the Stop hook. Never writes, never throws.")
    .action(async () => {
      const { retroGateCmd } = await import("./commands/retro-gate.js");
      await retroGateCmd();
    });

  program.command("entity-write")
    .description("Write entity-wiki .md pages + update .memarium/index.entity.json from an agent JSON payload.")
    .option("--input <path>", "path to entity pages JSON")
    .action(async (o: { input?: string }) => {
      const { entityWriteCmd } = await import("./commands/entity-write.js");
      const r = await entityWriteCmd({ inputPath: o.input });
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    });

  program.command("entity-index")
    .description("Rebuild .memarium/index.entity.json from memory/entities/ markdown.")
    .action(async () => {
      const { entityIndexCmd } = await import("./commands/entity-index.js");
      const r = await entityIndexCmd();
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    });

  program.command("entity-query")
    .description("Load entity wiki for the cwd's project, score, and emit ranked entities. --entity <name> adds a reverse lookup of memories referencing it (for digest authoring).")
    .option("--cwd <path>", "treat this dir as cwd (default process.cwd())")
    .option("--q <text>", "free-text query")
    .option("--kind <kind>", "filter by entity kind (file|symbol|api|concept|person)")
    .option("--entity <name>", "reverse-lookup: entities + memories referencing this name")
    .action(async (o: { cwd?: string; q?: string; kind?: string; entity?: string }) => {
      const { entityQueryCmd } = await import("./commands/entity-query.js");
      await entityQueryCmd(o);
    });

  program.command("qa-write")
    .description("Write distilled Q&A .md pages + update .memarium/index.qa.json from an agent JSON payload.")
    .option("--input <path>", "path to qa pages JSON")
    .action(async (o: { input?: string }) => {
      const { qaWriteCmd } = await import("./commands/qa-write.js");
      const r = await qaWriteCmd({ inputPath: o.input });
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    });

  program.command("qa-index")
    .description("Rebuild .memarium/index.qa.json from memory/qa/ markdown.")
    .action(async () => {
      const { qaIndexCmd } = await import("./commands/qa-index.js");
      const r = await qaIndexCmd();
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    });

  program.command("qa-query")
    .description("Load distilled Q&A for the cwd's project, score, and emit ranked Q&A (index-only, read-only).")
    .option("--cwd <path>", "working directory to resolve the project from")
    .option("--q <text>", "free-text query")
    .option("--kind <kind>", "filter by qa kind (compound|troubleshooting|decision|operational)")
    .action(async (o: { cwd?: string; q?: string; kind?: string }) => {
      const { qaQueryCmd } = await import("./commands/qa-query.js");
      await qaQueryCmd(o);
    });

  program.command("memory-lint")
    .description("Read-only integrity diagnostic across memory/entity/qa indexes (never writes the repo). --json for structured output; --fix queues review proposals for expired entries.")
    .option("--cwd <path>", "scope findings to the project at this path (+ global/user); default: lint the whole store")
    .option("--json", "emit the structured LintReport JSON instead of a human report")
    .option("--fix", "queue a review proposal (status→superseded) for each expired entry — goes through memory-diff/approve, never a direct write")
    .action(async (o: { cwd?: string; json?: boolean; fix?: boolean }) => {
      const { memoryLintCmd } = await import("./commands/memory-lint.js");
      await memoryLintCmd({ cwd: o.cwd, json: o.json, fix: o.fix });
    });

  program.command("memory-archive")
    .description("Archive stale/unused memories out of recall (reversible — keeps the .md + index row). Dry-run unless --apply.")
    .option("--cwd <path>", "project dir (accepted for symmetry; archive plans store-wide)")
    .option("--json", "emit the structured plan / result JSON instead of a human report")
    .option("--apply", "apply the plan (default: dry-run — prints the plan, writes nothing)")
    .action(async (o: { cwd?: string; json?: boolean; apply?: boolean }) => {
      const { memoryArchiveCmd } = await import("./commands/memory-archive.js");
      await memoryArchiveCmd({ cwd: o.cwd, json: o.json, apply: o.apply });
    });

  program.command("memory-propose")
    .description("Queue a gated (core/procedural/pinned) memory change as a local proposal instead of writing it. Reads an --input JSON array of {entry, body, rationale?, sourceSession?}.")
    .requiredOption("--input <path>", "JSON file: array of { entry, body, rationale?, sourceSession? }")
    .action(async (o: { input: string }) => {
      const { memoryProposeCmd } = await import("./commands/memory-propose.js");
      const r = await memoryProposeCmd({ inputPath: o.input });
      console.log(JSON.stringify(r));
    });

  program.command("memory-diff")
    .description("Read-only: show pending local memory proposals as a diff vs current live memory. Never writes.")
    .option("--id <targetKey>", "show only the proposal for this target (e.g. core/user-workflow)")
    .option("--json", "emit a structured JSON array instead of a human report")
    .action(async (o: { id?: string; json?: boolean }) => {
      const { memoryDiffCmd } = await import("./commands/memory-diff.js");
      await memoryDiffCmd({ id: o.id, json: o.json });
    });

  program.command("memory-approve")
    .description("Apply a pending local memory proposal to live memory, delete the proposal, and refresh affected primers.")
    .requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/user-workflow)")
    .action(async (o: { id: string }) => {
      const { memoryApproveCmd } = await import("./commands/memory-approve.js");
      const r = await memoryApproveCmd({ id: o.id });
      console.log(JSON.stringify(r));
    });

  program.command("memory-reject")
    .description("Discard a pending local memory proposal without applying it.")
    .requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/user-workflow)")
    .action(async (o: { id: string }) => {
      const { memoryRejectCmd } = await import("./commands/memory-reject.js");
      const r = await memoryRejectCmd({ id: o.id });
      console.log(JSON.stringify(r));
    });

  program
    .command("recall")
    .description("Ranked recall over typed memory. Stage 1 = this command (scored episodes + facts + procedures for --q); stage 2 = Read the top entry paths.")
    .option("--cwd <path>", "infer project from this cwd")
    .option("--project <slug>", "force a specific project slug")
    .option("--q <text>", "task keywords to score against (title/summary/entities + file/commit overlap)")
    .option("--all", "recall across every project (no cwd/project filter)")
    .option("--limit <n>", "max hits to return (default 25)", (v) => parseInt(v, 10))
    .action(async (opts: { cwd?: string; project?: string; q?: string; all?: boolean; limit?: number }) => {
      const { recallCmd } = await import("./commands/recall.js");
      await recallCmd({ cwd: opts.cwd, project: opts.project, q: opts.q, all: opts.all, limit: opts.limit });
    });

  program
    .command("first-run")
    .description("Show one-time onboarding tip if not shown before. Used by skill at start.")
    .action(async () => {
      const { firstRunCmd } = await import("./commands/first-run.js");
      await firstRunCmd();
    });

  program
    .command("orchestrate <mode>")
    .description("Plugin's autonomy entry: scan local jsonl into spool, then yield to caller. Modes: project | global")
    .option("--cwd <path>", "user cwd (project mode)")
    .action(async (mode: string, opts: { cwd?: string }) => {
      const { orchestrateCmd } = await import("./digest/orchestrator.js");
      await orchestrateCmd({ mode, cwd: opts.cwd });
    });

  await program.parseAsync(argv);
}

// Only invoke when run directly as the entry-point (not when imported by tests
// or other modules). The `import.meta.url` guard mirrors Node's __filename check.
const _thisFile = fileURLToPath(import.meta.url);
const _mainFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (_thisFile === _mainFile || _mainFile.endsWith("memarium-plugin.js")) {
  run(process.argv).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
