export type TransactionType = 'DEBIT' | 'CREDIT'
export type CategorySource = 'RULE' | 'MERCHANT' | 'DEFAULT' | 'MANUAL' | 'AI'

export interface AiCategorizationItemResult {
  transactionId: string
  categoryId: string | null
  categoryName: string | null
  confidence: number | null
  reason: string | null
  status: 'UPDATED' | 'PROPOSED' | 'LOW_CONFIDENCE' | 'FAILED' | string
}

export interface AiCategorizationResponse {
  scanned: number
  processed: number
  updated: number
  proposed: number
  skipped: number
  failed: number
  dryRun: boolean
  results: AiCategorizationItemResult[]
}

export interface BulkRecategorizeResponse {
  scanned: number
  assignedByRule: number
  assignedByMerchant: number
  leftAtDefault: number
}

export interface Category {
  id: string
  name: string
  description?: string
  transactionType?: string
  parentCategoryId?: string
  active: boolean
  systemDefined: boolean
}

export interface Merchant {
  id: string
  originalName: string
  normalizedName?: string
  defaultCategoryId?: string
  aliases: string[]
  active: boolean
}

export interface RuleCondition {
  field: string
  operator: string
  value: string
}

export interface CategorizationRule {
  id: string
  name: string
  categoryId: string
  transactionType?: string
  priority: number
  active: boolean
  conditions: RuleCondition[]
}

export interface Account {
  id: string
  provider?: string
  bankName?: string
  accountType?: string
  last4?: string
  currency?: string
  active: boolean
}

export interface Transaction {
  id: string
  source: string
  transactionDateTime: string
  type: TransactionType
  amount: number
  currency: string
  description: string
  upiTransactionId?: string
  importBatchId?: string
  counterparty: {
    originalName?: string
    normalizedName?: string
    upiId?: string
  }
  account: {
    accountId?: string
    bankName?: string
    last4?: string
  }
  category: {
    categoryId?: string
    categoryName?: string
    source?: CategorySource
    ruleId?: string
    confidence?: number
    manuallyOverridden?: boolean
  }
}

export interface ImportBatch {
  id: string
  source: string
  fileName: string
  fileHash: string
  statementPeriodStart?: string
  statementPeriodEnd?: string
  status: 'PROCESSING' | 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED'
  totalRows: number
  parsedRows: number
  importedRows: number
  duplicateRows: number
  failedRows: number
  errors: string[]
}

export interface AnalyticsSummary {
  from: string
  to: string
  transactionCount: number
  debits: number
  credits: number
  net: number
  amountByCategory: Record<string, number>
}

export interface MonthlyAnalyticsMonth {
  month: number
  monthName: string
  totalTransactionAmount: number
  totalDebits: number
  totalCredits: number
}

export interface MonthlyAnalytics {
  year: number
  months: MonthlyAnalyticsMonth[]
}
