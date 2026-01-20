import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { formatDateVN } from '../../utils/formatters'

const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
]

/**
 * Custom DatePicker component with quick selection buttons
 * Provides consistent UI across desktop and mobile
 */
const DatePicker = ({
    value,
    onChange,
    placeholder = 'Chọn ngày',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [showYearPicker, setShowYearPicker] = useState(false)
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            return new Date(value + 'T00:00:00')
        }
        return new Date()
    })
    const containerRef = useRef(null)

    // Get today's date for comparison
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Calculate quick dates
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const lastMonth = new Date(today)
    lastMonth.setMonth(today.getMonth() - 1)
    const lastMonthStr = lastMonth.toISOString().split('T')[0]

    const lastYear = new Date(today)
    lastYear.setFullYear(today.getFullYear() - 1)
    const lastYearStr = lastYear.toISOString().split('T')[0]

    // Generate year options (10 years back, 1 year forward)
    const currentYear = today.getFullYear()
    const yearOptions = []
    for (let y = currentYear + 1; y >= currentYear - 10; y--) {
        yearOptions.push(y)
    }

    // Update viewDate when value changes externally
    useEffect(() => {
        if (value) {
            setViewDate(new Date(value + 'T00:00:00'))
        }
    }, [value])

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
                setShowYearPicker(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('touchstart', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [isOpen])

    // Generate calendar days
    const generateCalendarDays = () => {
        const year = viewDate.getFullYear()
        const month = viewDate.getMonth()

        const firstDayOfMonth = new Date(year, month, 1)
        const lastDayOfMonth = new Date(year, month + 1, 0)

        const startDay = firstDayOfMonth.getDay() // 0 = Sunday
        const daysInMonth = lastDayOfMonth.getDate()

        const days = []

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate()
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                currentMonth: false,
                date: new Date(year, month - 1, prevMonthLastDay - i)
            })
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({
                day,
                currentMonth: true,
                date: new Date(year, month, day)
            })
        }

        // Next month days (fill remaining cells)
        const remaining = 42 - days.length // 6 rows * 7 days
        for (let day = 1; day <= remaining; day++) {
            days.push({
                day,
                currentMonth: false,
                date: new Date(year, month + 1, day)
            })
        }

        return days
    }

    const handleDateSelect = (dateObj) => {
        const dateStr = dateObj.date.toISOString().split('T')[0]
        onChange(dateStr)
        setIsOpen(false)
    }

    const handleQuickSelect = (dateStr) => {
        onChange(dateStr)
        const newDate = new Date(dateStr + 'T00:00:00')
        setViewDate(newDate)
        setIsOpen(false)
    }

    const navigateMonth = (direction) => {
        setViewDate(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(prev.getMonth() + direction)
            return newDate
        })
    }

    const handleYearSelect = (year) => {
        setViewDate(prev => {
            const newDate = new Date(prev)
            newDate.setFullYear(year)
            return newDate
        })
        setShowYearPicker(false)
    }

    const isToday = (dateObj) => {
        return dateObj.date.toISOString().split('T')[0] === todayStr
    }

    const isSelected = (dateObj) => {
        if (!value) return false
        return dateObj.date.toISOString().split('T')[0] === value
    }

    const calendarDays = generateCalendarDays()

    return (
        <div className={`date-picker-container ${className}`} ref={containerRef}>
            {/* Input Display */}
            <button
                type="button"
                className="date-picker-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Chọn ngày"
            >
                <Calendar size={18} className="date-picker-icon" />
                <span className={`date-picker-value ${!value ? 'placeholder' : ''}`}>
                    {value ? formatDateVN(value) : placeholder}
                </span>
            </button>

            {/* Calendar Dropdown */}
            {isOpen && (
                <div className="date-picker-dropdown">
                    {/* Quick Selection Buttons - Always visible at top */}
                    <div className="date-picker-quick-actions">
                        <button
                            type="button"
                            className={`quick-action-chip ${value === todayStr ? 'active' : ''}`}
                            onClick={() => handleQuickSelect(todayStr)}
                        >
                            Hôm nay
                        </button>
                        <button
                            type="button"
                            className={`quick-action-chip ${value === yesterdayStr ? 'active' : ''}`}
                            onClick={() => handleQuickSelect(yesterdayStr)}
                        >
                            Hôm qua
                        </button>
                        <button
                            type="button"
                            className={`quick-action-chip ${value === lastMonthStr ? 'active' : ''}`}
                            onClick={() => handleQuickSelect(lastMonthStr)}
                        >
                            Tháng trước
                        </button>
                        <button
                            type="button"
                            className={`quick-action-chip ${value === lastYearStr ? 'active' : ''}`}
                            onClick={() => handleQuickSelect(lastYearStr)}
                        >
                            Năm trước
                        </button>
                    </div>

                    {/* Header with Month/Year Navigation */}
                    <div className="date-picker-header">
                        <button
                            type="button"
                            className="date-picker-nav-btn"
                            onClick={() => navigateMonth(-1)}
                            aria-label="Tháng trước"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        {/* Month/Year - Click to select year */}
                        <button
                            type="button"
                            className="date-picker-month-year-btn"
                            onClick={() => setShowYearPicker(!showYearPicker)}
                        >
                            <span>{MONTHS_VI[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                            <ChevronDown size={16} className={`year-chevron ${showYearPicker ? 'open' : ''}`} />
                        </button>
                        
                        <button
                            type="button"
                            className="date-picker-nav-btn"
                            onClick={() => navigateMonth(1)}
                            aria-label="Tháng sau"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Year Picker Dropdown */}
                    {showYearPicker && (
                        <div className="date-picker-year-grid">
                            {yearOptions.map(year => (
                                <button
                                    key={year}
                                    type="button"
                                    className={`year-option ${year === viewDate.getFullYear() ? 'selected' : ''} ${year === currentYear ? 'current' : ''}`}
                                    onClick={() => handleYearSelect(year)}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Day Names */}
                    {!showYearPicker && (
                        <>
                            <div className="date-picker-weekdays">
                                {DAYS_VI.map(day => (
                                    <div key={day} className="date-picker-weekday">{day}</div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="date-picker-grid">
                                {calendarDays.map((dayObj, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={`date-picker-day ${!dayObj.currentMonth ? 'other-month' : ''
                                            } ${isToday(dayObj) ? 'today' : ''
                                            } ${isSelected(dayObj) ? 'selected' : ''
                                            }`}
                                        onClick={() => handleDateSelect(dayObj)}
                                    >
                                        {dayObj.day}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default DatePicker
