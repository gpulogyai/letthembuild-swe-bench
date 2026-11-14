// The one kernel profile every setup runs under, CLI alone or LetThemBuild (whose own seat sandbox is switched off
// for these runs, because macOS refuses a sandbox inside a sandbox). What it promises:
//  - nothing in the home folder can be read or written except the run's own workspace, the run's own home folder
//    (a fresh copy of a template, deleted after the run), the CLIs' installed programs, and the login keychain the
//    CLIs sign in through. The benchmark's data, grades, other runs and every other folder do not exist for the run.
//  - no network except the loopback, where the run's allow-list proxy listens. DNS still resolves (unix socket).
import { writeFileSync, realpathSync } from "node:fs";
import os from "node:os";
const real = (p) => realpathSync(p);
const q = (p) => JSON.stringify(p);
export function profile({ ws, home, extraRead = [], extraWrite = [] }) {
  const H = real(os.homedir());
  const read = [`${H}/.local`, `${H}/.grok/bin`, `${H}/.grok/vendor`, `${H}/.grok/bundled`, `${H}/.gemini/antigravity-cli/bin`, ...extraRead].map((p) => { try { return real(p); } catch { return p; } });
  const write = [real(ws), real(home), `${H}/Library/Keychains`, ...extraWrite].map((p) => { try { return real(p); } catch { return p; } });
  return `(version 1)
(allow default)
(deny file-read-data (subpath ${q(H)}))
(deny file-write* (subpath ${q(H)}))
(allow file-read-data ${read.map((p) => `(subpath ${q(p)})`).join(" ")})
(allow file-read-data file-write* ${write.map((p) => `(subpath ${q(p)})`).join(" ")})
(deny network-outbound)
(allow network-outbound (remote ip "localhost:*") (remote unix-socket))
`;
}
export function profileFile(file, opts) { writeFileSync(file, profile(opts)); return file; }
