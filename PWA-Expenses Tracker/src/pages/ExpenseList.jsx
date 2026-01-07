import { useState, useCallback } from 'react'
import Header from '../components/layout/Header'
import FilterBar from '../components/expenses/FilterBar'
import ExpenseCard from '../components/expenses/ExpenseCard'
import ExpenseForm from '../components/forms/ExpenseForm'
import { useProjects, useCategories, useExpenses, useDeleteExpense, useUpdateExpense } from '../hooks/useSupabase'
import { getCurrentMonth } from '../utils/formatters'
import { exportToExcel, exportToPDF } from '../utils/exportHelpers'
import { X } from 'lucide-react'

const ExpenseList = () => {
    const [selectedProject, setSelectedProject] = useState('all')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [searchText, setSearchText] = useState('')
    const [editingExpense, setEditingExpense] = useState(null)

    const { projects } = useProjects()
    const { categories } = useCategories()
    const { expenses, loading, refetch } = useExpenses({
        projectId: selectedProject,
        categoryId: selectedCategory,
        month: selectedMonth,
        search: searchText
    })
    const { deleteExpense } = useDeleteExpense()
    const { updateExpense, loading: updating } = useUpdateExpense()

    const handleEdit = (expense) => {
        setEditingExpense(expense)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa chi phí này?')) {
            await deleteExpense(id)
            refetch()
        }
    }

    const handleUpdate = async (formData) => {
        if (editingExpense) {
            await updateExpense(editingExpense.id, formData)
            setEditingExpense(null)
            refetch()
        }
    }

    const clearFilters = () => {
        setSelectedProject('all')
        setSelectedCategory('all')
        setSelectedMonth('')
        setSearchText('')
    }

    const handleDownload = (expense) => {
        if (expense.document_url) {
            // Open document in new tab or trigger download
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

    const hasActiveFilters = selectedProject !== 'all' ||
        selectedCategory !== 'all' ||
        selectedMonth !== '' ||
        searchText !== ''

    return (
        <div className="page-container">
            {/* Header */}
            <Header
                title="Chi tiết chi phí"
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
            />

            {/* Filter Bar */}
            <FilterBar
                projects={projects}
                categories={categories}
                selectedProject={selectedProject}
                selectedCategory={selectedCategory}
                selectedMonth={selectedMonth}
                searchText={searchText}
                onProjectChange={setSelectedProject}
                onCategoryChange={setSelectedCategory}
                onMonthChange={setSelectedMonth}
                onSearchChange={setSearchText}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-gray-800">Sửa chi phí</h2>
                            <button
                                onClick={() => setEditingExpense(null)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>
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
            )}
        </div>
    )
}

export default ExpenseList
