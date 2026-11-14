// The run's only way out: an HTTP(S) proxy on the loopback that lets through the model providers' own hosts and
// the Python package index, and refuses everything else (GitHub included). Every request is logged, allowed or
// refused, so the contamination check can show what a run tried to reach.
import http from "node:http";
import net from "node:net";
import { appendFileSync } from "node:fs";
export const ALLOW = [
  // Anthropic (Claude Code)
  "api.anthropic.com", "console.anthropic.com", "claude.ai", "statsig.anthropic.com", "platform.claude.com",
  // OpenAI (Codex)
  "chatgpt.com", "api.openai.com", "auth.openai.com", "ab.chatgpt.com",
  // xAI (Grok CLI)
  "api.x.ai", "auth.x.ai", "accounts.x.ai", "cli-chat-proxy.grok.com",
  // Google (Antigravity CLI)
  "cloudcode-pa.googleapis.com", "daily-cloudcode-pa.googleapis.com", "oauth2.googleapis.com", "www.googleapis.com",
  "accounts.google.com", "antigravity-pa.googleapis.com",
  // LetThemBuild's own account and plan checks
  "letthembuild.com", "www.letthembuild.com", "api.letthembuild.com", "letthem.chat", "www.letthem.chat", "letthemchat.com", "www.letthemchat.com", "api.letthemchat.com",
  // Python packages
  "pypi.org", "files.pythonhosted.org",
];
const allowed = (host) => ALLOW.includes(String(host).toLowerCase());
export function startProxy(logFile, allow = allowed) {
  const log = (verdict, host, how) => { try { appendFileSync(logFile, `${new Date().toISOString()} ${verdict} ${how} ${host}\n`); } catch {} };
  const server = http.createServer((req, res) => { // plain http: absolute-form URL
    let u; try { u = new URL(req.url); } catch { res.writeHead(400).end(); return; }
    if (!allow(u.hostname)) { log("REFUSED", u.hostname, "http"); res.writeHead(403).end("refused by the benchmark's network allow-list\n"); return; }
    log("allowed", u.hostname, "http");
    const up = http.request({ host: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on("error", () => res.destroy()); req.pipe(up);
  });
  server.on("connect", (req, sock, head) => {
    const [host, port] = String(req.url).split(":");
    if (!allow(host)) { log("REFUSED", host, "connect"); sock.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return; }
    log("allowed", host, "connect");
    const up = net.connect(+port || 443, host, () => { sock.write("HTTP/1.1 200 Connection Established\r\n\r\n"); up.write(head); up.pipe(sock); sock.pipe(up); });
    up.on("error", () => sock.destroy()); sock.on("error", () => up.destroy());
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ port: server.address().port, close: () => server.close() })));
}
