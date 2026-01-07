import { useState, useEffect } from 'react'
import { X, AlertTriangle, Edit3, Trash2 } from 'lucide-react'

const ReasonModal = ({
    isOpen,
    onClose,
    onConfirm,
    type = 'edit', // 'edit' or 'delete'
    expenseDescription = ''
}) => {
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setReason('')
            setError('')
            setIsSubmitting(false)
        }
    }, [isOpen])

    const isDelete = type === 'delete'

    const handleSubmit = async (e) => {
        e.preventDefault()

        const trimmedReason = reason.trim()

        if (!trimmedReason) {
            setError('Bạn phải cung cấp lý do để tiếp tục')
            return
        }

        if (trimmedReason.length < 3) {
            setError('Lý do phải có ít nhất 3 ký tự')
            return
        }

        setIsSubmitting(true)
        setError('')

        try {
            await onConfirm(trimmedReason)
            onClose()
        } catch (err) {
            setError('Có lỗi xảy ra. Vui lòng thử lại.')
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl animate-fade-in">
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${isDelete ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'
                    } rounded-t-2xl`}>
                    <div className="flex items-center gap-2">
                        {isDelete ? (
                            <Trash2 size={20} className="text-red-500" />
                        ) : (
                            <Edit3 size={20} className="text-blue-500" />
                        )}
                        <h3 className={`text-lg font-semibold ${isDelete ? 'text-red-800' : 'text-blue-800'
                            }`}>
                            {isDelete ? 'Xác nhận xóa' : 'Xác nhận cập nhật'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-4">
                    {/* Description of action */}
                    <div className={`p-3 rounded-lg mb-4 ${isDelete ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                        }`}>
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={18} className={`mt-0.5 flex-shrink-0 ${isDelete ? 'text-red-500' : 'text-blue-500'
                                }`} />
                            <div>
                                <p className={`text-sm font-medium ${isDelete ? 'text-red-800' : 'text-blue-800'
                                    }`}>
                                    {isDelete
                                        ? 'Bạn đang xóa chi phí:'
                                        : 'Bạn đang cập nhật chi phí:'}
                                </p>
                                <p className="text-sm text-gray-700 mt-1 font-medium">
                                    "{expenseDescription || 'Chi phí'}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reason Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Lý do thay đổi <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value)
                                setError('')
                            }}
                            placeholder={isDelete
                                ? "Ví dụ: Nhập sai thông tin, Chi phí trùng lặp..."
                                : "Ví dụ: Cập nhật số lượng, Sửa đơn giá..."}
                            className="input-field resize-none"
                            rows={3}
                            autoFocus
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <span className="text-sm text-red-600">{error}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-600 
                                       font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !reason.trim()}
                            className={`flex-1 py-3 px-4 rounded-xl text-white font-medium 
                                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                       ${isDelete
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-blue-500 hover:bg-blue-600'}`}
                        >
                            {isSubmitting
                                ? 'Đang xử lý...'
                                : isDelete ? 'Xác nhận xóa' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ReasonModal
