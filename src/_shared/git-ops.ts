// @sync-from: github.com/june9593/memarium → src/git-ops.ts
// Keep this file in sync with the canonical version above. If you fix a bug here, also patch it there.

import { simpleGit, SimpleGit } from "simple-git";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

/**
 * Expand a leading `~` to the user's home dir. (Shell expansion doesn't
 * happen for prompt input — `~/code` would be taken literally otherwise.)
 */
export function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/**
 * Clone with stdio inherited so git's terminal-based credential prompts
 * (HTTPS username/password, SSH passphrase) actually reach the user instead
 * of hanging forever on a piped FD that no one writes to. Also sets
 * GIT_TERMINAL_PROMPT=0 when stdin isn't a TTY so the call fails fast in CI
 * instead of hanging.
 */
function cloneWithProgress(repoUrl: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (!process.stdin.isTTY) env.GIT_TERMINAL_PROMPT = "0";
    const p = spawn("git", ["clone", "--progress", repoUrl, dest], {
      stdio: "inherit",
      env,
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone exited with code ${code}. If this is an HTTPS URL needing auth, prefer SSH (git@github.com:...) or store a PAT via 'git config credential.helper'.`));
    });
  });
}

export interface MaterializeResult {
  /** "cloned" = brand-new clone; "existing" = used existing checkout;
   *  "init" = empty dir made into a git repo with origin set. */
  kind: "cloned" | "existing" | "init";
  /** When "existing", this is the URL of `origin` already in that repo —
   *  may differ from repoUrl, in which case caller should warn the user. */
  existingRemote?: string;
}

/**
 * Make sure `localPath` contains the repo at `repoUrl`.
 *
 * - If `localPath` doesn't exist OR exists-and-empty → `git clone repoUrl
 *   localPath`. Returns kind:"cloned".
 * - If `localPath` exists and contains `.git` → reuse. Returns kind:"existing"
 *   with `existingRemote` so the wizard can warn on URL mismatch. Does NOT
 *   change the existing remote.
 * - If `localPath` exists, non-empty, no `.git` → throw with a friendly
 *   message; refuse to scribble inside an unrelated dir.
 */
export async function materializeRepoAtPath(
  localPath: string,
  repoUrl: string,
): Promise<MaterializeResult> {
  const path = resolve(expandHome(localPath));
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    await cloneWithProgress(repoUrl, path);
    return { kind: "cloned" };
  }
  const entries = readdirSync(path);
  if (entries.length === 0) {
    await cloneWithProgress(repoUrl, path);
    return { kind: "cloned" };
  }
  if (entries.includes(".git")) {
    const git = simpleGit(path);
    let remote = "";
    try {
      remote = (await git.getConfig("remote.origin.url")).value ?? "";
    } catch { /* no remote configured */ }
    return { kind: "existing", existingRemote: remote };
  }
  throw new Error(
    `${path} is not empty and is not a git repo. Pick another path or empty this one first.`,
  );
}

export async function ensureRepo(localPath: string, repoUrl: string): Promise<SimpleGit> {
  await materializeRepoAtPath(localPath, repoUrl);
  const git = simpleGit(localPath);
  if (!existsSync(join(localPath, ".git"))) {
    await git.init();
    await git.addRemote("origin", repoUrl).catch(() => { /* exists */ });
  }
  return git;
}

/**
 * Make sure the working tree is on `branch`.
 * Priority:
 *   1. Local branch exists → checkout.
 *   2. Remote `origin/<branch>` exists → checkout tracking branch.
 *   3. Neither → create as orphan (empty history, no parent).
 */
export async function ensureDeviceBranch(git: SimpleGit, branch: string): Promise<void> {
  const local = await git.branchLocal();
  if (local.all.includes(branch)) {
    if (local.current !== branch) await git.checkout(branch);
    return;
  }
  let remoteHas = false;
  try {
    const remote = await git.branch(["-r"]);
    remoteHas = remote.all.includes(`origin/${branch}`);
  } catch { /* no remotes fetched yet */ }
  if (remoteHas) {
    await git.checkout(["-b", branch, "--track", `origin/${branch}`]);
    return;
  }
  await git.checkout(["--orphan", branch]);
  await git.raw(["rm", "-rf", "--cached", "--ignore-unmatch", "."]);
}

export interface PushResult {
  ok: boolean;
  /** True iff stderr matched GitHub's push-protection / secret-scanning markers
   *  (GH013 / "push protection"). Only meaningful when ok=false. */
  secretBlocked: boolean;
  /** Tail of stderr (last ~4KB), useful for surfacing the reason. */
  stderrTail: string;
}

const SECRET_BLOCK_RE = /GH013|push protection|secret-scanning/i;

function pushWithProgress(cwd: string, branch: string): Promise<PushResult> {
  return new Promise((resolve) => {
    const errBuf: string[] = [];
    let bufLen = 0;
    const p = spawn(
      "git",
      ["push", "--progress", "--set-upstream", "origin", branch],
      { cwd, stdio: ["ignore", "inherit", "pipe"] },
    );
    p.stderr.on("data", (chunk: Buffer) => {
      // Tee to both terminal (so live progress still shows) AND buffer (so we
      // can scan for GitHub push-protection markers after exit).
      process.stderr.write(chunk);
      const s = chunk.toString();
      errBuf.push(s);
      bufLen += s.length;
      if (bufLen > 8192) {
        const drop = errBuf.shift();
        if (drop) bufLen -= drop.length;
      }
    });
    p.on("error", () => resolve({ ok: false, secretBlocked: false, stderrTail: errBuf.join("") }));
    p.on("close", (code) => {
      const tail = errBuf.join("");
      resolve({
        ok: code === 0,
        secretBlocked: code !== 0 && SECRET_BLOCK_RE.test(tail),
        stderrTail: tail.slice(-4096),
      });
    });
  });
}

export async function commitAndPush(
  git: SimpleGit,
  message: string,
  paths: string[],
  branch: string,
  onProgress?: (stage: string) => void,
): Promise<{ committed: boolean; pushed: boolean; pushResult?: PushResult }> {
  if (paths.length === 0) return { committed: false, pushed: false };
  onProgress?.(`git add (${paths.length} paths)...`);
  // Keep argv bounded even during a large migration, and never interpret
  // session filenames as pathspec globs. The private file contains paths only.
  const stagingDir = mkdtempSync(join(tmpdir(), "memarium-git-add-"));
  try {
    const pathspec = join(stagingDir, "paths");
    writeFileSync(pathspec, paths.join("\0") + "\0", { mode: 0o600 });
    await git.raw(["--literal-pathspecs", "add", `--pathspec-from-file=${pathspec}`, "--pathspec-file-nul"]);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
  const status = await git.status();
  if (status.staged.length === 0) return { committed: false, pushed: false };
  onProgress?.(`git commit (${status.staged.length} staged)...`);
  await git.commit(message);
  onProgress?.(`git push origin ${branch} (live progress below):`);
  const cwd = await git.revparse(["--show-toplevel"]).then((s) => s.trim());
  const r = await pushWithProgress(cwd, branch);
  return { committed: true, pushed: r.ok, pushResult: r };
}

/**
 * Bring the local device branch in sync with origin before we try to push,
 * so the GitHub Action's auto-commits don't cause non-fast-forward push
 * failures on the next `memarium sync` / `digest` run.
 *
 * Sequence:
 *   1. fetch origin
 *   2. if no remote tracking ref exists → skip (fresh branch, nothing to pull)
 *   3. try `pull --rebase --autostash` — handles both fast-forward and
 *      diverged-history cases, and auto-stashes any unstaged digest output
 *      sitting in the working tree
 *   4. on rebase conflict: abort cleanly and throw a friendly error pointing
 *      the user at the repo path. We deliberately do NOT try to auto-resolve
 *      (digest output + rebased remote changes are too risky to merge blindly)
 *
 * Caller is expected to handle the thrown error — surface the path to the
 * user and skip push for this run.
 */
export async function fastForwardBranch(
  git: SimpleGit,
  branch: string,
  onProgress?: (stage: string) => void,
): Promise<{ pulled: boolean; reason?: "no-tracking" | "no-remote" }> {
  let hasRemote = false;
  try {
    const remotes = await git.getRemotes(false);
    hasRemote = remotes.some((r) => r.name === "origin");
  } catch { /* ignore */ }
  if (!hasRemote) return { pulled: false, reason: "no-remote" };

  onProgress?.(`git fetch origin...`);
  try { await git.fetch("origin", branch); } catch { /* upstream branch may not exist yet */ }

  // Check whether origin/<branch> ref exists locally after the fetch.
  let hasUpstream = false;
  try {
    const refs = await git.branch(["-r"]);
    hasUpstream = refs.all.includes(`origin/${branch}`);
  } catch { /* ignore */ }
  if (!hasUpstream) return { pulled: false, reason: "no-tracking" };

  onProgress?.(`git pull --rebase --autostash origin ${branch}...`);
  try {
    await git.raw(["pull", "--rebase", "--autostash", "origin", branch]);
    return { pulled: true };
  } catch (err) {
    // Rebase conflict (or autostash-pop conflict). Clean up so we leave the
    // working tree in a sane state, then throw with actionable guidance.
    try { await git.raw(["rebase", "--abort"]); } catch { /* not in rebase */ }
    try { await git.raw(["stash", "pop"]); } catch { /* nothing to pop */ }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not fast-forward / rebase '${branch}' onto origin/${branch}. ` +
      `Resolve manually in the repo, then re-run. Original error:\n${msg}`,
    );
  }
}

/** Ensure localPath is a git repo WITHOUT requiring a remote. mkdir + git init
 *  if absent (self-contained mode — no `memarium init` / clone needed). Does
 *  NOT configure a remote; an existing origin (from npm `memarium init`) is
 *  left as-is. Sets a LOCAL fallback commit identity only when no git identity
 *  resolves (containers / fresh machines with no global config) so the first
 *  commit can't fail with "Author identity unknown"; an existing global/user
 *  identity is never clobbered. */
export async function ensureLocalRepo(localPath: string): Promise<{ git: SimpleGit; initialized: boolean; path: string }> {
  const path = resolve(expandHome(localPath));
  let initialized = false;
  if (!existsSync(join(path, ".git"))) {
    mkdirSync(path, { recursive: true });
    const g = simpleGit(path);
    await g.init();
    const hasIdentity = await g
      .raw(["config", "user.email"])
      .then((s) => s.trim().length > 0)
      .catch(() => false);
    if (!hasIdentity) {
      await g.addConfig("user.email", "memarium@localhost");
      await g.addConfig("user.name", "memarium");
    }
    initialized = true;
  }
  return { git: simpleGit(path), initialized, path };
}

export interface FinalizeResult { committed: boolean; pushed: boolean; staged: number; branch: string; }

/** Commit an explicit whitelist (only the paths that actually exist under
 *  repoPath), and optionally push the current branch. NEVER `git add -A`, and
 *  the commit uses the whitelist as an explicit pathspec so a foreign file that
 *  was ALREADY staged before this call is neither committed nor counted — only
 *  whitelist paths ever land in the commit. Push failures (offline / no
 *  upstream) are swallowed: committed stays true, pushed becomes false. */
export async function commitWhitelist(
  git: SimpleGit,
  repoPath: string,
  message: string,
  candidatePaths: string[],
  opts: { push: boolean; branch: string },
  onProgress?: (s: string) => void,
): Promise<FinalizeResult> {
  const existing = candidatePaths.filter((p) => existsSync(join(repoPath, p)));
  if (existing.length === 0) return { committed: false, pushed: false, staged: 0, branch: opts.branch };
  onProgress?.(`git add (${existing.length} whitelist paths)...`);
  await git.add(existing);
  const status = await git.status();
  // Count ONLY staged paths that fall inside the whitelist — a foreign file
  // staged before finalize must neither block (false "nothing to commit") nor
  // ride along.
  const underWhitelist = (f: string) =>
    existing.some((w) => { const ww = w.replace(/\/+$/, ""); return f === ww || f.startsWith(ww + "/"); });
  const stagedWhitelist = status.staged.filter(underWhitelist);
  if (stagedWhitelist.length === 0) return { committed: false, pushed: false, staged: 0, branch: opts.branch };
  onProgress?.(`git commit (${stagedWhitelist.length} whitelist paths)...`);
  // Commit ONLY the whitelist pathspecs. `git commit -- <pathspec>` records the
  // working-tree content of those paths and IGNORES any other staged entries,
  // so a pre-staged foreign file stays staged but is never committed.
  await git.commit(message, existing);
  const staged = stagedWhitelist.length;
  if (!opts.push) return { committed: true, pushed: false, staged, branch: opts.branch };
  try {
    await fastForwardBranch(git, opts.branch, onProgress);
  } catch (e) {
    onProgress?.(`push skipped (could not sync): ${(e as Error).message}`);
    return { committed: true, pushed: false, staged, branch: opts.branch };
  }
  const cwd = await git.revparse(["--show-toplevel"]).then((s) => s.trim());
  const r = await pushWithProgress(cwd, opts.branch);
  return { committed: true, pushed: r.ok, staged, branch: opts.branch };
}
