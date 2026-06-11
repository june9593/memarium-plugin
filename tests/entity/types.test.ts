import { describe, it, expect } from "vitest";
import { entityKey, emptyEntityIndex, type EntityPage } from "../../src/entity/types.js";

const page: EntityPage = {
  id: "entity/edge-memvc/source-adapter",
  kind: "symbol",
  scope: "project:edge-memvc",
  project: "edge-memvc",
  title: "SourceAdapter",
  aliases: ["source adapter"],
  sourceMemoryIds: [],
  sourceSessions: [],
  sourceFiles: ["src/sources/base.ts"],
  relatedEntities: [],
  path: "memory/entities/edge-memvc/source-adapter.md",
  createdAt: "2026-06-09",
  updatedAt: "2026-06-09",
};

describe("entityKey", () => {
  it("returns the entity id", () => {
    expect(entityKey(page)).toBe("entity/edge-memvc/source-adapter");
  });
});

describe("emptyEntityIndex", () => {
  it("returns version:1 with no entries", () => {
    const idx = emptyEntityIndex();
    expect(idx.version).toBe(1);
    expect(idx.entries).toEqual({});
  });
});
