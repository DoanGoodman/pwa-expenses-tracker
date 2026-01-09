import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import BottomSheet from './BottomSheet'

/**
 * DateRangeBottomSheet - Bottom Sheet với lịch chọn khoảng ngày
 * Lịch linh hoạt cho phép chọn startDate và endDate
 * 
 * @param {boolean} isOpen - Trạng thái mở/đóng
 * @param {function} onClose - Callback khi đóng
 * @param {string} startDate - Ngày bắt đầu (YYYY-MM)
 * @param {string} endDate - Ngày kết thúc (YYYY-MM)
 * @param {function} onApply - Callback khi áp dụng (startDate, endDate)
 */
const DateRangeBottomSheet = ({
    isOpen,
    onClose,
    startDate,
    endDate,
    onApply
}) => {
    // Internal state for selection
    const [tempStart, setTempStart] = useState(startDate)
    const [tempEnd, setTempEnd] = useState(endDate)
    const [selectingStart, setSelectingStart] = useState(true) // true = selecting start, false = selecting end
    const [viewYear, setViewYear] = useState(new Date().getFullYear())

    // Sync with props when opened
    useEffect(() => {
        if (isOpen) {
            setTempStart(startDate)
            setTempEnd(endDate)
            setSelectingStart(true)
            // Set view year to start date year
            if (startDate) {
                setViewYear(parseInt(startDate.split('-')[0]))
            }
        }
    }, [isOpen, startDate, endDate])

    // Month names in Vietnamese
    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
        'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
        'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ]

    // Navigate year
    const prevYear = () => setViewYear(viewYear - 1)
    const nextYear = () => setViewYear(viewYear + 1)

    // Handle month selection
    const handleMonthSelect = (monthIndex) => {
        const monthStr = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`

        if (selectingStart) {
            setTempStart(monthStr)
            // If selected start is after current end, reset end
            if (monthStr > tempEnd) {
                setTempEnd(monthStr)
            }
            setSelectingStart(false) // Switch to selecting end
        } else {
            // Ensure end is not before start
            if (monthStr >= tempStart) {
                setTempEnd(monthStr)
            } else {
                // If end is before start, swap them
                setTempEnd(tempStart)
                setTempStart(monthStr)
            }
        }
    }

    // Check if month is in selected range
    const isInRange = (monthIndex) => {
        const monthStr = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
        return monthStr >= tempStart && monthStr <= tempEnd
    }

    // Check if month is start or end
    const isStart = (monthIndex) => {
        const monthStr = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
        return monthStr === tempStart
    }

    const isEnd = (monthIndex) => {
        const monthStr = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
        return monthStr === tempEnd
    }

    // Handle apply
    const handleApply = () => {
        onApply(tempStart, tempEnd)
        onClose()
    }

    // Format display date
    const formatMonth = (monthStr) => {
        if (!monthStr) return ''
        const [year, month] = monthStr.split('-')
        return `T${parseInt(month)}/${year}`
    }

    // Quick select options
    const quickSelects = [
        { label: '3 tháng gần đây', months: 3 },
        { label: '6 tháng gần đây', months: 6 },
        { label: 'Năm nay', type: 'year' },
        { label: 'Năm trước', type: 'lastYear' }
    ]

    const handleQuickSelect = (option) => {
        const now = new Date()
        let start, end

        if (option.type === 'year') {
            start = `${now.getFullYear()}-01`
            end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        } else if (option.type === 'lastYear') {
            const lastYear = now.getFullYear() - 1
            start = `${lastYear}-01`
            end = `${lastYear}-12`
        } else {
            const startDate = new Date()
            startDate.setMonth(startDate.getMonth() - option.months + 1)
            start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
            end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        }

        setTempStart(start)
        setTempEnd(end)
        setViewYear(parseInt(start.split('-')[0]))
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Chọn khoảng thời gian"
            maxHeight="85vh"
        >
            {/* Date Range Summary */}
            <div className="date-range-summary">
                <button
                    className={`date-range-box ${selectingStart ? 'active' : ''}`}
                    onClick={() => setSelectingStart(true)}
                >
                    <span className="date-range-label">Từ</span>
                    <span className="date-range-value">{formatMonth(tempStart)}</span>
                </button>
                <div className="date-range-arrow">→</div>
                <button
                    className={`date-range-box ${!selectingStart ? 'active' : ''}`}
                    onClick={() => setSelectingStart(false)}
                >
                    <span className="date-range-label">Đến</span>
                    <span className="date-range-value">{formatMonth(tempEnd)}</span>
                </button>
            </div>

            {/* Quick Select Chips */}
            <div className="date-range-quick">
                {quickSelects.map((option, index) => (
                    <button
                        key={index}
                        className="date-range-chip"
                        onClick={() => handleQuickSelect(option)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Month Calendar */}
            <div className="date-range-calendar">
                {/* Year Navigation */}
                <div className="date-range-year-nav">
                    <button className="date-range-nav-btn" onClick={prevYear}>
                        <ChevronLeft size={20} />
                    </button>
                    <span className="date-range-year">{viewYear}</span>
                    <button className="date-range-nav-btn" onClick={nextYear}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Month Grid */}
                <div className="date-range-months">
                    {monthNames.map((name, index) => {
                        const inRange = isInRange(index)
                        const isStartMonth = isStart(index)
                        const isEndMonth = isEnd(index)

                        return (
                            <button
                                key={index}
                                className={`date-range-month 
                                    ${inRange ? 'in-range' : ''} 
                                    ${isStartMonth ? 'is-start' : ''} 
                                    ${isEndMonth ? 'is-end' : ''}
                                    ${isStartMonth && isEndMonth ? 'is-single' : ''}
                                `}
                                onClick={() => handleMonthSelect(index)}
                            >
                                <span className="date-range-month-abbr">T{index + 1}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Apply Button */}
            <div className="date-range-actions">
                <button className="date-range-apply-btn" onClick={handleApply}>
                    <Check size={18} />
                    <span>Áp dụng</span>
                </button>
            </div>
        </BottomSheet>
    )
}

export default DateRangeBottomSheet
