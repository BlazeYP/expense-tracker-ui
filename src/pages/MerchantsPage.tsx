import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Category, Merchant } from '../types'

const empty = { originalName: '', defaultCategoryId: '', aliases: '', active: true }

export function MerchantsPage() {
  const [items, setItems] = useState<Merchant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const [merchants, cats] = await Promise.all([api.getMerchants(), api.getCategories()])
      setItems(merchants)
      setCategories(cats.filter((c) => c.active))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load merchants')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const body = {
      originalName: form.originalName,
      defaultCategoryId: form.defaultCategoryId || undefined,
      aliases: form.aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      active: form.active,
    }
    try {
      if (editingId) {
        await api.updateMerchant(editingId, body)
      } else {
        await api.createMerchant(body)
      }
      setForm(empty)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  function categoryName(id?: string) {
    return categories.find((c) => c.id === id)?.name || '—'
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Merchants</h1>
          <p>Map merchant names to a default category for auto-categorization.</p>
        </div>
      </div>

      <form className="panel panel-pad form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="m-name">Original name</label>
          <input
            id="m-name"
            required
            value={form.originalName}
            onChange={(e) => setForm({ ...form, originalName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="m-cat">Default category</label>
          <select
            id="m-cat"
            value={form.defaultCategoryId}
            onChange={(e) => setForm({ ...form, defaultCategoryId: e.target.value })}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="m-aliases">Aliases (comma-separated)</label>
          <input
            id="m-aliases"
            value={form.aliases}
            onChange={(e) => setForm({ ...form, aliases: e.target.value })}
          />
        </div>
        <div className="full row-actions">
          <button className="btn" type="submit">
            {editingId ? 'Update merchant' : 'Create merchant'}
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
              <th>Name</th>
              <th>Aliases</th>
              <th>Default category</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.originalName}</td>
                <td>{item.aliases?.join(', ') || '—'}</td>
                <td>{categoryName(item.defaultCategoryId)}</td>
                <td>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setEditingId(item.id)
                      setForm({
                        originalName: item.originalName,
                        defaultCategoryId: item.defaultCategoryId || '',
                        aliases: (item.aliases || []).join(', '),
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
