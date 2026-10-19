"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBlameEnabled = setBlameEnabled;
exports.isBlameEnabled = isBlameEnabled;
exports.getLineAuthor = getLineAuthor;
exports.formatBlameLine = formatBlameLine;
const child_process_1 = require("child_process");
const BLAME_MAX_BUFFER = 64 * 1024 * 1024;
const BLAME_TIMEOUT_MS = 15000;
let _blameEnabled = false;
const _blameCache = new Map();
function setBlameEnabled(enabled) {
  _blameEnabled = enabled;
}
function isBlameEnabled() {
  return _blameEnabled;
}
function getFileBlame(file) {
  const cached = _blameCache.get(file);
  if (cached) return cached;
  const lines = new Map();
  _blameCache.set(file, lines);
  let output;
  try {
    output = (0, child_process_1.execFileSync)("git", ["blame", "--porcelain", "--", file], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: BLAME_MAX_BUFFER,
      timeout: BLAME_TIMEOUT_MS,
    });
  } catch {
    return lines;
  }
  const commits = new Map();
  let sha = "";
  let finalLine = 0;
  for (const row of output.split("\n")) {
    if (row.startsWith("\t")) {
      const info = commits.get(sha);
      const uncommitted = /^0+$/.test(sha);
      if (info && !info.boundary && !uncommitted && info.author) {
        lines.set(finalLine, {
          author: info.author,
          sha,
          timestamp: info.timestamp,
          timezone: info.timezone,
        });
      }
      continue;
    }
    const header = row.match(/^([0-9a-f]{40}) \d+ (\d+)/);
    if (header) {
      sha = header[1];
      finalLine = parseInt(header[2], 10);
      if (!commits.has(sha)) {
        commits.set(sha, { author: "", timestamp: 0, timezone: "+0000", boundary: false });
      }
      continue;
    }
    const info = commits.get(sha);
    if (!info) continue;
    if (row.startsWith("author ")) {
      info.author = row.slice(7).trim();
    } else if (row.startsWith("author-time ")) {
      info.timestamp = parseInt(row.slice(12).trim(), 10) || 0;
    } else if (row.startsWith("author-tz ")) {
      info.timezone = row.slice(10).trim();
    } else if (row === "boundary") {
      info.boundary = true;
    }
  }
  return lines;
}
function getLineAuthor(file, line) {
  if (!file || !Number.isInteger(line) || line < 1) return null;
  return getFileBlame(file).get(line) ?? null;
}
function formatDate(timestamp, timezone) {
  const tz = timezone.match(/^([+-])(\d{2})(\d{2})$/);
  const offsetSeconds = tz
    ? (tz[1] === "-" ? -1 : 1) * (parseInt(tz[2], 10) * 3600 + parseInt(tz[3], 10) * 60)
    : 0;
  const date = new Date((timestamp + offsetSeconds) * 1000);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}
function escapeMarkdown(text) {
  return text.replace(/[\\`*_[\]<>#|~]/g, "\\$&");
}
function formatBlameLine(file, line) {
  if (!_blameEnabled) return "";
  const info = getLineAuthor(file, line);
  if (!info) return "";
  const parts = [`**${escapeMarkdown(info.author)}**`];
  if (info.timestamp) parts.push(formatDate(info.timestamp, info.timezone));
  parts.push(`\`${info.sha.slice(0, 7)}\``);
  return `👤 Última alteração: ${parts.join(" · ")}`;
}
