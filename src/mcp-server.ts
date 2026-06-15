/**
 * Vibebook MCP server — exposes 9 read-only tools over stdio.
 *
 * Each tool is a thin boundary wrapper around an existing pure-core function
 * that returns a structured object. Handlers receive args, resolve `cwd`
 * from `project_dir` (arg) → CLAUDE_PROJECT_DIR (env) → process.cwd(), then
 * call the matching core and return its result directly.
 *
 * The MCP layer JSON-stringifies the result into `{ content: [{ type, text }] }`.
 * Tests call `handler()` directly and receive the raw structured value.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Core imports
import { buildMemoryQueryPayload } from "./commands/memory-query.js";
import { buildMemoryPrimer } from "./commands/memory-primer.js";
import { buildMemoryDiffViews } from "./commands/memory-diff.js";
import { buildMemoryLintReport } from "./commands/memory-lint.js";
import { buildQaQueryPayload } from "./commands/qa-query.js";
import { buildEntityQueryPayload } from "./commands/entity-query.js";
import { buildListProjectsPayload } from "./commands/list-projects.js";
import { buildPreparePayload } from "./commands/prepare.js";
import { buildRecallPayload } from "./commands/recall.js";

/** Resolve the `cwd` option from tool args and the environment. */
function resolveCwd(projectDir: string | undefined): string {
  return projectDir ?? process.env["CLAUDE_PROJECT_DIR"] ?? process.cwd();
}

// ---------------------------------------------------------------------------
// Tool registry
// Each entry: name, description, inputSchema (zod raw shape), handler(args) → Promise<unknown>
// ---------------------------------------------------------------------------

export const TOOLS: Array<{
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}> = [
  {
    name: "memory_query",
    description:
      "Load typed memory for the given project directory (or cwd). Returns layered context: core/procedural/semantic/episodic/working/artifact entries, a primer string, and conflict list.",
    inputSchema: {
      project_dir: z.string().optional().describe("Absolute path to the project directory (optional, defaults to cwd)"),
      type: z.string().optional().describe("Filter by memory type: core | semantic | episodic | procedural | working | artifact"),
      q: z.string().optional().describe("Free-text query string for relevance scoring"),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string; type?: string; q?: string };
      return buildMemoryQueryPayload({
        cwd: resolveCwd(a.project_dir),
        type: a.type,
        q: a.q,
      });
    },
  },

  {
    name: "memory_primer",
    description:
      "Return the primer markdown for the project at the given directory. Returns an empty string when no project is configured. Read-only, never writes.",
    inputSchema: {
      project_dir: z.string().optional().describe("Absolute path to the project directory (optional, defaults to cwd)"),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string };
      return buildMemoryPrimer({ cwd: resolveCwd(a.project_dir) });
    },
  },

  {
    name: "memory_diff",
    description:
      "List pending local memory proposals as a structured diff vs current live memory. Returns an array of DiffView objects. Read-only, never writes.",
    inputSchema: {
      id: z.string().optional().describe("Target key of a specific proposal (e.g. core/yue-workflow); omit to list all"),
    },
    handler: async (args) => {
      const a = args as { id?: string };
      return buildMemoryDiffViews({ id: a.id });
    },
  },

  {
    name: "memory_lint",
    description:
      "Read-only integrity diagnostic across memory/entity/qa indexes. Returns a structured LintReport with issues and suggestions. Never mutates the repo.",
    inputSchema: {
      project_dir: z.string().optional().describe("Scope findings to the project at this path (optional; omit to lint the whole store)"),
      stale_days: z.number().int().positive().optional().describe("Age threshold in days for stale episodic/working entries (default 90)"),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string; stale_days?: number };
      return buildMemoryLintReport({
        cwd: a.project_dir ? resolveCwd(a.project_dir) : undefined,
        staleDays: a.stale_days,
      });
    },
  },

  {
    name: "qa_query",
    description:
      "Load distilled Q&A for the project at the given directory, score entries, and return ranked results. Index-only, read-only.",
    inputSchema: {
      project_dir: z.string().optional().describe("Absolute path to the project directory (optional, defaults to cwd)"),
      q: z.string().optional().describe("Free-text query string for relevance scoring"),
      kind: z.string().optional().describe("Filter by qa kind: compound | troubleshooting | decision | operational"),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string; q?: string; kind?: string };
      return buildQaQueryPayload({
        cwd: resolveCwd(a.project_dir),
        q: a.q,
        kind: a.kind,
      });
    },
  },

  {
    name: "entity_query",
    description:
      "Load entity wiki for the project at the given directory, score entries, and return ranked entities. Optionally performs a reverse lookup of memories referencing a named entity.",
    inputSchema: {
      project_dir: z.string().optional().describe("Absolute path to the project directory (optional, defaults to cwd)"),
      q: z.string().optional().describe("Free-text query string for relevance scoring"),
      kind: z.string().optional().describe("Filter by entity kind: file | symbol | api | concept | person"),
      entity: z.string().optional().describe("Reverse-lookup: entities + memories referencing this name"),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string; q?: string; kind?: string; entity?: string };
      return buildEntityQueryPayload({
        cwd: resolveCwd(a.project_dir),
        q: a.q,
        kind: a.kind,
        entity: a.entity,
      });
    },
  },

  {
    name: "list_projects",
    description:
      "List every real project that has at least one synced session, with per-project counts of pending vs already-digested sessions and existing book artifacts.",
    inputSchema: {
      project_dir: z.string().optional().describe("Absolute path to use as cwd for isInSessionRepo detection (optional, defaults to cwd)"),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string };
      return buildListProjectsPayload(resolveCwd(a.project_dir));
    },
  },

  {
    name: "prepare",
    description:
      "Build the JSON payload of new (un-chronicled) sessions for the /vibebook skill to digest. Returns session metadata + existing topics/cards. Read-only.",
    inputSchema: {
      project_dir: z.string().optional().describe("Absolute path to the project directory — auto-detects the project slug (optional)"),
      project: z.string().optional().describe("Force a specific project slug (overrides project_dir)"),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string; project?: string };
      return buildPreparePayload({
        cwd: a.project_dir ? resolveCwd(a.project_dir) : undefined,
        project: a.project,
      });
    },
  },

  {
    name: "recall",
    description:
      "Three-stage progressive recall. Stage 1 (default): topic list + memex cards. Stage 2 (pass topic): chronicle list for one topic. Stage 3: use the Read tool on entry.path directly.",
    inputSchema: {
      project_dir: z.string().optional().describe("Absolute path to the project directory — infers the project (optional)"),
      project: z.string().optional().describe("Force a specific project slug"),
      topic: z.string().optional().describe("Stage 2: list chronicles in this topic slug"),
      all: z.boolean().optional().describe("Catalog every project (no filter). Use sparingly."),
    },
    handler: async (args) => {
      const a = args as { project_dir?: string; project?: string; topic?: string; all?: boolean };
      return buildRecallPayload({
        cwd: a.project_dir ? resolveCwd(a.project_dir) : undefined,
        project: a.project,
        topic: a.topic,
        all: a.all,
      });
    },
  },
];

// ---------------------------------------------------------------------------
// MCP server startup
// ---------------------------------------------------------------------------

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: "vibebook",
    version: "0.10.0",
  });

  for (const t of TOOLS) {
    // Use the `tool()` overload: name, description, zod raw shape, async callback.
    // The callback must return { content: [...] } as required by CallToolResult.
    server.tool(
      t.name,
      t.description,
      t.inputSchema,
      async (args: Record<string, unknown>) => ({
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(await t.handler(args), null, 2),
          },
        ],
      }),
    );
  }

  await server.connect(new StdioServerTransport());
}
