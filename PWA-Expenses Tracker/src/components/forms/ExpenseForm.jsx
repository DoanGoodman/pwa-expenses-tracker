import { useState, useEffect } from 'react'
import { Save, X, Edit3, Camera, Plus, ChevronDown } from 'lucide-react'
import { formatAmountInput, parseAmount } from '../../utils/formatters'
import UnitBottomSheet, { UNIT_OPTIONS } from './UnitBottomSheet'

const ExpenseForm = ({
    projects,
    categories,
    initialData = null,
    onSubmit,
    onCancel,
    loading = false,
    onAddProject
}) => {
    const [inputMethod, setInputMethod] = useState('manual') // 'manual' or 'invoice'
    const [showUnitSheet, setShowUnitSheet] = useState(false)
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
        const qty = parseFloat(formData.quantity) || 0
        const price = parseAmount(formData.unit_price) || 0
        const calculated = qty * price

        if (calculated > 0 && (parseAmount(formData.unit_price) > 0)) {
            setFormData(prev => ({
                ...prev,
                amount: formatAmountInput(String(calculated))
            }))
        }
    }, [formData.quantity, formData.unit_price])

    const handleChange = (field, value) => {
        if (field === 'amount' || field === 'unit_price') {
            value = formatAmountInput(value)
        }
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const submitData = {
            ...formData,
            quantity: parseFloat(formData.quantity) || 1,
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
                    {/* Project Select with Add Button */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Dự án <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={formData.project_id}
                                onChange={(e) => handleChange('project_id', e.target.value)}
                                className="select-field flex-1"
                                required
                            >
                                <option value="">Chọn dự án</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                            {onAddProject && (
                                <button
                                    type="button"
                                    onClick={onAddProject}
                                    className="add-project-btn"
                                    title="Thêm dự án mới"
                                >
                                    <Plus size={24} strokeWidth={2.5} color="white" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category & Date on same row */}
                    <div className="category-date-row">
                        <div className="category-date-field">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Danh mục <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => handleChange('category_id', e.target.value)}
                                className="select-field"
                                required
                            >
                                <option value="">Chọn</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.icon} {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="category-date-field">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Ngày chi <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="input-field"
                                required
                            />
                        </div>
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
                                type="number"
                                step="0.01"
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
        </div>
    )
}

export default ExpenseForm
