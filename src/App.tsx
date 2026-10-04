import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { Layout } from './components/Layout'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { DashboardPage } from './pages/DashboardPage'
import { ImportPage } from './pages/ImportPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { RulesPage } from './pages/RulesPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading">Loading your account…</div>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="*" element={!user ? <Navigate to="/login" replace /> : <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="merchants" element={<MerchantsPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>} />
    </Routes>
  )
}
