import { useState, useEffect } from 'react'
import { X, UserPlus, Users, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Modal quản lý tài khoản nhân viên
 * Cho phép Owner xem danh sách staff và tạo tài khoản mới
 */
const StaffManagementModal = ({ isOpen, onClose }) => {
    const { user } = useAuth()
    const [staffList, setStaffList] = useState([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [deleting, setDeleting] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Form state
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showForm, setShowForm] = useState(false)

    // Fetch danh sách staff
    const fetchStaffList = async () => {
        if (!user) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, email, created_at')
                .eq('parent_id', user.id)
                .eq('role', 'staff')
                .order('created_at', { ascending: false })

            if (error) throw error
            setStaffList(data || [])
        } catch (err) {
            console.error('Error fetching staff:', err)
            setError('Không thể tải danh sách nhân viên')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchStaffList()
            setError('')
            setSuccess('')
        }
    }, [isOpen, user])

    // Tạo tài khoản staff mới
    const handleCreateStaff = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setCreating(true)

        try {
            // Gọi Edge Function
            const { data, error } = await supabase.functions.invoke('create-staff-account', {
                body: { username, password }
            })

            if (error) throw error

            if (data.error) {
                setError(data.error)
                return
            }

            setSuccess(`Đã tạo tài khoản "${username}" thành công!`)
            setUsername('')
            setPassword('')
            setShowForm(false)
            fetchStaffList()
        } catch (err) {
            console.error('Error creating staff:', err)
            setError(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.')
        } finally {
            setCreating(false)
        }
    }

    // Xóa tài khoản staff (chỉ xóa khỏi profiles, không xóa auth user)
    const handleDeleteStaff = async (staffId, staffUsername) => {
        if (!confirm(`Bạn có chắc muốn xóa tài khoản "${staffUsername}"?`)) return

        setDeleting(staffId)
        try {
            // Lưu ý: Để xóa hoàn toàn cần Edge Function với admin API
            // Hiện tại chỉ cập nhật để vô hiệu hóa
            const { error } = await supabase
                .from('profiles')
                .update({ parent_id: null }) // Hủy liên kết với owner
                .eq('id', staffId)

            if (error) throw error

            setSuccess(`Đã xóa liên kết với "${staffUsername}"`)
            fetchStaffList()
        } catch (err) {
            console.error('Error deleting staff:', err)
            setError('Không thể xóa tài khoản. Vui lòng thử lại.')
        } finally {
            setDeleting(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Quản lý nhân viên</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Add Staff Button / Form */}
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full mb-4 p-3 border-2 border-dashed border-indigo-300 rounded-xl 
                                     text-indigo-600 font-medium flex items-center justify-center gap-2
                                     hover:bg-indigo-50 transition-colors"
                        >
                            <UserPlus className="w-5 h-5" />
                            Thêm nhân viên mới
                        </button>
                    ) : (
                        <form onSubmit={handleCreateStaff} className="mb-4 p-4 bg-slate-50 rounded-xl">
                            <h3 className="font-medium text-slate-700 mb-3">Tạo tài khoản mới</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Tên đăng nhập</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="vd: nhanvien01"
                                        className="input-field"
                                        required
                                        minLength={3}
                                        maxLength={20}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        3-20 ký tự, chỉ chữ thường, số và gạch dưới
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Mật khẩu</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Tối thiểu 6 ký tự"
                                        className="input-field"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false)
                                            setUsername('')
                                            setPassword('')
                                            setError('')
                                        }}
                                        className="flex-1 py-2 px-4 bg-slate-200 text-slate-700 rounded-xl font-medium
                                                 hover:bg-slate-300 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-xl font-medium
                                                 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2
                                                 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {creating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang tạo...
                                            </>
                                        ) : (
                                            'Tạo tài khoản'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Staff List */}
                    <div>
                        <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Danh sách nhân viên ({staffList.length})
                        </h3>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                            </div>
                        ) : staffList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p>Chưa có nhân viên nào</p>
                                <p className="text-sm">Nhấn "Thêm nhân viên mới" để bắt đầu</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {staffList.map((staff) => (
                                    <div
                                        key={staff.id}
                                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-800">{staff.username}</p>
                                            <p className="text-xs text-slate-500">{staff.email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteStaff(staff.id, staff.username)}
                                            disabled={deleting === staff.id}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors
                                                     disabled:opacity-50"
                                        >
                                            {deleting === staff.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StaffManagementModal
