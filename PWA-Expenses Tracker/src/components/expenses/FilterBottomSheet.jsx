import { useState, useEffect } from 'react'
import { Building2, Tag, Check, Search } from 'lucide-react'
import BottomSheet from '../common/BottomSheet'

/**
 * FilterBottomSheet - Bottom Sheet chứa Bộ lọc Dự án & Danh mục
 * Mở khi người dùng focus vào ô tìm kiếm
 */
const FilterBottomSheet = ({
    isOpen,
    onClose,
    projects = [],
    categories = [],
    selectedProject,
    selectedCategories = [],
    searchText,
    onApply
}) => {
    // Local state for selections
    const [tempProject, setTempProject] = useState(selectedProject)
    const [tempCategories, setTempCategories] = useState(selectedCategories)
    const [tempSearch, setTempSearch] = useState(searchText)
    const [projectSearch, setProjectSearch] = useState('')

    // Sync with props when opened
    useEffect(() => {
        if (isOpen) {
            setTempProject(selectedProject)
            setTempCategories(selectedCategories)
            setTempSearch(searchText)
            setProjectSearch('')
        }
    }, [isOpen, selectedProject, selectedCategories, searchText])

    // Filter projects by search
    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase())
    )

    // Toggle category selection
    const toggleCategory = (categoryId) => {
        if (tempCategories.includes(categoryId)) {
            setTempCategories(tempCategories.filter(id => id !== categoryId))
        } else {
            setTempCategories([...tempCategories, categoryId])
        }
    }

    // Handle apply
    const handleApply = () => {
        onApply({
            project: tempProject,
            categories: tempCategories,
            search: tempSearch
        })
        onClose()
    }

    // Handle reset
    const handleReset = () => {
        setTempProject('all')
        setTempCategories([])
        setTempSearch('')
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Bộ lọc & Tìm kiếm"
            maxHeight="85vh"
        >
            {/* Search Input */}
            <div className="filter-sheet-section">
                <label className="filter-sheet-label">
                    <Search size={14} />
                    <span>Tìm kiếm tên chi phí</span>
                </label>
                <input
                    type="text"
                    placeholder="Nhập từ khóa..."
                    value={tempSearch}
                    onChange={(e) => setTempSearch(e.target.value)}
                    className="filter-sheet-input"
                    autoFocus={false}
                />
            </div>

            {/* Project Selection */}
            <div className="filter-sheet-section">
                <label className="filter-sheet-label">
                    <Building2 size={14} />
                    <span>Chọn Dự án</span>
                </label>

                {/* Quick project search */}
                <input
                    type="text"
                    placeholder="Tìm dự án..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="filter-sheet-search"
                />

                <div className="filter-sheet-project-list">
                    {/* All Projects */}
                    <button
                        className={`filter-sheet-project-item ${tempProject === 'all' ? 'selected' : ''}`}
                        onClick={() => setTempProject('all')}
                    >
                        <span>Tất cả dự án</span>
                        {tempProject === 'all' && <Check size={16} />}
                    </button>

                    {/* Project List */}
                    {filteredProjects.map(project => (
                        <button
                            key={project.id}
                            className={`filter-sheet-project-item ${String(tempProject) === String(project.id) ? 'selected' : ''}`}
                            onClick={() => setTempProject(project.id)}
                        >
                            <span>{project.name}</span>
                            {String(tempProject) === String(project.id) && <Check size={16} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Selection */}
            <div className="filter-sheet-section">
                <label className="filter-sheet-label">
                    <Tag size={14} />
                    <span>Chọn Danh mục</span>
                    {tempCategories.length > 0 && (
                        <span className="filter-sheet-count">{tempCategories.length}</span>
                    )}
                </label>

                <div className="filter-sheet-categories">
                    {categories.map(category => (
                        <button
                            key={category.id}
                            className={`filter-sheet-category ${tempCategories.includes(category.id) ? 'selected' : ''}`}
                            onClick={() => toggleCategory(category.id)}
                        >
                            <span>{category.name}</span>
                            {tempCategories.includes(category.id) && (
                                <Check size={14} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="filter-sheet-actions">
                <button className="filter-sheet-reset" onClick={handleReset}>
                    Đặt lại
                </button>
                <button className="filter-sheet-apply" onClick={handleApply}>
                    <Check size={18} />
                    <span>Áp dụng</span>
                </button>
            </div>
        </BottomSheet>
    )
}

export default FilterBottomSheet
