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
