import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import type { AnalyticsSummary, MonthlyAnalytics, Transaction } from '../types'
import { defaultRange, formatInr } from '../utils'

const chartColors = ['#17835e', '#e19a45', '#6184cc', '#bd6686', '#50a5a2', '#9673c5', '#cf7652', '#8a9d49']

function MaximizeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="chart-maximize" type="button" aria-label={`Maximize ${label}`} title={`Maximize ${label}`} onClick={onClick}>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M7 3H3v4M13 3h4v4M17 13v4h-4M7 17H3v-4" />
      </svg>
    </button>
  )
}

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

function currencyAxis(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function DashboardPage() {
  const initial = useMemo(() => defaultRange(), [])
  const currentYear = new Date().getFullYear()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [loadedRange, setLoadedRange] = useState<{ from: string; to: string } | null>(null)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [monthlyYearInput, setMonthlyYearInput] = useState(String(currentYear))
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics | null>(null)
  const [loadedMonthlyYear, setLoadedMonthlyYear] = useState<number | null>(null)
  const [monthlyMetric, setMonthlyMetric] = useState<'gross' | 'debit' | 'credit'>('gross')
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState('')
  const [expandedChart, setExpandedChart] = useState<'category' | 'share' | 'monthly' | null>(null)
  const chartDialogRef = useRef<HTMLDialogElement>(null)

  async function load(nextFrom = from, nextTo = to) {
    if (!nextFrom || !nextTo) {
      setError('Choose both a from date and a to date.')
      return
    }
    if (nextTo < nextFrom) {
      setError('The to date must be on or after the from date.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const [summaryData, transactionData] = await Promise.all([
        api.getSummary(nextFrom, nextTo),
        api.getTransactions(),
      ])
      setSummary(summaryData)
      setTransactions(transactionData)
      setLoadedRange({ from: nextFrom, to: nextTo })
      setHasLoaded(true)
    } catch (err) {
      setSummary(null)
      setTransactions([])
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  async function loadMonthly(year = Number(monthlyYearInput)) {
    if (!Number.isInteger(year) || year < 1 || year > 9998) {
      setMonthlyError('Enter a year between 1 and 9998.')
      return
    }
    setMonthlyLoading(true)
    setMonthlyError('')
    try {
      const data = await api.getMonthlyAnalytics(year)
      setMonthlyData(data)
      setLoadedMonthlyYear(year)
    } catch (err) {
      setMonthlyData(null)
      setLoadedMonthlyYear(null)
      setMonthlyError(err instanceof Error ? err.message : 'Failed to load monthly analytics')
    } finally {
      setMonthlyLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // Load the default six-month range once when the dashboard opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadMonthly(currentYear)
    // Load the current calendar year once when the dashboard opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const dialog = chartDialogRef.current
    if (!dialog) return
    if (expandedChart && !dialog.open) dialog.showModal()
    else if (!expandedChart && dialog.open) dialog.close()
  }, [expandedChart])

  const chartData = useMemo(() => {
    const totals = new Map<string, number>()
    transactions.forEach((transaction) => {
      if (transaction.type !== 'DEBIT') return
      const date = dateInBusinessTimezone(transaction.transactionDateTime)
      if (loadedRange && (date < loadedRange.from || date > loadedRange.to)) return
      const category = transaction.category?.categoryName?.trim() || 'Uncategorized'
      totals.set(category, (totals.get(category) ?? 0) + Number(transaction.amount))
    })
    return Array.from(totals, ([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, loadedRange])

  const totalSpend = useMemo(
    () => chartData.reduce((total, item) => total + item.amount, 0),
    [chartData],
  )
  const topCategory = chartData[0]
  const monthlyChartData = useMemo(() => {
    const metricKey = monthlyMetric === 'gross'
      ? 'totalTransactionAmount'
      : monthlyMetric === 'debit'
        ? 'totalDebits'
        : 'totalCredits'
    return (monthlyData?.months ?? []).map((month) => ({
      month: month.monthName.charAt(0) + month.monthName.slice(1).toLowerCase(),
      amount: Number(month[metricKey]),
    }))
  }, [monthlyData, monthlyMetric])

  return (
    <div className="dashboard-page">
      <div className="page-head dashboard-head">
        <div>
          <span className="eyebrow">Your money, at a glance</span>
          <h1>Spending overview</h1>
          <p>Choose a date range to see where your expenses are going.</p>
        </div>
        <div className="dashboard-period" aria-live="polite">
          <span className="period-dot" />
          {loadedRange ? `${loadedRange.from} — ${loadedRange.to}` : 'Select a date range'}
        </div>
      </div>

      <form
        className="date-filter panel"
        onSubmit={(event) => {
          event.preventDefault()
          void load()
        }}
      >
        <div className="date-filter-copy">
          <strong>Explore a period</strong>
          <span>All dates use India Standard Time.</span>
        </div>
        <div className="field">
          <label htmlFor="from">From date</label>
          <input id="from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="to">To date</label>
          <input id="to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} required />
        </div>
        <button className="btn date-filter-button" type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Show spending'}
        </button>
      </form>

      {error && <p className="error dashboard-error" role="alert">{error}</p>}

      {summary && (
        <div className="stats dashboard-stats">
          <div className="stat">
            <label>Net cash flow</label>
            <strong>{formatInr(summary.net)}</strong>
            <span className="stat-note">Money in minus spent</span>
          </div>
          <div className="stat">
            <label>Total spent</label>
            <strong>{formatInr(totalSpend)}</strong>
            <span className="stat-note">Debits in this period</span>
          </div>
          <div className="stat">
            <label>Transactions</label>
            <strong>{summary.transactionCount}</strong>
            <span className="stat-note">Debits and credits</span>
          </div>
          <div className="stat">
            <label>Money in</label>
            <strong>{formatInr(summary.credits)}</strong>
            <span className="stat-note">Credits in this period</span>
          </div>
          <div className="stat">
            <label>Top category</label>
            <strong className="top-category-value">{topCategory?.category ?? '—'}</strong>
            <span className="stat-note">{topCategory ? formatInr(topCategory.amount) : 'No spending yet'}</span>
          </div>
        </div>
      )}

      <div className="dashboard-charts">
        <section className="panel chart-card">
          <div className="chart-card-head">
            <div>
              <h2>Spend by category</h2>
              <p>Categories ranked by total debit amount</p>
            </div>
            <div className="chart-header-actions">
              <span className="chart-total">{formatInr(totalSpend)}</span>
              <MaximizeButton label="Spend by category chart" onClick={() => setExpandedChart('category')} />
            </div>
          </div>
          {loading ? (
            <div className="chart-state">Loading your spending…</div>
          ) : chartData.length === 0 ? (
            <div className="chart-state">
              <strong>{hasLoaded ? 'No spending in this date range' : 'Your chart will appear here'}</strong>
              <span>{hasLoaded ? 'Try a wider range or import a statement.' : 'Select a date range to explore your expenses.'}</span>
            </div>
          ) : (
            <div className="bar-chart-wrap">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData} margin={{ top: 34, right: 14, left: 4, bottom: 56 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="category" interval={0} angle={-25} textAnchor="end" height={70} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} />
                  <YAxis tickFormatter={currencyAxis} tickLine={false} axisLine={false} width={54} tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [formatInr(value), 'Spent']}
                    cursor={{ fill: 'rgba(23,131,94,0.07)' }}
                    contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--tooltip-bg)', color: 'var(--ink)', boxShadow: '0 10px 30px rgba(0,0,0,0.16)' }}
                  />
                  <Bar dataKey="amount" name="Spent" fill="var(--bar)" radius={[7, 7, 0, 0]} maxBarSize={52}>
                    <LabelList dataKey="amount" position="top" formatter={(value: number) => formatInr(value)} fill="var(--ink-soft)" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel chart-card category-share-card">
          <div className="chart-card-head">
            <div>
              <h2>Spending split</h2>
              <p>Share of expenses by category</p>
            </div>
            <MaximizeButton label="Spending split chart" onClick={() => setExpandedChart('share')} />
          </div>
          {loading ? (
            <div className="chart-state">Loading your spending…</div>
          ) : chartData.length === 0 ? (
            <div className="chart-state">Category shares appear when spending is available.</div>
          ) : (
            <>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={chartData} dataKey="amount" nameKey="category" innerRadius={64} outerRadius={91} paddingAngle={3} stroke="none">
                      {chartData.map((entry, index) => <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatInr(value), 'Spent']}
                      contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--tooltip-bg)', color: 'var(--ink)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-total"><strong>{formatInr(totalSpend)}</strong><span>Total spent</span></div>
              </div>
              <div className="category-legend">
                {chartData.slice(0, 6).map((entry, index) => (
                  <div className="category-legend-row" key={entry.category}>
                    <span className="category-swatch" style={{ background: chartColors[index % chartColors.length] }} />
                    <span className="category-legend-name" title={entry.category}>{entry.category}</span>
                    <strong>{totalSpend ? `${Math.round((entry.amount / totalSpend) * 100)}%` : '0%'}</strong>
                  </div>
                ))}
                {chartData.length > 6 && <span className="muted category-more">+ {chartData.length - 6} more categories in chart</span>}
              </div>
            </>
          )}
        </section>

        <section className="panel chart-card monthly-chart-card">
          <div className="monthly-chart-header">
            <div className="chart-card-head">
              <div>
                <h2>Spend by Month</h2>
                <p>{loadedMonthlyYear ? `Monthly totals for ${loadedMonthlyYear}` : 'Compare monthly totals across a year'}</p>
              </div>
              <div className="chart-header-actions">
                {monthlyData && <span className="chart-total">{monthlyData.year}</span>}
                <MaximizeButton label="Spend by Month chart" onClick={() => setExpandedChart('monthly')} />
              </div>
            </div>
            <form
              className="monthly-chart-controls"
              onSubmit={(event) => {
                event.preventDefault()
                void loadMonthly()
              }}
            >
              <div className="field monthly-metric-field">
                <label htmlFor="monthly-metric">Show</label>
                <select id="monthly-metric" value={monthlyMetric} onChange={(event) => setMonthlyMetric(event.target.value as typeof monthlyMetric)}>
                  <option value="gross">Gross</option>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="field monthly-year-field">
                <label htmlFor="monthly-year">Enter year</label>
                <input
                  id="monthly-year"
                  type="number"
                  min={1}
                  max={9998}
                  step={1}
                  value={monthlyYearInput}
                  onChange={(event) => setMonthlyYearInput(event.target.value)}
                  required
                />
              </div>
              <button className="btn monthly-submit" type="submit" disabled={monthlyLoading || !monthlyYearInput}>
                {monthlyLoading ? 'Loading…' : 'Show year'}
              </button>
            </form>
          </div>
          {monthlyError ? (
            <div className="chart-state error" role="alert">{monthlyError}</div>
          ) : monthlyLoading ? (
            <div className="chart-state">Loading monthly totals…</div>
          ) : !monthlyData ? (
            <div className="chart-state">Choose a year to view monthly totals.</div>
          ) : (
            <div className="monthly-bar-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyChartData} margin={{ top: 34, right: 18, left: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} />
                  <YAxis tickFormatter={currencyAxis} tickLine={false} axisLine={false} width={58} tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [formatInr(value), monthlyMetric === 'gross' ? 'Gross' : monthlyMetric === 'debit' ? 'Debit' : 'Credit']}
                    cursor={{ fill: 'rgba(23,131,94,0.07)' }}
                    contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--tooltip-bg)', color: 'var(--ink)', boxShadow: '0 10px 30px rgba(0,0,0,0.16)' }}
                  />
                  <Bar dataKey="amount" name={monthlyMetric === 'gross' ? 'Gross' : monthlyMetric === 'debit' ? 'Debit' : 'Credit'} fill="var(--bar)" radius={[7, 7, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="amount" position="top" formatter={(value: number) => formatInr(value)} fill="var(--ink-soft)" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <dialog
        ref={chartDialogRef}
        className="chart-modal"
        aria-labelledby="expanded-chart-title"
        onClose={() => setExpandedChart(null)}
      >
        <div className="chart-modal-header">
          <div>
            <h2 id="expanded-chart-title">
              {expandedChart === 'category' ? 'Spend by category' : expandedChart === 'share' ? 'Spending split' : 'Spend by Month'}
            </h2>
            <p>
              {expandedChart === 'category'
                ? 'Category totals for the selected date range'
                : expandedChart === 'share'
                  ? 'Share of expenses by category'
                  : `${monthlyMetric === 'gross' ? 'Gross' : monthlyMetric === 'debit' ? 'Debit' : 'Credit'} totals for ${loadedMonthlyYear ?? 'the selected year'}`}
            </p>
          </div>
          <button className="chart-modal-close" type="button" aria-label="Close chart" onClick={() => setExpandedChart(null)}>×</button>
        </div>
        <div className="chart-modal-body">
          {expandedChart === 'category' && (
            chartData.length === 0 ? <div className="chart-state">No category spending is available for this range.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 38, right: 28, left: 12, bottom: 70 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="category" interval={0} angle={-25} textAnchor="end" height={80} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 13 }} />
                  <YAxis tickFormatter={currencyAxis} tickLine={false} axisLine={false} width={68} tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatInr(value), 'Spent']} contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--tooltip-bg)', color: 'var(--ink)' }} />
                  <Bar dataKey="amount" name="Spent" fill="var(--bar)" radius={[7, 7, 0, 0]} maxBarSize={68}>
                    <LabelList dataKey="amount" position="top" formatter={(value: number) => formatInr(value)} fill="var(--ink-soft)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          )}
          {expandedChart === 'share' && (
            chartData.length === 0 ? <div className="chart-state">No category spending is available for this range.</div> :
              <div className="expanded-share-layout">
                <div className="expanded-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="amount" nameKey="category" innerRadius="52%" outerRadius="78%" paddingAngle={3} stroke="none">
                        {chartData.map((entry, index) => <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatInr(value), 'Spent']} contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--tooltip-bg)', color: 'var(--ink)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-total"><strong>{formatInr(totalSpend)}</strong><span>Total spent</span></div>
                </div>
                <div className="expanded-share-legend">
                  {chartData.map((entry, index) => (
                    <div className="category-legend-row" key={entry.category}>
                      <span className="category-swatch" style={{ background: chartColors[index % chartColors.length] }} />
                      <span className="category-legend-name">{entry.category}</span>
                      <strong>{formatInr(entry.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
          )}
          {expandedChart === 'monthly' && (
            !monthlyData ? <div className="chart-state">No monthly totals are available.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 38, right: 28, left: 14, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 13 }} />
                  <YAxis tickFormatter={currencyAxis} tickLine={false} axisLine={false} width={70} tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatInr(value), monthlyMetric === 'gross' ? 'Gross' : monthlyMetric === 'debit' ? 'Debit' : 'Credit']} contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--tooltip-bg)', color: 'var(--ink)' }} />
                  <Bar dataKey="amount" name={monthlyMetric === 'gross' ? 'Gross' : monthlyMetric === 'debit' ? 'Debit' : 'Credit'} fill="var(--bar)" radius={[7, 7, 0, 0]} maxBarSize={62}>
                    <LabelList dataKey="amount" position="top" formatter={(value: number) => formatInr(value)} fill="var(--ink-soft)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          )}
        </div>
      </dialog>

    </div>
  )
}
