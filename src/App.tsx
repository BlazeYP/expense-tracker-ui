import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { DashboardPage } from './pages/DashboardPage'
import { ImportPage } from './pages/ImportPage'
import { MerchantsPage } from './pages/MerchantsPage'
import { RulesPage } from './pages/RulesPage'
import { TransactionsPage } from './pages/TransactionsPage'

export default function App() {
  return (
    <Routes>
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
    </Routes>
  )
}
