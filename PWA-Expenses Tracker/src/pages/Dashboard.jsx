import { useState } from 'react'
import Header from '../components/layout/Header'
import AdvancedSearchBar from '../components/common/AdvancedSearchBar'
import TotalCard from '../components/dashboard/TotalCard'
import MonthlyBarChart from '../components/dashboard/MonthlyBarChart'
import SCurveChart from '../components/dashboard/SCurveChart'
import CategoryChart from '../components/dashboard/CategoryChart'
import { useProjects, useDashboardStats } from '../hooks/useSupabase'
import { getCurrentMonth, getMonthsAgo } from '../utils/formatters'

const Dashboard = () => {
    const [selectedProject, setSelectedProject] = useState('all')
    const [startMonth, setStartMonth] = useState(getMonthsAgo(5))
    const [endMonth, setEndMonth] = useState(getCurrentMonth())

    const { projects } = useProjects()
    const { stats, loading } = useDashboardStats(
        startMonth,
        endMonth,
        selectedProject !== 'all' ? selectedProject : null
    )

    return (
        <div className="page-container">
            {/* Header */}
            <Header title="Tổng quan" />

            {/* Advanced Search Bar - Booking.com style */}
            <AdvancedSearchBar
                projects={projects}
                selectedProject={selectedProject}
                onProjectChange={setSelectedProject}
                startMonth={startMonth}
                endMonth={endMonth}
                onStartChange={setStartMonth}
                onEndChange={setEndMonth}
            />


            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Total Card */}
                    <TotalCard total={stats.total} />

                    {/* Monthly Bar Chart */}
                    <MonthlyBarChart data={stats.byMonth} />

                    {/* S-Curve Chart */}
                    <SCurveChart data={stats.byMonth} />

                    {/* Category Chart */}
                    <CategoryChart data={stats.byCategory} />
                </>
            )}
        </div>
    )
}

export default Dashboard

