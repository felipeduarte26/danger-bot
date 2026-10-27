"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubspecCache = void 0;
exports.readPubspec = readPubspec;
exports.parseSdkLowerBound = parseSdkLowerBound;
exports.findNearestPubspec = findNearestPubspec;
/**
 * Leitura do pubspec.yaml mais próximo de um arquivo (nome do pacote e SDK mínimo).
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
exports.pubspecCache = new Map();
function readPubspec(pubspecPath) {
  const cached = exports.pubspecCache.get(pubspecPath);
  if (cached) return cached;
  const info = { name: null, version: null };
  try {
    const parsed = yaml.load(fs.readFileSync(pubspecPath, "utf-8"));
    if (typeof parsed?.name === "string") info.name = parsed.name;
    const sdk = parsed?.environment?.sdk;
    if (typeof sdk === "string") info.version = parseSdkLowerBound(sdk);
  } catch {
    // pubspec inválido: sem versão (o plugin não roda)
  }
  exports.pubspecCache.set(pubspecPath, info);
  return info;
}
/**
 * Versão mínima (major.minor) de uma restrição de SDK: `^3.13.0`,
 * `>=3.13.0 <4.0.0`, `<4.0.0 >=3.13.0`, `">= 3.13.0-0"`, `3.13.0`. Limites
 * superiores (`<`, `<=`) não contam; sem limite inferior (`any`) retorna null.
 */
function parseSdkLowerBound(constraint) {
  let lower = null;
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
function findNearestPubspec(file) {
  let dir = path.dirname(path.resolve(file));
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, "pubspec.yaml");
    if (fs.existsSync(candidate)) return candidate;
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
}
