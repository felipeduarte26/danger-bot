export interface LineAuthor {
  author: string;
  sha: string;
  timestamp: number;
  timezone: string;
}
export declare function setBlameEnabled(enabled: boolean): void;
export declare function isBlameEnabled(): boolean;
export declare function getLineAuthor(file: string, line: number): LineAuthor | null;
export declare function formatBlameLine(file: string, line: number): string;
