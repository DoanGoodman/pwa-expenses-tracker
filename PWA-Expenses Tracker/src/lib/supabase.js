import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// Supabase client với optimized config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Storage key để không conflict với các storage khác
        storageKey: 'qswings-auth-token',
    },
    // Disable realtime để giảm connection overhead
    realtime: {
        params: {
            eventsPerSecond: 1,
        },
    },
    global: {
        // Shorter fetch timeout (10s thay vì unlimited)
        fetch: (url, options = {}) => {
            return fetch(url, {
                ...options,
                // 10 second timeout for all requests
                signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : options.signal,
            })
        },
    },
})

/**
 * Warm-up ping - Gọi một request rất nhẹ để "đánh thức" Supabase connection
 * Call this early in app initialization
 */
export const warmUpSupabase = async () => {
    try {
        const start = Date.now()
        // Lightweight health check - just checks auth status, no DB query
        await supabase.auth.getSession()
        const elapsed = Date.now() - start
        console.log(`[Supabase] Warm-up completed in ${elapsed}ms`)
        return true
    } catch (error) {
        console.warn('[Supabase] Warm-up failed:', error.message)
        return false
    }
}

// Auto warm-up khi module được import (chạy song song với app load)
if (typeof window !== 'undefined') {
    // Defer warm-up để không block initial render
    setTimeout(() => {
        warmUpSupabase()
    }, 100)
}

// Note: Visibility change handling được thực hiện trong AuthContext
// Không cần xử lý ở đây nữa vì đã có localStorage cache cho data

// Demo data for development
export const demoData = {
    projects: [
        { id: '1', name: 'Dự án A - Chung cư Sunrise' },
        { id: '2', name: 'Dự án B - Biệt thự Riverside' },
        { id: '3', name: 'Dự án C - Nhà phố Green Valley' },
    ],
    categories: [
        { id: '1', name: 'Nhân công', icon: '👷' },
        { id: '2', name: 'Vật tư', icon: '🧱' },
        { id: '3', name: 'Thiết bị', icon: '🔧' },
        { id: '4', name: 'Vận chuyển', icon: '🚚' },
        { id: '5', name: 'Khác', icon: '📦' },
    ],
    expenses: [
        { id: '1', project_id: '1', category_id: '1', description: 'Tiền công thợ xây tuần 1', amount: 15000000, expense_date: '2026-01-05' },
        { id: '2', project_id: '1', category_id: '2', description: 'Xi măng INSEE 100 bao', amount: 8500000, expense_date: '2026-01-04' },
        { id: '3', project_id: '2', category_id: '3', description: 'Thuê máy trộn bê tông', amount: 3000000, expense_date: '2026-01-03' },
        { id: '4', project_id: '1', category_id: '1', description: 'Tiền công thợ điện', amount: 5500000, expense_date: '2026-01-02' },
        { id: '5', project_id: '3', category_id: '4', description: 'Vận chuyển cát đá', amount: 2200000, expense_date: '2026-01-01' },
        { id: '6', project_id: '2', category_id: '2', description: 'Gạch ốp lát nhập khẩu', amount: 22000000, expense_date: '2025-12-28' },
        { id: '7', project_id: '1', category_id: '5', description: 'Chi phí ăn uống công nhân', amount: 1800000, expense_date: '2025-12-25' },
        { id: '8', project_id: '3', category_id: '1', description: 'Thợ sơn nước', amount: 7500000, expense_date: '2025-12-20' },
        { id: '9', project_id: '2', category_id: '2', description: 'Thép Hòa Phát 20 tấn', amount: 45000000, expense_date: '2025-11-15' },
        { id: '10', project_id: '1', category_id: '3', description: 'Máy cắt gạch', amount: 4500000, expense_date: '2025-11-10' },
        { id: '11', project_id: '3', category_id: '1', description: 'Công thợ mộc', amount: 12000000, expense_date: '2025-10-25' },
        { id: '12', project_id: '2', category_id: '4', description: 'Vận chuyển thiết bị', amount: 3500000, expense_date: '2025-10-20' },
    ]
}

// Check if using demo mode
export const isDemoMode = () => {
    // Force demo mode if env var is set (useful for local dev/testing)
    if (import.meta.env.VITE_USE_DEMO === 'true') {
        return true
    }
    return supabaseUrl === 'https://your-project.supabase.co'
}
