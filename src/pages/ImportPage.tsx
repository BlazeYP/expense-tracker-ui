import { useState, type FormEvent } from 'react'
import { api } from '../api'
import type { ImportBatch } from '../types'

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportBatch | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('Choose a GPay CSV or PDF statement first.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const batch = await api.importGpay(file)
      setResult(batch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Import statement</h1>
          <p>Upload a Google Pay CSV or PDF. Transactions are parsed, deduped, and stored in MongoDB.</p>
        </div>
      </div>

      <form className="panel panel-pad stack" onSubmit={onSubmit}>
        <div className="dropzone">
          <strong>GPay CSV or PDF</strong>
          <p className="muted">Max 15 MB · field name `file`</p>
          <input
            type="file"
            accept=".csv,.pdf,application/pdf,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && <p>{file.name}</p>}
        </div>
        <div>
          <button className="btn" type="submit" disabled={loading || !file}>
            {loading ? 'Importing…' : 'Import to MongoDB'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      {result && (
        <section className="panel panel-pad stack" style={{ marginTop: '1rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Import result</h2>
          <p>
            Status: <span className="badge">{result.status}</span>
          </p>
          <div className="stats">
            <div className="stat">
              <label>Total rows</label>
              <strong>{result.totalRows}</strong>
            </div>
            <div className="stat">
              <label>Imported</label>
              <strong>{result.importedRows}</strong>
            </div>
            <div className="stat">
              <label>Duplicates</label>
              <strong>{result.duplicateRows}</strong>
            </div>
            <div className="stat">
              <label>Failed</label>
              <strong>{result.failedRows}</strong>
            </div>
          </div>
          {result.statementPeriodStart && (
            <p className="muted">
              Period: {result.statementPeriodStart} → {result.statementPeriodEnd}
            </p>
          )}
          {result.errors?.length > 0 && (
            <div>
              <p className="error">Errors</p>
              <ul>
                {result.errors.slice(0, 20).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
