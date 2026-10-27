export interface PubspecInfo {
  name: string | null;
  version: {
    major: number;
    minor: number;
  } | null;
}
export declare const pubspecCache: Map<string, PubspecInfo>;
export declare function readPubspec(pubspecPath: string): PubspecInfo;
/**
 * Versão mínima (major.minor) de uma restrição de SDK: `^3.13.0`,
 * `>=3.13.0 <4.0.0`, `<4.0.0 >=3.13.0`, `">= 3.13.0-0"`, `3.13.0`. Limites
 * superiores (`<`, `<=`) não contam; sem limite inferior (`any`) retorna null.
 */
export declare function parseSdkLowerBound(constraint: string): {
  major: number;
  minor: number;
} | null;
export declare function findNearestPubspec(file: string): string | null;
