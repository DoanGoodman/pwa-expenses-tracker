import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Plus } from 'lucide-react'
import Header from '../components/layout/Header'
import ExpenseForm from '../components/forms/ExpenseForm'
import AddProjectModal from '../components/forms/AddProjectModal'
import { useProjects, useCategories, useAddExpense } from '../hooks/useSupabase'

const AddExpense = () => {
    const navigate = useNavigate()
    const [showSuccess, setShowSuccess] = useState(false)
    const [showAddProjectModal, setShowAddProjectModal] = useState(false)

    const { projects, addProject, checkProjectExists } = useProjects()
    const { categories } = useCategories()
    const { addExpense, loading } = useAddExpense()

    const handleSubmit = async (formData) => {
        const result = await addExpense(formData)
        if (result.success) {
            setShowSuccess(true)
            setTimeout(() => {
                setShowSuccess(false)
                navigate('/expenses')
            }, 1500)
        }
    }

    const handleCreateProject = async (projectData) => {
        const result = await addProject(projectData)
        if (result.success) {
            // Project created successfully, modal will close automatically
        }
    }

    // Custom left action for Header: Add Project Button
    const addProjectButton = (
        <button
            className="header-icon-btn"
            onClick={() => setShowAddProjectModal(true)}
            aria-label="Thêm dự án"
        >
            <Plus size={26} className="text-primary" />
        </button>
    )

    return (
        <div className="page-container">
            {/* Header with Custom Left Action */}
            <Header title="Thêm chi phí" leftAction={addProjectButton} />

            {/* Form Card */}
            <div className="card-soft-lg">
                <ExpenseForm
                    projects={projects}
                    categories={categories}
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            </div>

            {/* Add Project Modal */}
            <AddProjectModal
                isOpen={showAddProjectModal}
                onClose={() => setShowAddProjectModal(false)}
                onSubmit={handleCreateProject}
                existingProjects={projects}
                checkProjectExists={checkProjectExists}
            />

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col items-center animate-fade-in">
                        <CheckCircle size={48} className="text-primary mb-3" />
                        <p className="text-lg font-semibold text-gray-800">Đã lưu thành công!</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AddExpense
