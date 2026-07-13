import chalk from "chalk";
import { readPluginConfig } from "../spool/plugin-config.js";
import { ensureLocalRepo, commitWhitelist } from "../_shared/git-ops.js";

/** Paths the plugin writes during a digest. ONLY these get staged — never
 *  `git add -A`, so foreign files the user dropped in the repo (e.g.
 *  connect_extracts/) are never committed. NOTE: `.memarium/index.skips.json`
 *  is deliberately NOT here — the skip ledger is device-local (never synced),
 *  so it stays an uncommitted local file. */
const WHITELIST = [
  "raw_sessions",
  "memory",
  ".memarium/index.json",
  ".memarium/index.memory.json",
  ".memarium/index.entity.json",
  ".memarium/index.qa.json",
];

export interface FinalizeOptions { noPush?: boolean; }
export interface FinalizeReport {
  initialized: boolean;
  committed: boolean;
  pushed: boolean;
  staged: number;
  branch: string;
  remote: boolean;
}

/** End-of-digest closing commit. Ensures the session-repo is a git repo,
 *  commits all plugin-written paths, and auto-pushes if a remote is
 *  configured. Idempotent. Never throws into the skill — a git failure here
 *  must not fail the whole digest. */
export async function finalizeCmd(opts: FinalizeOptions = {}): Promise<FinalizeReport> {
  const cfg = readPluginConfig();
  try {
    const { git, initialized, path: repoPath } = await ensureLocalRepo(cfg.repoPath);

    // Current branch (works on an unborn HEAD via symbolic-ref). Never switch
    // branches — committing on the current branch avoids a dirty-tree checkout.
    let branch = cfg.deviceBranch || "main";
    try {
      const b = (await git.raw(["symbolic-ref", "--short", "HEAD"])).trim();
      if (b) branch = b;
    } catch { /* unborn / detached — keep fallback */ }

    // Remote only if config has a URL AND an origin remote actually exists
    // (npm `memarium init` created it). finalize never configures a remote.
    let remote = !!cfg.repoUrl;
    if (remote) {
      try {
        const remotes = await git.getRemotes(false);
        remote = remotes.some((r) => r.name === "origin");
      } catch { remote = false; }
    }

    const r = await commitWhitelist(
      git,
      repoPath,
      "memarium: finalize digest (raw_sessions + memory)",
      WHITELIST,
      { push: remote && !opts.noPush, branch },
      (s) => console.error(chalk.gray(`  ${s}`)),
    );
    return { initialized, committed: r.committed, pushed: r.pushed, staged: r.staged, branch: r.branch, remote };
  } catch (e) {
    console.error(chalk.red(`finalize: ${e instanceof Error ? e.message : String(e)}`));
    return { initialized: false, committed: false, pushed: false, staged: 0, branch: "", remote: false };
  }
}
