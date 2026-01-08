import { Search, X } from 'lucide-react'
import { useMemo } from 'react'

// Tạo danh sách tháng gần đây (12 tháng gần nhất)
const generateMonthOptions = () => {
    const months = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const value = `${year}-${month}`
        const label = `T${date.getMonth() + 1}/${year}`
        months.push({ value, label })
    }

    return months
}

const FilterBar = ({
    projects,
    categories,
    selectedProject,
    selectedCategory,
    selectedMonth,
    searchText,
    onProjectChange,
    onCategoryChange,
    onMonthChange,
    onSearchChange,
    hasActiveFilters,
    onClearFilters
}) => {
    // Generate month options once
    const monthOptions = useMemo(() => generateMonthOptions(), [])

    // Sort categories by ID
    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => {
            // If IDs are numbers, sort numerically
            if (typeof a.id === 'number' && typeof b.id === 'number') {
                return a.id - b.id
            }
            // Otherwise sort as strings
            return String(a.id).localeCompare(String(b.id))
        })
    }, [categories])

    return (
        <div className="space-y-3 mb-5">
            {/* Search Bar with Clear Filter */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
                    />
                    <input
                        type="text"
                        placeholder="Tìm kiếm chi phí..."
                        value={searchText}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: '2.75rem' }}
                    />
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="flex items-center gap-1 px-3 py-2 text-xs text-primary font-medium bg-primary/10 rounded-xl whitespace-nowrap hover:bg-primary/20 transition-colors"
                    >
                        <X size={14} />
                        Xóa lọc
                    </button>
                )}
            </div>

            {/* Filter Dropdowns - Customized widths */}
            <div className="flex gap-2">
                {/* Project Filter - Wider (Priority) */}
                <select
                    value={selectedProject}
                    onChange={(e) => onProjectChange(e.target.value)}
                    className="filter-dropdown flex-[1.5] min-w-0"
                >
                    <option value="all">Dự án</option>
                    {projects.map(project => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </select>

                {/* Category Filter - Standard flexible */}
                <select
                    value={selectedCategory}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="filter-dropdown flex-1 min-w-0"
                >
                    <option value="all">Danh mục</option>
                    {sortedCategories.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>

                {/* Month Filter - Fixed narrow width (just enough for T12/2025) */}
                <select
                    value={selectedMonth}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className="filter-dropdown w-[90px] flex-shrink-0 px-1 text-center"
                >
                    <option value="">Tháng</option>
                    {monthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}

export default FilterBar
