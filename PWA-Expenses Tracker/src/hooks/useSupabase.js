import { useState, useEffect, useCallback } from 'react'
import { supabase, demoData, isDemoMode } from '../lib/supabase'

// Helper function to get current user ID
const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
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

    const fetchProjects = useCallback(async () => {
        if (isDemoMode()) {
            setProjects(demoData.projects)
            setLoading(false)
            return
        }

        try {
            const userId = await getCurrentUserId()
            if (!userId) {
                setProjects([])
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', userId)
                .order('name')

            if (error) throw error
            setProjects(data || [])
        } catch (error) {
            console.error('Error fetching projects:', error)
            alert('Lỗi tải danh sách dự án: ' + error.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProjects()
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
                .eq('user_id', userId)
                .ilike('name', trimmedName)

            if (error) throw error

            return data && data.length > 0
        } catch (error) {
            console.error('Error checking project existence:', error)
            return false
        }
    }

    return { projects, loading, addProject, checkProjectExists, refetch: fetchProjects }
}

// Hook để lấy danh sách categories
export const useCategories = () => {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            if (isDemoMode()) {
                setCategories(demoData.categories)
                setLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('*')
                    .order('id')

                if (error) throw error
                setCategories(data || [])
            } catch (error) {
                console.error('Error fetching categories:', error)
                alert('Lỗi tải danh mục: ' + error.message)
            } finally {
                setLoading(false)
            }
        }

        fetchCategories()
    }, [])

    return { categories, loading }
}

// Hook để lấy danh sách expenses với filter (filtered by user_id)
// Supports: projectId, categoryIds (array), startMonth, endMonth, search, sortOption
export const useExpenses = (filters = {}) => {
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchExpenses = useCallback(async () => {
        setLoading(true)

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
            const userId = await getCurrentUserId()
            if (!userId) {
                setExpenses([])
                setLoading(false)
                return
            }

            // 1. Build query with user_id filter
            let query = supabase
                .from('expenses')
                .select('*')
                .eq('user_id', userId)
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

            const { data: expensesData, error: expensesError } = await query

            if (expensesError) throw expensesError

            if (expensesData) {
                // 2. Fetch Projects and Categories for manual join
                const [projectsResponse, categoriesResponse] = await Promise.all([
                    supabase.from('projects').select('id, name').eq('user_id', userId),
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

                setExpenses(enriched)
            }
        } catch (error) {
            console.error('Error fetching expenses:', error)
            alert('Lỗi tải chi phí: ' + error.message)
        } finally {
            setLoading(false)
        }
    }, [filters.projectId, filters.categoryId, filters.categoryIds, filters.month, filters.startMonth, filters.endMonth, filters.search, filters.sortOption])

    useEffect(() => {
        fetchExpenses()
    }, [fetchExpenses])

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
            const insertData = {
                date: expenseData.expense_date || expenseData.date || new Date().toISOString(),
                project_id: parseInt(expenseData.project_id),
                category_id: parseInt(expenseData.category_id),
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
            // Step 1: Update last_change_reason BEFORE deleting (for trigger/audit)
            if (reason) {
                await supabase
                    .from('expenses')
                    .update({ last_change_reason: reason })
                    .eq('id', id)
            }

            // Step 2: Perform the actual delete
            const { error } = await supabase
                .from('expenses')
                .delete()
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
export const useDashboardStats = (startMonth, endMonth, projectId = null) => {
    const [stats, setStats] = useState({
        total: 0,
        byCategory: [],
        byMonth: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const calculateStats = async () => {
            setLoading(true)

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
                const userId = await getCurrentUserId()
                if (!userId) {
                    setStats({ total: 0, byCategory: [], byMonth: [] })
                    setLoading(false)
                    return
                }

                // Build query with filters
                let query = supabase
                    .from('expenses')
                    .select('*')
                    .eq('user_id', userId)

                if (startMonth && endMonth) {
                    const lastDay = getLastDayOfMonth(endMonth)
                    query = query.gte('date', `${startMonth}-01T00:00:00`)
                    query = query.lte('date', `${endMonth}-${String(lastDay).padStart(2, '0')}T23:59:59`)
                }

                if (projectId) {
                    query = query.eq('project_id', projectId)
                }

                const { data: expensesData, error } = await query

                if (error) throw error

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

                setStats({ total, byCategory, byMonth })
            } catch (error) {
                console.error('Error calculating dashboard stats:', error)
                alert('Lỗi tải thống kê: ' + error.message)
            } finally {
                setLoading(false)
            }
        }

        calculateStats()
    }, [startMonth, endMonth, projectId])

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

            // Add user_id to each expense
            const dataWithUserId = expensesArray.map(expense => ({
                ...expense,
                user_id: userId
            }))

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
