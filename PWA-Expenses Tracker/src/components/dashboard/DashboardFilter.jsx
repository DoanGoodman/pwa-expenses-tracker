import { useRef } from 'react'
import { Calendar } from 'lucide-react'
import { formatMonthYear } from '../../utils/formatters'

const DashboardFilter = ({
    projects,
    selectedProject,
    onProjectChange,
    startMonth,
    endMonth,
    onStartChange,
    onEndChange
}) => {
    const startInputRef = useRef(null)
    const endInputRef = useRef(null)

    const handleStartClick = () => {
        if (startInputRef.current?.showPicker) {
            startInputRef.current.showPicker()
        } else {
            startInputRef.current?.click()
        }
    }

    const handleEndClick = () => {
        if (endInputRef.current?.showPicker) {
            endInputRef.current.showPicker()
        } else {
            endInputRef.current?.click()
        }
    }

    return (
        <div className="flex items-center justify-between gap-2 mb-5">
            {/* Project Dropdown */}
            <select
                value={selectedProject}
                onChange={(e) => onProjectChange(e.target.value)}
                className="filter-dropdown flex-1"
                style={{ minWidth: '120px' }}
            >
                <option value="all">Tất cả dự án</option>
                {projects.map(project => (
                    <option key={project.id} value={project.id}>
                        {project.name}
                    </option>
                ))}
            </select>

            {/* Compact Date Range - Pushed to the right */}
            <div className="flex items-center gap-2 ml-auto">
                {/* Start Month */}
                <div className="range-pill-small" onClick={handleStartClick}>
                    <Calendar size={14} className="text-primary" />
                    <span className="text-xs font-medium text-gray-700">
                        {formatMonthYear(startMonth)}
                    </span>
                    <input
                        ref={startInputRef}
                        type="month"
                        value={startMonth}
                        onChange={(e) => onStartChange(e.target.value)}
                        className="absolute opacity-0 w-full h-full left-0 top-0 z-10 cursor-pointer"
                    />
                </div>

                <span className="text-gray-400 text-xs">→</span>

                {/* End Month */}
                <div className="range-pill-small" onClick={handleEndClick}>
                    <Calendar size={14} className="text-primary" />
                    <span className="text-xs font-medium text-gray-700">
                        {formatMonthYear(endMonth)}
                    </span>
                    <input
                        ref={endInputRef}
                        type="month"
                        value={endMonth}
                        onChange={(e) => onEndChange(e.target.value)}
                        className="absolute opacity-0 w-full h-full left-0 top-0 z-10 cursor-pointer"
                    />
                </div>
            </div>
        </div>
    )
}

export default DashboardFilter
