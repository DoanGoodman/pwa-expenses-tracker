import { useState, useRef, useEffect } from 'react'
import { Menu, FileSpreadsheet, FileText, User, LogOut, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import StaffManagementModal from '../common/StaffManagementModal'

const Header = ({ title, onExportExcel, onExportPDF, onRecycleBin, leftAction }) => {
    const { user, signOut, isOwner } = useAuth()
    const [showMenuDropdown, setShowMenuDropdown] = useState(false)
    const [showUserDropdown, setShowUserDropdown] = useState(false)
    const [showStaffModal, setShowStaffModal] = useState(false)
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

    const handleRecycleBinClick = () => {
        if (onRecycleBin) onRecycleBin()
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
        <>
            <header className="app-header">
                {/* Left Section: Custom Action or Menu */}
                <div className="header-left-section" ref={menuRef}>
                    {leftAction ? (
                        leftAction
                    ) : (
                        <div className="header-menu">
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
                                    {onRecycleBin && (
                                        <button onClick={handleRecycleBinClick} className="dropdown-item">
                                            <Trash2 size={18} />
                                            <span>Thùng rác</span>
                                        </button>
                                    )}
                                    {!onExportExcel && !onExportPDF && !onRecycleBin && (
                                        <div className="p-3 text-sm text-gray-500 text-center">
                                            Không có hành động
                                        </div>
                                    )}
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
                            <span className="avatar-initials">{displayName.charAt(0).toUpperCase()}</span>
                        </div>
                    </button>

                    {/* User Dropdown */}
                    {showUserDropdown && (
                        <div className="header-dropdown right">
                            <div className="dropdown-header">
                                <div className="avatar-circle small">
                                    <span className="avatar-initials">{displayName.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="user-info">
                                    <span className="user-name">{displayName}</span>
                                    <span className="user-email">{displayEmail}</span>
                                </div>
                            </div>
                            <div className="dropdown-divider"></div>

                            {/* Mục Quản lý nhân viên - chỉ hiển thị cho Owner */}
                            {isOwner && (
                                <button
                                    onClick={() => {
                                        setShowStaffModal(true)
                                        setShowUserDropdown(false)
                                    }}
                                    className="dropdown-item"
                                >
                                    <UserPlus size={18} />
                                    <span>Quản lý nhân viên</span>
                                </button>
                            )}

                            <button onClick={handleLogout} className="dropdown-item danger">
                                <LogOut size={18} />
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Staff Management Modal */}
            <StaffManagementModal
                isOpen={showStaffModal}
                onClose={() => setShowStaffModal(false)}
            />
        </>
    )
}

export default Header
