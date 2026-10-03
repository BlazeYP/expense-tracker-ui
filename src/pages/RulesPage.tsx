import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { CategorizationRule, Category } from '../types'

const empty = {
  name: '',
  categoryId: '',
  priority: 100,
  field: 'DESCRIPTION',
  operator: 'CONTAINS',
  value: '',
  active: true,
}

export function RulesPage() {
  const [items, setItems] = useState<CategorizationRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const [rules, cats] = await Promise.all([api.getRules(), api.getCategories()])
      setItems(rules)
      setCategories(cats.filter((c) => c.active))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await api.createRule({
        name: form.name,
        categoryId: form.categoryId,
        priority: Number(form.priority),
        active: true,
        conditions: [{ field: form.field, operator: form.operator, value: form.value }],
      })
      setForm(empty)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function onDelete(id: string) {
    try {
      await api.deleteRule(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name || id
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Categorization rules</h1>
          <p>Match transaction fields and assign a category automatically.</p>
        </div>
      </div>

      <form className="panel panel-pad form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="r-name">Rule name</label>
          <input
            id="r-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="r-cat">Category</label>
          <select
            id="r-cat"
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="" disabled>
              Select…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-field">Field</label>
          <select
            id="r-field"
            value={form.field}
            onChange={(e) => setForm({ ...form, field: e.target.value })}
          >
            <option value="DESCRIPTION">DESCRIPTION</option>
            <option value="COUNTERPARTY_NAME">COUNTERPARTY_NAME</option>
            <option value="NORMALIZED_MERCHANT">NORMALIZED_MERCHANT</option>
            <option value="UPI_ID">UPI_ID</option>
            <option value="TRANSACTION_TYPE">TRANSACTION_TYPE</option>
            <option value="AMOUNT">AMOUNT</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-op">Operator</label>
          <select
            id="r-op"
            value={form.operator}
            onChange={(e) => setForm({ ...form, operator: e.target.value })}
          >
            <option value="CONTAINS">CONTAINS</option>
            <option value="EQUALS">EQUALS</option>
            <option value="STARTS_WITH">STARTS_WITH</option>
            <option value="ENDS_WITH">ENDS_WITH</option>
            <option value="REGEX">REGEX</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-value">Value</label>
          <input
            id="r-value"
            required
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="r-priority">Priority</label>
          <input
            id="r-priority"
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
          />
        </div>
        <div className="full">
          <button className="btn" type="submit">
            Create rule
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Conditions</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{categoryName(item.categoryId)}</td>
                <td>{item.priority}</td>
                <td>
                  {(item.conditions || [])
                    .map((c) => `${c.field} ${c.operator} ${c.value}`)
                    .join('; ') || '—'}
                </td>
                <td>
                  <button className="btn danger" type="button" onClick={() => void onDelete(item.id)}>
                    Delete
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
