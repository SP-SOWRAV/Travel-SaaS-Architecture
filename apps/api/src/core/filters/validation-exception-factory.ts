import { UnprocessableEntityException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

// API_RULES §5: validation failures return 422 with every failing field listed in one
// response, never the ValidationPipe's 400 default — this exceptionFactory (wired into
// the global ValidationPipe, main.ts) is the one place that shaping happens, so no DTO or
// controller ever hand-formats a validation error itself (CODING_STANDARDS §8).
function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): { field: string; issue: string }[] {
  const result: { field: string; issue: string }[] = [];

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      result.push({ field: path, issue: Object.values(error.constraints).join(', ') });
    }
    if (error.children && error.children.length > 0) {
      result.push(...flattenValidationErrors(error.children, path));
    }
  }

  return result;
}

export function validationExceptionFactory(errors: ValidationError[]): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'VALIDATION_ERROR',
    message: 'Request failed validation',
    details: flattenValidationErrors(errors),
  });
}
