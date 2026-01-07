import { useState, useRef, useEffect } from 'react'
import { Menu, FileSpreadsheet, FileText, User, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Header = ({ title, onExportExcel, onExportPDF }) => {
    const { user, signOut } = useAuth()
    const [showMenuDropdown, setShowMenuDropdown] = useState(false)
    const [showUserDropdown, setShowUserDropdown] = useState(false)
    const menuRef = useRef(null)
    const userRef = useRef(null)

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenuDropdown(false)
            }
            if (userRef.current && !userRef.current.contains(event.target)) {
                setShowUserDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleExportExcelClick = () => {
        if (onExportExcel) onExportExcel()
        setShowMenuDropdown(false)
    }

    const handleExportPDFClick = () => {
        if (onExportPDF) onExportPDF()
        setShowMenuDropdown(false)
    }

    const handleLogout = async () => {
        await signOut()
        setShowUserDropdown(false)
    }

    // Get display name from user
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng'
    const displayEmail = user?.email || 'user@example.com'

    return (
        <header className="app-header">
            {/* Menu Button - Only show if export functions exist */}
            <div className="header-menu" ref={menuRef}>
                <button
                    className="header-icon-btn"
                    onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                    aria-label="Menu"
                >
                    <Menu size={22} />
                </button>

                {/* Menu Dropdown */}
                {showMenuDropdown && (
                    <div className="header-dropdown left">
                        {onExportExcel && (
                            <button onClick={handleExportExcelClick} className="dropdown-item">
                                <FileSpreadsheet size={18} />
                                <span>Xuất Excel</span>
                            </button>
                        )}
                        {onExportPDF && (
                            <button onClick={handleExportPDFClick} className="dropdown-item">
                                <FileText size={18} />
                                <span>Xuất PDF</span>
                            </button>
                        )}
                        {!onExportExcel && !onExportPDF && (
                            <div className="p-3 text-sm text-gray-500 text-center">
                                Không có hành động
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Title */}
            <h1 className="header-title">{title}</h1>

            {/* User Avatar */}
            <div className="header-user" ref={userRef}>
                <button
                    className="header-avatar-btn"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    aria-label="Tài khoản"
                >
                    <div className="avatar-circle">
                        <User size={18} />
                    </div>
                </button>

                {/* User Dropdown */}
                {showUserDropdown && (
                    <div className="header-dropdown right">
                        <div className="dropdown-header">
                            <div className="avatar-circle small">
                                <User size={14} />
                            </div>
                            <div className="user-info">
                                <span className="user-name">{displayName}</span>
                                <span className="user-email">{displayEmail}</span>
                            </div>
                        </div>
                        <div className="dropdown-divider"></div>
                        <button onClick={handleLogout} className="dropdown-item danger">
                            <LogOut size={18} />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}

export default Header

