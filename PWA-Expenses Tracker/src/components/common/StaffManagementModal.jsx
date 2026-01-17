import { useState, useEffect, useRef, useCallback } from 'react'
import { X, UserPlus, Users, Trash2, Loader2, AlertCircle, Briefcase, RefreshCw, ChevronDown, ChevronUp, FolderKanban } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ProjectAssignmentModal from './ProjectAssignmentModal'

// Cache key for staff list
const STAFF_CACHE_KEY = 'cached_staff_list'
const STAFF_CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

// Cache key for staff assignments
const STAFF_ASSIGNMENTS_CACHE_KEY = 'cached_staff_assignments'

// Cache helpers
const getCachedStaff = (ownerId) => {
    try {
        const cached = localStorage.getItem(STAFF_CACHE_KEY)
        if (!cached) return null

        const { data, ownerId: cachedOwnerId, timestamp } = JSON.parse(cached)

        // Check if cache is for same owner and not expired
        if (cachedOwnerId === ownerId && Date.now() - timestamp < STAFF_CACHE_EXPIRY) {
            return data
        }
        return null
    } catch {
        return null
    }
}

const setCachedStaff = (ownerId, data) => {
    try {
        localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify({
            data,
            ownerId,
            timestamp: Date.now()
        }))
    } catch (e) {
        console.warn('Failed to cache staff list:', e)
    }
}

// Cache helpers for assignments
const getCachedAssignments = (ownerId) => {
    try {
        const cached = localStorage.getItem(STAFF_ASSIGNMENTS_CACHE_KEY)
        if (!cached) return null

        const { data, ownerId: cachedOwnerId, timestamp } = JSON.parse(cached)

        if (cachedOwnerId === ownerId && Date.now() - timestamp < STAFF_CACHE_EXPIRY) {
            return data
        }
        return null
    } catch {
        return null
    }
}

const setCachedAssignments = (ownerId, data) => {
    try {
        localStorage.setItem(STAFF_ASSIGNMENTS_CACHE_KEY, JSON.stringify({
            data,
            ownerId,
            timestamp: Date.now()
        }))
    } catch (e) {
        console.warn('Failed to cache staff assignments:', e)
    }
}

/**
 * Modal quản lý tài khoản nhân viên
 * Cho phép Owner xem danh sách staff và tạo tài khoản mới
 */
const StaffManagementModal = ({ isOpen, onClose }) => {
    const { user } = useAuth()

    // State
    const [staffList, setStaffList] = useState([])
    const [loading, setLoading] = useState(false) // Bắt đầu với false
    const [creating, setCreating] = useState(false)
    const [deleting, setDeleting] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [hasCacheLoaded, setHasCacheLoaded] = useState(false)

    // Refs để ngăn duplicate fetch
    const isFetchingRef = useRef(false)
    const lastFetchUserIdRef = useRef(null)

    // Assignment State
    const [assigningStaff, setAssigningStaff] = useState(null)
    const [staffAssignments, setStaffAssignments] = useState({}) // { staffId: [{ project_id, project_name }] }
    const [expandedStaff, setExpandedStaff] = useState({}) // { staffId: boolean }

    // Form state
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showForm, setShowForm] = useState(false)

    // Giới hạn tối đa tài khoản con
    const MAX_STAFF_ACCOUNTS = 3
    const canCreateMore = staffList.length < MAX_STAFF_ACCOUNTS

    // Load cache ngay khi modal mở và user available
    useEffect(() => {
        if (isOpen && user?.id && !hasCacheLoaded) {
            const cached = getCachedStaff(user.id)
            const cachedAssignments = getCachedAssignments(user.id)
            if (cached && cached.length > 0) {
                console.log('[StaffManagement] Loaded', cached.length, 'staff from cache')
                setStaffList(cached)
                if (cachedAssignments) {
                    setStaffAssignments(cachedAssignments)
                }
                setHasCacheLoaded(true)
                // KHÔNG set loading = true vì đã có data
            } else {
                // Không có cache, cần loading
                setLoading(true)
            }
        }
    }, [isOpen, user?.id, hasCacheLoaded])

    // Fetch danh sách staff với timeout và lock
    const fetchStaffList = useCallback(async (forceRefresh = false) => {
        const userId = user?.id

        if (!userId) {
            setLoading(false)
            return
        }

        // Ngăn duplicate fetch (trừ khi force refresh)
        if (isFetchingRef.current) {
            console.log('[StaffManagement] Already fetching, skipping...')
            return
        }

        // Skip nếu đã fetch cho user này và không force refresh
        if (!forceRefresh && lastFetchUserIdRef.current === userId && staffList.length > 0) {
            console.log('[StaffManagement] Already loaded for this user, skipping...')
            setLoading(false)
            return
        }

        isFetchingRef.current = true
        // Chỉ show loading nếu chưa có data (tránh flash)
        if (staffList.length === 0) {
            setLoading(true)
        }
        setError('')

        // Timeout sau 20 giây (đủ lâu cho Supabase cold start)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
            console.warn('[StaffManagement] Timeout reached, force cleanup')
            controller.abort()
            // Force cleanup vì AbortController không phải lúc nào cũng trigger catch
            isFetchingRef.current = false
            setLoading(false)
        }, 20000)

        try {
            console.log('[StaffManagement] Fetching staff for owner:', userId)

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, email, created_at')
                .eq('parent_id', userId)
                .eq('role', 'staff')
                .order('created_at', { ascending: false })
                .abortSignal(controller.signal)

            clearTimeout(timeoutId)

            if (error) throw error

            console.log('[StaffManagement] Found', data?.length || 0, 'staff members')
            setStaffList(data || [])
            lastFetchUserIdRef.current = userId
            setError('') // Clear any previous errors

            // Save to cache
            setCachedStaff(userId, data || [])

            // Fetch project assignments cho tất cả staff
            if (data && data.length > 0) {
                const staffIds = data.map(s => s.id)
                const { data: assignmentsData, error: assignmentsError } = await supabase
                    .from('project_assignments')
                    .select('staff_id, project_id, projects(name)')
                    .in('staff_id', staffIds)

                if (!assignmentsError && assignmentsData) {
                    // Group by staff_id
                    const grouped = assignmentsData.reduce((acc, item) => {
                        if (!acc[item.staff_id]) {
                            acc[item.staff_id] = []
                        }
                        acc[item.staff_id].push({
                            project_id: item.project_id,
                            project_name: item.projects?.name || 'Dự án không tên'
                        })
                        return acc
                    }, {})
                    setStaffAssignments(grouped)
                    setCachedAssignments(userId, grouped)
                    console.log('[StaffManagement] Loaded assignments for', Object.keys(grouped).length, 'staff')
                }
            }
        } catch (err) {
            clearTimeout(timeoutId)
            console.error('[StaffManagement] Catch error:', err.name, err.message)

            if (err.name === 'AbortError') {
                console.warn('[StaffManagement] Fetch timeout')
                // Chỉ hiển thị error nếu không có cached data
                if (staffList.length === 0) {
                    setError('Tải dữ liệu quá lâu. Nhấn "Thử lại" để tải lại.')
                }
            } else {
                console.error('[StaffManagement] Error fetching staff:', err)
                if (staffList.length === 0) {
                    setError('Không thể tải: ' + (err.message || 'Lỗi kết nối'))
                }
            }
        } finally {
            console.log('[StaffManagement] Finally block - resetting states')
            isFetchingRef.current = false
            setLoading(false)
        }
    }, [user?.id, staffList.length])

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchStaffList()
        }
        if (isOpen) {
            setError('')
            setSuccess('')
        }
    }, [isOpen, user?.id])

    // Tạo tài khoản staff mới
    const handleCreateStaff = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setCreating(true)

        try {
            // Gọi Edge Function để tạo staff account (endpoint là 'quick-task')
            const { data, error } = await supabase.functions.invoke('quick-task', {
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

            // Reload list with force refresh
            await fetchStaffList(true)
        } catch (err) {
            console.error('Error creating staff:', err)
            setError(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.')
        } finally {
            setCreating(false)
        }
    }

    // Xóa (vô hiệu hóa) tài khoản staff
    const handleDeleteStaff = async (staffId, staffUsername) => {
        if (!confirm(`Bạn có chắc muốn xóa tài khoản "${staffUsername}"? Nhân viên này sẽ không thể đăng nhập được nữa.`)) return

        setDeleting(staffId)
        setError('') // Clear any previous errors

        try {
            // Gọi RPC function (bypass RLS với SECURITY DEFINER)
            const { data, error } = await supabase.rpc('disable_staff', {
                p_staff_id: staffId,
                p_owner_id: user.id
            })

            if (error) {
                console.error('RPC error:', error)
                throw new Error(error.message)
            }

            // RPC trả về boolean, check cả true và falsy
            if (!data) {
                throw new Error('Không có quyền xóa tài khoản này')
            }

            // Cập nhật UI ngay lập tức
            setStaffList(prev => {
                const newList = prev.filter(s => s.id !== staffId)
                // Update cache
                setCachedStaff(user.id, newList)
                return newList
            })
            setSuccess(`Đã xóa tài khoản "${staffUsername}"`)
        } catch (err) {
            console.error('Error deleting staff:', err)
            setError(err.message || 'Không thể xóa tài khoản. Vui lòng thử lại.')
        }

        // Always reset deleting state
        setDeleting(null)
    }

    if (!isOpen) return null

    return (
        <>
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
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-600 text-sm">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                                <button
                                    onClick={() => fetchStaffList(true)}
                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-medium transition-colors"
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                                {success}
                            </div>
                        )}

                        {/* Add Staff Button / Form */}
                        {!showForm ? (
                            <>
                                <button
                                    onClick={() => setShowForm(true)}
                                    disabled={!canCreateMore}
                                    className={`w-full mb-2 p-3 border-2 border-dashed rounded-xl 
                                             font-medium flex items-center justify-center gap-2
                                             transition-colors ${canCreateMore
                                            ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                                            : 'border-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <UserPlus className="w-5 h-5" />
                                    Thêm nhân viên mới
                                </button>
                                <p className={`text-center text-xs mb-4 ${canCreateMore ? 'text-slate-500' : 'text-orange-500'
                                    }`}>
                                    {staffList.length}/{MAX_STAFF_ACCOUNTS} tài khoản
                                    {!canCreateMore && ' (đã đạt giới hạn)'}
                                </p>
                            </>
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
                                {/* Show small spinner if loading but have cached data */}
                                {loading && staffList.length > 0 && (
                                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                )}
                            </h3>

                            {/* Only show full loading if no data at all */}
                            {loading && staffList.length === 0 ? (
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
                                    {staffList.map((staff) => {
                                        const assignments = staffAssignments[staff.id] || []
                                        const isExpanded = expandedStaff[staff.id]
                                        const hasAssignments = assignments.length > 0
                                        
                                        return (
                                            <div
                                                key={staff.id}
                                                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                                            >
                                                <div className="p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {hasAssignments && (
                                                            <button
                                                                onClick={() => setExpandedStaff(prev => ({
                                                                    ...prev,
                                                                    [staff.id]: !prev[staff.id]
                                                                }))}
                                                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors shrink-0"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="w-4 h-4" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-800">{staff.username}</p>
                                                            <p className="text-xs text-slate-500 truncate">{staff.email}</p>
                                                            {hasAssignments && (
                                                                <p className="text-xs text-indigo-600 mt-0.5 flex items-center gap-1">
                                                                    <FolderKanban className="w-3 h-3" />
                                                                    {assignments.length} dự án
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => setAssigningStaff(staff)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Phân quyền dự án"
                                                        >
                                                            <Briefcase className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStaff(staff.id, staff.username)}
                                                            disabled={deleting === staff.id}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors
                                                                     disabled:opacity-50"
                                                            title="Xóa tài khoản"
                                                        >
                                                            {deleting === staff.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Expanded Project List */}
                                                {isExpanded && hasAssignments && (
                                                    <div className="px-3 pb-3 pt-0">
                                                        <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                                                            {assignments.map((assignment) => (
                                                                <div
                                                                    key={assignment.project_id}
                                                                    className="flex items-center gap-2 text-xs text-slate-600 py-1 px-2 bg-white rounded"
                                                                >
                                                                    <FolderKanban className="w-3 h-3 text-indigo-500 shrink-0" />
                                                                    <span className="truncate">{assignment.project_name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Assignment Modal */}
            <ProjectAssignmentModal
                isOpen={!!assigningStaff}
                staff={assigningStaff}
                onClose={() => setAssigningStaff(null)}
                onSaved={(msg) => {
                    setSuccess(msg)
                    // Refresh assignments after save
                    fetchStaffList(true)
                }}
            />
        </>
    )
}

export default StaffManagementModal
