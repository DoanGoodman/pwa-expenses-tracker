import { useState } from 'react'
import { Building2, Calendar, ChevronDown } from 'lucide-react'
import ProjectBottomSheet from './ProjectBottomSheet'
import DateRangeBottomSheet from './DateRangeBottomSheet'
import { formatMonthYear } from '../../utils/formatters'

/**
 * AdvancedSearchBar - Thanh tìm kiếm nâng cao cho Mobile PWA
 * Kiểu dáng: Thanh màu trắng, bo tròn 12px, bóng đổ nhẹ
 * Tương tác: Clickable areas (không phải input) để mở Bottom Sheet
 * 
 * Thiết kế lấy cảm hứng từ Booking.com
 * 
 * @param {Array} projects - Danh sách dự án từ Supabase
 * @param {string} selectedProject - ID dự án được chọn ('all' hoặc project.id)
 * @param {function} onProjectChange - Callback khi chọn dự án
 * @param {string} startMonth - Tháng bắt đầu (YYYY-MM)
 * @param {string} endMonth - Tháng kết thúc (YYYY-MM)
 * @param {function} onStartChange - Callback khi thay đổi tháng bắt đầu
 * @param {function} onEndChange - Callback khi thay đổi tháng kết thúc
 */
const AdvancedSearchBar = ({
    projects = [],
    selectedProject,
    onProjectChange,
    startMonth,
    endMonth,
    onStartChange,
    onEndChange
}) => {
    // Bottom Sheet states
    const [showProjectSheet, setShowProjectSheet] = useState(false)
    const [showDateSheet, setShowDateSheet] = useState(false)

    // Get current project name
    const getProjectName = () => {
        if (selectedProject === 'all') return 'Tất cả dự án'
        const project = projects.find(p => String(p.id) === String(selectedProject))
        return project?.name || 'Chọn dự án'
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

    // Handle date range apply
    const handleDateApply = (start, end) => {
        onStartChange(start)
        onEndChange(end)
    }

    return (
        <>
            {/* Search Bar Container */}
            <div className="advanced-search-bar">
                {/* Left Section - Project Selector */}
                <button
                    className="search-bar-section project-section"
                    onClick={() => setShowProjectSheet(true)}
                    aria-label="Chọn dự án"
                >
                    <div className="search-bar-left">
                        <div className="search-bar-icon">
                            <Building2 size={14} />
                        </div>
                        <div className="search-bar-content">
                            <span className="search-bar-label">Dự án</span>
                            <span className="search-bar-value">{getProjectName()}</span>
                        </div>
                    </div>
                    <ChevronDown size={14} className="search-bar-chevron" />
                </button>

                {/* Divider */}
                <div className="search-bar-divider" />

                {/* Right Section - Date Range Selector */}
                <button
                    className="search-bar-section date-section"
                    onClick={() => setShowDateSheet(true)}
                    aria-label="Chọn khoảng thời gian"
                >
                    <div className="search-bar-left">
                        <div className="search-bar-icon">
                            <Calendar size={14} />
                        </div>
                        <div className="search-bar-content">
                            <span className="search-bar-label">Thời gian</span>
                            <span className="search-bar-value">{getDateRangeDisplay()}</span>
                        </div>
                    </div>
                    <ChevronDown size={14} className="search-bar-chevron" />
                </button>
            </div>

            {/* Project Bottom Sheet */}
            <ProjectBottomSheet
                isOpen={showProjectSheet}
                onClose={() => setShowProjectSheet(false)}
                projects={projects}
                selectedId={selectedProject}
                onSelect={onProjectChange}
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

export default AdvancedSearchBar
