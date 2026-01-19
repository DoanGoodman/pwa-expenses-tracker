import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * BottomSheet Component - Ngăn kéo trượt từ dưới lên
 * Sử dụng kỹ thuật giống Booking.com
 * 
 * @param {boolean} isOpen - Trạng thái mở/đóng
 * @param {function} onClose - Callback khi đóng
 * @param {string} title - Tiêu đề Bottom Sheet
 * @param {React.ReactNode} children - Nội dung bên trong
 * @param {string} maxHeight - Chiều cao tối đa (default: 80vh)
 */
const BottomSheet = ({
    isOpen,
    onClose,
    title,
    children,
    maxHeight = '80vh'
}) => {
    const sheetRef = useRef(null)
    const startY = useRef(0)
    const currentY = useRef(0)

    // Prevent body scroll when sheet is open
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

    // Handle touch gestures for swipe-to-close
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
            // Swipe down threshold reached - close the sheet
            onClose()
        }

        // Reset position
        if (sheetRef.current) {
            sheetRef.current.style.transform = ''
        }
        startY.current = 0
        currentY.current = 0
    }

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="bottom-sheet-overlay"
            onClick={handleBackdropClick}
        >
            <div
                ref={sheetRef}
                className="bottom-sheet-container"
                style={{ maxHeight }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="bottom-sheet-handle">
                    <div className="bottom-sheet-handle-bar" />
                </div>

                {/* Header */}
                <div className="bottom-sheet-header">
                    <h3 className="bottom-sheet-title">{title}</h3>
                    <button
                        className="bottom-sheet-close"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="bottom-sheet-content">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default BottomSheet
