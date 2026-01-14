import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, PlusCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tổng quan', useIcon: true, ownerOnly: true },
    { path: '/expenses', icon: List, label: 'Chi phí', useIcon: true, ownerOnly: false },
    { path: '/add', icon: PlusCircle, label: 'Thêm mới', useIcon: true, ownerOnly: false },
    { path: '/documents', icon: null, label: 'qswings', emoji: '🤖', useIcon: false, ownerOnly: true },
]

const BottomNav = () => {
    const { isStaff } = useAuth()

    // Lọc các tab dựa trên role
    const navItems = isStaff
        ? allNavItems.filter(item => !item.ownerOnly)
        : allNavItems

    return (
        <nav className="bottom-nav">
            <div className="flex justify-around items-center max-w-md mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `bottom-nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        {item.useIcon ? (
                            <item.icon size={22} strokeWidth={2} />
                        ) : (
                            <span className="text-xl">{item.emoji}</span>
                        )}
                        <span className="mt-1">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}

export default BottomNav
