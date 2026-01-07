import { useState, useEffect, useMemo } from 'react'
import { X, FolderPlus, AlertCircle } from 'lucide-react'

const AddProjectModal = ({
    isOpen,
    onClose,
    onSubmit,
    existingProjects = [],
    checkProjectExists
}) => {
    const [projectName, setProjectName] = useState('')
    const [error, setError] = useState('')
    const [isChecking, setIsChecking] = useState(false)

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setProjectName('')
            setError('')
        }
    }, [isOpen])

    // Smart suggestions: Filter projects that contain the typed keyword
    const suggestions = useMemo(() => {
        if (!projectName.trim() || projectName.length < 2) return []

        const keyword = projectName.toLowerCase().trim()
        return existingProjects
            .filter(p => p.name.toLowerCase().includes(keyword))
            .slice(0, 5) // Limit to 5 suggestions
    }, [projectName, existingProjects])

    // Handle input change
    const handleInputChange = (e) => {
        const value = e.target.value
        setProjectName(value)
        setError('') // Clear error when typing
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()

        const trimmedName = projectName.trim()

        if (!trimmedName) {
            setError('Vui lòng nhập tên dự án')
            return
        }

        setIsChecking(true)
        setError('')

        try {
            // Check if project already exists
            const exists = await checkProjectExists(trimmedName)

            if (exists) {
                setError(`Dự án "${trimmedName}" đã tồn tại! Vui lòng chọn trong danh sách.`)
                setIsChecking(false)
                return
            }

            // Project doesn't exist, proceed to create
            await onSubmit({ name: trimmedName })
            onClose()
        } catch (err) {
            setError('Có lỗi xảy ra. Vui lòng thử lại.')
        } finally {
            setIsChecking(false)
        }
    }

    // Handle suggestion click
    const handleSuggestionClick = (suggestion) => {
        // Close modal without creating - user should select from dropdown instead
        alert(`Dự án "${suggestion.name}" đã có sẵn. Vui lòng chọn từ danh sách thả xuống.`)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FolderPlus size={20} className="text-primary" style={{ color: 'var(--color-primary)' }} />
                        <h3 className="text-lg font-semibold text-gray-800">Thêm dự án mới</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-4">
                    {/* Input Field */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Tên dự án
                        </label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={handleInputChange}
                            placeholder="Nhập tên dự án..."
                            className="input-field"
                            autoFocus
                        />
                    </div>

                    {/* Smart Suggestions */}
                    {suggestions.length > 0 && (
                        <div
                            id="project-suggestions"
                            className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                            <p className="text-xs text-amber-700 font-medium mb-1.5">
                                💡 Các dự án hiện có tương tự:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {suggestions.map((project) => (
                                    <button
                                        key={project.id}
                                        type="button"
                                        onClick={() => handleSuggestionClick(project)}
                                        className="px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-full 
                                                   text-amber-800 hover:bg-amber-100 transition-colors"
                                    >
                                        {project.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div
                            id="project-error"
                            className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                        >
                            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-600">{error}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-600 
                                       font-medium hover:bg-gray-50 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isChecking || !projectName.trim()}
                            className="flex-1 py-3 px-4 rounded-xl text-white font-medium 
                                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                            {isChecking ? 'Đang kiểm tra...' : 'Tạo dự án'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddProjectModal
