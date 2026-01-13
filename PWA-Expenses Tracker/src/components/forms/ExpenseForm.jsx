import { useState, useEffect } from 'react'
import { Save, X, Edit3, ImagePlus, ChevronDown, ChevronRight, Plus, CheckCircle2 } from 'lucide-react'
import { formatAmountInput, parseAmount, formatDecimalInput, parseDecimal, formatDateVN } from '../../utils/formatters'
import { CategoryIconComponent, getCategoryIconColor } from '../../utils/categoryIcons'
import UnitBottomSheet, { UNIT_OPTIONS } from './UnitBottomSheet'
import SelectionBottomSheet from './SelectionBottomSheet'
import ReceiptScanner from './ReceiptScanner'
import ReceiptItemCard from './ReceiptItemCard'
import { useBulkInsertExpenses } from '../../hooks/useSupabase'

const ExpenseForm = ({
    projects,
    categories,
    initialData = null,
    onSubmit,
    onCancel,
    loading = false,
    onBulkSaveSuccess
}) => {
    const { bulkInsert, loading: bulkLoading } = useBulkInsertExpenses()
    const [inputMethod, setInputMethod] = useState('manual') // 'manual' or 'invoice'
    const [showUnitSheet, setShowUnitSheet] = useState(false)
    const [showSelectionSheet, setShowSelectionSheet] = useState(false)

    // Multi-item state for manual entry
    const [manualItems, setManualItems] = useState([])
    const [selectedProject, setSelectedProject] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])

    // Single item form data (for edit mode or when initialData is provided)
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

    // Initialize first item when entering manual mode (only if no items exist)
    useEffect(() => {
        if (inputMethod === 'manual' && manualItems.length === 0 && !initialData) {
            addNewItem()
        }
    }, [inputMethod])

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

    // Auto calculate amount when quantity or unit_price changes (for edit mode)
    useEffect(() => {
        if (initialData) {
            const qty = parseDecimal(formData.quantity) || 0
            const price = parseAmount(formData.unit_price) || 0
            const calculated = qty * price

            if (calculated > 0 && (parseAmount(formData.unit_price) > 0)) {
                setFormData(prev => ({
                    ...prev,
                    amount: formatAmountInput(String(Math.round(calculated)))
                }))
            }
        }
    }, [formData.quantity, formData.unit_price, initialData])

    // Add a new item to the manual items list
    const addNewItem = () => {
        const newItem = {
            id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: '',
            quantity: 1,
            unit: '',
            unit_price: 0,
            amount: 0,
            confidence: 1 // High confidence for manual entry
        }
        setManualItems(prev => [...prev, newItem])
    }

    // Update an item in the list
    const handleItemUpdate = (itemId, updatedItem) => {
        setManualItems(prev => prev.map(item =>
            item.id === itemId ? updatedItem : item
        ))
    }

    // Delete an item from the list
    const handleItemDelete = (itemId) => {
        setManualItems(prev => prev.filter(item => item.id !== itemId))
    }

    // Calculate total for manual items
    const manualTotal = manualItems.reduce((sum, item) => sum + (item.amount || 0), 0)

    // Check if manual multi-item form is valid
    const isManualMultiValid = selectedProject && selectedCategory && manualItems.length > 0 &&
        manualItems.every(item => item.amount > 0)

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
            {/* Input Method Tabs - only show when NOT in manual add mode (multi-item mode has its own tabs in sticky header) */}
            {!(inputMethod === 'manual' && !initialData) && (
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
                        <ImagePlus size={18} />
                        Tải hóa đơn
                    </button>
                </div>
            )}

            {inputMethod === 'manual' ? (
                initialData ? (
                    // EDIT MODE - Single item form
                    <form onSubmit={handleSubmit} className="expense-form-content">
                        {/* Selection Summary Bar */}
                        <div
                            className="selection-summary-bar"
                            onClick={() => setShowSelectionSheet(true)}
                        >
                            <div className="summary-content">
                                <div className="summary-title">
                                    {projects.find(p => String(p.id) === String(formData.project_id))?.name || 'Chưa chọn dự án'}
                                </div>
                                <div className="summary-subtitle">
                                    {(() => {
                                        const cat = categories.find(c => String(c.id) === String(formData.category_id))
                                        if (cat) {
                                            return (
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <CategoryIconComponent categoryName={cat.name} size={14} />
                                                    <span className={getCategoryIconColor(cat.name)}>{cat.name}</span>
                                                </span>
                                            )
                                        }
                                        return <span className="text-gray-400">Chưa chọn danh mục</span>
                                    })()}
                                    <span className="text-gray-300 mx-1">•</span>
                                    <span>{formatDateVN(formData.date)}</span>
                                </div>
                            </div>
                            <ChevronRight className="summary-arrow" size={20} />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="input-field resize-none"
                                rows={2}
                                placeholder="Nhập mô tả chi phí..."
                            />
                        </div>

                        {/* Quantity, Unit, Price */}
                        <div className="quantity-unit-price-row">
                            <div className="quantity-field">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Khối lượng</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">ĐVT</label>
                                <button type="button" onClick={() => setShowUnitSheet(true)} className="unit-selector-btn">
                                    <span>{getUnitLabel(formData.unit)}</span>
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            <div className="unit-price-field">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Đơn giá (VND)</label>
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

                        {/* Amount */}
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
                        </div>

                        {/* Buttons */}
                        <div className="expense-form-buttons">
                            {onCancel && (
                                <button type="button" onClick={onCancel} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                                    <X size={18} /> Hủy
                                </button>
                            )}
                            <button type="submit" disabled={!isValid || loading} className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Save size={18} /> {loading ? 'Đang lưu...' : 'Cập nhật'}
                            </button>
                        </div>
                    </form>
                ) : (
                    // ADD MODE - Multi-item form
                    <div className="expense-form-content">
                        {/* Sticky Header: Tabs + Selection Summary */}
                        <div className="manual-sticky-header">
                            {/* Input Method Tabs */}
                            <div className="flex gap-2 mb-3">
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
                                    <ImagePlus size={18} />
                                    Tải hóa đơn
                                </button>
                            </div>

                            {/* Selection Summary Bar */}
                            <div
                                className="selection-summary-bar"
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
                                                <span className={getCategoryIconColor(selectedCategory.name)}>{selectedCategory.name}</span>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Chọn danh mục chung *</span>
                                        )}
                                        <span className="text-gray-300 mx-1">•</span>
                                        <span>{formatDateVN(manualDate)}</span>
                                    </div>
                                </div>
                                <ChevronRight className="summary-arrow" size={20} />
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-3">
                            {manualItems.map((item, index) => (
                                <ReceiptItemCard
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onUpdate={handleItemUpdate}
                                    onDelete={handleItemDelete}
                                />
                            ))}
                        </div>

                        {/* Add Item Button */}
                        <button
                            type="button"
                            onClick={addNewItem}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                        >
                            <Plus size={20} />
                            Thêm mục chi phí
                        </button>

                        {/* Total Summary */}
                        <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">Tổng ({manualItems.length})</span>
                                <span className="text-lg font-bold text-teal-700 text-right truncate">
                                    {new Intl.NumberFormat('en-US').format(Math.round(manualTotal))} đ
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="expense-form-buttons">
                            <button
                                type="button"
                                onClick={() => {
                                    setManualItems([])
                                    setSelectedProject(null)
                                    setSelectedCategory(null)
                                    addNewItem()
                                }}
                                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={!isManualMultiValid || bulkLoading}
                                onClick={async () => {
                                    const expensesData = manualItems.map(item => ({
                                        project_id: selectedProject.id,
                                        category_id: selectedCategory.id,
                                        expense_date: manualDate,
                                        description: item.description || '',
                                        quantity: item.quantity || 1,
                                        unit: item.unit || null,
                                        unit_price: item.unit_price || 0,
                                        amount: item.amount || 0
                                    }))
                                    const result = await bulkInsert(expensesData)
                                    if (result.success && onBulkSaveSuccess) {
                                        onBulkSaveSuccess(result.count)
                                        // Reset form
                                        setManualItems([])
                                        setSelectedProject(null)
                                        setSelectedCategory(null)
                                        addNewItem()
                                    }
                                }}
                                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle2 size={18} />
                                {bulkLoading ? 'Đang lưu...' : 'Xác nhận & Lưu'}
                            </button>
                        </div>
                    </div>
                )
            ) : (
                // Receipt Scanner Mode
                <ReceiptScanner
                    projects={projects}
                    categories={categories}
                    onBulkSave={async (expensesData) => {
                        const result = await bulkInsert(expensesData)
                        if (result.success && onBulkSaveSuccess) {
                            onBulkSaveSuccess(result.count)
                        }
                        return result
                    }}
                    loading={bulkLoading}
                />
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
                    projectId: initialData ? formData.project_id : (selectedProject?.id || ''),
                    categoryId: initialData ? formData.category_id : (selectedCategory?.id || ''),
                    date: initialData ? formData.date : manualDate
                }}
                onApply={(data) => {
                    if (initialData) {
                        // Edit mode - update formData
                        setFormData(prev => ({
                            ...prev,
                            project_id: data.projectId,
                            category_id: data.categoryId,
                            date: data.date
                        }))
                    } else {
                        // Add mode - update multi-item states
                        const proj = projects.find(p => String(p.id) === String(data.projectId))
                        const cat = categories.find(c => String(c.id) === String(data.categoryId))
                        setSelectedProject(proj || null)
                        setSelectedCategory(cat || null)
                        setManualDate(data.date)
                    }
                }}
            />
        </div>
    )
}

export default ExpenseForm
