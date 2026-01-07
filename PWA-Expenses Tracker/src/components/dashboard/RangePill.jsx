import { useRef } from 'react'
import { Calendar } from 'lucide-react'
import { formatMonthYear } from '../../utils/formatters'

const RangePill = ({ startMonth, endMonth, onStartChange, onEndChange }) => {
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
        <div className="flex items-center justify-center gap-2 mb-5">
            {/* Start Month Pill */}
            <div className="range-pill" onClick={handleStartClick}>
                <Calendar size={16} className="text-primary" />
                <span className="font-medium text-gray-700">
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

            <span className="text-gray-400 font-medium">→</span>

            {/* End Month Pill */}
            <div className="range-pill" onClick={handleEndClick}>
                <Calendar size={16} className="text-primary" />
                <span className="font-medium text-gray-700">
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
    )
}

export default RangePill
