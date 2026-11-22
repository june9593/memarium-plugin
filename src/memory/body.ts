import { lstatSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import { canonicalMemoryPath } from "./gate.js";
import type { MemoryView } from "./source-resolver.js";
import type { MemoryEntry } from "./types.js";

/** Largest .md the primer will read for a body; core rules are a few KB. */
const MAX_BODY_FILE_BYTES = 64 * 1024;

/** Drop the leading blank lines and H1 headings above the body: the renderer
 *  writes `# <title>`, and authored bodies often restate it (sometimes reworded),
 *  while the primer already shows the title. Then trim. */
function stripLeadingHeadings(body: string): string {
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i]!.trim() === "" || /^# /.test(lines[i]!.trim()))) i++;
  return lines.slice(i).join("\n").trim();
}

/** Read-only body lookup for the SessionStart primer. Resolves the entry's
 *  CANONICAL .md (derived from type/project/id; the indexed `path` is not
 *  trusted) under the tree the entry came from — the local repo or the
 *  aggregated overlay — refuses anything outside `memory/`, symlinked path
 *  components, non-files and oversized files, and requires the file's
 *  frontmatter id to match the entry. Returns the body without its title
 *  heading, or null on any doubt so the caller falls back to the summary. */
export function readEntryBody(view: MemoryView, entry: MemoryEntry): string | null {
  try {
    const root = view.sources[entry.id] === "overlay" && view.roots.overlay ? view.roots.overlay : view.roots.local;
    const memRoot = resolve(join(root, "memory"));
    const abs = resolve(join(root, canonicalMemoryPath(entry)));
    if (!abs.startsWith(memRoot + sep)) return null;
    assertNoSymlinkedComponent(root, abs, "memory body");
    const st = lstatSync(abs);
    if (!st.isFile() || st.size > MAX_BODY_FILE_BYTES) return null;
    const md = readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
    const fm = md.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!fm) return null;
    const id = (fm[1]!.match(/^id:[ \t]*(.*)$/m)?.[1] ?? "").trim();
    if (id !== entry.id) return null;
    const body = stripLeadingHeadings(md.slice(fm[0].length));
    return body === "" ? null : body;
  } catch {
    return null;
  }
}
