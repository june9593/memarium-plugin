import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileOrphanChronicles } from "../../src/digest/reconcile-orphans.js";
import type { BookIndexV2, ChronicleEntry } from "../../src/digest/book-index-v2.js";

function emptyIndex(): BookIndexV2 {
  return { version: 2, chronicles: {}, topics: {}, cards: {} };
}

function chronEntry(over: Partial<ChronicleEntry> = {}): ChronicleEntry {
  return {
    threadId: "aaa11111", project: "edge-memvc", title: "Known", sessionIds: ["s1"],
    path: "book/edge-memvc/chronicle/2026-06-01__known__claude.md",
    createdAt: "2026-06-01", updatedAt: "2026-06-01", tags: [], skip: false,
    ...over,
  };
}

function writeChronicleMd(
  repo: string, project: string, file: string,
  fm: { threadId?: string; title?: string; sessionIds?: string; created?: string; updated?: string; tags?: string },
): void {
  const dir = join(repo, "book", project, "chronicle");
  mkdirSync(dir, { recursive: true });
  const lines = ["---"];
  if (fm.threadId !== undefined) lines.push(`threadId: ${fm.threadId}`);
  if (fm.title !== undefined) lines.push(`title: ${fm.title}`);
  if (fm.sessionIds !== undefined) lines.push(`sessionIds: ${fm.sessionIds}`);
  if (fm.created !== undefined) lines.push(`created: ${fm.created}`);
  if (fm.updated !== undefined) lines.push(`updated: ${fm.updated}`);
  if (fm.tags !== undefined) lines.push(`tags: ${fm.tags}`);
  lines.push(`project: ${project}`, "status: done", "---", "", "# Body", "x");
  writeFileSync(join(dir, file), lines.join("\n"));
}

describe("reconcileOrphanChronicles (#38)", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-recon-"));
    vi.stubEnv("HOME", home);
    repo = join(home, "repo");
    mkdirSync(repo, { recursive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("registers a well-formed orphan chronicle md not in the index", () => {
    const idx = emptyIndex();
    writeChronicleMd(repo, "chromium-src", "2025-11-22__glic-hacks__copilot.md", {
      threadId: "94598dc3", title: "Forcing glic on", sessionIds: "[94598dc3-49bb-444f]",
      created: "2025-11-22", updated: "2025-11-22", tags: "[glic, gemini]",
    });
    const r = reconcileOrphanChronicles(repo, idx);
    expect(r.healed).toEqual(["book/chromium-src/chronicle/2025-11-22__glic-hacks__copilot.md"]);
    const e = idx.chronicles["94598dc3"];
    expect(e).toBeTruthy();
    expect(e.project).toBe("chromium-src");
    expect(e.title).toBe("Forcing glic on");
    expect(e.sessionIds).toEqual(["94598dc3-49bb-444f"]);
    expect(e.createdAt).toBe("2025-11-22");
    expect(e.tags).toEqual(["glic", "gemini"]);
    expect(e.path).toBe("book/chromium-src/chronicle/2025-11-22__glic-hacks__copilot.md");
  });

  it("strips quotes from a quoted title", () => {
    const idx = emptyIndex();
    writeChronicleMd(repo, "p", "a.md", { threadId: "t1", title: '"Quoted: title"', sessionIds: "[s1]", created: "2026-01-01" });
    reconcileOrphanChronicles(repo, idx);
    expect(idx.chronicles["t1"].title).toBe("Quoted: title");
  });

  it("does NOT touch chronicles already in the index (idempotent)", () => {
    const idx = emptyIndex();
    idx.chronicles["aaa11111"] = chronEntry();
    writeChronicleMd(repo, "edge-memvc", "2026-06-01__known__claude.md", {
      threadId: "aaa11111", title: "Known", sessionIds: "[s1]", created: "2026-06-01",
    });
    const r = reconcileOrphanChronicles(repo, idx);
    expect(r.healed).toEqual([]);
    expect(Object.keys(idx.chronicles)).toEqual(["aaa11111"]);
  });

  it("skips (does not throw on) malformed md missing required fields", () => {
    const idx = emptyIndex();
    writeChronicleMd(repo, "p", "bad.md", { title: "no threadId", sessionIds: "[]" }); // no threadId, empty sessions
    const r = reconcileOrphanChronicles(repo, idx);
    expect(r.healed).toEqual([]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].path).toBe("book/p/chronicle/bad.md");
    expect(Object.keys(idx.chronicles)).toEqual([]);
  });

  it("skips an orphan whose threadId collides with an indexed entry (reports conflict)", () => {
    const idx = emptyIndex();
    idx.chronicles["dup"] = chronEntry({ threadId: "dup", path: "book/edge-memvc/chronicle/orig.md" });
    writeChronicleMd(repo, "other-proj", "clash.md", { threadId: "dup", title: "Clash", sessionIds: "[s9]", created: "2026-02-02" });
    const r = reconcileOrphanChronicles(repo, idx);
    expect(r.healed).toEqual([]);
    expect(r.skipped[0].reason).toMatch(/already indexed at book\/edge-memvc\/chronicle\/orig\.md/);
    expect(idx.chronicles["dup"].path).toBe("book/edge-memvc/chronicle/orig.md");
  });

  it("ignores book/_meta and projects without a chronicle dir; no book/ → no-op", () => {
    const idx = emptyIndex();
    mkdirSync(join(repo, "book", "_meta"), { recursive: true });
    writeFileSync(join(repo, "book", "_meta", "timeline.md"), "x");
    mkdirSync(join(repo, "book", "edge-memvc", "topics"), { recursive: true });
    const r = reconcileOrphanChronicles(repo, idx);
    expect(r.healed).toEqual([]);
    expect(r.skipped).toEqual([]);
    // no book/ at all
    const empty = mkdtempSync(join(tmpdir(), "vbp-nobook-"));
    expect(reconcileOrphanChronicles(empty, emptyIndex()).healed).toEqual([]);
    rmSync(empty, { recursive: true, force: true });
  });
});
