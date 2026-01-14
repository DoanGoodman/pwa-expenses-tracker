import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import BottomNav from './components/layout/BottomNav'
import UpdateNotification from './components/common/UpdateNotification'
import Dashboard from './pages/Dashboard'
import ExpenseList from './pages/ExpenseList'
import AddExpense from './pages/AddExpense'
import Documents from './pages/Documents'
import RecycleBin from './pages/RecycleBin'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'

// Component bảo vệ route chỉ dành cho Owner
const OwnerRoute = ({ children }) => {
  const { isStaff, loading } = useAuth()

  if (loading) return null

  // Redirect staff về trang chi phí
  if (isStaff) {
    return <Navigate to="/expenses" replace />
  }

  return children
}

// Protected App Content
const AppContent = () => {
  const { isAuthenticated, loading, isStaff, isOwner } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Redirect về trang mặc định dựa trên role khi đăng nhập
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const currentPath = location.pathname

      // Owner: redirect về / nếu đang ở trang không phù hợp
      if (isOwner && currentPath !== '/' && currentPath !== '/documents' && currentPath !== '/recycle-bin') {
        // Nếu owner đang ở /expenses hoặc /add, redirect về trang chủ
        if (currentPath === '/expenses' || currentPath === '/add') {
          navigate('/', { replace: true })
        }
      }

      // Staff: redirect về /expenses nếu đang ở trang owner-only
      if (isStaff && (currentPath === '/' || currentPath === '/documents' || currentPath === '/recycle-bin')) {
        navigate('/expenses', { replace: true })
      }
    }
  }, [loading, isAuthenticated, isOwner, isStaff, location.pathname, navigate])

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
        {/* Routes dành cho Owner */}
        <Route path="/" element={
          <OwnerRoute>
            <Dashboard />
          </OwnerRoute>
        } />
        <Route path="/documents" element={
          <OwnerRoute>
            <Documents />
          </OwnerRoute>
        } />
        <Route path="/recycle-bin" element={
          <OwnerRoute>
            <RecycleBin />
          </OwnerRoute>
        } />

        {/* Routes cho cả Owner và Staff */}
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/add" element={<AddExpense />} />

        {/* Redirect mặc định cho staff */}
        <Route path="*" element={
          isStaff ? <Navigate to="/expenses" replace /> : <Navigate to="/" replace />
        } />
      </Routes>
      <UpdateNotification />
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
