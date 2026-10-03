import type {
  Account,
  AiCategorizationResponse,
  AnalyticsSummary,
  BulkRecategorizeResponse,
  CategorizationRule,
  Category,
  ImportBatch,
  Merchant,
  MonthlyAnalytics,
  Transaction,
} from './types'

const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      message = body.message || body.error || message
    } catch {
      // ignore non-json errors
    }
    throw new Error(message)
  }
  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

export const api = {
  getSummary: (from: string, to: string) =>
    request<AnalyticsSummary>(`/analytics/summary?from=${from}&to=${to}`),
  getMonthlyAnalytics: (year: number, timezone = 'Asia/Kolkata') =>
    request<MonthlyAnalytics>(`/analytics/monthly?year=${year}&timezone=${encodeURIComponent(timezone)}`),

  importGpay: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<ImportBatch>('/imports/gpay', { method: 'POST', body: form })
  },

  getTransactions: () => request<Transaction[]>('/transactions'),
  aiRecategorize: (limit: number) =>
    request<AiCategorizationResponse>('/transactions/ai-recategorize', jsonInit('POST', { limit })),
  bulkRecategorize: () =>
    request<BulkRecategorizeResponse>('/transactions/recategorize', { method: 'POST' }),
  getTransaction: (id: string) => request<Transaction>(`/transactions/${id}`),
  overrideCategory: (id: string, categoryId: string) =>
    request<Transaction>(`/transactions/${id}/category`, jsonInit('PATCH', { categoryId })),
  recategorize: (id: string) =>
    request<Transaction>(`/transactions/${id}/recategorize`, jsonInit('POST')),

  getCategories: () => request<Category[]>('/categories'),
  createCategory: (body: Partial<Category>) =>
    request<Category>('/categories', jsonInit('POST', body)),
  updateCategory: (id: string, body: Partial<Category>) =>
    request<Category>(`/categories/${id}`, jsonInit('PUT', body)),
  deleteCategory: (id: string) =>
    request<void>(`/categories/${id}`, jsonInit('DELETE')),

  getMerchants: () => request<Merchant[]>('/merchants'),
  createMerchant: (body: Partial<Merchant>) =>
    request<Merchant>('/merchants', jsonInit('POST', body)),
  updateMerchant: (id: string, body: Partial<Merchant>) =>
    request<Merchant>(`/merchants/${id}`, jsonInit('PUT', body)),

  getRules: () => request<CategorizationRule[]>('/rules'),
  createRule: (body: Partial<CategorizationRule>) =>
    request<CategorizationRule>('/rules', jsonInit('POST', body)),
  updateRule: (id: string, body: Partial<CategorizationRule>) =>
    request<CategorizationRule>(`/rules/${id}`, jsonInit('PUT', body)),
  deleteRule: (id: string) =>
    request<void>(`/rules/${id}`, jsonInit('DELETE')),

  getAccounts: () => request<Account[]>('/accounts'),
  createAccount: (body: Partial<Account>) =>
    request<Account>('/accounts', jsonInit('POST', body)),
  updateAccount: (id: string, body: Partial<Account>) =>
    request<Account>(`/accounts/${id}`, jsonInit('PUT', body)),
}
