import { useState, useEffect } from 'react'
import { Save, X, Edit3, Camera, ChevronDown, ChevronRight } from 'lucide-react'
import { formatAmountInput, parseAmount, formatDecimalInput, parseDecimal, formatDateVN } from '../../utils/formatters'
import UnitBottomSheet, { UNIT_OPTIONS } from './UnitBottomSheet'
import SelectionBottomSheet from './SelectionBottomSheet'

const ExpenseForm = ({
    projects,
    categories,
    initialData = null,
    onSubmit,
    onCancel,
    loading = false
}) => {
    const [inputMethod, setInputMethod] = useState('manual') // 'manual' or 'invoice'
    const [showUnitSheet, setShowUnitSheet] = useState(false)
    const [showSelectionSheet, setShowSelectionSheet] = useState(false)
    const [formData, setFormData] = useState({
        project_id: '',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        quantity: '1',
        unit: '',
        unit_price: '',
        amount: ''
    })

    useEffect(() => {
        if (initialData) {
            // Support both 'date' and 'expense_date' field names
            const dateValue = initialData.date || initialData.expense_date || new Date().toISOString().split('T')[0]
            // Handle timestamptz format from Supabase
            const formattedDate = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue

            setFormData({
                project_id: initialData.project_id || '',
                category_id: initialData.category_id || '',
                date: formattedDate,
                description: initialData.description || '',
                quantity: initialData.quantity ? String(initialData.quantity) : '1',
                unit: initialData.unit || '',
                unit_price: initialData.unit_price ? formatAmountInput(initialData.unit_price) : '',
                amount: initialData.amount ? formatAmountInput(initialData.amount) : ''
            })
        }
    }, [initialData])

    // Auto calculate amount when quantity or unit_price changes
    useEffect(() => {
        const qty = parseDecimal(formData.quantity) || 0
        const price = parseAmount(formData.unit_price) || 0
        const calculated = qty * price

        if (calculated > 0 && (parseAmount(formData.unit_price) > 0)) {
            setFormData(prev => ({
                ...prev,
                amount: formatAmountInput(String(Math.round(calculated))) // Round amount to avoid decimals in total
            }))
        }
    }, [formData.quantity, formData.unit_price])

    const handleChange = (field, value) => {
        if (field === 'amount' || field === 'unit_price') {
            value = formatAmountInput(value)
        }
        if (field === 'quantity') {
            // Allow typing decimals: don't format if ending with dot
            if (value.endsWith('.') || value.endsWith(',')) {
                // Just update state, let user type
            } else {
                value = formatDecimalInput(value)
            }
        }
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const submitData = {
            ...formData,
            quantity: parseDecimal(formData.quantity) || 1,
            unit: formData.unit || null,
            unit_price: parseAmount(formData.unit_price),
            amount: parseAmount(formData.amount)
        }

        onSubmit(submitData)
    }

    const getUnitLabel = (value) => {
        const option = UNIT_OPTIONS.find(opt => opt.value === value)
        return option ? option.label : 'Chọn'
    }

    const isValid = formData.project_id &&
        formData.category_id &&
        formData.date &&
        parseAmount(formData.amount) > 0

    return (
        <div className="expense-form-container">
            {/* Input Method Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setInputMethod('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${inputMethod === 'manual'
                        ? 'bg-white border-2 border-primary text-primary shadow-sm'
                        : 'bg-gray-100 border-2 border-transparent text-gray-500'
                        }`}
                >
                    <Edit3 size={18} />
                    Nhập tay
                </button>
                <button
                    type="button"
                    onClick={() => setInputMethod('invoice')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${inputMethod === 'invoice'
                        ? 'bg-white border-2 border-primary text-primary shadow-sm'
                        : 'bg-gray-100 border-2 border-transparent text-gray-500'
                        }`}
                >
                    <Camera size={18} />
                    Chụp hóa đơn
                </button>
            </div>

            {inputMethod === 'manual' ? (
                <form onSubmit={handleSubmit} className="expense-form-content">
                    {/* Selection Summary Bar (Replaces Project, Category, Date inputs) */}
                    <div
                        className="selection-summary-bar"
                        onClick={() => setShowSelectionSheet(true)}
                    >
                        <div className="summary-content">
                            <div className="summary-title">
                                {projects.find(p => p.id === formData.project_id)?.name || 'Chưa chọn dự án'}
                            </div>
                            <div className="summary-subtitle">
                                {categories.find(c => c.id === formData.category_id) ? (
                                    <span
                                        className="flex items-center gap-1.5 font-medium"
                                        style={{ color: categories.find(c => c.id === formData.category_id).color || '#64748b' }}
                                    >
                                        <span>{categories.find(c => c.id === formData.category_id).icon}</span>
                                        <span>{categories.find(c => c.id === formData.category_id).name}</span>
                                    </span>
                                ) : (
                                    <span>Chưa chọn danh mục</span>
                                )}
                                <span className="text-gray-300 mx-1">•</span>
                                <span>{formatDateVN(formData.date)}</span>
                            </div>
                        </div>
                        <ChevronRight className="summary-arrow" size={20} />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Mô tả
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="input-field resize-none"
                            rows={2}
                            placeholder="Nhập mô tả chi phí..."
                        />
                    </div>

                    {/* Quantity, Unit (ĐVT), Unit Price - Adjusted widths */}
                    <div className="quantity-unit-price-row">
                        <div className="quantity-field">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Khối lượng
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={formData.quantity}
                                onChange={(e) => handleChange('quantity', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="input-field text-right"
                                placeholder="1"
                            />
                        </div>
                        <div className="unit-field">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                ĐVT
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowUnitSheet(true)}
                                className="unit-selector-btn"
                            >
                                <span>{getUnitLabel(formData.unit)}</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>
                        <div className="unit-price-field">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Đơn giá (VND)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formData.unit_price}
                                onChange={(e) => handleChange('unit_price', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="input-field text-right"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Amount (Auto-calculated or Manual) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Số tiền (VND) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={formData.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            className="input-field text-right text-lg font-semibold text-primary"
                            placeholder="0"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {parseAmount(formData.unit_price) > 0
                                ? '✓ Tự động tính = Khối lượng × Đơn giá'
                                : 'Nhập trực tiếp hoặc nhập Đơn giá'}
                        </p>
                    </div>

                    {/* Buttons with safe area padding */}
                    <div className="expense-form-buttons">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                <X size={18} />
                                Hủy
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={!isValid || loading}
                            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {loading ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Lưu chi phí')}
                        </button>
                    </div>
                </form>
            ) : (
                // Invoice Scanner Mode (Coming Soon)
                <div className="py-20 text-center">
                    <Camera size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Chức năng đang phát triển
                    </h3>
                    <p className="text-sm text-gray-500">
                        Tính năng chụp và quét hóa đơn sẽ sớm có mặt
                    </p>
                </div>
            )}

            {/* Unit Bottom Sheet */}
            <UnitBottomSheet
                isOpen={showUnitSheet}
                onClose={() => setShowUnitSheet(false)}
                selectedUnit={formData.unit}
                onSelect={(value) => handleChange('unit', value)}
            />

            {/* Selection Bottom Sheet */}
            <SelectionBottomSheet
                isOpen={showSelectionSheet}
                onClose={() => setShowSelectionSheet(false)}
                projects={projects}
                categories={categories}
                initialData={{
                    projectId: formData.project_id,
                    categoryId: formData.category_id,
                    date: formData.date
                }}
                onApply={(data) => {
                    setFormData(prev => ({
                        ...prev,
                        project_id: data.projectId,
                        category_id: data.categoryId,
                        date: data.date
                    }))
                }}
            />
        </div>
    )
}

export default ExpenseForm
