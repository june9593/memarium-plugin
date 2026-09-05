// @sync-from: github.com/june9593/memarium → src/writer.ts
// Keep this file in sync with the canonical version above. If you fix a bug here, also patch it there.

import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { NormalizedSession, ContentBlock, SessionManifest, TocEntry } from "../_shared/types.js";
import { extractManifest } from "../_shared/digest/manifest.js";
import { buildTocEntries, renderTocMarkdown } from "../_shared/digest/toc.js";

export interface WriteSessionOptions {
  /** Render the assistant's reasoning/thinking as `> 💭` blockquotes in md.
   *  Default true. Set false for smaller context models that don't benefit
   *  from reasoning context. */
  includeReasoning?: boolean;
  /** Skip truncation of large tool_result / tool_use.input blocks.
   *  Default false. Override via MEMARIUM_FULL_TOOL_RESULTS=1. */
  fullToolResults?: boolean;
}

export interface WrittenPaths {
  md: string;
}

/** Threshold above which tool_result.content / tool_use.input gets truncated.
 *  Empirical: a 20 KB code-fence in markdown is already large; tool outputs
 *  bigger than this usually mean Claude Read a long file or Bash dumped a
 *  build log — neither is high-value context for resume. The truncation
 *  preserves first 30 + last 10 lines + a footer noting the original size. */
export const TRUNCATE_THRESHOLD_BYTES = 20 * 1024;

export function writeSession(
  repoRoot: string,
  s: NormalizedSession,
  opts: WriteSessionOptions = {},
): WrittenPaths {
  const date = s.startedAt.slice(0, 10); // YYYY-MM-DD
  const dirRel = ["raw_sessions", s.tool, s.project, date].join("/");
  const absDir = join(repoRoot, "raw_sessions", s.tool, s.project, date);
  mkdirSync(absDir, { recursive: true });

  const storageId = s.tool === "codex" ? safeStorageId(s.sessionId) : s.shortId;
  const base = `${s.nameSlug}__${storageId}`;
  const fileName = `${base}.md`;
  const mdRel = `${dirRel}/${fileName}`;

  const includeReasoning = opts.includeReasoning ?? true;
  const fullToolResults =
    opts.fullToolResults ?? process.env.MEMARIUM_FULL_TOOL_RESULTS === "1";

  writeFileSync(
    join(absDir, fileName),
    renderMarkdown(s, { includeReasoning, fullToolResults }),
  );

  // A case-only write can retain the directory entry's old spelling on macOS
  // and Windows. Index that spelling so a case-sensitive Git tree can find it.
  const actualRel = relative(realpathSync.native(repoRoot), realpathSync.native(join(absDir, fileName))).split(sep).join("/");
  // Do not replace logical spool paths with symlink targets.
  return { md: actualRel.toLowerCase() === mdRel.toLowerCase() ? actualRel : mdRel };
}

function safeStorageId(sessionId: string): string {
  return sessionId
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface RenderCtx {
  includeReasoning: boolean;
  fullToolResults: boolean;
}

function renderMarkdown(s: NormalizedSession, ctx: RenderCtx): string {
  const renderedPerMessage: { md: string; src: NormalizedSession["messages"][number] }[] = [];
  for (const m of s.messages) {
    const md = renderMessageBlock(m, ctx);
    if (!md) continue;
    renderedPerMessage.push({ md, src: m });
  }

  const bodyParts: string[] = [];
  const messageLineOffsetsRelative: number[] = [];
  let currentLine = 1;
  for (let i = 0; i < renderedPerMessage.length; i++) {
    messageLineOffsetsRelative.push(currentLine);
    const md = renderedPerMessage[i]!.md;
    bodyParts.push(md);
    if (i < renderedPerMessage.length - 1) {
      currentLine += md.split("\n").length + 1;
    }
  }
  const body = bodyParts.join("\n\n");

  const renderedMessages = renderedPerMessage.map((r) => r.src);
  const manifestRel = extractManifest(renderedMessages, messageLineOffsetsRelative);
  const tocRel = buildTocEntries(renderedMessages, messageLineOffsetsRelative);

  const tocMdRel = renderTocMarkdown(tocRel);
  const frontmatterRel = renderFrontmatter(s, manifestRel);
  const tocSection = tocMdRel ? `\n\n${tocMdRel}` : "";
  const prefixRel = frontmatterRel + tocSection + "\n\n";
  const prefixLineCount = prefixRel.split("\n").length - 1;

  const manifest: SessionManifest = patchManifestLines(manifestRel, prefixLineCount);
  const toc: TocEntry[] = tocRel.map((e) => ({ ...e, line: e.line + prefixLineCount }));

  const frontmatter = renderFrontmatter(s, manifest);
  const tocMd = renderTocMarkdown(toc);
  return [frontmatter, tocMd, body].filter(Boolean).join("\n\n");
}

function patchManifestLines(m: SessionManifest, offset: number): SessionManifest {
  return {
    ...m,
    commits: m.commits.map((c) => ({ ...c, line: c.line + offset })),
    candidate_decisions: m.candidate_decisions.map((d) => ({ ...d, line: d.line + offset })),
  };
}

function renderFrontmatter(s: NormalizedSession, m: SessionManifest): string {
  const lines = [
    "---",
    `sessionId: ${s.sessionId}`,
    `tool: ${s.tool}`,
    `project: ${s.project}`,
    `projectRaw: ${s.projectRaw}`,
    `startedAt: ${s.startedAt}`,
    `endedAt: ${s.endedAt}`,
    `displayName: ${yamlSafeString(s.displayName)}`,
    `manifest_version: 1`,
    `user_turns: ${m.user_turns}`,
    `assistant_turns: ${m.assistant_turns}`,
    ...renderToolsUsed(m.tools_used),
    ...renderCommits(m.commits),
    ...renderFilesTouched(m.files_touched),
    ...renderCandidateDecisions(m.candidate_decisions),
    "---",
  ];
  return lines.join("\n");
}

function renderToolsUsed(t: Record<string, number>): string[] {
  const entries = Object.entries(t).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return ["tools_used: {}"];
  return ["tools_used:", ...entries.map(([k, v]) => `  ${yamlSafeKey(k)}: ${v}`)];
}

function renderCommits(commits: SessionManifest["commits"]): string[] {
  if (commits.length === 0) return ["commits: []"];
  return [
    "commits:",
    ...commits.map((c) => `  - { sha: ${yamlSafeString(c.sha)}, msg: ${yamlSafeString(c.msg)}, line: ${c.line} }`),
  ];
}

function renderFilesTouched(files: string[]): string[] {
  if (files.length === 0) return ["files_touched: []"];
  return [
    "files_touched:",
    ...files.map((f) => `  - ${yamlSafeString(f)}`),
  ];
}

function renderCandidateDecisions(decisions: SessionManifest["candidate_decisions"]): string[] {
  if (decisions.length === 0) return ["candidate_decisions: []"];
  return [
    "candidate_decisions:",
    ...decisions.map((d) => `  - { line: ${d.line}, preview: ${yamlSafeString(d.preview)} }`),
  ];
}

function yamlSafeString(s: string): string {
  if (/^[A-Za-z0-9_一-鿿　-〿 -]+$/.test(s) && s === s.trim()) return s;
  const escaped = s.replace(/'/g, "''");
  return `'${escaped}'`;
}

function yamlSafeKey(s: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "''")}'`;
}

function renderMessageBlock(
  m: NormalizedSession["messages"][number],
  ctx: RenderCtx,
): string {
  const heading =
    m.role === "user" ? "## User" :
    m.role === "assistant" ? "## Assistant" :
    `## ${m.role}`;
  const ts = m.timestamp ? ` _(${m.timestamp})_` : "";

  const rendered = renderMessageContent(m.contentBlocks, m.text, m.reasoning, ctx);
  if (!rendered.trim()) return "";
  return `${heading}${ts}\n\n${rendered}`;
}

function renderMessageContent(
  blocks: ContentBlock[] | undefined,
  fallbackText: string,
  fallbackReasoning: string | undefined,
  ctx: RenderCtx,
): string {
  if (blocks && blocks.length > 0) {
    const out: string[] = [];
    for (const b of blocks) {
      if (b.type === "thinking") {
        if (!ctx.includeReasoning) continue;
        out.push(renderThinking(b.thinking));
      } else if (b.type === "text") {
        if (b.text.trim()) out.push(b.text);
      } else if (b.type === "tool_use") {
        out.push(renderToolUse(b, ctx));
      } else if (b.type === "tool_result") {
        out.push(renderToolResult(b, ctx));
      }
    }
    return out.join("\n\n");
  }
  const out: string[] = [];
  if (ctx.includeReasoning && fallbackReasoning) {
    out.push(renderThinking(fallbackReasoning));
  }
  if (fallbackText) out.push(fallbackText);
  return out.join("\n\n");
}

function renderThinking(text: string): string {
  const quoted = text.split("\n").map((l) => `> ${l}`).join("\n");
  return `> 💭 _thinking_\n${quoted}`;
}

function renderToolUse(b: Extract<ContentBlock, { type: "tool_use" }>, ctx: RenderCtx): string {
  const inputStr = JSON.stringify(b.input, null, 2);
  const truncated = ctx.fullToolResults
    ? inputStr
    : maybeTruncate(inputStr, "input");
  return `### 🔧 tool_use: ${b.name}\n\n\`\`\`json\n${truncated}\n\`\`\``;
}

function renderToolResult(b: Extract<ContentBlock, { type: "tool_result" }>, ctx: RenderCtx): string {
  const truncated = ctx.fullToolResults
    ? b.content
    : maybeTruncate(b.content, "output");
  return `### ✅ tool_result\n\n\`\`\`\n${truncated}\n\`\`\``;
}

function maybeTruncate(s: string, kind: "input" | "output"): string {
  if (Buffer.byteLength(s, "utf8") <= TRUNCATE_THRESHOLD_BYTES) return s;
  const lines = s.split("\n");
  if (lines.length <= 50) {
    const head = s.slice(0, 4000);
    const tail = s.slice(-1000);
    return `${head}\n\n[... truncated: ${(Buffer.byteLength(s, "utf8") / 1024).toFixed(1)} KB total, showing first 4000 + last 1000 chars ...]\n\n${tail}`;
  }
  const head = lines.slice(0, 30).join("\n");
  const tail = lines.slice(-10).join("\n");
  const omitted = lines.length - 40;
  const sizeKb = (Buffer.byteLength(s, "utf8") / 1024).toFixed(1);
  return `${head}\n\n[... truncated: ${sizeKb} KB ${kind}, omitting ${omitted} middle lines ...]\n\n${tail}`;
}
