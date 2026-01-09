import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './pages/Dashboard'
import ExpenseList from './pages/ExpenseList'
import AddExpense from './pages/AddExpense'
import Documents from './pages/Documents'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'

// Protected App Content
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="app-container min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/documents" element={<Documents />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public route for password reset */}
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* All other routes go through AppContent */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App


