import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadEntityIndex, saveEntityIndex, upsertEntity, ENTITY_INDEX_REL,
} from "../../src/entity/index-store.js";
import type { EntityPage } from "../../src/entity/types.js";

function page(id: string, over: Partial<EntityPage> = {}): EntityPage {
  return {
    id, kind: "symbol", scope: "project:edge-memvc", project: "edge-memvc",
    title: "T", aliases: [], sourceMemoryIds: [], sourceSessions: [], sourceFiles: [],
    relatedEntities: [], path: `memory/entities/edge-memvc/${id.split("/").pop()}.md`,
    createdAt: "2026-06-09", updatedAt: "2026-06-09", ...over,
  };
}

describe("entity index store", () => {
  let repo: string;
  beforeEach(() => { repo = mkdtempSync(join(tmpdir(), "vbp-entidx-")); });
  afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

  it("load returns empty index when file absent", () => {
    expect(loadEntityIndex(repo)).toEqual({ version: 1, entries: {} });
  });

  it("upsert + save + load round-trips, keyed by id", () => {
    const idx = loadEntityIndex(repo);
    upsertEntity(idx, page("entity/edge-memvc/source-adapter"));
    saveEntityIndex(repo, idx);
    expect(existsSync(join(repo, ENTITY_INDEX_REL))).toBe(true);
    const reloaded = loadEntityIndex(repo);
    expect(Object.keys(reloaded.entries)).toEqual(["entity/edge-memvc/source-adapter"]);
    expect(reloaded.entries["entity/edge-memvc/source-adapter"].title).toBe("T");
  });

  it("upsert overwrites by id", () => {
    const idx = loadEntityIndex(repo);
    upsertEntity(idx, page("a", { title: "first" }));
    upsertEntity(idx, page("a", { title: "second" }));
    expect(Object.keys(idx.entries)).toEqual(["a"]);
    expect(idx.entries["a"].title).toBe("second");
  });

  it("ENTITY_INDEX_REL points into .memarium/", () => {
    expect(ENTITY_INDEX_REL).toBe(".memarium/index.entity.json");
  });
});
