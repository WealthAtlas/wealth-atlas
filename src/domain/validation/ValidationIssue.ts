export interface ValidationIssue {
  /** Entity field the problem belongs to, so a form can render it inline. */
  field: string;
  message: string;
}

export function isValid(issues: ValidationIssue[]): boolean {
  return issues.length === 0;
}

/** First issue for a field, if any. Convenience for `helperText` in MUI inputs. */
export function issueFor(issues: ValidationIssue[], field: string): string | undefined {
  return issues.find(issue => issue.field === field)?.message;
}

/** Renders issues as a single line, for logs and import warnings. */
export function summariseIssues(issues: ValidationIssue[]): string {
  return issues.map(issue => `${issue.field}: ${issue.message}`).join('; ');
}
