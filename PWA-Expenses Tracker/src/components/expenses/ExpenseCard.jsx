import { Pencil, Trash2, FolderOpen, Calendar, Download } from 'lucide-react'
import { formatVND, formatDateVN } from '../../utils/formatters'
import { CategoryIconComponent, getCategoryIconColor } from '../../utils/categoryIcons'

const ExpenseCard = ({ expense, onEdit, onDelete, onDownload }) => {
    const { description, amount, date, expense_date, project, category, document_url, image_url } = expense
    const displayDate = date || expense_date // Support both old and new column names
    const categoryColor = getCategoryIconColor(category?.name)

    // Check if expense has any downloadable URL (document_url or image_url from receipt scan)
    const hasDownloadUrl = document_url || image_url
    const downloadUrl = document_url || image_url

    return (
        <div className="card-soft mb-3 animate-fade-in">
            {/* Dòng 1: Tên hạng mục - Số tiền */}
            <div className="flex items-start justify-between mb-1.5">
                <h4 className="font-semibold text-gray-800 text-sm leading-tight flex-1 mr-3">
                    {description}
                </h4>
                <span className="text-primary font-bold text-base whitespace-nowrap">
                    {formatVND(amount)}
                </span>
            </div>

            {/* Dòng 2: Tên Dự án (full width để hiển thị đầy đủ tên dài) */}
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1.5">
                <FolderOpen size={14} className="flex-shrink-0" />
                <span className="truncate">{project?.name || 'N/A'}</span>
            </div>

            {/* Dòng 3: Danh mục, Ngày, Actions */}
            <div className="flex items-center justify-between">
                {/* Info: Danh mục + Ngày */}
                <div className="flex items-center gap-3 text-gray-500 text-xs">
                    <span className="flex items-center gap-1">
                        <CategoryIconComponent categoryName={category?.name} size={14} />
                        <span className={`font-medium ${categoryColor}`}>{category?.name || 'N/A'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar size={14} className="flex-shrink-0" />
                        <span className="whitespace-nowrap">{formatDateVN(displayDate)}</span>
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                    {/* Download button - highlight when URL exists */}
                    <button
                        onClick={() => onDownload && onDownload({ ...expense, document_url: downloadUrl })}
                        className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${hasDownloadUrl
                            ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                            : 'text-gray-300 cursor-default'}`}
                        aria-label="Tải tài liệu"
                        title={hasDownloadUrl ? 'Tải hóa đơn' : 'Chưa có hóa đơn'}
                        disabled={!hasDownloadUrl}
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 text-primary hover:bg-primary-light rounded-lg transition-colors"
                        aria-label="Sửa"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(expense.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Xóa"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ExpenseCard
