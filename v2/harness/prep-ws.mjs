// prepWorkspace(task, ws): a checkout at the issue's base commit holding only the history up to that commit.
// The workspace is a new repository that fetched one commit from the local mirror, so nothing later than the
// issue (the fix, later releases, other branches, tags) is in it: no refs, no remote, no reflog, no FETCH_HEAD.
import { execFileSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
const MIRRORS = join(os.homedir(), "ltb-tokenbench/swe/repos");
const git = (cwd, ...a) => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", maxBuffer: 256 << 20 }).trim();
export function prepWorkspace(task, ws) {
  const mirror = join(MIRRORS, `${task.repo.replace("/", "__")}.git`);
  try { git(mirror, "config", "--get", "uploadpack.allowAnySHA1InWant"); } catch { git(mirror, "config", "uploadpack.allowAnySHA1InWant", "true"); }
  rmSync(ws, { recursive: true, force: true }); mkdirSync(ws, { recursive: true });
  git(ws, "init", "-q", "-b", "main");
  git(ws, "fetch", "-q", "--no-tags", "--no-write-fetch-head", `file://${mirror}`, `${task.base_commit}:refs/heads/base`);
  git(ws, "checkout", "-q", "-B", "main", "base"); git(ws, "branch", "-q", "-D", "base");
  git(ws, "reflog", "expire", "--expire=now", "--all");
  git(ws, "config", "user.email", "bench@letthembuild.invalid"); git(ws, "config", "user.name", "bench");
  // Proof, kept with the run: the newest commit reachable from anything must be the base commit itself.
  const newest = git(ws, "log", "--all", "-1", "--format=%H %cI");
  const refs = git(ws, "for-each-ref", "--format=%(refname)").split("\n").filter(Boolean);
  if (!newest.startsWith(task.base_commit) || refs.join() !== "refs/heads/main") throw new Error(`workspace not clean: ${newest} ${refs}`);
  return { newest, refs, commits: +git(ws, "rev-list", "--all", "--count") };
}
