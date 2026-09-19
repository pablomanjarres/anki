/** Convert Anki's first deletion into the prompt shown before and after reveal. */
export function clozeDisplay(expression: string, revealed: boolean): string {
  return expression.replace(/\{\{c1::([^}:]+)(?:::([^}]+))?\}\}/g,
    (_, answer: string, hint?: string) => revealed ? answer : `[${hint || '…'}]`);
}
