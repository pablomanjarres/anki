/** Convert each supported deletion into the prompt shown before and after reveal. */
export function clozeDisplay(expression: string, revealed: boolean): string {
  return expression.replace(/\{\{c[1-9]\d*::([^}:]+)(?:::([^}]+))?\}\}/g,
    (_, answer: string, hint?: string) => revealed ? answer : `[${hint || '…'}]`);
}
