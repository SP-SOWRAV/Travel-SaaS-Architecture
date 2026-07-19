import { ApiRequestError } from './api-client';

// API_RULES §7: a VALIDATION_ERROR's `details` array is `{ field, issue }[]` — this maps
// it to a field-name lookup so a form can show each error next to the input it belongs to,
// instead of only a single generic banner at the top of the form.
export function extractFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiRequestError) || !Array.isArray(err.apiError.details)) {
    return {};
  }
  const fieldErrors: Record<string, string> = {};
  for (const entry of err.apiError.details as unknown[]) {
    if (entry && typeof entry === 'object' && 'field' in entry && 'issue' in entry) {
      const { field, issue } = entry as { field: string; issue: string };
      fieldErrors[field] = issue;
    }
  }
  return fieldErrors;
}
