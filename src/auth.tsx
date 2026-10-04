import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { api } from './api'

export type User = { id: string; name: string; email: string; picture?: string }
type AuthValue = { user: User | null; loading: boolean; signIn: (credential: string) => Promise<void>; signOut: () => Promise<void> }
const TOKEN_KEY = 'expense-tracker-token'
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setLoading(false); return }
    api.getCurrentUser().then(setUser).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthValue>(() => ({
    user, loading,
    async signIn(credential) {
      const result = await api.signInWithGoogle(credential)
      localStorage.setItem(TOKEN_KEY, result.token)
      setUser(result.user)
    },
    async signOut() {
      try { await api.signOut() } finally { localStorage.removeItem(TOKEN_KEY); setUser(null) }
    },
  }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
