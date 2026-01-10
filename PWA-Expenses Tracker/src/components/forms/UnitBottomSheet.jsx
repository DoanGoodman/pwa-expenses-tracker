import { useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'

const UNIT_OPTIONS = [
    { value: '', label: 'Chọn' },
    { value: 'm2', label: 'm²' },
    { value: 'm3', label: 'm³' },
    { value: 'md', label: 'md' },
    { value: 'kg', label: 'kg' },
    { value: 'lit', label: 'lít' },
    { value: 'bao', label: 'bao' },
    { value: 'thung', label: 'thùng' },
    { value: 'cai', label: 'cái' },
    { value: 'hop', label: 'hộp' },
    { value: 'ls', label: 'ls' },
]

const UnitBottomSheet = ({ isOpen, onClose, selectedUnit, onSelect }) => {
    const sheetRef = useRef(null)
    const startY = useRef(0)
    const currentY = useRef(0)

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
        currentY.current = e.touches[0].clientY
        const diff = currentY.current - startY.current
        if (diff > 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${diff}px)`
        }
    }

    const handleTouchEnd = () => {
        const diff = currentY.current - startY.current
        if (diff > 100) {
            onClose()
        }
        if (sheetRef.current) {
            sheetRef.current.style.transform = ''
        }
    }

    const handleSelect = (value) => {
        onSelect(value)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="bottom-sheet-overlay" onClick={onClose}>
            <div
                ref={sheetRef}
                className="bottom-sheet unit-bottom-sheet"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Handle */}
                <div className="bottom-sheet-handle">
                    <div className="bottom-sheet-handle-bar"></div>
                </div>

                {/* Header */}
                <div className="bottom-sheet-header">
                    <h3>Chọn đơn vị tính</h3>
                    <button className="bottom-sheet-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Unit Tags Grid */}
                <div className="unit-tags-container">
                    <div className="unit-tags-grid">
                        {UNIT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`unit-tag ${selectedUnit === option.value ? 'selected' : ''}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                {option.label}
                                {selectedUnit === option.value && (
                                    <Check size={14} className="unit-tag-check" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="unit-sheet-actions">
                    <button
                        className="unit-action-reset"
                        onClick={() => handleSelect('')}
                    >
                        Đặt lại
                    </button>
                    <button
                        className="unit-action-apply"
                        onClick={onClose}
                    >
                        <Check size={18} />
                        Áp dụng
                    </button>
                </div>
            </div>
        </div>
    )
}

export { UNIT_OPTIONS }
export default UnitBottomSheet
