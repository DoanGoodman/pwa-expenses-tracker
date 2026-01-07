import { TrendingUp } from 'lucide-react'
import { formatVND } from '../../utils/formatters'

const TotalCard = ({ total, label = "Tổng chi phí" }) => {
    return (
        <div
            className="card-soft-lg mx-0 mb-5"
            style={{ background: 'linear-gradient(to right, #00a99d, #00c4b6)' }}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                        <TrendingUp size={20} className="text-white/70" />
                        <span className="text-xs text-white/70">Trong kỳ</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-white text-2xl font-bold">
                        {formatVND(total)}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default TotalCard
