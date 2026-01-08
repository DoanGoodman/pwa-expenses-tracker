import { Pencil, Trash2, FolderOpen, Calendar, Download } from 'lucide-react'
import { formatVND, formatDateVN } from '../../utils/formatters'
import { CategoryIconComponent, getCategoryIconColor } from '../../utils/categoryIcons'

const ExpenseCard = ({ expense, onEdit, onDelete, onDownload }) => {
    const { description, amount, date, expense_date, project, category, document_url } = expense
    const displayDate = date || expense_date // Support both old and new column names
    const categoryColor = getCategoryIconColor(category?.name)

    return (
        <div className="card-soft mb-3 animate-fade-in">
            {/* Dòng 1: Tên hạng mục - Số tiền */}
            <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-800 text-sm leading-tight flex-1 mr-3">
                    {description}
                </h4>
                <span className="text-primary font-bold text-base whitespace-nowrap">
                    {formatVND(amount)}
                </span>
            </div>

            {/* Dòng 2: Info bên trái, Actions bên phải */}
            <div className="flex items-center justify-between">
                {/* Info icons */}
                <div className="flex items-center gap-2 text-gray-500 text-xs flex-wrap">
                    <span className="flex items-center gap-1">
                        <FolderOpen size={14} className="flex-shrink-0" />
                        <span className="max-w-[60px] truncate">{project?.name || 'N/A'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <CategoryIconComponent categoryName={category?.name} size={14} />
                        <span className={`font-medium max-w-[55px] truncate ${categoryColor}`}>{category?.name || 'N/A'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar size={14} className="flex-shrink-0" />
                        <span className="whitespace-nowrap">{formatDateVN(displayDate)}</span>
                    </span>
                </div>

                {/* Action buttons với gap-x-4 */}
                <div className="flex items-center gap-x-3">
                    {document_url && (
                        <button
                            onClick={() => onDownload && onDownload(expense)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="Tải tài liệu"
                            title="Tải hóa đơn"
                        >
                            <Download size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 text-primary hover:bg-primary-light rounded-lg transition-colors"
                        aria-label="Sửa"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(expense.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Xóa"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ExpenseCard
