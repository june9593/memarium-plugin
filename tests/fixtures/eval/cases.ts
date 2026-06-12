import type { EvalCase } from "../../../src/memory/eval.js";
import { NOW } from "./corpus.js";

const q = (text: string, project: string | null = "alpha", extra: Record<string, unknown> = {}) =>
  ({ text, project, now: NOW, ...extra });

export const CASES: EvalCase[] = [
  { name: "memory/info-extraction: esbuild build", category: "memory",
    query: q("esbuild build"), goldIds: ["semantic/alpha/build"] },
  { name: "memory/multi-session: deploy across sessions", category: "memory",
    query: q("deploy"), goldIds: ["semantic/alpha/deploy-1", "semantic/alpha/deploy-2"] },
  { name: "memory/temporal: current config, expired excluded", category: "memory",
    query: q("config"), goldIds: ["semantic/alpha/config"], excludedIds: ["semantic/alpha/old-config"] },
  { name: "memory/knowledge-update: new auth, superseded excluded", category: "memory",
    query: q("auth oauth"), goldIds: ["semantic/alpha/new-auth"], excludedIds: ["semantic/alpha/old-auth"] },
  { name: "memory/cross-project: betastuff not leaked into alpha", category: "memory",
    query: q("betastuff"), goldIds: [], excludedIds: ["semantic/beta/secret"], expectAbstain: true },
  { name: "memory/abstention: irrelevant query surfaces no content match", category: "memory",
    query: q("xyzzy nonexistent topic"), goldIds: [], expectAbstain: true },
  { name: "qa/compound: auth+deploy question", category: "qa",
    query: q("how to set up auth and deploy"), goldIds: ["qa/alpha/auth-deploy"] },
  { name: "entity/no-leak: esbuild alpha page, beta excluded", category: "entity",
    query: q("esbuild"), goldIds: ["entity/alpha/esbuild"], excludedIds: ["entity/beta/esbuild"] },
  { name: "primer/include-exclude: core+semantic+procedural in, episodic/superseded/expired out", category: "primer",
    query: q("", "alpha"),
    goldIds: ["core/_global/yue", "semantic/alpha/build", "procedural/alpha/run-tests"],
    excludedIds: ["episodic/alpha/dbg", "semantic/alpha/old-auth", "semantic/alpha/old-config"] },
];
