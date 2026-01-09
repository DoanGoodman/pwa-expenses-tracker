import { useState } from 'react'
import { ArrowUpDown, X, ChevronDown } from 'lucide-react'

/**
 * SortToolbar - Toolbar sắp xếp và hiển thị Filter Tags
 * - Nút Sort nhỏ để chọn thứ tự sắp xếp
 * - Dòng Filter Tags hiển thị các bộ lọc đang active
 */
const SortToolbar = ({
    sortOption,
    onSortChange,
    selectedProject,
    selectedCategories = [],
    searchText,
    projects = [],
    categories = [],
    onRemoveProject,
    onRemoveCategory,
    onRemoveSearch,
    onClearAll
}) => {
    const [showSortMenu, setShowSortMenu] = useState(false)

    // Sort options
    const sortOptions = [
        { value: 'date_desc', label: 'Ngày hóa đơn (Mới → Cũ)' },
        { value: 'date_asc', label: 'Ngày hóa đơn (Cũ → Mới)' },
        { value: 'created_desc', label: 'Ngày nhập (Mới → Cũ)' },
        { value: 'created_asc', label: 'Ngày nhập (Cũ → Mới)' }
    ]

    // Get current sort label
    const currentSortLabel = sortOptions.find(opt => opt.value === sortOption)?.label || 'Sắp xếp'

    // Get project name
    const getProjectName = () => {
        if (selectedProject === 'all') return null
        const project = projects.find(p => String(p.id) === String(selectedProject))
        return project?.name || null
    }

    // Get category names
    const getCategoryNames = () => {
        return selectedCategories.map(catId => {
            const cat = categories.find(c => c.id === catId)
            return cat ? { id: catId, name: cat.name } : null
        }).filter(Boolean)
    }

    const projectName = getProjectName()
    const categoryTags = getCategoryNames()
    const hasFilters = projectName || categoryTags.length > 0 || searchText

    const handleSortSelect = (value) => {
        onSortChange(value)
        setShowSortMenu(false)
    }

    return (
        <div className="sort-toolbar">
            {/* Single Row: Sort Button + Tags + Clear All */}
            <div className="sort-toolbar-row">
                {/* Sort Button - Fixed on left */}
                <div className="sort-button-wrapper">
                    <button
                        className="sort-button"
                        onClick={() => setShowSortMenu(!showSortMenu)}
                    >
                        <ArrowUpDown size={12} />
                        <span>Sắp xếp</span>
                        <ChevronDown size={12} />
                    </button>

                    {/* Sort Menu Dropdown */}
                    {showSortMenu && (
                        <>
                            <div
                                className="sort-menu-backdrop"
                                onClick={() => setShowSortMenu(false)}
                            />
                            <div className="sort-menu">
                                {sortOptions.map(option => (
                                    <button
                                        key={option.value}
                                        className={`sort-menu-item ${sortOption === option.value ? 'active' : ''}`}
                                        onClick={() => handleSortSelect(option.value)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Filter Tags - Scrollable area */}
                {hasFilters && (
                    <div className="filter-tags-scroll">
                        {/* Search Tag */}
                        {searchText && (
                            <div className="filter-tag">
                                <span>"{searchText}"</span>
                                <button onClick={onRemoveSearch} aria-label="Xóa tìm kiếm">
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* Project Tag */}
                        {projectName && (
                            <div className="filter-tag project">
                                <span>{projectName}</span>
                                <button onClick={onRemoveProject} aria-label="Xóa dự án">
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* Category Tags */}
                        {categoryTags.map(cat => (
                            <div key={cat.id} className="filter-tag category">
                                <span>{cat.name}</span>
                                <button onClick={() => onRemoveCategory(cat.id)} aria-label={`Xóa ${cat.name}`}>
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Clear All Button - Fixed on right */}
                {hasFilters && (
                    <button className="sort-clear-all" onClick={onClearAll}>
                        <X size={12} />
                    </button>
                )}
            </div>
        </div>
    )
}

export default SortToolbar
