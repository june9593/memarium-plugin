import { describe, it, expect } from "vitest";
import { scoreEntities, type EntityQuery } from "../../src/entity/score.js";
import type { EntityPage } from "../../src/entity/types.js";

function e(over: Partial<EntityPage>): EntityPage {
  return {
    id: over.id ?? "entity/p/x",
    kind: over.kind ?? "symbol",
    scope: over.scope ?? "project:p",
    project: over.project ?? "p",
    title: over.title ?? "",
    aliases: over.aliases ?? [],
    sourceMemoryIds: [],
    sourceSessions: [],
    sourceFiles: over.sourceFiles ?? [],
    relatedEntities: over.relatedEntities ?? [],
    path: "memory/entities/p/x.md",
    createdAt: "2026-01-01",
    updatedAt: over.updatedAt ?? "2026-01-01",
  };
}

const Q = (over: Partial<EntityQuery> = {}): EntityQuery => ({
  project: "p", text: "", kind: null, now: "2026-06-09", ...over,
});

describe("scoreEntities", () => {
  it("name match in title raises score and whyMatched has 'name'", () => {
    const entries = [
      e({ id: "entity/p/source-adapter", title: "SourceAdapter" }),
      e({ id: "entity/p/unrelated", title: "UnrelatedThing" }),
    ];
    const r = scoreEntities(entries, Q({ text: "sourceadapter" }));
    expect(r[0].entry.id).toBe("entity/p/source-adapter");
    expect(r[0].whyMatched).toContain("name");
  });

  it("alias match raises score and whyMatched has 'name'", () => {
    const entries = [
      e({ id: "entity/p/adapter", title: "SourceAdapter", aliases: ["source adapter", "adapter"] }),
      e({ id: "entity/p/other", title: "OtherThing" }),
    ];
    const r = scoreEntities(entries, Q({ text: "adapter" }));
    expect(r[0].entry.id).toBe("entity/p/adapter");
    expect(r[0].whyMatched).toContain("name");
  });

  it("same-project entries outrank other-project on equal text", () => {
    const entries = [
      e({ id: "entity/p/mine", project: "p", scope: "project:p", title: "auth flow" }),
      e({ id: "entity/q/theirs", project: "q", scope: "project:q", title: "auth flow" }),
    ];
    const r = scoreEntities(entries, Q({ project: "p", text: "auth" }));
    expect(r[0].entry.id).toBe("entity/p/mine");
    expect(r[0].whyMatched).toContain("scope");
  });

  it("kind filter restricts results", () => {
    const entries = [
      e({ id: "entity/p/fn", kind: "symbol", title: "myFunction", scope: "project:p" }),
      e({ id: "entity/p/api", kind: "api", title: "myFunction", scope: "project:p" }),
    ];
    const r = scoreEntities(entries, Q({ text: "myfunction", kind: "symbol" }));
    expect(r.map((x) => x.entry.id)).toEqual(["entity/p/fn"]);
  });

  it("global scope eligible regardless of project filter", () => {
    const entries = [
      e({ id: "entity/_global/npm-policy", scope: "global", project: null, title: "npm publish policy" }),
    ];
    const r = scoreEntities(entries, Q({ project: "anything", text: "publish" }));
    expect(r.map((x) => x.entry.id)).toEqual(["entity/_global/npm-policy"]);
    expect(r[0].whyMatched).toContain("scope:global");
  });

  it("user scope always eligible", () => {
    const entries = [
      e({ id: "entity/_global/owner-prefs", scope: "user", project: null, title: "the maintainer preferences" }),
    ];
    const r = scoreEntities(entries, Q({ project: "my-project", text: "owner" }));
    expect(r).toHaveLength(1);
    expect(r[0].whyMatched).toContain("scope:user");
  });

  it("recent entries get recency boost", () => {
    const now = "2026-06-09";
    const entries = [
      e({ id: "entity/p/old", title: "foo", updatedAt: "2026-01-01" }),
      e({ id: "entity/p/recent", title: "foo", updatedAt: "2026-06-08" }),
    ];
    const r = scoreEntities(entries, Q({ text: "foo", now }));
    expect(r[0].entry.id).toBe("entity/p/recent");
  });

  it("project-scoped entries from other project excluded when cwd is set", () => {
    const entries = [
      e({ id: "entity/other/thing", project: "other", scope: "project:other", title: "auth" }),
    ];
    const r = scoreEntities(entries, Q({ project: "p", text: "auth" }));
    expect(r).toHaveLength(0);
  });

  it("project-scoped entries from other project included when no cwd project", () => {
    const entries = [
      e({ id: "entity/other/thing", project: "other", scope: "project:other", title: "auth" }),
    ];
    const r = scoreEntities(entries, Q({ project: null, text: "auth" }));
    expect(r).toHaveLength(1);
  });

  it("sorts by score desc, tiebreaks by id asc", () => {
    const entries = [
      e({ id: "entity/p/b", scope: "global", project: null, title: "same" }),
      e({ id: "entity/p/a", scope: "global", project: null, title: "same" }),
    ];
    const r = scoreEntities(entries, Q({ text: "" }));
    expect(r[0].entry.id).toBe("entity/p/a");
  });
});
