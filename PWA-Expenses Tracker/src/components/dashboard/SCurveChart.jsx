import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatVND, formatVNDShort, getShortMonthName } from '../../utils/formatters'

const SCurveChart = ({ data }) => {
    // Tính chi phí lũy kế
    const cumulativeData = useMemo(() => {
        if (!data || data.length === 0) return []

        let cumulative = 0
        return data.map(item => {
            cumulative += item.amount
            return {
                ...item,
                monthLabel: getShortMonthName(item.month),
                cumulative
            }
        })
    }, [data])

    if (!data || data.length === 0) {
        return (
            <div className="card-soft mb-5">
                <h3 className="text-sm font-semibold text-gray-600 mb-4">
                    📈 Chi phí lũy kế (S-Curve)
                </h3>
                <p className="text-gray-400 text-sm text-center py-8">
                    Chưa có dữ liệu
                </p>
            </div>
        )
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-primary">
                        Lũy kế: {formatVND(payload[0].value)}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="card-soft mb-5">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">
                📈 Chi phí lũy kế (S-Curve)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00a99d" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00a99d" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
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
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#00a99d"
                        strokeWidth={2.5}
                        fill="url(#areaGradient)"
                        dot={{ r: 4, fill: '#00a99d', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#00a99d', strokeWidth: 2, stroke: '#fff' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

export default SCurveChart
