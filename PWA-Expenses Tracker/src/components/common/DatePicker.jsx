import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatDateVN } from '../../utils/formatters'

const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
]

/**
 * Custom DatePicker component with "Today" button
 * Provides consistent UI across desktop and mobile
 */
const DatePicker = ({
    value,
    onChange,
    placeholder = 'Chọn ngày',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            return new Date(value + 'T00:00:00')
        }
        return new Date()
    })
    const containerRef = useRef(null)
    const calendarRef = useRef(null)

    // Parse selected date
    const selectedDate = value ? new Date(value + 'T00:00:00') : null

    // Get today's date for comparison
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

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

    const handleTodayClick = () => {
        onChange(todayStr)
        setViewDate(new Date())
        setIsOpen(false)
    }

    const handleClearClick = () => {
        onChange('')
        setIsOpen(false)
    }

    const navigateMonth = (direction) => {
        setViewDate(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(prev.getMonth() + direction)
            return newDate
        })
    }

    const isToday = (dateObj) => {
        return dateObj.date.toISOString().split('T')[0] === todayStr
    }

    const isSelected = (dateObj) => {
        if (!selectedDate) return false
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
                <div className="date-picker-dropdown" ref={calendarRef}>
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
                        <span className="date-picker-month-year">
                            {MONTHS_VI[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button
                            type="button"
                            className="date-picker-nav-btn"
                            onClick={() => navigateMonth(1)}
                            aria-label="Tháng sau"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Day Names */}
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

                    {/* Footer with Quick Actions */}
                    <div className="date-picker-footer">
                        <button
                            type="button"
                            className="date-picker-action-btn clear"
                            onClick={handleClearClick}
                        >
                            <X size={16} />
                            Xóa
                        </button>
                        <button
                            type="button"
                            className="date-picker-action-btn today"
                            onClick={handleTodayClick}
                        >
                            <Calendar size={16} />
                            Hôm nay
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DatePicker
