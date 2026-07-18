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

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
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

export interface SettingsResponse {
  id: string;
  agencyId: string;
  legalName: string | null;
  logoUrl: string | null;
  theme: 'light' | 'dark' | 'system';
  currencyCode: string;
  timezone: string;
  invoicePrefix: string;
  ticketPrefix: string;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  cityId: string | null;
  countryId: string | null;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateSettingsInput = Partial<
  Pick<
    SettingsResponse,
    | 'legalName'
    | 'logoUrl'
    | 'theme'
    | 'currencyCode'
    | 'timezone'
    | 'invoicePrefix'
    | 'ticketPrefix'
    | 'contactEmail'
    | 'contactPhone'
    | 'addressLine1'
    | 'addressLine2'
    | 'postalCode'
  >
>;

export function getSettings(accessToken: string): Promise<SettingsResponse> {
  return request<SettingsResponse>('/api/v1/settings', {
    headers: authHeaders(accessToken),
  });
}

export function updateSettings(
  accessToken: string,
  data: UpdateSettingsInput,
): Promise<SettingsResponse> {
  return request<SettingsResponse>('/api/v1/settings', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export interface BranchResponse {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  addressLine1: string | null;
  cityId: string | null;
  countryId: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateBranchInput = Pick<BranchResponse, 'name' | 'code'> &
  Partial<Pick<BranchResponse, 'addressLine1' | 'phone' | 'email'>>;

export type UpdateBranchInput = Partial<
  Pick<BranchResponse, 'name' | 'code' | 'addressLine1' | 'phone' | 'email' | 'isActive'>
>;

export function listBranches(accessToken: string): Promise<BranchResponse[]> {
  return request<BranchResponse[]>('/api/v1/branches', {
    headers: authHeaders(accessToken),
  });
}

export function createBranch(
  accessToken: string,
  data: CreateBranchInput,
): Promise<BranchResponse> {
  return request<BranchResponse>('/api/v1/branches', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function updateBranch(
  accessToken: string,
  id: string,
  data: UpdateBranchInput,
): Promise<BranchResponse> {
  return request<BranchResponse>(`/api/v1/branches/${id}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function deleteBranch(accessToken: string, id: string): Promise<void> {
  return request<void>(`/api/v1/branches/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
}

export type StaffRole = 'agency_admin' | 'branch_manager' | 'agent';

export interface UserResponse {
  id: string;
  agencyId: string | null;
  branchId: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: StaffRole;
  branchId?: string;
  phone?: string;
}

export type UpdateUserInput = Partial<
  Pick<UserResponse, 'fullName' | 'role' | 'branchId' | 'phone' | 'isActive'>
>;

export function listUsers(accessToken: string): Promise<UserResponse[]> {
  return request<UserResponse[]>('/api/v1/users', {
    headers: authHeaders(accessToken),
  });
}

export function createUser(accessToken: string, data: CreateUserInput): Promise<UserResponse> {
  return request<UserResponse>('/api/v1/users', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function updateUser(
  accessToken: string,
  id: string,
  data: UpdateUserInput,
): Promise<UserResponse> {
  return request<UserResponse>(`/api/v1/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}
