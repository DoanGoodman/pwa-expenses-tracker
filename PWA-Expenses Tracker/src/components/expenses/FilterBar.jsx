import { Search, X } from 'lucide-react'
import { useMemo } from 'react'

// Tạo danh sách tháng gần đây (12 tháng gần nhất) với label ngắn gọn
const generateMonthOptions = () => {
    const months = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const value = `${year}-${month}`
        // Shorter label: MM/YY format (e.g., 12/25 instead of T12/2025)
        const shortYear = String(year).slice(-2)
        const label = `${date.getMonth() + 1}/${shortYear}`
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

            {/* Filter Dropdowns - Grid with wrapper divs for iOS compatibility */}
            <div className="grid grid-cols-[1fr_125px_80px] gap-1.5">
                {/* Project Filter - Takes remaining space */}
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <select
                        value={selectedProject}
                        onChange={(e) => onProjectChange(e.target.value)}
                        className="w-full h-full py-2 pl-2 pr-6 text-sm bg-transparent border-none outline-none appearance-none cursor-pointer"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    >
                        <option value="all">Dự án</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <select
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className="w-full h-full py-2 pl-2 pr-6 text-xs bg-transparent border-none outline-none appearance-none cursor-pointer"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    >
                        <option value="all">Danh mục</option>
                        {sortedCategories.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                </div>

                {/* Month Filter */}
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <select
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="w-full h-full py-2 pl-2 pr-6 text-xs bg-transparent border-none outline-none appearance-none cursor-pointer"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    >
                        <option value="">Tháng</option>
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FilterBar
