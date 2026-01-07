import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatVND, formatVNDShort, getShortMonthName } from '../../utils/formatters'

const MonthlyBarChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="card-soft mb-5">
                <h3 className="text-sm font-semibold text-gray-600 mb-4">
                    📊 Chi phí theo tháng
                </h3>
                <p className="text-gray-400 text-sm text-center py-8">
                    Chưa có dữ liệu
                </p>
            </div>
        )
    }

    const chartData = data.map(item => ({
        ...item,
        monthLabel: getShortMonthName(item.month)
    }))

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-primary">
                        {formatVND(payload[0].value)}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="card-soft mb-5">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">
                📊 Chi phí theo tháng
            </h3>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis
                        dataKey="monthLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={(value) => formatVNDShort(value)}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 169, 157, 0.1)' }} />
                    <Bar
                        dataKey="amount"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#barGradient)`}
                            />
                        ))}
                    </Bar>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00d4c8" />
                            <stop offset="100%" stopColor="#00a99d" />
                        </linearGradient>
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export default MonthlyBarChart
