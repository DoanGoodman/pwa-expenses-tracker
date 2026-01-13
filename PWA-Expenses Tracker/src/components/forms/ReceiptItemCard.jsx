import { useState, useEffect } from 'react'
import { Trash2, AlertTriangle, ChevronDown } from 'lucide-react'
import { formatAmountInput, parseAmount } from '../../utils/formatters'
import UnitBottomSheet, { UNIT_OPTIONS } from './UnitBottomSheet'

const ReceiptItemCard = ({
    item,
    index,
    onUpdate,
    onDelete
}) => {
    // Format quantity with thousand separators (34439.52 -> 34,439.52)
    const formatQuantityDisplay = (value) => {
        const num = parseFloat(value)
        if (isNaN(num)) return String(value)
        // Use en-US locale for comma as thousand separator
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num)
    }

    const [localData, setLocalData] = useState({
        description: item.description || '',
        quantity: formatQuantityDisplay(item.quantity || 1),
        unit: item.unit || '',
        unit_price: item.unit_price ? formatAmountInput(item.unit_price) : ''
    })
    const [hasBeenEdited, setHasBeenEdited] = useState(false)
    const [showUnitSheet, setShowUnitSheet] = useState(false)

    // Get unit display label
    const getUnitLabel = (value) => {
        const option = UNIT_OPTIONS.find(opt => opt.value === value)
        return option ? option.label : (value || 'Chọn')
    }

    // Parse quantity string (remove thousand separators before parsing)
    const parseQuantity = (value) => {
        if (!value) return 0
        // Remove thousand separator commas, keep decimal dot
        const cleaned = String(value).replace(/,/g, '')
        return parseFloat(cleaned) || 0
    }

    // Calculate amount
    const calculatedAmount = (parseQuantity(localData.quantity) || 0) * (parseAmount(localData.unit_price) || 0)

    // Determine if this item needs review (low confidence)
    const needsReview = item.confidence < 0.8 && !hasBeenEdited

    useEffect(() => {
        // Sync local changes to parent
        onUpdate(item.id, {
            ...item,
            description: localData.description,
            quantity: parseQuantity(localData.quantity) || 1,
            unit: localData.unit,
            unit_price: parseAmount(localData.unit_price) || 0,
            amount: calculatedAmount
        })
    }, [localData])

    const handleChange = (field, value) => {
        setHasBeenEdited(true)

        if (field === 'unit_price') {
            value = formatAmountInput(value)
        }
        if (field === 'quantity') {
            // Allow typing, but don't format comma-separated input while typing
            // Just allow digits, dots, and commas
            value = value.replace(/[^0-9.,]/g, '')
        }

        setLocalData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className={`receipt-item-card ${needsReview ? 'flash-warning' : ''}`}>
            {/* Header with index and delete */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    #{index + 1}
                </span>
                {needsReview && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle size={12} />
                        Cần kiểm tra
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Xóa item"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Description */}
            <div className="mb-3">
                <input
                    type="text"
                    value={localData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                    placeholder="Mô tả chi phí..."
                />
            </div>

            {/* Quantity, Unit, Unit Price in a row - matching ExpenseForm layout */}
            <div className="flex gap-2 mb-3">
                <div className="flex-1 min-w-0">
                    <label className="block text-xs text-gray-500 mb-1">SL</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={localData.quantity}
                        onChange={(e) => handleChange('quantity', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-primary"
                    />
                </div>
                <div className="w-20 flex-shrink-0">
                    <label className="block text-xs text-gray-500 mb-1">ĐVT</label>
                    <button
                        type="button"
                        onClick={() => setShowUnitSheet(true)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-primary bg-white flex items-center justify-center gap-1"
                    >
                        <span className="truncate">{getUnitLabel(localData.unit)}</span>
                        <ChevronDown size={12} className="flex-shrink-0 text-gray-400" />
                    </button>
                </div>
                <div className="flex-[1.5] min-w-0">
                    <label className="block text-xs text-gray-500 mb-1">Đơn giá</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={localData.unit_price}
                        onChange={(e) => handleChange('unit_price', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* Calculated Amount */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">Thành tiền:</span>
                <span className="text-sm font-semibold text-primary">
                    {new Intl.NumberFormat('en-US').format(Math.round(calculatedAmount))} đ
                </span>
            </div>

            {/* Unit Bottom Sheet */}
            <UnitBottomSheet
                isOpen={showUnitSheet}
                onClose={() => setShowUnitSheet(false)}
                selectedUnit={localData.unit}
                onSelect={(value) => handleChange('unit', value)}
            />
        </div>
    )
}

export default ReceiptItemCard
