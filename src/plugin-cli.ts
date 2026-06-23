#!/usr/bin/env node
// Plugin-internal CLI. NOT installed on user PATH; invoked by skills via
//   ${CLAUDE_PLUGIN_ROOT}/bin/vibebook-plugin.js <subcommand>
//
// The shape mirrors the subcommands the /vibebook and /vibebook-recall skills
// used to call on the npm `vibebook` binary, so SKILL.md changes are minimal
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
    .name("vibebook-plugin")
    .description("Vibebook Claude Code plugin internal CLI (invoked by skills, not by users)")
    .version(readPackageVersion(), "-v, --version", "print the installed plugin version");

  program
    .command("list-projects")
    .description("List projects with pending sessions in the spool. Used by /vibebook to detect mode.")
    .action(async () => {
      const { listProjectsCmd } = await import("./commands/list-projects.js");
      await listProjectsCmd();
    });

  program
    .command("status")
    .description("Digest coverage: synced sessions vs digested vs pending, plus book + memory layer counts.")
    .action(async () => {
      const { statusCmd } = await import("./commands/status.js");
      await statusCmd();
    });

  program
    .command("prepare")
    .description("Emit the JSON payload of new sessions for the /vibebook skill to digest.")
    .option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())")
    .option("--project <slug>", "force a specific project slug")
    .action(async (opts: { cwd?: string; project?: string }) => {
      const { prepareCmd } = await import("./commands/prepare.js");
      await prepareCmd({ cwd: opts.cwd, project: opts.project });
    });

  program
    .command("publish")
    .description("Write chronicle/topic md files emitted by the /vibebook skill into the book.")
    .option("--chronicles <path>", "path to chronicles JSON")
    .option("--topics <path>", "path to topics JSON")
    .option("--no-catalog", "skip book/index.md regen (caller will batch)")
    .action(async (opts: { chronicles?: string; topics?: string; catalog?: boolean }) => {
      const { publishCmd } = await import("./commands/publish.js");
      const report = await publishCmd({
        chroniclesPath: opts.chronicles,
        topicsPath: opts.topics,
        noCatalog: opts.catalog === false,
      });
      // Print a JSON summary so the calling skill (or CI) can confirm what
      // landed without resorting to "rerun and check for already-exists
      // errors". Always written to stdout, even on zero-insert runs.
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    });

  program.command("finalize")
    .description("Ensure the session-repo is a git repo, commit all plugin-written paths (raw_sessions/book/memory/index), and push if a remote is configured. Never stages foreign files.")
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
    .description("Rebuild .vibebook/index.memory.json from the memory/ markdown files.")
    .action(async () => {
      const { memoryIndexCmd } = await import("./commands/memory-index.js");
      const report = await memoryIndexCmd();
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

  program.command("entity-write")
    .description("Write entity-wiki .md pages + update .vibebook/index.entity.json from an agent JSON payload.")
    .option("--input <path>", "path to entity pages JSON")
    .action(async (o: { input?: string }) => {
      const { entityWriteCmd } = await import("./commands/entity-write.js");
      const r = await entityWriteCmd({ inputPath: o.input });
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    });

  program.command("entity-index")
    .description("Rebuild .vibebook/index.entity.json from memory/entities/ markdown.")
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
    .description("Write distilled Q&A .md pages + update .vibebook/index.qa.json from an agent JSON payload.")
    .option("--input <path>", "path to qa pages JSON")
    .action(async (o: { input?: string }) => {
      const { qaWriteCmd } = await import("./commands/qa-write.js");
      const r = await qaWriteCmd({ inputPath: o.input });
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    });

  program.command("qa-index")
    .description("Rebuild .vibebook/index.qa.json from memory/qa/ markdown.")
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
    .option("--stale-days <n>", "age threshold for stale episodic/working (default 90)", (v) => parseInt(v, 10))
    .option("--fix", "queue a review proposal (status→superseded) for each expired entry — goes through memory-diff/approve, never a direct write")
    .action(async (o: { cwd?: string; json?: boolean; staleDays?: number; fix?: boolean }) => {
      const { memoryLintCmd } = await import("./commands/memory-lint.js");
      await memoryLintCmd({ cwd: o.cwd, json: o.json, staleDays: o.staleDays, fix: o.fix });
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
    .option("--id <targetKey>", "show only the proposal for this target (e.g. core/yue-workflow)")
    .option("--json", "emit a structured JSON array instead of a human report")
    .action(async (o: { id?: string; json?: boolean }) => {
      const { memoryDiffCmd } = await import("./commands/memory-diff.js");
      await memoryDiffCmd({ id: o.id, json: o.json });
    });

  program.command("memory-approve")
    .description("Apply a pending local memory proposal to live memory, delete the proposal, and refresh affected primers.")
    .requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/yue-workflow)")
    .action(async (o: { id: string }) => {
      const { memoryApproveCmd } = await import("./commands/memory-approve.js");
      const r = await memoryApproveCmd({ id: o.id });
      console.log(JSON.stringify(r));
    });

  program.command("memory-reject")
    .description("Discard a pending local memory proposal without applying it.")
    .requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/yue-workflow)")
    .action(async (o: { id: string }) => {
      const { memoryRejectCmd } = await import("./commands/memory-reject.js");
      const r = await memoryRejectCmd({ id: o.id });
      console.log(JSON.stringify(r));
    });

  program
    .command("recall")
    .description("Three-stage progressive recall. Stage 1 = topics; --topic = stage 2; Read tool = stage 3.")
    .option("--cwd <path>", "infer project from this cwd")
    .option("--project <slug>", "force a specific project slug")
    .option("--topic <slug>", "stage 2: list chronicles in this topic")
    .action(async (opts: { cwd?: string; project?: string; topic?: string }) => {
      const { recallCmd } = await import("./commands/recall.js");
      await recallCmd({ cwd: opts.cwd, project: opts.project, topic: opts.topic });
    });

  program
    .command("catalog-regen")
    .description("Rebuild book/index.md after a global sweep.")
    .option("--no-commit", "skip git commit + push of the regenerated catalog")
    .action(async (opts: { commit?: boolean }) => {
      const { catalogRegenCmd } = await import("./commands/catalog-regen.js");
      const report = await catalogRegenCmd({ noCommit: opts.commit === false });
      // Print JSON summary so callers don't have to parse stderr noise from
      // git's progress output to figure out what happened.
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    });

  program
    .command("site <action>")
    .description("Render the book as a static site. Actions: serve | build")
    .action(async (action: string) => {
      if (action === "serve") {
        const { serveSiteCmd } = await import("./commands/site.js");
        await serveSiteCmd();
      } else if (action === "build") {
        const { buildSiteCmd } = await import("./commands/site.js");
        await buildSiteCmd();
      } else {
        throw new Error(`Unknown site action "${action}". Expected "serve" or "build".`);
      }
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
if (_thisFile === _mainFile || _mainFile.endsWith("vibebook-plugin.js")) {
  run(process.argv).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
