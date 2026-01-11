import { X } from 'lucide-react'

const ImageZoomModal = ({ isOpen, onClose, imageUrl }) => {
    if (!isOpen || !imageUrl) return null

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                aria-label="Đóng"
            >
                <X size={24} />
            </button>

            {/* Image */}
            <img
                src={imageUrl}
                alt="Hóa đơn phóng to"
                className="max-w-full max-h-full object-contain p-4"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Instruction */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 text-sm">
                Nhấn bất kỳ đâu để đóng
            </div>
        </div>
    )
}

export default ImageZoomModal
