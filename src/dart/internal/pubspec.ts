/**
 * Leitura do pubspec.yaml mais próximo de um arquivo (nome do pacote e SDK mínimo).
 */
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export interface PubspecInfo {
  name: string | null;
  version: { major: number; minor: number } | null;
}

export const pubspecCache = new Map<string, PubspecInfo>();

export function readPubspec(pubspecPath: string): PubspecInfo {
  const cached = pubspecCache.get(pubspecPath);
  if (cached) return cached;
  const info: PubspecInfo = { name: null, version: null };
  try {
    const parsed = yaml.load(fs.readFileSync(pubspecPath, "utf-8")) as {
      name?: unknown;
      environment?: { sdk?: unknown };
    } | null;
    if (typeof parsed?.name === "string") info.name = parsed.name;
    const sdk = parsed?.environment?.sdk;
    if (typeof sdk === "string") info.version = parseSdkLowerBound(sdk);
  } catch {
    // pubspec inválido: sem versão (o plugin não roda)
  }
  pubspecCache.set(pubspecPath, info);
  return info;
}

/**
 * Versão mínima (major.minor) de uma restrição de SDK: `^3.13.0`,
 * `>=3.13.0 <4.0.0`, `<4.0.0 >=3.13.0`, `">= 3.13.0-0"`, `3.13.0`. Limites
 * superiores (`<`, `<=`) não contam; sem limite inferior (`any`) retorna null.
 */
export function parseSdkLowerBound(constraint: string): { major: number; minor: number } | null {
  let lower: { major: number; minor: number } | null = null;
  const re = /(\^|>=|<=|>|<)?\s*(\d+)\.(\d+)(?:\.\d+)?(?:[-+][0-9A-Za-z.-]*)?/g;
  for (const m of constraint.matchAll(re)) {
    if (m[1] === "<" || m[1] === "<=") continue;
    const version = { major: parseInt(m[2], 10), minor: parseInt(m[3], 10) };
    const higher =
      lower === null ||
      version.major > lower.major ||
      (version.major === lower.major && version.minor > lower.minor);
    if (higher) lower = version;
  }
  return lower;
}

export function findNearestPubspec(file: string): string | null {
  let dir = path.dirname(path.resolve(file));
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, "pubspec.yaml");
    if (fs.existsSync(candidate)) return candidate;
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
}
