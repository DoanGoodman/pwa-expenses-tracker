import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trash2, AlertCircle } from 'lucide-react'
import { supabase, isDemoMode } from '../lib/supabase'

const RecycleBin = () => {
    const navigate = useNavigate()
    const [deletedExpenses, setDeletedExpenses] = useState([])
    const [loading, setLoading] = useState(true)
    const [restoring, setRestoring] = useState(null)

    // Fetch deleted expenses
    useEffect(() => {
        const fetchDeletedExpenses = async () => {
            if (isDemoMode()) {
                setDeletedExpenses([])
                setLoading(false)
                return
            }

            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                // Get expenses where deleted_at is NOT null
                const { data, error } = await supabase
                    .from('expenses')
                    .select('*, projects(name), categories(name)')
                    .eq('user_id', user.id)
                    .not('deleted_at', 'is', null)
                    .order('deleted_at', { ascending: false })

                if (error) throw error
                setDeletedExpenses(data || [])
            } catch (error) {
                console.error('Error fetching deleted expenses:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDeletedExpenses()
    }, [])

    // Restore expense
    const handleRestore = async (id) => {
        setRestoring(id)
        try {
            const { error } = await supabase
                .from('expenses')
                .update({ deleted_at: null })
                .eq('id', id)

            if (error) throw error

            // Remove from list
            setDeletedExpenses(prev => prev.filter(e => e.id !== id))
        } catch (error) {
            console.error('Error restoring expense:', error)
            alert('Lỗi khôi phục: ' + error.message)
        } finally {
            setRestoring(null)
        }
    }

    // Calculate days remaining before permanent delete
    const getDaysRemaining = (deletedAt) => {
        const deleteDate = new Date(deletedAt)
        const permanentDeleteDate = new Date(deleteDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        const now = new Date()
        const diffTime = permanentDeleteDate - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return Math.max(0, diffDays)
    }

    // Format date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount) + ' đ'
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="app-header">
                <button
                    onClick={() => navigate(-1)}
                    className="header-icon-btn"
                    aria-label="Quay lại"
                >
                    <ArrowLeft size={22} />
                </button>
                <h1 className="header-title">Thùng rác</h1>
                <div className="w-10"></div>
            </header>

            {/* Content */}
            <main className="pt-20 pb-24 px-4">
                {/* Info Banner */}
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-medium">Lưu ý:</p>
                        <p>Các chi phí trong thùng rác sẽ bị xóa vĩnh viễn sau 30 ngày. Bấm nút khôi phục để đưa chi phí về danh sách.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : deletedExpenses.length === 0 ? (
                    <div className="text-center py-12">
                        <Trash2 size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Thùng rác trống</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deletedExpenses.map(expense => {
                            const daysRemaining = getDaysRemaining(expense.deleted_at)
                            return (
                                <div
                                    key={expense.id}
                                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800 mb-1">
                                                {expense.description || 'Chi phí không tên'}
                                            </p>
                                            <p className="text-teal-600 font-semibold">
                                                {formatCurrency(expense.amount)}
                                            </p>
                                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                                                <p>Dự án: {expense.projects?.name || 'N/A'}</p>
                                                <p>Danh mục: {expense.categories?.name || 'N/A'}</p>
                                                <p>Đã xóa: {formatDate(expense.deleted_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${daysRemaining <= 7
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                Còn {daysRemaining} ngày
                                            </span>
                                            <button
                                                onClick={() => handleRestore(expense.id)}
                                                disabled={restoring === expense.id}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50"
                                            >
                                                <RotateCcw size={14} className={restoring === expense.id ? 'animate-spin' : ''} />
                                                <span>Khôi phục</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}

export default RecycleBin
