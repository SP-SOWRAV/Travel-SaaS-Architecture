const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ApiError {
  code: string;
  message: string;
  details: unknown;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly apiError: ApiError,
    public readonly status: number,
  ) {
    super(apiError.message);
  }
}

// Normalizes both the documented API_RULES §7 error envelope and Nest's default
// exception shape (used until the global exception filter, TASKS.md T50, lands),
// so callers only ever handle one ApiError shape.
function normalizeError(body: unknown): ApiError {
  const parsed = body as { error?: ApiError; message?: string | string[] } | null;
  if (parsed?.error) {
    return parsed.error;
  }
  const message = Array.isArray(parsed?.message) ? parsed?.message.join(', ') : parsed?.message;
  return { code: 'UNKNOWN_ERROR', message: message ?? 'Something went wrong', details: null };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiRequestError(normalizeError(body), res.status);
  }

  return body?.data as T;
}

export interface LoginResponse {
  accessToken: string;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
