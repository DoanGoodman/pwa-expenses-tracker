import { useState } from 'react'
import { Search, Calendar, ChevronDown, Filter } from 'lucide-react'
import FilterBottomSheet from './FilterBottomSheet'
import DateRangeBottomSheet from '../common/DateRangeBottomSheet'
import { formatMonthYear } from '../../utils/formatters'

/**
 * ExpenseSearchBar - Thanh tìm kiếm đa thành phần cho trang Chi phí
 * Kiểu dáng: Một khối duy nhất, bo tròn, chia 2 vùng
 * 
 * Section 1: Ô Input - khi focus mở Bottom Sheet (không hiện bàn phím)
 * Section 2: Icon lịch + khoảng ngày - khi nhấn mở Date Range picker
 */
const ExpenseSearchBar = ({
    projects = [],
    categories = [],
    selectedProject,
    selectedCategories = [],
    searchText,
    startMonth,
    endMonth,
    onFilterChange,
    onDateChange
}) => {
    const [showFilterSheet, setShowFilterSheet] = useState(false)
    const [showDateSheet, setShowDateSheet] = useState(false)

    // Get display text for search/filter section
    const getFilterDisplayText = () => {
        const parts = []

        if (searchText) {
            parts.push(`"${searchText}"`)
        }

        if (selectedProject !== 'all') {
            const project = projects.find(p => String(p.id) === String(selectedProject))
            if (project) parts.push(project.name)
        }

        if (selectedCategories.length > 0) {
            parts.push(`${selectedCategories.length} danh mục`)
        }

        if (parts.length === 0) {
            return null
        }

        return parts.join(', ')
    }

    // Format date range for display
    const getDateRangeDisplay = () => {
        const start = formatMonthYear(startMonth)
        const end = formatMonthYear(endMonth)

        if (start === end) {
            return start
        }
        return `${start} → ${end}`
    }

    // Handle filter apply from Bottom Sheet
    const handleFilterApply = (filters) => {
        onFilterChange(filters)
    }

    // Handle date range apply
    const handleDateApply = (start, end) => {
        onDateChange(start, end)
    }

    // Check if has active filters
    const hasActiveFilters = searchText || selectedProject !== 'all' || selectedCategories.length > 0
    const filterDisplay = getFilterDisplayText()

    return (
        <>
            {/* Search Bar Container */}
            <div className="expense-search-bar">
                {/* Section 1 - Filter/Search Input */}
                <button
                    className="expense-search-section filter-section"
                    onClick={() => setShowFilterSheet(true)}
                    aria-label="Mở bộ lọc"
                >
                    <div className="expense-search-left">
                        <div className="expense-search-icon">
                            {hasActiveFilters ? <Filter size={14} /> : <Search size={14} />}
                        </div>
                        <div className="expense-search-content">
                            {filterDisplay ? (
                                <span className="expense-search-value active">{filterDisplay}</span>
                            ) : (
                                <span className="expense-search-placeholder">Tìm tên chi phí hoặc lọc...</span>
                            )}
                        </div>
                    </div>
                    <ChevronDown size={14} className="expense-search-chevron" />
                </button>

                {/* Divider */}
                <div className="expense-search-divider" />

                {/* Section 2 - Date Range */}
                <button
                    className="expense-search-section date-section"
                    onClick={() => setShowDateSheet(true)}
                    aria-label="Chọn khoảng thời gian"
                >
                    <div className="expense-search-left">
                        <div className="expense-search-icon">
                            <Calendar size={14} />
                        </div>
                        <div className="expense-search-content">
                            <span className="expense-search-value">{getDateRangeDisplay()}</span>
                        </div>
                    </div>
                    <ChevronDown size={14} className="expense-search-chevron" />
                </button>
            </div>

            {/* Filter Bottom Sheet */}
            <FilterBottomSheet
                isOpen={showFilterSheet}
                onClose={() => setShowFilterSheet(false)}
                projects={projects}
                categories={categories}
                selectedProject={selectedProject}
                selectedCategories={selectedCategories}
                searchText={searchText}
                onApply={handleFilterApply}
            />

            {/* Date Range Bottom Sheet */}
            <DateRangeBottomSheet
                isOpen={showDateSheet}
                onClose={() => setShowDateSheet(false)}
                startDate={startMonth}
                endDate={endMonth}
                onApply={handleDateApply}
            />
        </>
    )
}

export default ExpenseSearchBar
