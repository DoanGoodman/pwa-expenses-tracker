import { formatVND } from '../../utils/formatters'
import { CategoryIconComponent, getCategoryIconColor, getCategoryProgressColor } from '../../utils/categoryIcons'

const CategoryChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="card-soft mb-5">
                <h3 className="text-sm font-semibold text-gray-600 mb-4">
                    📋 Tỷ trọng theo hạng mục
                </h3>
                <p className="text-gray-400 text-sm text-center py-4">
                    Chưa có dữ liệu
                </p>
            </div>
        )
    }

    return (
        <div className="card-soft mb-5">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">
                📋 Tỷ trọng theo hạng mục
            </h3>
            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={item.id} className="animate-fade-in">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                {/* SVG Icon based on category name */}
                                <CategoryIconComponent categoryName={item.name} size={18} />
                                <span className={`text-sm font-medium ${getCategoryIconColor(item.name)}`}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">
                                    {formatVND(item.amount)}
                                </span>
                                <span className="text-sm font-bold text-gray-800 min-w-[50px] text-right">
                                    {item.percentage.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="progress-bar-bg">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${item.percentage}%`,
                                    ...getCategoryProgressColor(item.name)
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default CategoryChart
