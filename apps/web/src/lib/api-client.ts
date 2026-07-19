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

export type UpdateMyProfileInput = Partial<Pick<UserResponse, 'fullName' | 'phone'>>;

export function getMe(accessToken: string): Promise<UserResponse> {
  return request<UserResponse>('/api/v1/me', {
    headers: authHeaders(accessToken),
  });
}

export function updateMe(
  accessToken: string,
  data: UpdateMyProfileInput,
): Promise<UserResponse> {
  return request<UserResponse>('/api/v1/me', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function changeMyPassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return request<void>('/api/v1/me/password', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export interface CustomerResponse {
  id: string;
  agencyId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  passportNumber: string | null;
  nationalityCountryId: string | null;
  dateOfBirth: string | null;
  addressLine1: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateCustomerInput = Pick<CustomerResponse, 'fullName'> &
  Partial<Pick<CustomerResponse, 'email' | 'phone' | 'passportNumber' | 'dateOfBirth' | 'addressLine1'>>;

export type UpdateCustomerInput = Partial<
  Pick<CustomerResponse, 'fullName' | 'email' | 'phone' | 'passportNumber' | 'dateOfBirth' | 'addressLine1'>
>;

export function listCustomers(accessToken: string, q?: string): Promise<CustomerResponse[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return request<CustomerResponse[]>(`/api/v1/customers${query}`, {
    headers: authHeaders(accessToken),
  });
}

export function createCustomer(
  accessToken: string,
  data: CreateCustomerInput,
): Promise<CustomerResponse> {
  return request<CustomerResponse>('/api/v1/customers', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function updateCustomer(
  accessToken: string,
  id: string,
  data: UpdateCustomerInput,
): Promise<CustomerResponse> {
  return request<CustomerResponse>(`/api/v1/customers/${id}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export interface AirlineResponse {
  id: string;
  iataCode: string;
  icaoCode: string | null;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listAirlines(accessToken: string): Promise<AirlineResponse[]> {
  return request<AirlineResponse[]>('/api/v1/airlines', {
    headers: authHeaders(accessToken),
  });
}

export interface AirportResponse {
  id: string;
  cityId: string;
  iataCode: string;
  icaoCode: string | null;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listAirports(accessToken: string): Promise<AirportResponse[]> {
  return request<AirportResponse[]>('/api/v1/airports', {
    headers: authHeaders(accessToken),
  });
}

export type PassengerTypeCode = 'ADT' | 'CHD' | 'INF';
export type CabinClassCode = 'economy' | 'premium_economy' | 'business' | 'first';

export interface CreateBookingPassengerInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passengerType?: PassengerTypeCode;
}

export interface CreateBookingSectorInput {
  airlineId: string;
  originAirportId: string;
  destinationAirportId: string;
  flightNumber: string;
  cabinClass?: CabinClassCode;
  departureAt: string;
  arrivalAt: string;
  sequenceNumber?: number;
}

export interface CreateBookingTaxInput {
  taxCode: string;
  description?: string;
  amount: number;
}

export interface CreateBookingFareInput {
  passengerIndex: number;
  sectorIndex: number;
  baseAmount: number;
  taxes?: CreateBookingTaxInput[];
}

export interface CreateBookingAggregateInput {
  customerId: string;
  branchId: string;
  passengers: CreateBookingPassengerInput[];
  sectors: CreateBookingSectorInput[];
  fares?: CreateBookingFareInput[];
}

export interface BookingPassengerResponse {
  id: string;
  firstName: string;
  lastName: string;
  passengerType: PassengerTypeCode;
}

export interface BookingSectorResponse {
  id: string;
  airlineId: string;
  originAirportId: string;
  destinationAirportId: string;
  flightNumber: string;
  cabinClass: CabinClassCode;
  departureAt: string;
  arrivalAt: string;
  sequenceNumber: number;
}

export interface BookingFareResponse {
  id: string;
  passengerId: string;
  sectorId: string;
  baseAmount: string;
  currencyCode: string;
  taxes: { id: string; taxCode: string; description: string | null; amount: string }[];
}

export interface BookingAggregateResponse {
  id: string;
  agencyId: string;
  bookingReference: string;
  customerId: string;
  branchId: string;
  agentId: string;
  status: string;
  currencyCode: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  passengers: BookingPassengerResponse[];
  sectors: BookingSectorResponse[];
  fares: BookingFareResponse[];
}

export function createBookingAggregate(
  accessToken: string,
  data: CreateBookingAggregateInput,
): Promise<BookingAggregateResponse> {
  return request<BookingAggregateResponse>('/api/v1/bookings', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function getBookingAggregate(
  accessToken: string,
  id: string,
): Promise<BookingAggregateResponse> {
  return request<BookingAggregateResponse>(`/api/v1/bookings/${id}`, {
    headers: authHeaders(accessToken),
  });
}

export interface BookingSummaryResponse {
  id: string;
  agencyId: string;
  bookingReference: string;
  customerId: string;
  branchId: string;
  agentId: string;
  status: string;
  currencyCode: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

export function listBookings(
  accessToken: string,
  filters: { status?: string; branchId?: string } = {},
): Promise<BookingSummaryResponse[]> {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.branchId) {
    params.set('branchId', filters.branchId);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<BookingSummaryResponse[]>(`/api/v1/bookings${query}`, {
    headers: authHeaders(accessToken),
  });
}

export function reserveBooking(
  accessToken: string,
  bookingId: string,
  reason?: string,
): Promise<BookingAggregateResponse> {
  return request<BookingAggregateResponse>(`/api/v1/bookings/${bookingId}/reserve`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function issueTicketForBooking(
  accessToken: string,
  bookingId: string,
  reason?: string,
): Promise<BookingAggregateResponse> {
  return request<BookingAggregateResponse>(`/api/v1/bookings/${bookingId}/issue-ticket`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function cancelBooking(
  accessToken: string,
  bookingId: string,
  reason: string,
): Promise<BookingAggregateResponse> {
  return request<BookingAggregateResponse>(`/api/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ reason }),
  });
}

export interface WorkflowTransitionResponse {
  id: string;
  bookingId: string;
  fromStage: string | null;
  toStage: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export function getBookingTransitions(
  accessToken: string,
  bookingId: string,
): Promise<WorkflowTransitionResponse[]> {
  return request<WorkflowTransitionResponse[]>(`/api/v1/bookings/${bookingId}/transitions`, {
    headers: authHeaders(accessToken),
  });
}

export interface InvoiceLineResponse {
  id: string;
  description: string;
  quantity: number;
  unitAmount: string;
  lineTotal: string;
  sortOrder: number;
}

export type InvoiceStatus = 'issued' | 'partially_paid' | 'paid' | 'void';

export interface InvoiceResponse {
  id: string;
  agencyId: string;
  bookingId: string;
  invoiceNumber: string;
  currencyCode: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  status: InvoiceStatus;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  lines?: InvoiceLineResponse[];
}

export function generateInvoice(
  accessToken: string,
  bookingId: string,
  reason?: string,
): Promise<InvoiceResponse> {
  return request<InvoiceResponse>(`/api/v1/bookings/${bookingId}/invoice`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function listInvoices(
  accessToken: string,
  filters: { status?: string; bookingId?: string } = {},
): Promise<InvoiceResponse[]> {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.bookingId) {
    params.set('bookingId', filters.bookingId);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<InvoiceResponse[]>(`/api/v1/invoices${query}`, {
    headers: authHeaders(accessToken),
  });
}

export function getInvoice(accessToken: string, id: string): Promise<InvoiceResponse> {
  return request<InvoiceResponse>(`/api/v1/invoices/${id}`, {
    headers: authHeaders(accessToken),
  });
}

export type PaymentMethodCode = 'cash' | 'card' | 'bank_transfer' | 'other';

export interface ReceiptResponse {
  id: string;
  agencyId: string;
  paymentId: string;
  receiptNumber: string;
  issuedAt: string;
}

export interface PaymentResponse {
  id: string;
  agencyId: string;
  invoiceId: string;
  amount: string;
  currencyCode: string;
  paymentMethod: PaymentMethodCode;
  reference: string | null;
  receivedBy: string;
  paidAt: string;
  createdAt: string;
  receipt?: ReceiptResponse;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: PaymentMethodCode;
  reference?: string;
  reason?: string;
}

export function recordPayment(
  accessToken: string,
  invoiceId: string,
  data: RecordPaymentInput,
): Promise<PaymentResponse> {
  return request<PaymentResponse>(`/api/v1/invoices/${invoiceId}/payments`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function listPaymentsForInvoice(accessToken: string, invoiceId: string): Promise<PaymentResponse[]> {
  return request<PaymentResponse[]>(`/api/v1/invoices/${invoiceId}/payments`, {
    headers: authHeaders(accessToken),
  });
}

export interface RefundResponse {
  id: string;
  agencyId: string;
  invoiceId: string;
  paymentId: string | null;
  amount: string;
  currencyCode: string;
  reason: string;
  processedBy: string;
  refundedAt: string;
  createdAt: string;
}

export interface ProcessRefundInput {
  amount: number;
  reason: string;
  paymentId?: string;
}

export function processRefund(
  accessToken: string,
  invoiceId: string,
  data: ProcessRefundInput,
): Promise<RefundResponse> {
  return request<RefundResponse>(`/api/v1/invoices/${invoiceId}/refunds`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });
}

export function listRefundsForInvoice(accessToken: string, invoiceId: string): Promise<RefundResponse[]> {
  return request<RefundResponse[]>(`/api/v1/invoices/${invoiceId}/refunds`, {
    headers: authHeaders(accessToken),
  });
}
