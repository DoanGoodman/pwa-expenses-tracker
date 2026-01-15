import { useState, useRef } from 'react'
import { ImagePlus, Save, Plus, ZoomIn, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { compressImage, uploadToR2, analyzeReceipt, calculateTotal, generateFileHash, checkDuplicateHash } from '../../services/receiptService'
import { useUploadLimit } from '../../hooks/useSupabase'
import ReceiptItemCard from './ReceiptItemCard'
import ImageZoomModal from '../common/ImageZoomModal'
import SelectionBottomSheet from './SelectionBottomSheet'
import { CategoryIconComponent, getCategoryIconColor } from '../../utils/categoryIcons'

// Processing stages for UI feedback
const STAGES = {
    IDLE: 'idle',
    CHECKING_LIMIT: 'checking_limit',
    HASHING: 'hashing',
    COMPRESSING: 'compressing',
    UPLOADING: 'uploading',
    ANALYZING: 'analyzing',
    REVIEW: 'review',
    SAVING: 'saving'
}

const ReceiptScanner = ({
    projects,
    categories,
    onBulkSave,
    loading: savingLoading
}) => {
    const { user } = useAuth()
    const { checkAndIncrementUpload, DAILY_LIMIT } = useUploadLimit()
    const fileInputRef = useRef(null)

    // States
    const [stage, setStage] = useState(STAGES.IDLE)
    const [imageUrl, setImageUrl] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [items, setItems] = useState([])
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
    const [error, setError] = useState(null)
    const [showZoom, setShowZoom] = useState(false)
    const [showSelectionSheet, setShowSelectionSheet] = useState(false)
    const [fileHash, setFileHash] = useState(null) // Store file hash for saving

    // Global settings for all items
    const [globalSettings, setGlobalSettings] = useState({
        project_id: '',
        category_id: ''
    })

    // Handle file selection
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        setFileHash(null)

        // Show preview immediately
        const previewUrl = URL.createObjectURL(file)
        setImagePreview(previewUrl)

        try {
            // Stage 0: Check daily upload limit (30 images/day)
            setStage(STAGES.CHECKING_LIMIT)
            const limitCheck = await checkAndIncrementUpload()
            if (!limitCheck.allowed) {
                throw new Error(`Bạn đã đạt giới hạn ${DAILY_LIMIT} ảnh/ngày. Vui lòng thử lại vào ngày mai!`)
            }

            // Stage 1: Generate file hash for duplicate detection
            setStage(STAGES.HASHING)
            const hash = await generateFileHash(file)
            setFileHash(hash)

            // Check for duplicate
            const duplicateCheck = await checkDuplicateHash(hash)
            if (duplicateCheck.exists) {
                throw new Error('Hóa đơn này đã được tải lên trước đó. Vui lòng kiểm tra lại!')
            }

            // Stage 1: Compress image
            setStage(STAGES.COMPRESSING)
            const compressedFile = await compressImage(file)

            // Stage 2: Upload to R2
            setStage(STAGES.UPLOADING)
            const uploadResult = await uploadToR2(compressedFile, user?.id || 'demo')

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Upload failed')
            }

            setImageUrl(uploadResult.imageUrl)

            // Stage 3: Analyze with AI
            setStage(STAGES.ANALYZING)
            const analysisResult = await analyzeReceipt(uploadResult.imageUrl)

            if (!analysisResult.success) {
                throw new Error(analysisResult.error || 'Analysis failed')
            }

            // Set extracted data - use AI-extracted date
            setReceiptDate(analysisResult.data.date || new Date().toISOString().split('T')[0])
            setItems(analysisResult.data.items.map(item => ({
                ...item,
                id: item.id || crypto.randomUUID()
            })))

            // Move to review stage
            setStage(STAGES.REVIEW)

        } catch (err) {
            console.error('Receipt processing error:', err)
            setError(err.message)
            setStage(STAGES.IDLE)
            setFileHash(null)
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Update item in list
    const handleItemUpdate = (itemId, updatedItem) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? updatedItem : item
        ))
    }

    // Delete item from list
    const handleItemDelete = (itemId) => {
        setItems(prev => prev.filter(item => item.id !== itemId))
    }

    // Add new empty item
    const handleAddItem = () => {
        setItems(prev => [...prev, {
            id: crypto.randomUUID(),
            description: '',
            quantity: 1,
            unit: '',
            unit_price: 0,
            confidence: 1 // User-added items are 100% confident
        }])
    }

    // Handle bulk save
    const handleSave = async () => {
        if (!globalSettings.project_id || !globalSettings.category_id) {
            setError('Vui lòng chọn Dự án và Danh mục')
            return
        }

        if (items.length === 0) {
            setError('Không có chi phí nào để lưu')
            return
        }

        setStage(STAGES.SAVING)
        setError(null)

        // Prepare data for bulk insert
        const expensesData = items.map(item => ({
            project_id: globalSettings.project_id,
            category_id: globalSettings.category_id,
            date: receiptDate,
            description: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || null,
            unit_price: item.unit_price || 0,
            amount: (item.quantity || 1) * (item.unit_price || 0),
            image_url: imageUrl,
            file_hash: fileHash // Store hash for duplicate detection
        }))

        try {
            await onBulkSave(expensesData)

            // Reset form on success
            resetForm()
        } catch (err) {
            setError(err.message || 'Lưu thất bại')
            setStage(STAGES.REVIEW)
        }
    }

    // Reset form to initial state
    const resetForm = () => {
        setStage(STAGES.IDLE)
        setImageUrl(null)
        setImagePreview(null)
        setItems([])
        setReceiptDate(new Date().toISOString().split('T')[0])
        setGlobalSettings({ project_id: '', category_id: '' })
        setError(null)
        setFileHash(null)
    }

    // Calculate total
    const total = calculateTotal(items)

    // Get selected project/category names
    const selectedProject = projects.find(p => String(p.id) === String(globalSettings.project_id))
    const selectedCategory = categories.find(c => String(c.id) === String(globalSettings.category_id))

    // Render based on stage
    if (stage === STAGES.IDLE) {
        return (
            <div className="receipt-scanner-idle expense-form-content">
                {/* Image picker button */}
                <label className="receipt-picker-btn">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <div className="picker-icon">
                        <ImagePlus size={48} strokeWidth={1.5} />
                    </div>
                    <span className="picker-label">Chọn hóa đơn từ thư viện</span>
                    <span className="picker-hint">Hỗ trợ ảnh JPG, PNG</span>
                </label>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>
        )
    }

    // Processing stages (hashing, compressing, uploading, analyzing)
    if ([STAGES.CHECKING_LIMIT, STAGES.HASHING, STAGES.COMPRESSING, STAGES.UPLOADING, STAGES.ANALYZING].includes(stage)) {
        return (
            <div className="receipt-scanner-processing expense-form-content">
                {/* Image preview */}
                {imagePreview && (
                    <div className="relative w-full max-w-xs mx-auto mb-6 rounded-xl overflow-hidden shadow-lg">
                        <img
                            src={imagePreview}
                            alt="Đang xử lý..."
                            className="w-full h-auto opacity-50"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-teal-600/30">
                            <Loader2 size={48} className="text-white animate-spin" />
                        </div>
                    </div>
                )}

                {/* Loading overlay */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-teal-50 rounded-full text-teal-700">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="font-medium">
                            {stage === STAGES.CHECKING_LIMIT && 'Đang kiểm tra giới hạn upload...'}
                            {stage === STAGES.HASHING && 'Đang kiểm tra trùng lặp...'}
                            {stage === STAGES.COMPRESSING && 'Đang nén ảnh...'}
                            {stage === STAGES.UPLOADING && 'Đang tải lên...'}
                            {stage === STAGES.ANALYZING && 'Đang phân tích dữ liệu...'}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    // Review stage
    return (
        <div className="receipt-scanner-review expense-form-content">
            {/* STICKY HEADER: Image thumbnail + date + project/category selector */}
            <div className="receipt-sticky-header">
                {/* Image thumbnail + zoom */}
                <div className="flex items-start gap-4 mb-4">
                    <button
                        type="button"
                        onClick={() => setShowZoom(true)}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0 group"
                    >
                        <img
                            src={imagePreview || imageUrl}
                            alt="Hóa đơn"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                            <ZoomIn size={20} className="text-white" />
                        </div>
                    </button>

                    <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">Ngày hóa đơn</div>
                        <input
                            type="date"
                            value={receiptDate}
                            onChange={(e) => setReceiptDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>

                {/* Global Project/Category Selector */}
                <div
                    className="selection-summary-bar mb-4"
                    onClick={() => setShowSelectionSheet(true)}
                >
                    <div className="summary-content">
                        <div className="summary-title">
                            {selectedProject?.name || 'Chọn dự án chung *'}
                        </div>
                        <div className="summary-subtitle">
                            {selectedCategory ? (
                                <span className="flex items-center gap-1.5 font-medium">
                                    <CategoryIconComponent categoryName={selectedCategory.name} size={14} />
                                    <span className={getCategoryIconColor(selectedCategory.name)}>
                                        {selectedCategory.name}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-gray-400">Chọn danh mục chung *</span>
                            )}
                        </div>
                    </div>
                    <span className="text-gray-400">▶</span>
                </div>

                {/* Error message - also in sticky area */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>

            {/* Items list */}
            <div className="space-y-3 mb-4">
                {items.map((item, index) => (
                    <ReceiptItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        onUpdate={handleItemUpdate}
                        onDelete={handleItemDelete}
                    />
                ))}
            </div>

            {/* Add item button */}
            <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
            >
                <Plus size={20} />
                Thêm mục chi phí
            </button>

            {/* Auto-sum display */}
            <div className="mt-4 mb-24 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">Tổng ({items.length})</span>
                    <span className="text-lg font-bold text-teal-700 text-right truncate">
                        {new Intl.NumberFormat('en-US').format(Math.round(total))} đ
                    </span>
                </div>
            </div>

            {/* Action buttons */}
            <div className="expense-form-buttons">
                <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                    Hủy
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={savingLoading || stage === STAGES.SAVING || items.length === 0}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {stage === STAGES.SAVING ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={18} />
                            Xác nhận & Lưu
                        </>
                    )}
                </button>
            </div>

            {/* Image Zoom Modal */}
            <ImageZoomModal
                isOpen={showZoom}
                onClose={() => setShowZoom(false)}
                imageUrl={imagePreview || imageUrl}
            />

            {/* Selection Bottom Sheet for Project/Category */}
            <SelectionBottomSheet
                isOpen={showSelectionSheet}
                onClose={() => setShowSelectionSheet(false)}
                projects={projects}
                categories={categories}
                initialData={{
                    projectId: globalSettings.project_id,
                    categoryId: globalSettings.category_id,
                    date: receiptDate
                }}
                onApply={(data) => {
                    setGlobalSettings({
                        project_id: data.projectId,
                        category_id: data.categoryId
                    })
                    setReceiptDate(data.date)
                }}
                hideDate={true}
            />
        </div>
    )
}

export default ReceiptScanner
