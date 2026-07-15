import type { MemoryEntry } from "../../../src/memory/types.js";
import type { QaEntry } from "../../../src/qa/types.js";
import type { EntityPage } from "../../../src/entity/types.js";
import type { EvalCorpus } from "../../../src/memory/eval.js";

// "now" all cases use. semantic/alpha/old-config validTo is far in the past → expired.
export const NOW = "2026-06-12";

function mem(o: Partial<MemoryEntry> & Pick<MemoryEntry, "id" | "type" | "scope" | "project" | "title" | "summary">): MemoryEntry {
  return {
    confidence: 0.9, importance: 3, createdAt: "2026-01-01", updatedAt: "2026-06-01",
    validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    status: "active", path: "", trust: "trusted", ...o,
  };
}
function qa(o: Partial<QaEntry> & Pick<QaEntry, "id" | "scope" | "project" | "question" | "answerSummary" | "kind">): QaEntry {
  return {
    tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
    path: "", createdAt: "2026-01-01", updatedAt: "2026-06-01", ...o,
  };
}
function ent(o: Partial<EntityPage> & Pick<EntityPage, "id" | "kind" | "scope" | "project" | "title">): EntityPage {
  return {
    aliases: [], sourceMemoryIds: [], sourceSessions: [], sourceFiles: [], relatedEntities: [],
    path: "", createdAt: "2026-01-01", updatedAt: "2026-06-01", ...o,
  };
}

export const CORPUS: EvalCorpus = {
  memory: [
    mem({ id: "semantic/alpha/build", type: "semantic", scope: "project:alpha", project: "alpha",
      title: "Alpha build uses esbuild", summary: "alpha build pipeline", entities: ["esbuild", "build"], importance: 4 }),
    mem({ id: "procedural/alpha/run-tests", type: "procedural", scope: "project:alpha", project: "alpha",
      title: "How to run alpha tests", summary: "run vitest for alpha", entities: ["vitest"], importance: 4 }),
    mem({ id: "semantic/alpha/old-auth", type: "semantic", scope: "project:alpha", project: "alpha",
      title: "Alpha legacy auth flow", summary: "legacy cookie auth", status: "superseded", entities: ["auth"] }),
    mem({ id: "semantic/alpha/new-auth", type: "semantic", scope: "project:alpha", project: "alpha",
      title: "Alpha auth flow uses OAuth", summary: "oauth based auth", supersedes: "semantic/alpha/old-auth",
      entities: ["oauth", "auth"], importance: 4 }),
    mem({ id: "semantic/alpha/old-config", type: "semantic", scope: "project:alpha", project: "alpha",
      title: "Alpha deprecated config layout", summary: "old config", validTo: "2020-01-01", entities: ["config"] }),
    mem({ id: "semantic/alpha/config", type: "semantic", scope: "project:alpha", project: "alpha",
      title: "Alpha current config format", summary: "current config", entities: ["config"], importance: 4 }),
    mem({ id: "core/_global/yue", type: "core", scope: "global", project: null,
      title: "Yue ships fast and never npm publishes", summary: "global workflow rule", importance: 5 }),
    mem({ id: "episodic/alpha/dbg", type: "episodic", scope: "project:alpha", project: "alpha",
      title: "Debugged a flaky alpha test", summary: "episode pointer" }),
    mem({ id: "semantic/beta/secret", type: "semantic", scope: "project:beta", project: "beta",
      title: "Beta has a betastuff module", summary: "beta only", entities: ["betastuff"], importance: 4 }),
    mem({ id: "semantic/alpha/deploy-1", type: "semantic", scope: "project:alpha", project: "alpha",
      title: "Alpha deploy step one", summary: "deploy first step", entities: ["deploy"], sourceSessions: ["s1"], importance: 4 }),
    mem({ id: "semantic/alpha/deploy-2", type: "semantic", scope: "project:alpha", project: "alpha",
      title: "Alpha deploy rollback", summary: "deploy rollback step", entities: ["deploy", "rollback"], sourceSessions: ["s2"], importance: 4 }),
    // scope-gate hardening: a global memory that legitimately surfaces for a project
    // query (guards against over-aggressive scope filtering), + another project's
    // project-scoped memory that must be excluded even though it shares the query term.
    mem({ id: "semantic/_global/editor", type: "semantic", scope: "global", project: null,
      title: "Yue prefers vim keybindings", summary: "global editor preference vim", entities: ["vim"] }),
    mem({ id: "semantic/beta/deploy", type: "semantic", scope: "project:beta", project: "beta",
      title: "Beta deploy runbook", summary: "beta deploy vim runbook", entities: ["deploy", "vim"] }),
  ],
  qa: [
    qa({ id: "qa/alpha/auth-deploy", scope: "project:alpha", project: "alpha", kind: "compound",
      question: "How do I set up alpha auth and then deploy?", answerSummary: "configure oauth auth then run the deploy steps",
      tags: ["auth", "deploy"] }),
    qa({ id: "qa/alpha/cache", scope: "project:alpha", project: "alpha", kind: "operational",
      question: "How do I clear the alpha cache?", answerSummary: "delete the cache dir", tags: ["cache"] }),
  ],
  entity: [
    ent({ id: "entity/alpha/esbuild", kind: "concept", scope: "project:alpha", project: "alpha",
      title: "Esbuild", aliases: ["esbuild"] }),
    ent({ id: "entity/beta/esbuild", kind: "concept", scope: "project:beta", project: "beta",
      title: "Esbuild", aliases: ["esbuild"] }),
  ],
};
