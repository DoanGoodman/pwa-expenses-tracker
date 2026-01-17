import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, demoData, isDemoMode } from '../lib/supabase'

// Cache userId để tránh gọi Supabase nhiều lần
let cachedUserId = null

// Helper function to get current user ID với cache và timeout
// IMPORTANT: Trả về cached value NGAY LẬP TỨC nếu có
const getCurrentUserId = async () => {
    // Return cached value NGAY LẬP TỨC nếu có - không chờ gì cả
    if (cachedUserId) {
        console.log('[getCurrentUserId] Using cached userId:', cachedUserId.substring(0, 8) + '...')
        return cachedUserId
    }

    console.log('[getCurrentUserId] No cache, attempting to get session...')

    try {
        // Timeout 3 giây (giảm từ 5s) - nếu quá lâu thì trả về null
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.warn('[getCurrentUserId] getSession timeout after 3s')
                resolve({ data: { session: null }, error: new Error('timeout') })
            }, 3000)
        })

        const sessionPromise = supabase.auth.getSession()

        const result = await Promise.race([sessionPromise, timeoutPromise])

        if (result.error) {
            console.error('[getCurrentUserId] Error:', result.error)
            return null
        }

        cachedUserId = result.data?.session?.user?.id || null
        console.log('[getCurrentUserId] Got userId from session:', cachedUserId ? cachedUserId.substring(0, 8) + '...' : 'null')
        return cachedUserId
    } catch (error) {
        console.error('[getCurrentUserId] Unexpected error:', error)
        return null
    }
}

// Function để clear cache khi logout
export const clearUserIdCache = () => {
    cachedUserId = null
}

// Function để set cache từ bên ngoài (ví dụ từ AuthContext)
export const setUserIdCache = (userId) => {
    cachedUserId = userId
}

// Helper function to get the last day of a month
const getLastDayOfMonth = (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number)
    // Create date for next month's first day, then subtract 1 day
    const lastDay = new Date(year, month, 0).getDate()
    return lastDay
}

// Hook để lấy danh sách projects (filtered by user_id)
export const useProjects = () => {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const hasDataRef = useRef(false)  // Track nếu đã có data
    const isFetchingRef = useRef(false)  // Fetch lock

    // Cache key
    const cacheKey = 'projects_cache'

    // Load từ cache khi component mount
    useEffect(() => {
        try {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                const parsed = JSON.parse(cached)
                console.log('[useProjects] Loaded', parsed.length, 'projects from cache')
                setProjects(parsed)
                hasDataRef.current = true
                setLoading(false)
            }
        } catch (e) {
            console.warn('[useProjects] Failed to load from cache:', e)
        }
    }, [])

    const fetchProjects = useCallback(async () => {
        // Fetch lock
        if (isFetchingRef.current) {
            console.log('[useProjects] Fetch already in progress, skipping...')
            return
        }
        isFetchingRef.current = true

        // Chỉ show loading nếu chưa có cached data
        if (!hasDataRef.current) {
            setLoading(true)
        }

        if (isDemoMode()) {
            setProjects(demoData.projects)
            hasDataRef.current = true
            setLoading(false)
            isFetchingRef.current = false
            return
        }

        try {
            const userId = await getCurrentUserId()
            if (!userId) {
                setProjects([])
                setLoading(false)
                isFetchingRef.current = false
                return
            }

            const { data, error } = await supabase
                .from('projects')
                .select('*')
                // RLS determines visibility (Own + Parent's)
                .order('name')

            if (error) throw error
            setProjects(data || [])
            hasDataRef.current = true

            // Save to cache
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data || []))
            } catch (e) {
                console.warn('[useProjects] Failed to save to cache:', e)
            }
        } catch (error) {
            console.error('[useProjects] Fetch ERROR:', error)
            // KHÔNG dùng alert() vì có thể gây infinite loop
        } finally {
            setLoading(false)
            isFetchingRef.current = false
        }
    }, [])

    useEffect(() => {
        fetchProjects()

        // Safety timeout: Clear fetch lock sau 15 giây
        const safetyTimeout = setTimeout(() => {
            if (isFetchingRef.current) {
                console.warn('[useProjects] Safety timeout - clearing fetch lock')
                isFetchingRef.current = false
                if (!hasDataRef.current) {
                    setLoading(false)
                }
            }
        }, 15000)

        return () => clearTimeout(safetyTimeout)
    }, [fetchProjects])

    const addProject = async (projectData) => {
        if (isDemoMode()) {
            const newProject = {
                id: `demo-proj-${Date.now()}`,
                name: projectData.name,
                created_at: new Date().toISOString()
            }
            demoData.projects.push(newProject)
            setProjects([...demoData.projects])
            return { success: true, data: newProject }
        }

        try {
            const userId = await getCurrentUserId()
            if (!userId) {
                throw new Error('Bạn cần đăng nhập để thêm dự án')
            }

            const { data, error } = await supabase
                .from('projects')
                .insert([{ ...projectData, user_id: userId }])
                .select()

            if (error) throw error

            await fetchProjects() // Refresh list
            return { success: true, data: data[0] }
        } catch (error) {
            console.error('Error adding project:', error)
            alert('Lỗi thêm dự án: ' + error.message)
            return { success: false, error }
        }
    }

    // Check if project name already exists (case-insensitive)
    const checkProjectExists = async (name) => {
        if (!name || !name.trim()) return false

        const trimmedName = name.trim()

        if (isDemoMode()) {
            // Demo mode: Check in local array
            return demoData.projects.some(
                p => p.name.toLowerCase() === trimmedName.toLowerCase()
            )
        }

        try {
            const userId = await getCurrentUserId()
            if (!userId) return false

            const { data, error } = await supabase
                .from('projects')
                .select('name')
                // RLS Check: user sees own and parent's projects
                .ilike('name', trimmedName)

            if (error) throw error

            return data && data.length > 0
        } catch (error) {
            console.error('Error checking project existence:', error)
            return false
        }
    }

    // --- Project Assignments Helpers (For Owner) ---

    // Lấy danh sách dự án được assign cho một staff
    const getStaffAssignments = async (staffId) => {
        try {
            const { data, error } = await supabase
                .from('project_assignments')
                .select('project_id')
                .eq('staff_id', staffId)

            if (error) throw error
            return data.map(item => item.project_id)
        } catch (error) {
            console.error('Error fetching assignments:', error)
            return []
        }
    }

    // Cập nhật danh sách dự án cho staff (assign/unassign hàng loạt)
    const updateStaffAssignments = async (staffId, projectIds) => {
        try {
            // 1. Lấy assignments hiện tại
            const currentIds = await getStaffAssignments(staffId)

            // 2. Tìm cái cần thêm và cái cần xóa
            const toAdd = projectIds.filter(id => !currentIds.includes(id))
            const toRemove = currentIds.filter(id => !projectIds.includes(id))

            if (toRemove.length > 0) {
                const { error: delError } = await supabase
                    .from('project_assignments')
                    .delete()
                    .eq('staff_id', staffId)
                    .in('project_id', toRemove)
                if (delError) throw delError
            }

            if (toAdd.length > 0) {
                const currentUserId = await getCurrentUserId()
                const { error: insError } = await supabase
                    .from('project_assignments')
                    .insert(
                        toAdd.map(projectId => ({
                            staff_id: staffId,
                            project_id: projectId,
                            assigned_by: currentUserId
                        }))
                    )
                if (insError) throw insError
            }

            return { success: true }
        } catch (error) {
            console.error('Error updating assignments:', error)
            return { success: false, error: error.message }
        }
    }

    return {
        projects,
        loading,
        addProject,
        checkProjectExists,
        refetch: fetchProjects,
        getStaffAssignments,
        updateStaffAssignments
    }
}

// Hook để lấy danh sách categories
export const useCategories = () => {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const hasDataRef = useRef(false)
    const isFetchingRef = useRef(false)
    const cacheKey = 'categories_cache'

    // Load từ cache
    useEffect(() => {
        try {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                const parsed = JSON.parse(cached)
                console.log('[useCategories] Loaded', parsed.length, 'categories from cache')
                setCategories(parsed)
                hasDataRef.current = true
                setLoading(false)
            }
        } catch (e) {
            console.warn('[useCategories] Failed to load from cache:', e)
        }
    }, [])

    useEffect(() => {
        const fetchCategories = async () => {
            if (isFetchingRef.current) return
            isFetchingRef.current = true

            if (!hasDataRef.current) {
                setLoading(true)
            }

            if (isDemoMode()) {
                setCategories(demoData.categories)
                hasDataRef.current = true
                setLoading(false)
                isFetchingRef.current = false
                return
            }

            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('*')
                    .order('id')

                if (error) throw error
                setCategories(data || [])
                hasDataRef.current = true

                // Save to cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(data || []))
                } catch (e) {
                    console.warn('[useCategories] Failed to save to cache:', e)
                }
            } catch (error) {
                console.error('[useCategories] Fetch ERROR:', error)
                // KHÔNG dùng alert()
            } finally {
                setLoading(false)
                isFetchingRef.current = false
            }
        }

        fetchCategories()

        // Safety timeout: Clear fetch lock sau 15 giây
        const safetyTimeout = setTimeout(() => {
            if (isFetchingRef.current) {
                console.warn('[useCategories] Safety timeout - clearing fetch lock')
                isFetchingRef.current = false
                if (!hasDataRef.current) {
                    setLoading(false)
                }
            }
        }, 15000)

        return () => clearTimeout(safetyTimeout)
    }, [])

    return { categories, loading }
}

// Hook để lấy danh sách expenses với filter (filtered by user_id)
// Supports: projectId, categoryIds (array), startMonth, endMonth, search, sortOption
export const useExpenses = (filters = {}) => {
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)
    const isFetchingRef = useRef(false)
    const hasDataRef = useRef(false)  // Track nếu đã có data

    // Cache key dựa trên userId (để mỗi user có cache riêng)
    const cacheKey = filters.userId ? `expenses_cache_${filters.userId}` : null

    // Load từ cache khi component mount
    useEffect(() => {
        if (cacheKey) {
            try {
                const cached = localStorage.getItem(cacheKey)
                if (cached) {
                    const parsed = JSON.parse(cached)
                    console.log('[useExpenses] Loaded', parsed.length, 'items from cache')
                    setExpenses(parsed)
                    hasDataRef.current = true  // Mark có data
                    setLoading(false)  // ← Hiển thị data ngay, không đợi network
                }
            } catch (e) {
                console.warn('[useExpenses] Failed to load from cache:', e)
            }
        }
    }, [cacheKey])

    const fetchExpenses = useCallback(async () => {
        // Fetch lock: Ngăn multiple concurrent fetches
        if (isFetchingRef.current) {
            console.log('[useExpenses] Fetch already in progress, skipping...')
            return
        }
        isFetchingRef.current = true

        // Chỉ show loading spinner nếu chưa có data (first load)
        // Nếu đã có cached data, fetch chạy ngầm (background refresh)
        if (!hasDataRef.current) {
            setLoading(true)
        }

        // Parse sort option
        const sortOption = filters.sortOption || 'date_desc'
        const [sortField, sortDirection] = sortOption.split('_')
        const sortColumn = sortField === 'created' ? 'created_at' : 'date'
        const ascending = sortDirection === 'asc'

        if (isDemoMode()) {
            let filtered = [...demoData.expenses]

            // Apply filters with AND logic
            if (filters.projectId && filters.projectId !== 'all') {
                filtered = filtered.filter(e => e.project_id === filters.projectId)
            }

            // Support both single categoryId and categoryIds array
            if (filters.categoryIds && filters.categoryIds.length > 0) {
                filtered = filtered.filter(e => filters.categoryIds.includes(e.category_id))
            } else if (filters.categoryId && filters.categoryId !== 'all') {
                filtered = filtered.filter(e => e.category_id === filters.categoryId)
            }

            // Month filter using startsWith logic (use 'date' field)
            if (filters.month) {
                filtered = filtered.filter(e => (e.date || e.expense_date)?.startsWith(filters.month))
            }

            // Month range filter
            if (filters.startMonth && filters.endMonth) {
                filtered = filtered.filter(e => {
                    const expenseMonth = (e.date || e.expense_date)?.substring(0, 7)
                    return expenseMonth >= filters.startMonth && expenseMonth <= filters.endMonth
                })
            }

            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                filtered = filtered.filter(e =>
                    e.description?.toLowerCase().includes(searchLower)
                )
            }

            // Sort based on option
            filtered.sort((a, b) => {
                const dateA = new Date(sortColumn === 'created_at' ? a.created_at : (a.date || a.expense_date))
                const dateB = new Date(sortColumn === 'created_at' ? b.created_at : (b.date || b.expense_date))
                return ascending ? dateA - dateB : dateB - dateA
            })

            // Enrich with project and category names
            const enriched = filtered.map(expense => ({
                ...expense,
                project: demoData.projects.find(p => p.id === expense.project_id),
                category: demoData.categories.find(c => c.id === expense.category_id)
            }))

            setExpenses(enriched)
            setLoading(false)
            return
        }

        try {
            // Nếu userId không được truyền vào, đợi thay vì gọi getCurrentUserId (có thể treo)
            const userId = filters.userId

            console.log('[useExpenses] Starting fetch with userId:', userId ? userId.substring(0, 8) + '...' : 'NONE')

            if (!userId) {
                // Không có userId - component có thể đang đợi AuthContext load
                console.warn('[useExpenses] No userId - returning empty. This should only happen on initial mount.')
                setExpenses([])
                setLoading(false)
                return
            }

            console.log('[useExpenses] Building query...')

            // 1. Build query - RELY ON RLS, DO NOT FILTER BY USER_ID MANUALLY
            let query = supabase
                .from('expenses')
                .select('*')
                // .eq('user_id', userId) <--- REMOVED: Let RLS handle this
                .is('deleted_at', null)
                .order(sortColumn, { ascending })

            if (filters.projectId && filters.projectId !== 'all') {
                query = query.eq('project_id', filters.projectId)
            }

            // Support multiple categories using .in()
            if (filters.categoryIds && filters.categoryIds.length > 0) {
                query = query.in('category_id', filters.categoryIds)
            } else if (filters.categoryId && filters.categoryId !== 'all') {
                query = query.eq('category_id', filters.categoryId)
            }

            if (filters.month) {
                const lastDay = getLastDayOfMonth(filters.month)
                query = query.gte('date', `${filters.month}-01T00:00:00`)
                query = query.lte('date', `${filters.month}-${String(lastDay).padStart(2, '0')}T23:59:59`)
            }

            if (filters.startMonth && filters.endMonth) {
                const lastDay = getLastDayOfMonth(filters.endMonth)
                query = query.gte('date', `${filters.startMonth}-01T00:00:00`)
                query = query.lte('date', `${filters.endMonth}-${String(lastDay).padStart(2, '0')}T23:59:59`)
            }

            if (filters.search) {
                query = query.ilike('description', `%${filters.search}%`)
            }

            console.log('[useExpenses] Executing query...')

            // Simple await - AbortController gây timeout giả khi tab bị hidden
            const { data: expensesData, error: expensesError } = await query

            console.log('[useExpenses] Query returned:', expensesData?.length, 'items')

            if (expensesError) throw expensesError

            if (expensesData) {
                // 2. Fetch Projects and Categories for manual join
                const [projectsResponse, categoriesResponse] = await Promise.all([
                    supabase.from('projects').select('id, name'),
                    supabase.from('categories').select('id, name')
                ])

                const projectsMap = new Map(projectsResponse.data?.map(p => [p.id, p]) || [])
                const categoriesMap = new Map(categoriesResponse.data?.map(c => [c.id, c]) || [])

                // 3. Manual Join
                const enriched = expensesData.map(expense => ({
                    ...expense,
                    project: projectsMap.get(expense.project_id),
                    category: categoriesMap.get(expense.category_id)
                }))

                console.log('[useExpenses] Fetch SUCCESS - setting', enriched.length, 'expenses')
                setExpenses(enriched)
                hasDataRef.current = true  // Mark có data

                // Save to cache
                if (cacheKey) {
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(enriched))
                    } catch (e) {
                        console.warn('[useExpenses] Failed to save to cache:', e)
                    }
                }
            } else {
                console.log('[useExpenses] No expenses data returned')
                setExpenses([])
            }

        } catch (error) {
            console.error('[useExpenses] Fetch ERROR:', error)
            // KHÔNG dùng alert() vì có thể gây infinite loop khi window focus trigger refetch
        } finally {
            console.log('[useExpenses] Fetch COMPLETE - setting loading to false')
            isFetchingRef.current = false  // Clear lock
            setLoading(false)
        }
    }, [filters.projectId, filters.categoryId, filters.categoryIds, filters.month, filters.startMonth, filters.endMonth, filters.search, filters.sortOption, filters.userId, cacheKey])

    useEffect(() => {
        fetchExpenses()

        // Safety timeout: Sau 15 giây, clear fetch lock và retry 1 lần
        const safetyTimeout = setTimeout(() => {
            if (isFetchingRef.current) {
                console.warn('[useExpenses] Safety timeout - clearing fetch lock, will retry')
                isFetchingRef.current = false

                // Retry fetch 1 lần
                fetchExpenses()
            }
        }, 15000)

        // Lần retry cũng có timeout riêng (30 giây tổng)
        const finalTimeout = setTimeout(() => {
            if (isFetchingRef.current) {
                console.warn('[useExpenses] Final timeout - giving up')
                isFetchingRef.current = false
                if (!hasDataRef.current) {
                    setLoading(false)
                }
            }
        }, 30000)

        return () => {
            clearTimeout(safetyTimeout)
            clearTimeout(finalTimeout)
        }
    }, [fetchExpenses])

    // NOTE: Đã xóa visibility change handler vì gây infinite loop
    // Khi fetch bị treo → safety timeout → visibility handler trigger refetch → fetch treo lại → loop

    return { expenses, loading, refetch: fetchExpenses }
}


// Hook để thêm expense mới (with all 10 columns)
export const useAddExpense = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const addExpense = async (expenseData) => {
        setLoading(true)
        setError(null)

        if (isDemoMode()) {
            // Demo mode - just simulate success
            await new Promise(resolve => setTimeout(resolve, 500))
            setLoading(false)
            return { success: true }
        }

        try {
            const userId = await getCurrentUserId()
            if (!userId) {
                throw new Error('Bạn cần đăng nhập để thêm chi phí')
            }

            // Map form data to database columns
            // Ensure date is in ISO format for timestamptz column
            let dateValue = expenseData.expense_date || expenseData.date || new Date().toISOString()
            if (dateValue && !dateValue.includes('T')) {
                dateValue = `${dateValue}T00:00:00`
            }

            const insertData = {
                date: dateValue,
                project_id: Number(expenseData.project_id),
                category_id: Number(expenseData.category_id),
                amount: expenseData.amount || 0,
                description: expenseData.description || '',
                quantity: expenseData.quantity || 1,
                unit_price: expenseData.unit_price || 0,
                unit: expenseData.unit || null,
                user_id: userId
            }

            const { data, error: supaError } = await supabase
                .from('expenses')
                .insert([insertData])
                .select()

            if (supaError) throw supaError

            setLoading(false)
            return { success: true, data }
        } catch (err) {
            console.error('Error adding expense:', err)
            setError(err.message)
            alert('Lỗi thêm chi phí: ' + err.message)
            setLoading(false)
            return { success: false, error: err }
        }
    }

    return { addExpense, loading, error }
}

// Hook để cập nhật expense
export const useUpdateExpense = () => {
    const [loading, setLoading] = useState(false)

    const updateExpense = async (id, expenseData, reason = '') => {
        setLoading(true)

        if (isDemoMode()) {
            await new Promise(resolve => setTimeout(resolve, 500))
            setLoading(false)
            return { success: true }
        }

        try {
            // Map form data to database columns, include change reason
            const updateData = {
                date: expenseData.expense_date || expenseData.date,
                project_id: parseInt(expenseData.project_id),
                category_id: parseInt(expenseData.category_id),
                amount: expenseData.amount || 0,
                description: expenseData.description || '',
                quantity: expenseData.quantity || 1,
                unit_price: expenseData.unit_price || 0,
                unit: expenseData.unit || null,
                last_change_reason: reason || 'Cập nhật chi phí'
            }

            const { error } = await supabase
                .from('expenses')
                .update(updateData)
                .eq('id', id)

            if (error) throw error

            setLoading(false)
            return { success: true }
        } catch (error) {
            console.error('Error updating expense:', error)
            alert('Lỗi cập nhật chi phí: ' + error.message)
            setLoading(false)
            return { success: false, error }
        }
    }

    return { updateExpense, loading }
}

// Hook để xóa expense
export const useDeleteExpense = () => {
    const [loading, setLoading] = useState(false)

    const deleteExpense = async (id, reason = '') => {
        setLoading(true)

        if (isDemoMode()) {
            await new Promise(resolve => setTimeout(resolve, 500))
            setLoading(false)
            return { success: true }
        }

        try {
            // Soft delete: Set deleted_at timestamp instead of hard delete
            // This allows recovery within 30 days
            const { error } = await supabase
                .from('expenses')
                .update({
                    deleted_at: new Date().toISOString(),
                    last_change_reason: reason || 'Xóa chi phí'
                })
                .eq('id', id)

            if (error) throw error

            setLoading(false)
            return { success: true }
        } catch (error) {
            console.error('Error deleting expense:', error)
            alert('Lỗi xóa chi phí: ' + error.message)
            setLoading(false)
            return { success: false, error }
        }
    }

    return { deleteExpense, loading }
}

// Hook để lấy thống kê dashboard (with real Supabase data)
export const useDashboardStats = (startMonth, endMonth, projectId = null, userId = null) => {
    const [stats, setStats] = useState({
        total: 0,
        byCategory: [],
        byMonth: []
    })
    const [loading, setLoading] = useState(true)
    const hasDataRef = useRef(false)  // Track nếu đã có data

    // Cache key dựa trên userId và các filters
    const cacheKey = userId ? `dashboard_stats_${userId}_${startMonth}_${endMonth}_${projectId || 'all'}` : null

    // Load từ cache khi component mount
    useEffect(() => {
        if (cacheKey) {
            try {
                const cached = localStorage.getItem(cacheKey)
                if (cached) {
                    const parsed = JSON.parse(cached)
                    console.log('[useDashboardStats] Loaded from cache - total:', parsed.total)
                    setStats(parsed)
                    hasDataRef.current = true  // Mark có data
                    setLoading(false)  // ← Hiển thị data ngay, không đợi network
                }
            } catch (e) {
                console.warn('[useDashboardStats] Failed to load from cache:', e)
            }
        }
    }, [cacheKey])

    useEffect(() => {
        const calculateStats = async () => {
            // Chỉ show loading spinner nếu chưa có data (first load)
            if (!hasDataRef.current) {
                setLoading(true)
            }

            if (isDemoMode()) {
                let filtered = demoData.expenses

                // Filter by date range
                if (startMonth && endMonth) {
                    filtered = filtered.filter(e => {
                        const expenseMonth = (e.date || e.expense_date)?.substring(0, 7)
                        return expenseMonth >= startMonth && expenseMonth <= endMonth
                    })
                }

                // Filter by project
                if (projectId) {
                    filtered = filtered.filter(e => e.project_id === projectId)
                }

                // Total
                const total = filtered.reduce((sum, e) => sum + e.amount, 0)

                // By category
                const categoryTotals = {}
                filtered.forEach(e => {
                    if (!categoryTotals[e.category_id]) {
                        categoryTotals[e.category_id] = 0
                    }
                    categoryTotals[e.category_id] += e.amount
                })

                const byCategory = Object.entries(categoryTotals)
                    .map(([categoryId, amount]) => {
                        const category = demoData.categories.find(c => c.id === categoryId)
                        return {
                            id: categoryId,
                            name: category?.name || 'Khác',
                            icon: category?.icon || '📦',
                            amount,
                            percentage: total > 0 ? (amount / total) * 100 : 0
                        }
                    })
                    .sort((a, b) => b.amount - a.amount)

                // By month
                const monthTotals = {}
                filtered.forEach(e => {
                    const month = (e.date || e.expense_date)?.substring(0, 7)
                    if (!monthTotals[month]) {
                        monthTotals[month] = 0
                    }
                    monthTotals[month] += e.amount
                })

                const byMonth = Object.entries(monthTotals)
                    .map(([month, amount]) => ({ month, amount }))
                    .sort((a, b) => a.month.localeCompare(b.month))

                setStats({ total, byCategory, byMonth })
                setLoading(false)
                return
            }

            // --- REAL SUPABASE DATA ---
            try {
                // Không gọi getCurrentUserId() vì có thể treo
                // Đợi userId được truyền từ AuthContext
                console.log('[useDashboardStats] Starting fetch with userId:', userId ? userId.substring(0, 8) + '...' : 'NONE')

                if (!userId) {
                    console.warn('[useDashboardStats] No userId - returning empty stats')
                    setStats({ total: 0, byCategory: [], byMonth: [] })
                    setLoading(false)
                    return
                }

                console.log('[useDashboardStats] Building query...')

                // Build query with filters
                // Exclude soft-deleted items from dashboard stats
                let query = supabase
                    .from('expenses')
                    .select('*')
                    // .eq('user_id', userId) <--- REMOVED: Let RLS handle this
                    .is('deleted_at', null)

                if (startMonth && endMonth) {
                    const lastDay = getLastDayOfMonth(endMonth)
                    query = query.gte('date', `${startMonth}-01T00:00:00`)
                    query = query.lte('date', `${endMonth}-${String(lastDay).padStart(2, '0')}T23:59:59`)
                }

                if (projectId) {
                    query = query.eq('project_id', projectId)
                }

                console.log('[useDashboardStats] Executing query...')

                // Add timeout protection (20 seconds)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => {
                    console.warn('[useDashboardStats] ⏰ Query timeout, aborting...')
                    controller.abort()
                }, 20000)

                let expensesData, queryError
                try {
                    const result = await query.abortSignal(controller.signal)
                    expensesData = result.data
                    queryError = result.error
                } finally {
                    clearTimeout(timeoutId)
                }

                console.log('[useDashboardStats] Query returned:', expensesData?.length, 'items')

                if (queryError) throw queryError

                if (!expensesData || expensesData.length === 0) {
                    setStats({ total: 0, byCategory: [], byMonth: [] })
                    setLoading(false)
                    return
                }

                // Fetch categories for names
                const { data: categoriesData } = await supabase
                    .from('categories')
                    .select('id, name')

                const categoriesMap = new Map(categoriesData?.map(c => [c.id, c]) || [])

                // Calculate total
                const total = expensesData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

                // Group by category
                const categoryTotals = {}
                expensesData.forEach(e => {
                    const catId = e.category_id
                    if (!categoryTotals[catId]) {
                        categoryTotals[catId] = 0
                    }
                    categoryTotals[catId] += parseFloat(e.amount) || 0
                })

                const byCategory = Object.entries(categoryTotals)
                    .map(([categoryId, amount]) => {
                        const category = categoriesMap.get(parseInt(categoryId))
                        return {
                            id: categoryId,
                            name: category?.name || 'Khác',
                            icon: '📦', // Categories table doesn't have icon column
                            amount,
                            percentage: total > 0 ? (amount / total) * 100 : 0
                        }
                    })
                    .sort((a, b) => b.amount - a.amount)

                // Group by month
                const monthTotals = {}
                expensesData.forEach(e => {
                    const dateStr = e.date
                    if (dateStr) {
                        const month = dateStr.substring(0, 7)
                        if (!monthTotals[month]) {
                            monthTotals[month] = 0
                        }
                        monthTotals[month] += parseFloat(e.amount) || 0
                    }
                })

                const byMonth = Object.entries(monthTotals)
                    .map(([month, amount]) => ({ month, amount }))
                    .sort((a, b) => a.month.localeCompare(b.month))

                console.log('[useDashboardStats] Fetch SUCCESS - total:', total, 'categories:', byCategory.length, 'months:', byMonth.length)
                const newStats = { total, byCategory, byMonth }

                // Chỉ update nếu data thực sự khác (tránh re-render gây giật)
                const newStatsStr = JSON.stringify(newStats)
                const currentStatsStr = JSON.stringify(stats)
                if (newStatsStr !== currentStatsStr) {
                    setStats(newStats)
                }
                hasDataRef.current = true  // Mark có data

                // Save to cache
                if (cacheKey) {
                    try {
                        localStorage.setItem(cacheKey, newStatsStr)
                    } catch (e) {
                        console.warn('[useDashboardStats] Failed to save to cache:', e)
                    }
                }
            } catch (error) {
                console.error('[useDashboardStats] Fetch ERROR:', error)
                // KHÔNG dùng alert() vì có thể gây infinite loop
            } finally {
                console.log('[useDashboardStats] Fetch COMPLETE - setting loading to false')
                setLoading(false)
            }
        }

        calculateStats()
        // Không cần safety timeout vì đã có cache và hasDataRef
    }, [startMonth, endMonth, projectId, userId, cacheKey])

    // NOTE: Đã xóa visibility change handler vì gây infinite loop
    // Khi fetch bị treo → safety timeout → visibility handler trigger refetch → fetch treo lại → loop

    return { stats, loading }
}

// Hook để bulk insert nhiều expenses cùng lúc (từ Receipt Scanner)
export const useBulkInsertExpenses = () => {
    const [loading, setLoading] = useState(false)

    const bulkInsert = async (expensesArray) => {
        if (!expensesArray || expensesArray.length === 0) {
            throw new Error('Không có dữ liệu để lưu')
        }

        setLoading(true)

        try {
            if (isDemoMode()) {
                // Demo mode: add to local array
                const newExpenses = expensesArray.map((expense, index) => ({
                    id: `demo-${Date.now()}-${index}`,
                    ...expense,
                    created_at: new Date().toISOString()
                }))
                demoData.expenses.push(...newExpenses)
                setLoading(false)
                return { success: true, count: newExpenses.length }
            }

            const userId = await getCurrentUserId()
            if (!userId) {
                throw new Error('Bạn cần đăng nhập để lưu chi phí')
            }

            // Add user_id to each expense and ensure proper data types
            const dataWithUserId = expensesArray.map(expense => {
                // Ensure date is in ISO format for timestamptz column
                let dateValue = expense.date || new Date().toISOString()
                if (dateValue && !dateValue.includes('T')) {
                    dateValue = `${dateValue}T00:00:00`
                }

                return {
                    ...expense,
                    date: dateValue,
                    project_id: Number(expense.project_id),
                    category_id: Number(expense.category_id),
                    user_id: userId
                }
            })

            const { data, error } = await supabase
                .from('expenses')
                .insert(dataWithUserId)
                .select()

            if (error) throw error

            return { success: true, count: data?.length || 0, data }
        } catch (error) {
            console.error('Bulk insert error:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    return { bulkInsert, loading }
}

// Hook để check và track giới hạn upload (30 ảnh/ngày cho owner)
// Staff dùng chung quota với Owner (parent)
export const useUploadLimit = () => {
    const DAILY_LIMIT = 30

    // Helper: Lấy owner_id (nếu là staff thì lấy parent_id)
    const getOwnerIdForQuota = async () => {
        const userId = await getCurrentUserId()
        if (!userId) return null

        // Check if user is staff with parent
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, parent_id')
            .eq('id', userId)
            .single()

        if (error || !profile) return userId

        // Staff uses parent's quota
        if (profile.role === 'staff' && profile.parent_id) {
            return profile.parent_id
        }

        return userId
    }

    // Lấy số lượng upload hôm nay (của owner)
    const getTodayCount = async () => {
        if (isDemoMode()) return 0

        try {
            const ownerId = await getOwnerIdForQuota()
            if (!ownerId) return 0

            const { data, error } = await supabase.rpc('get_today_upload_count', {
                p_owner_id: ownerId
            })

            if (error) {
                console.error('Error getting upload count:', error)
                return 0
            }

            return data || 0
        } catch (error) {
            console.error('Error in getTodayCount:', error)
            return 0
        }
    }

    // Check và increment upload count (dùng chung quota với owner)
    const checkAndIncrementUpload = async () => {
        if (isDemoMode()) return { allowed: true, remaining: DAILY_LIMIT }

        try {
            const ownerId = await getOwnerIdForQuota()
            if (!ownerId) return { allowed: false, remaining: 0, error: 'Chưa đăng nhập' }

            const { data, error } = await supabase.rpc('increment_upload_count', {
                p_owner_id: ownerId,
                p_limit: DAILY_LIMIT
            })

            if (error) {
                console.error('Error checking upload limit:', error)
                // Nếu function chưa tồn tại, cho phép upload (fallback)
                if (error.code === 'PGRST202') {
                    return { allowed: true, remaining: DAILY_LIMIT }
                }
                return { allowed: false, remaining: 0, error: error.message }
            }

            const result = data?.[0] || { allowed: true, remaining: DAILY_LIMIT }
            return {
                allowed: result.allowed,
                currentCount: result.current_count,
                remaining: result.remaining
            }
        } catch (error) {
            console.error('Error in checkAndIncrementUpload:', error)
            return { allowed: true, remaining: DAILY_LIMIT } // Fallback cho phép upload
        }
    }

    return { getTodayCount, checkAndIncrementUpload, DAILY_LIMIT }
}
