import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import ExpenseSearchBar from '../components/expenses/ExpenseSearchBar'
import SortToolbar from '../components/expenses/SortToolbar'
import ExpenseCard from '../components/expenses/ExpenseCard'
import ExpenseForm from '../components/forms/ExpenseForm'
import ReasonModal from '../components/forms/ReasonModal'
import { useProjects, useCategories, useExpenses, useDeleteExpense, useUpdateExpense } from '../hooks/useSupabase'
import { getCurrentMonth, getMonthsAgo } from '../utils/formatters'
import { exportToExcel, exportToPDF } from '../utils/exportHelpers'
import { X, CheckCircle } from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'

const ExpenseList = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { user } = useAuth()

    // Filter states
    const [selectedProject, setSelectedProject] = useState('all')
    const [selectedCategories, setSelectedCategories] = useState([])
    const [searchText, setSearchText] = useState('')
    const [startMonth, setStartMonth] = useState(getMonthsAgo(5))
    const [endMonth, setEndMonth] = useState(getCurrentMonth())
    const [sortOption, setSortOption] = useState('date_desc')

    // UI states
    const [editingExpense, setEditingExpense] = useState(null)

    // States for reason modal
    const [pendingUpdate, setPendingUpdate] = useState(null)
    const [pendingDelete, setPendingDelete] = useState(null)
    const [showSuccessToast, setShowSuccessToast] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const { projects } = useProjects()
    const { categories } = useCategories()
    const { expenses, loading, refetch } = useExpenses({
        projectId: selectedProject,
        categoryIds: selectedCategories,
        startMonth,
        endMonth,
        search: searchText,
        sortOption,
        userId: user?.id
    })
    const { deleteExpense } = useDeleteExpense()
    const { updateExpense, loading: updating } = useUpdateExpense()

    // Refetch when navigating to this page (e.g., after bulk save from receipt scanner)
    // Chỉ refetch khi có userId để tránh gọi thừa
    useEffect(() => {
        if (user?.id) {
            refetch()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key, user?.id])

    // Handle filter change from Bottom Sheet
    const handleFilterChange = (filters) => {
        setSelectedProject(filters.project)
        setSelectedCategories(filters.categories)
        setSearchText(filters.search)
    }

    // Handle date range change
    const handleDateChange = (start, end) => {
        setStartMonth(start)
        setEndMonth(end)
    }

    // Remove individual filters
    const handleRemoveProject = () => setSelectedProject('all')
    const handleRemoveCategory = (categoryId) => {
        setSelectedCategories(selectedCategories.filter(id => id !== categoryId))
    }
    const handleRemoveSearch = () => setSearchText('')

    // Clear all filters
    const clearAllFilters = () => {
        setSelectedProject('all')
        setSelectedCategories([])
        setSearchText('')
    }

    const handleEdit = (expense) => {
        setEditingExpense(expense)
    }

    // Step 1: User clicks delete -> show reason modal
    const handleDelete = (id) => {
        const expense = expenses.find(e => e.id === id)
        setPendingDelete({
            id,
            description: expense?.description || 'Chi phí'
        })
    }

    // Step 2: User provides reason and confirms delete
    const confirmDelete = async (reason) => {
        if (pendingDelete) {
            await deleteExpense(pendingDelete.id, reason)
            setPendingDelete(null)
            refetch()
            showSuccess('Data sẽ bị xóa vĩnh viễn trong vòng 30 ngày. Để khôi phục hãy vào biểu tượng ☰ góc trái chọn mục Thùng rác.')
        }
    }

    // Step 1: User submits edit form -> store pending data and show reason modal
    const handleUpdate = async (formData) => {
        if (editingExpense) {
            setPendingUpdate({
                id: editingExpense.id,
                formData,
                description: editingExpense.description || 'Chi phí'
            })
            setEditingExpense(null)
        }
    }

    // Step 2: User provides reason and confirms update
    const confirmUpdate = async (reason) => {
        if (pendingUpdate) {
            await updateExpense(pendingUpdate.id, pendingUpdate.formData, reason)
            setPendingUpdate(null)
            refetch()
            showSuccess('Đã cập nhật và ghi lại nhật ký thay đổi')
        }
    }

    // Show success toast
    const showSuccess = (message) => {
        setSuccessMessage(message)
        setShowSuccessToast(true)
        setTimeout(() => {
            setShowSuccessToast(false)
            setSuccessMessage('')
        }, 2000)
    }

    const handleDownload = (expense) => {
        if (expense.document_url) {
            const link = document.createElement('a')
            link.href = expense.document_url
            link.target = '_blank'
            link.download = expense.description || 'document'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    const handleExportExcel = () => {
        if (expenses.length === 0) {
            alert('Không có dữ liệu để xuất')
            return
        }
        exportToExcel(expenses, `DS_ChiPhi_${new Date().toISOString().slice(0, 10)}`)
    }

    const handleExportPDF = () => {
        if (expenses.length === 0) {
            alert('Không có dữ liệu để xuất')
            return
        }
        exportToPDF(expenses, `DS_ChiPhi_${new Date().toISOString().slice(0, 10)}`)
    }

    const handleRecycleBin = () => {
        navigate('/recycle-bin')
    }

    return (
        <div className="page-container">
            {/* Header */}
            <Header
                title="Chi tiết chi phí"
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                onRecycleBin={handleRecycleBin}
            />

            {/* New Advanced Search Bar */}
            <ExpenseSearchBar
                projects={projects}
                categories={categories}
                selectedProject={selectedProject}
                selectedCategories={selectedCategories}
                searchText={searchText}
                startMonth={startMonth}
                endMonth={endMonth}
                onFilterChange={handleFilterChange}
                onDateChange={handleDateChange}
            />

            {/* Sort Toolbar & Filter Tags */}
            <SortToolbar
                sortOption={sortOption}
                onSortChange={setSortOption}
                selectedProject={selectedProject}
                selectedCategories={selectedCategories}
                searchText={searchText}
                projects={projects}
                categories={categories}
                onRemoveProject={handleRemoveProject}
                onRemoveCategory={handleRemoveCategory}
                onRemoveSearch={handleRemoveSearch}
                onClearAll={clearAllFilters}
            />

            {/* Expense List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : expenses.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-400 text-lg mb-2">📭</p>
                    <p className="text-gray-500">Không tìm thấy chi phí nào</p>
                </div>
            ) : (
                <div>
                    {expenses.map(expense => (
                        <ExpenseCard
                            key={expense.id}
                            expense={expense}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onDownload={handleDownload}
                        />
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingExpense && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl my-8 max-h-[calc(100vh-4rem)]">
                        {/* Header - Fixed */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="text-lg font-bold text-gray-800">Sửa chi phí</h2>
                            <button
                                onClick={() => setEditingExpense(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-5 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
                            <ExpenseForm
                                projects={projects}
                                categories={categories}
                                initialData={editingExpense}
                                onSubmit={handleUpdate}
                                onCancel={() => setEditingExpense(null)}
                                loading={updating}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Reason Modal for Update */}
            <ReasonModal
                isOpen={!!pendingUpdate}
                onClose={() => setPendingUpdate(null)}
                onConfirm={confirmUpdate}
                type="edit"
                expenseDescription={pendingUpdate?.description}
            />

            {/* Reason Modal for Delete */}
            <ReasonModal
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                type="delete"
                expenseDescription={pendingDelete?.description}
            />

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed inset-0 bg-black/30 z-[70] flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col items-center animate-fade-in">
                        <CheckCircle size={48} className="text-green-500 mb-3" />
                        <p className="text-lg font-semibold text-gray-800">{successMessage}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ExpenseList
