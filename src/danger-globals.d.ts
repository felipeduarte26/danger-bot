/**
 * GLOBAL DANGER TYPES
 * ===================
 * Tipos globais do Danger JS injetados em runtime
 */

declare global {
  const danger: any;
  const warn: (message: string, file?: string, line?: number) => void;
  const fail: (message: string, file?: string, line?: number) => void;
  const message: (message: string) => void;
  const markdown: (message: string) => void;
  const schedule: (asyncFunction: Promise<any>) => void;
}

export {};

