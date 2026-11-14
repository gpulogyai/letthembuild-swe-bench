// A fresh home folder for every run, copied from home-template/. It holds each CLI's settings for these runs (web
// search and web fetch off, no plugins, no history) and copies of the two sign-ins kept as files (Codex, Grok);
// Claude Code and Antigravity sign in through the login keychain. After the run a sign-in file the CLI refreshed
// is copied back to the template, so the next run starts signed in, and the run's home is deleted.
import { cpSync, rmSync, existsSync, statSync, copyFileSync, mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
export const TEMPLATE = join(import.meta.dirname, "home-template");
export const AUTH_FILES = [".codex/auth.json", ".grok/auth.json"];
export function makeHome(home) {
  rmSync(home, { recursive: true, force: true });
  cpSync(TEMPLATE, home, { recursive: true });
  mkdirSync(join(home, "tmp"), { recursive: true });
  // The login keychain is found through $HOME/Library/Keychains; without this link Claude Code and Antigravity are signed out.
  mkdirSync(join(home, "Library"), { recursive: true }); symlinkSync(join(os.homedir(), "Library/Keychains"), join(home, "Library/Keychains"));
  return home;
}
export function returnHome(home) {
  for (const f of AUTH_FILES) {
    const a = join(home, f), t = join(TEMPLATE, f);
    if (existsSync(a) && (!existsSync(t) || statSync(a).mtimeMs > statSync(t).mtimeMs)) copyFileSync(a, t);
  }
}
