import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { BulkRecategorizeResponse, Category, Transaction } from '../types'
import { formatDateTime, formatInr } from '../utils'

function dateInBusinessTimezone(isoDate: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoDate))
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [openColumnFilter, setOpenColumnFilter] = useState<'category' | 'type' | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [aiLimit, setAiLimit] = useState(20)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiResult, setAiResult] = useState<Awaited<ReturnType<typeof api.aiRecategorize>> | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkRecategorizeResponse | null>(null)

  async function load() {
    setError('')
    try {
      const [txns, cats] = await Promise.all([api.getTransactions(), api.getCategories()])
      setTransactions(txns)
      setCategories(cats.filter((c) => c.active))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!openColumnFilter) return
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Element && !event.target.closest('.table-column-menu')) {
        setOpenColumnFilter(null)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenColumnFilter(null)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openColumnFilter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions.filter((t) => {
      const date = dateInBusinessTimezone(t.transactionDateTime)
      if (fromDate && date < fromDate) return false
      if (toDate && date > toDate) return false
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      const category = t.category?.categoryName?.trim() || 'Uncategorized'
      if (categoryFilter !== 'all' && category !== categoryFilter) return false
      if (!q) return true
      const hay = [
        t.description,
        t.counterparty?.originalName,
        t.category?.categoryName,
        t.upiTransactionId,
        t.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [transactions, query, fromDate, toDate, categoryFilter, typeFilter])

  const categoryOptions = useMemo(() => Array.from(new Set([
    ...categories.map((category) => category.name),
    ...transactions.map((transaction) => transaction.category?.categoryName?.trim() || 'Uncategorized'),
  ])).sort((a, b) => a.localeCompare(b)), [categories, transactions])

  async function onOverride(id: string, categoryId: string) {
    if (!categoryId) return
    setBusyId(id)
    try {
      const updated = await api.overrideCategory(id, categoryId)
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Override failed')
    } finally {
      setBusyId('')
    }
  }

  async function onRecategorize(id: string) {
    setBusyId(id)
    try {
      const updated = await api.recategorize(id)
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recategorize failed')
    } finally {
      setBusyId('')
    }
  }

  async function onAiCategorize() {
    setError('')
    setAiResult(null)
    setAiBusy(true)
    try {
      const result = await api.aiRecategorize(aiLimit)
      setAiResult(result)
      setTransactions(await api.getTransactions())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI categorization failed')
    } finally {
      setAiBusy(false)
    }
  }

  async function onBulkRecategorize() {
    const confirmed = window.confirm(
      'Re-run automatic categorization for all uncategorized or default-category transactions? Transactions with other categories are not included.',
    )
    if (!confirmed) return

    setError('')
    setBulkResult(null)
    setBulkBusy(true)
    try {
      const result = await api.bulkRecategorize()
      setBulkResult(result)
      setTransactions(await api.getTransactions())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk recategorization failed')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Transactions</h1>
          <p>Browse imported rows, override category, or re-run auto-categorization.</p>
        </div>
        <div className="page-actions">
          <button className="btn secondary" type="button" disabled={aiBusy || bulkBusy} onClick={() => void load()}>
            Refresh
          </button>
          <button className="btn secondary bulk-recategorize-button" type="button" disabled={aiBusy || bulkBusy || transactions.length === 0} onClick={() => void onBulkRecategorize()}>
            {bulkBusy ? 'Recategorizing…' : 'Recategorize uncategorized'}
          </button>
        </div>
      </div>

      {bulkResult && (
        <section className="bulk-recategorize-result panel" aria-live="polite">
          <strong>Bulk recategorization complete</strong>
          <span>{bulkResult.scanned} scanned</span>
          <span>{bulkResult.assignedByRule} assigned by rules</span>
          <span>{bulkResult.assignedByMerchant} assigned by merchants</span>
          <span>{bulkResult.leftAtDefault} left at default</span>
        </section>
      )}

      <section className="ai-categorize-panel panel" aria-labelledby="ai-categorize-title">
        <div className="ai-categorize-copy">
          <span className="ai-kicker">AI assist</span>
          <h2 id="ai-categorize-title">Auto-categorize transactions</h2>
          <p>Apply AI suggestions to uncategorized transactions. Manually assigned categories are protected.</p>
        </div>
        <div className="ai-categorize-controls">
          <div className="field ai-limit-field">
            <label htmlFor="ai-limit">Transaction limit</label>
            <input
              id="ai-limit"
              type="number"
              min={1}
              max={100}
              step={1}
              value={aiLimit}
              disabled={aiBusy}
              onChange={(event) => setAiLimit(Number(event.target.value))}
            />
          </div>
          <button
            className="btn ai-categorize-button"
            type="button"
            disabled={aiBusy || bulkBusy || transactions.length === 0 || !Number.isInteger(aiLimit) || aiLimit < 1 || aiLimit > 100}
            onClick={() => void onAiCategorize()}
          >
            {aiBusy ? 'Categorizing…' : '✦  Categorize with AI'}
          </button>
        </div>
        <span className="ai-limit-note">Processes up to {aiLimit || 'your selected'} eligible transactions per run (maximum 100).</span>
      </section>

      {aiResult && (
        <section className="ai-result panel" aria-live="polite">
          <div className="ai-result-heading">
            <div>
              <strong>AI categorization complete</strong>
              <span>{aiResult.scanned} scanned</span>
            </div>
            <span className="ai-complete-mark" aria-hidden="true">✓</span>
          </div>
          <div className="ai-result-counts">
            <span><strong>{aiResult.updated}</strong> updated</span>
            <span><strong>{aiResult.skipped}</strong> skipped</span>
            <span><strong>{aiResult.failed}</strong> failed</span>
          </div>
          {aiResult.results.length > 0 && (
            <details className="ai-result-details">
              <summary>View transaction results</summary>
              <div className="ai-result-list">
                {aiResult.results.slice(0, 12).map((item) => (
                  <div className="ai-result-row" key={item.transactionId}>
                    <span className="ai-result-category">{item.categoryName || item.reason || 'No category assigned'}</span>
                    <span className={`ai-status ${item.status.toLowerCase().replace(/_/g, '-')}`}>{item.status.replace(/_/g, ' ')}</span>
                    {item.confidence !== null && item.confidence !== undefined && (
                      <span className="ai-confidence">{Math.round(item.confidence * 100)}%</span>
                    )}
                  </div>
                ))}
                {aiResult.results.length > 12 && <span className="muted ai-more-results">Showing 12 of {aiResult.results.length} results.</span>}
              </div>
            </details>
          )}
          <details className="ai-result-details ai-raw-response">
            <summary>View response JSON</summary>
            <pre>{JSON.stringify(aiResult, null, 2)}</pre>
          </details>
        </section>
      )}

      <div className="transaction-filter-bar">
        <div className="field transaction-search-field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            className="search"
            placeholder="Merchant, category, UPI id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="transaction-from">From date</label>
          <input id="transaction-from" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="transaction-to">To date</label>
          <input id="transaction-to" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} />
        </div>
        <button
          className="btn secondary clear-transaction-filters"
          type="button"
          disabled={!query && !fromDate && !toDate && categoryFilter === 'all' && typeFilter === 'all'}
          onClick={() => {
            setQuery('')
            setFromDate('')
            setToDate('')
            setCategoryFilter('all')
            setTypeFilter('all')
          }}
        >
          Clear filters
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      <p className="transaction-result-count muted">Showing {filtered.length} of {transactions.length} transactions</p>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Details</th>
              <th>
                <div className="table-column-menu">
                  <button
                    className={`table-filter-trigger${typeFilter !== 'all' ? ' active' : ''}`}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={openColumnFilter === 'type'}
                    onClick={() => setOpenColumnFilter((current) => current === 'type' ? null : 'type')}
                  >
                    <span>Type</span><span className="filter-chevron" aria-hidden="true">▾</span>
                  </button>
                  {openColumnFilter === 'type' && (
                    <div className="table-filter-options" role="menu" aria-label="Filter by type">
                      {[
                        { value: 'all', label: 'All types' },
                        { value: 'DEBIT', label: 'Debit' },
                        { value: 'CREDIT', label: 'Credit' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="menuitemradio"
                          aria-checked={typeFilter === option.value}
                          className={typeFilter === option.value ? 'selected' : ''}
                          onClick={() => {
                            setTypeFilter(option.value)
                            setOpenColumnFilter(null)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              <th>Amount</th>
              <th>
                <div className="table-column-menu">
                  <button
                    className={`table-filter-trigger${categoryFilter !== 'all' ? ' active' : ''}`}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={openColumnFilter === 'category'}
                    onClick={() => setOpenColumnFilter((current) => current === 'category' ? null : 'category')}
                  >
                    <span>Category</span><span className="filter-chevron" aria-hidden="true">▾</span>
                  </button>
                  {openColumnFilter === 'category' && (
                    <div className="table-filter-options" role="menu" aria-label="Filter by category">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={categoryFilter === 'all'}
                        className={categoryFilter === 'all' ? 'selected' : ''}
                        onClick={() => {
                          setCategoryFilter('all')
                          setOpenColumnFilter(null)
                        }}
                      >
                        All categories
                      </button>
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          type="button"
                          role="menuitemradio"
                          aria-checked={categoryFilter === category}
                          className={categoryFilter === category ? 'selected' : ''}
                          onClick={() => {
                            setCategoryFilter(category)
                            setOpenColumnFilter(null)
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((txn) => (
              <tr key={txn.id}>
                <td>{formatDateTime(txn.transactionDateTime)}</td>
                <td>
                  <div>{txn.description || txn.counterparty?.originalName || '—'}</div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {txn.account?.bankName}
                    {txn.account?.last4 ? ` •••• ${txn.account.last4}` : ''}
                  </div>
                </td>
                <td>
                  <span className={`badge ${txn.type.toLowerCase()}`}>{txn.type}</span>
                </td>
                <td>{formatInr(txn.amount)}</td>
                <td>
                  <div>{txn.category?.categoryName || 'Uncategorized'}</div>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    {txn.category?.source}
                  </div>
                </td>
                <td>
                  <div className="row-actions">
                    <select
                      disabled={busyId === txn.id}
                      defaultValue=""
                      onChange={(e) => {
                        void onOverride(txn.id, e.target.value)
                        e.target.value = ''
                      }}
                    >
                      <option value="" disabled>
                        Override…
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busyId === txn.id}
                      onClick={() => void onRecategorize(txn.id)}
                    >
                      Recategorize
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No transactions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
