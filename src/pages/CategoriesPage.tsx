import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Category } from '../types'

const empty = { name: '', description: '', active: true }

export function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    setError('')
    try {
      setItems(await api.getCategories())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
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
        await api.updateCategory(editingId, form)
      } else {
        await api.createCategory(form)
      }
      setForm(empty)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function onDelete(id: string) {
    setError('')
    try {
      await api.deleteCategory(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <p>System categories seed on backend startup; add or edit your own.</p>
        </div>
      </div>

      <form className="panel panel-pad form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="cat-name">Name</label>
          <input
            id="cat-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="cat-desc">Description</label>
          <input
            id="cat-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="full row-actions">
          <button className="btn" type="submit">
            {editingId ? 'Update category' : 'Create category'}
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
              <th>Status</th>
              <th>System</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div>{item.name}</div>
                  {item.description && <div className="muted">{item.description}</div>}
                </td>
                <td>{item.active ? 'Active' : 'Inactive'}</td>
                <td>{item.systemDefined ? 'Yes' : 'No'}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => {
                        setEditingId(item.id)
                        setForm({
                          name: item.name,
                          description: item.description || '',
                          active: item.active,
                        })
                      }}
                    >
                      Edit
                    </button>
                    {!item.systemDefined && (
                      <button className="btn danger" type="button" onClick={() => void onDelete(item.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
