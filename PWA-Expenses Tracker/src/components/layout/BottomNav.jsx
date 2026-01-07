import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, PlusCircle } from 'lucide-react'

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tổng quan', useIcon: true },
    { path: '/expenses', icon: List, label: 'Chi phí', useIcon: true },
    { path: '/add', icon: PlusCircle, label: 'Thêm mới', useIcon: true },
    { path: '/documents', icon: null, label: 'qswings', emoji: '🤖', useIcon: false },
]

const BottomNav = () => {
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
