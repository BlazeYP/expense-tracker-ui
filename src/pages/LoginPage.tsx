import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'

declare global {
  interface Window { google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, string>) => void } } } }
}

export function LoginPage() {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn } = useAuth()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const render = () => {
      if (!cancelled && window.google && buttonRef.current) {
        window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => {
          setBusy(true); setError('')
          void signIn(credential).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Google sign-in failed')).finally(() => setBusy(false))
        } })
        window.google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: '280' })
      }
    }
    if (window.google) render()
    else {
      const script = document.querySelector<HTMLScriptElement>('#google-identity-script')
      script?.addEventListener('load', render)
      return () => { cancelled = true; script?.removeEventListener('load', render) }
    }
    return () => { cancelled = true }
  }, [clientId, signIn])

  return <main className="login-page">
    <section className="login-card">
      <span className="eyebrow">A clearer view of your money</span>
      <h1>Welcome to Ledger</h1>
      <p>Sign in with Google to securely access your personal expense tracker.</p>
      {!clientId ? <p className="error" role="alert">Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and restart the UI.</p> : <div className="google-button-wrap"><div ref={buttonRef} />{busy && <span>Signing you in…</span>}</div>}
      {error && <p className="error" role="alert">{error}</p>}
      <small>Your transactions are private to your account.</small>
    </section>
  </main>
}
