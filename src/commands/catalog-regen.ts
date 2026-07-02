import chalk from "chalk";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadBookIndexV2, saveBookIndexV2 } from "../digest/book-index-v2.js";
import { generateBookCatalog } from "../digest/book-catalog.js";
import { reconcileOrphanChronicles } from "../digest/reconcile-orphans.js";
import { ensureRepo, ensureDeviceBranch, fastForwardBranch, commitAndPush } from "../_shared/git-ops.js";

export interface CatalogRegenOptions {
  /** Skip the git commit + push step. */
  noCommit?: boolean;
}

export interface CatalogRegenReport {
  /** Repo-rooted paths the catalog renderer wrote. */
  written: string[];
  /** Orphan chronicle md (written directly, bypassing publish) re-registered. */
  healed: string[];
  committed: boolean;
  pushed: boolean;
}

/**
 * Regenerate every catalog file from the existing BookIndex on disk. The
 * global-mode `/memarium` skill runs this once after subagent fan-out has
 * published into each project — that way the project subagents never thrash
 * the catalog and we get one consistent regen + one commit at the end.
 *
 * Before rendering, reconciles orphan chronicle md (written directly under
 * book/<project>/chronicle/, bypassing publish → absent from the index, #38)
 * so a whole project can't silently vanish from the catalog. The index stays
 * the source of truth; reconcile just re-registers what was already on disk.
 */
export async function catalogRegenCmd(opts: CatalogRegenOptions): Promise<CatalogRegenReport> {
  const cfg = readPluginConfig();
  const bookIndex = loadBookIndexV2(cfg.repoPath);

  const orphans = reconcileOrphanChronicles(cfg.repoPath, bookIndex);
  if (orphans.healed.length > 0) {
    console.log(chalk.cyan(`+ reconciled ${orphans.healed.length} orphan chronicle(s) into the index (written directly, bypassing publish):`));
    for (const p of orphans.healed) console.log(chalk.gray(`    ${p}`));
    saveBookIndexV2(cfg.repoPath, bookIndex);
  }
  for (const s of orphans.skipped) {
    console.log(chalk.yellow(`! skipped orphan ${s.path}: ${s.reason}`));
  }

  const catalog = generateBookCatalog(cfg.repoPath, bookIndex);

  const report: CatalogRegenReport = {
    written: catalog.written,
    healed: orphans.healed,
    committed: false,
    pushed: false,
  };

  if (opts.noCommit || !cfg.repoUrl || !cfg.deviceBranch) return report;

  const git = await ensureRepo(cfg.repoPath, cfg.repoUrl);
  try { await git.fetch(); } catch { /* offline / empty */ }
  await ensureDeviceBranch(git, cfg.deviceBranch);
  try {
    await fastForwardBranch(git, cfg.deviceBranch, (s) => console.log(chalk.gray(`  ${s}`)));
  } catch (err) {
    console.log(chalk.red(`! could not sync with origin: ${err instanceof Error ? err.message : String(err)}`));
    console.log(chalk.cyan(`  Catalog regenerated locally; push skipped.`));
    return report;
  }
  // Stage the regen'd catalog + any healed orphan md (now first-class) + the
  // index file, so the reconciliation persists to the remote.
  const staged = [...catalog.written, ...orphans.healed, ".memarium/index.book.json"];
  const r = await commitAndPush(
    git,
    "memarium: regen catalog",
    staged,
    cfg.deviceBranch,
    (stage) => console.log(chalk.gray(`  ${stage}`)),
  );
  report.committed = r.committed;
  report.pushed = r.pushed;
  return report;
}
