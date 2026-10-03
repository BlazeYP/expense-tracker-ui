import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Account } from '../types'

const empty = {
  provider: 'GPAY',
  bankName: '',
  accountType: 'SAVINGS',
  last4: '',
  currency: 'INR',
  active: true,
}

export function AccountsPage() {
  const [items, setItems] = useState<Account[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      setItems(await api.getAccounts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.updateAccount(editingId, form)
      } else {
        await api.createAccount(form)
      }
      setForm(empty)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Accounts</h1>
          <p>Track bank accounts linked to your GPay payments.</p>
        </div>
      </div>

      <form className="panel panel-pad form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="a-provider">Provider</label>
          <input
            id="a-provider"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="a-bank">Bank name</label>
          <input
            id="a-bank"
            required
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="a-type">Account type</label>
          <input
            id="a-type"
            value={form.accountType}
            onChange={(e) => setForm({ ...form, accountType: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="a-last4">Last 4</label>
          <input
            id="a-last4"
            required
            maxLength={4}
            value={form.last4}
            onChange={(e) => setForm({ ...form, last4: e.target.value })}
          />
        </div>
        <div className="full row-actions">
          <button className="btn" type="submit">
            {editingId ? 'Update account' : 'Create account'}
          </button>
          {editingId && (
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(empty)
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bank</th>
              <th>Provider</th>
              <th>Type</th>
              <th>Last 4</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.bankName}</td>
                <td>{item.provider}</td>
                <td>{item.accountType}</td>
                <td>{item.last4}</td>
                <td>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setEditingId(item.id)
                      setForm({
                        provider: item.provider || '',
                        bankName: item.bankName || '',
                        accountType: item.accountType || '',
                        last4: item.last4 || '',
                        currency: item.currency || 'INR',
                        active: item.active,
                      })
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
