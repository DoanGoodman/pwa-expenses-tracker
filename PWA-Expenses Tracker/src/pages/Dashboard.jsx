import { useState } from 'react'
import { Info } from 'lucide-react'
import Header from '../components/layout/Header'
import AdvancedSearchBar from '../components/common/AdvancedSearchBar'
import TotalCard from '../components/dashboard/TotalCard'
import MonthlyBarChart from '../components/dashboard/MonthlyBarChart'
import SCurveChart from '../components/dashboard/SCurveChart'
import CategoryChart from '../components/dashboard/CategoryChart'
import PrivacySheet from '../components/dashboard/PrivacySheet'
import { useProjects, useDashboardStats } from '../hooks/useSupabase'
import { getCurrentMonth, getMonthsAgo } from '../utils/formatters'

const Dashboard = () => {
    const [selectedProject, setSelectedProject] = useState('all')
    const [startMonth, setStartMonth] = useState(getMonthsAgo(5))
    const [endMonth, setEndMonth] = useState(getCurrentMonth())
    const [showPrivacy, setShowPrivacy] = useState(false)

    const { projects } = useProjects()
    const { stats, loading } = useDashboardStats(
        startMonth,
        endMonth,
        selectedProject !== 'all' ? selectedProject : null
    )

    return (
        <div className="page-container">
            {/* Header with Info Button */}
            <Header
                title="Tổng quan"
                leftAction={
                    <button
                        className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors text-teal-600"
                        onClick={() => setShowPrivacy(true)}
                    >
                        <Info size={24} />
                    </button>
                }
            />

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

            {/* Privacy Information Sheet */}
            <PrivacySheet isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
        </div>
    )
}

export default Dashboard

