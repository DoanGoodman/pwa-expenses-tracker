import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'
import { clearUserIdCache, setUserIdCache } from '../hooks/useSupabase'

const AuthContext = createContext({})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(() => {
        // Load cached profile từ localStorage
        try {
            const cached = localStorage.getItem('cached_profile')
            return cached ? JSON.parse(cached) : null
        } catch {
            return null
        }
    })
    const [userRole, setUserRole] = useState(() => {
        // Load cached role từ localStorage
        try {
            return localStorage.getItem('cached_user_role') || null
        } catch {
            return null
        }
    })
    const [loading, setLoading] = useState(true)

    // Refs để tránh duplicate fetch và infinite loop
    const isFetchingRef = useRef(false)
    const lastFetchTimeRef = useRef(0)
    const lastUserIdRef = useRef(null)
    const userRoleRef = useRef(userRole)
    const retryCountRef = useRef(0)
    const maxRetries = 3
    const staleTimeMs = 5 * 60 * 1000 // 5 phút - không fetch lại nếu profile mới hơn 5 phút

    // Helper: Save profile to cache
    const cacheProfile = (profileData, role) => {
        try {
            if (profileData) {
                localStorage.setItem('cached_profile', JSON.stringify(profileData))
            } else {
                localStorage.removeItem('cached_profile')
            }
            if (role) {
                localStorage.setItem('cached_user_role', role)
            } else {
                localStorage.removeItem('cached_user_role')
            }
        } catch (e) {
            console.error('Error caching profile:', e)
        }
    }

    // Helper: Clear ALL app caches when logout to avoid conflicts when switching accounts
    const clearAllAppCaches = () => {
        const cacheKeys = [
            'cached_profile',
            'cached_user_role',
            'projects_cache',
            'categories_cache',
            'expenses_cache',
            'cached_staff_list',
            'cached_staff_assignments',
            'dashboard_stats_',
            'feature_permission_'
        ]
        
        try {
            // Clear exact matches
            cacheKeys.forEach(key => {
                if (!key.endsWith('_')) {
                    localStorage.removeItem(key)
                }
            })
            
            // Clear keys that start with prefix (like dashboard_stats_xxx)
            const keysToRemove = []
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && cacheKeys.some(prefix => prefix.endsWith('_') && key.startsWith(prefix))) {
                    keysToRemove.push(key)
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key))
            
            console.log('[AuthContext] Cleared all app caches')
        } catch (e) {
            console.error('Error clearing app caches:', e)
        }
    }

    /**
     * Fetch user profile với đầy đủ cơ chế bảo vệ:
     * - Fetching lock (prevent concurrent calls)
     * - Stale-time check (5 phút)
     * - Exponential backoff retry (max 3 lần)
     * - Proper error/timeout handling
     * 
     * @param {string} userId - User ID to fetch
     * @param {object} options - { fromVisibilityChange: boolean, forceRefresh: boolean }
     */
    const fetchProfile = useCallback(async (userId, options = {}) => {
        console.log('[AuthContext] 🔵 fetchProfile START - userId:', userId, 'options:', options)

        const { fromVisibilityChange = false, forceRefresh = false } = options

        if (!userId) {
            console.warn('[AuthContext] ⚠️ No userId provided, aborting')
            return
        }

        const now = Date.now()

        // === GUARD 1: Stale-time check (5 phút) ===
        // Nếu gọi từ visibility change và profile còn mới, skip
        if (fromVisibilityChange && !forceRefresh) {
            if (lastUserIdRef.current === userId && now - lastFetchTimeRef.current < staleTimeMs) {
                console.log('[AuthContext] Profile still fresh, skipping fetch on visibility change')
                // Đảm bảo userRole có giá trị nếu skip
                if (!userRoleRef.current) {
                    console.log('[AuthContext] Setting fallback role: owner (fresh profile)')
                    setUserRole('owner')
                }
                return
            }
        }

        // === GUARD 2: Short debounce (2 giây) để tránh spam ===
        if (lastUserIdRef.current === userId && now - lastFetchTimeRef.current < 2000 && !forceRefresh) {
            console.log('[AuthContext] Debounce: Too soon since last fetch')
            // Đảm bảo userRole có giá trị nếu skip
            if (!userRoleRef.current) {
                console.log('[AuthContext] Setting fallback role: owner (debounce)')
                setUserRole('owner')
            }
            return
        }

        // === GUARD 3: Fetching lock (prevent concurrent) ===
        if (isFetchingRef.current) {
            console.log('[AuthContext] ⏭️ Already fetching, ignoring duplicate call')
            return
        }

        // === GUARD 4: Max retry limit ===
        if (retryCountRef.current >= maxRetries) {
            console.error('[AuthContext] ❌ Max retries reached, stopping')
            setLoading(false)
            // Ensure role is set even on max retry
            if (!userRoleRef.current) {
                console.log('[AuthContext] Setting fallback role: owner (max retry)')
                setUserRole('owner')
            }
            retryCountRef.current = 0
            return
        }

        // Lock fetch để ngăn duplicate
        isFetchingRef.current = true
        lastUserIdRef.current = userId

        // Timeout sau 15 giây (tăng từ 10s -> 15s để tránh timeout mạng chậm)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
            console.warn('[AuthContext] ⏰ Fetch timeout, aborting...')
            controller.abort()
        }, 15000)

        try {
            console.log('[AuthContext] 🔍 Querying profiles table...')
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
                .abortSignal(controller.signal)

            clearTimeout(timeoutId)

            if (error) {
                console.error('[AuthContext] ❌ Profiles query error:', error.message, error.code)
                throw error
            }

            console.log('[AuthContext] ✅ Profiles data received:', { id: data?.id, role: data?.role, is_active: data?.is_active })

            // Check if account is disabled
            if (data?.is_active === false) {
                console.warn('Account is disabled, logging out...')
                alert('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.')
                await supabase.auth.signOut()
                return
            }

            // For Staff: Check if they still have a parent
            if (data?.role === 'staff') {
                console.log('[AuthContext] 👤 Staff detected, checking parent status...')

                if (!data?.parent_id) {
                    console.warn('Staff account has no parent, logging out...')
                    alert('Tài khoản của bạn đã bị xóa khỏi hệ thống hệ thống. Vui lòng liên hệ quản trị viên.')
                    await supabase.auth.signOut()
                    return
                }

                // Check if parent (owner) is also active using RPC function (bypasses RLS)
                try {
                    console.log('[AuthContext] Checking parent is_active via RPC...')
                    // Create a promise race to prevent RPC from hanging indefinitely
                    const rpcPromise = supabase.rpc('check_parent_is_active')
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('RPC_TIMEOUT')), 5000)
                    )

                    const result = await Promise.race([rpcPromise, timeoutPromise])
                    const { data: isActive, error: rpcError } = result || {}

                    if (rpcError) throw rpcError

                    if (isActive === false) {
                        console.warn('Parent account is disabled, logging out staff...')
                        alert('Tài khoản chủ sở hữu đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.')
                        await supabase.auth.signOut()
                        return
                    }
                    console.log('[AuthContext] ✅ Parent status OK')
                } catch (rpcErr) {
                    // If function doesn't exist yet or times out, skip check
                    console.warn(`[AuthContext] ⚠️ check_parent_is_active warning: ${rpcErr.message || rpcErr}`)
                    // Continue anyway - don't block login on RPC error
                }
            }

            const determinedRole = data?.role || 'owner'
            console.log('[AuthContext] 🎯 Setting user role:', determinedRole)
            setProfile(data)  // Set profile state với data từ DB (bao gồm parent_id cho staff)
            setUserRole(determinedRole)
            cacheProfile(data, determinedRole)
            lastFetchTimeRef.current = Date.now()
            retryCountRef.current = 0 // Reset retry count on success

        } catch (err) {
            clearTimeout(timeoutId)
            console.error('[AuthContext] ❌ fetchProfile caught error:', err.name, err.message)

            // Handle abort (timeout)
            if (err.name === 'AbortError') {
                console.warn(`[AuthContext] ⏰ fetchProfile timeout (attempt ${retryCountRef.current + 1}/${maxRetries})`)
                retryCountRef.current++

                // === EXPONENTIAL BACKOFF RETRY ===
                if (retryCountRef.current < maxRetries && !fromVisibilityChange) {
                    const backoffDelay = Math.pow(2, retryCountRef.current) * 1000 // 2s, 4s, 8s
                    console.log(`[AuthContext] 🔄 Retrying in ${backoffDelay}ms...`)

                    // Release lock before retry
                    isFetchingRef.current = false

                    await new Promise(resolve => setTimeout(resolve, backoffDelay))
                    return fetchProfile(userId, { fromVisibilityChange, forceRefresh })
                } else {
                    console.error('[AuthContext] ❌ All retry attempts failed or skipped for visibility change')
                }
            }

            // === ALWAYS SET FALLBACK ROLE IN ERROR CASE ===
            const fallbackRole = 'owner'
            console.log('[AuthContext] 🔧 Setting fallback role:', fallbackRole, '(error recovery)')
            setUserRole(fallbackRole)

        } finally {
            console.log('[AuthContext] 🏁 fetchProfile FINALLY - releasing lock and stopping loading')
            // === ALWAYS release lock and stop loading ===
            isFetchingRef.current = false
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sync userRoleRef với userRole state
    useEffect(() => {
        console.log('[AuthContext] 📝 userRole state changed:', userRole)
        userRoleRef.current = userRole
    }, [userRole])

    useEffect(() => {
        // Check for demo mode
        if (isDemoMode()) {
            // Check localStorage for demo user
            const demoUser = localStorage.getItem('demo_user')
            if (demoUser) {
                const parsedUser = JSON.parse(demoUser)
                setUser(parsedUser)
                setUserRole('owner') // Demo user is always owner
            }
            setLoading(false)
            return
        }

        // Get initial session
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Error getting session:', error)
                    setLoading(false)
                    return
                }

                const currentUser = session?.user ?? null
                setUser(currentUser)

                // Set cache cho hooks sử dụng
                if (currentUser?.id) {
                    setUserIdCache(currentUser.id)
                }

                if (currentUser) {
                    // Kiểm tra cache có hợp lệ không
                    const cachedProfile = profile
                    const hasCachedProfile = cachedProfile && cachedProfile.id === currentUser.id

                    if (hasCachedProfile && userRole) {
                        // Cache hợp lệ - set loading false ngay lập tức
                        console.log('[AuthContext] Using cached profile, role:', userRole)
                        setLoading(false)
                    } else {
                        // Không có cache - fetch profile
                        await fetchProfile(currentUser.id)

                        // Đảm bảo userRole có giá trị sau fetchProfile
                        // (Trong trường hợp fetchProfile bị skip hoặc fail)
                        if (!userRoleRef.current) {
                            console.log('[AuthContext] userRole still null after fetchProfile, defaulting to owner')
                            setUserRole('owner')
                        }
                    }
                }
            } catch (err) {
                console.error('Error in getSession:', err)
            } finally {
                setLoading(false)
            }
        }

        getSession()

        // Safety timeout: nếu sau 10 giây vẫn loading và chưa có userRole, force set
        const safetyTimeout = setTimeout(() => {
            // Chỉ trigger nếu đang trong trạng thái loading thực sự và chưa có userRole
            if (!userRoleRef.current) {
                console.warn('[AuthContext] ⚠️ Safety timeout triggered - forcing loading to false')
                setLoading(false)
                // Nếu có cached profile nhưng chưa set user, try to recover
                const cachedProfile = localStorage.getItem('cached_profile')
                if (cachedProfile) {
                    try {
                        const parsed = JSON.parse(cachedProfile)
                        console.log('[AuthContext] Recovering user from cached profile:', parsed.id)
                        const cachedRole = localStorage.getItem('cached_user_role') || 'owner'
                        setUserRole(cachedRole)
                    } catch (e) {
                        console.error('[AuthContext] Failed to recover from cache:', e)
                        // Set default role to avoid infinite loading
                        setUserRole('owner')
                    }
                } else {
                    // No cache, set default role
                    setUserRole('owner')
                }
            }
        }, 10000)

        // Listen for auth changes (chỉ handle SIGNED_IN và SIGNED_OUT)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Bỏ qua INITIAL_SESSION vì getSession đã handle
                // Bỏ qua TOKEN_REFRESHED vì không cần fetch lại profile
                if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                    return
                }

                const currentUser = session?.user ?? null
                setUser(currentUser)

                // Update cache
                if (currentUser?.id) {
                    setUserIdCache(currentUser.id)
                } else {
                    clearUserIdCache()
                }

                if (event === 'SIGNED_IN' && currentUser) {
                    setLoading(true)  // Set loading khi bắt đầu fetch
                    await fetchProfile(currentUser.id)
                } else if (event === 'SIGNED_OUT') {
                    // Clear all caches to avoid conflicts when switching accounts
                    clearAllAppCaches()
                    clearUserIdCache()
                    
                    // Reset all refs
                    isFetchingRef.current = false
                    lastFetchTimeRef.current = 0
                    lastUserIdRef.current = null
                    retryCountRef.current = 0
                    
                    setProfile(null)
                    setUserRole(null)
                }
            }
        )

        // Visibility change handler: Check session khi tab resume từ sleep
        // Nếu refresh token invalid, tự động logout
        let lastVisibilityTime = Date.now()
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const hiddenDuration = Date.now() - lastVisibilityTime

                // Nếu hidden quá 5 phút, check session
                if (hiddenDuration > 5 * 60 * 1000) {
                    console.log('[AuthContext] Tab was hidden for', Math.round(hiddenDuration / 1000 / 60), 'minutes - checking session...')

                    try {
                        // Thử refresh session
                        const { data, error } = await supabase.auth.getSession()

                        if (error) {
                            console.error('[AuthContext] Session check failed:', error)

                            // Nếu lỗi liên quan đến refresh token
                            if (error.message?.includes('Refresh Token') ||
                                error.message?.includes('refresh_token') ||
                                error.message?.includes('Invalid') ||
                                error.message?.includes('expired')) {
                                console.warn('[AuthContext] Refresh token invalid - logging out')

                                // Clear tất cả cache và logout
                                localStorage.removeItem('cached_profile')
                                localStorage.removeItem('cached_user_role')
                                localStorage.removeItem('projects_cache')
                                localStorage.removeItem('categories_cache')
                                clearUserIdCache()

                                // Sign out
                                await supabase.auth.signOut()

                                setUser(null)
                                setProfile(null)
                                setUserRole(null)

                                // Không alert - chỉ redirect về login page
                                // App sẽ tự động redirect thông qua ProtectedRoute
                            }
                        } else if (!data.session) {
                            // Không có session - user đã logout
                            console.log('[AuthContext] No session found after resume')
                            setUser(null)
                            setProfile(null)
                            setUserRole(null)
                        }
                    } catch (err) {
                        console.error('[AuthContext] Error checking session:', err)
                    }
                }

                lastVisibilityTime = Date.now()
            } else {
                lastVisibilityTime = Date.now()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            subscription.unsubscribe()
            clearTimeout(safetyTimeout)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sign up with email
    const signUp = async (email, password) => {
        if (isDemoMode()) {
            const demoUser = {
                id: 'demo-user-' + Date.now(),
                email,
                user_metadata: { full_name: email.split('@')[0] }
            }
            localStorage.setItem('demo_user', JSON.stringify(demoUser))
            setUser(demoUser)
            return { success: true }
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        })

        if (error) {
            return { success: false, error: error.message }
        }
        return { success: true, data }
    }

    // Sign in with email
    const signIn = async (email, password) => {
        if (isDemoMode()) {
            const demoUser = {
                id: 'demo-user-' + Date.now(),
                email,
                user_metadata: { full_name: email.split('@')[0] }
            }
            localStorage.setItem('demo_user', JSON.stringify(demoUser))
            setUser(demoUser)
            return { success: true }
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            return { success: false, error: error.message }
        }
        return { success: true, data }
    }

    // Sign out - optimized for faster UI response
    const signOut = async () => {
        // Clear all caches ngay lập tức để tránh xung đột khi login tài khoản khác
        clearAllAppCaches()
        clearUserIdCache()
        
        // Reset refs
        isFetchingRef.current = false
        lastFetchTimeRef.current = 0
        lastUserIdRef.current = null
        retryCountRef.current = 0

        // Clear state ngay lập tức để UI phản hồi nhanh
        setUser(null)
        setProfile(null)
        setUserRole(null)

        if (isDemoMode()) {
            localStorage.removeItem('demo_user')
            return { success: true }
        }

        // Gọi API sau (không block UI)
        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
        return { success: true }
    }

    // Sign in with Google
    const signInWithGoogle = async () => {
        if (isDemoMode()) {
            const demoUser = {
                id: 'demo-google-user-' + Date.now(),
                email: 'demo@gmail.com',
                user_metadata: { full_name: 'Demo Google User', avatar_url: '' }
            }
            localStorage.setItem('demo_user', JSON.stringify(demoUser))
            setUser(demoUser)
            return { success: true }
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        })

        if (error) {
            return { success: false, error: error.message }
        }
        return { success: true }
    }

    // Reset password - send email
    const resetPasswordForEmail = async (email) => {
        if (isDemoMode()) {
            return { success: true, message: 'Demo mode: Email sent (simulated)' }
        }

        // Tự động lấy tên miền hiện tại (localhost hoặc production)
        const redirectUrl = `${window.location.origin}/reset-password`

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        })

        if (error) {
            return { success: false, error: error.message }
        }
        return { success: true }
    }

    // Update password
    const updatePassword = async (newPassword) => {
        if (isDemoMode()) {
            return { success: true, message: 'Demo mode: Password updated (simulated)' }
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (error) {
            return { success: false, error: error.message }
        }
        return { success: true }
    }

    const value = {
        user,
        profile,
        userRole,
        loading,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        resetPasswordForEmail,
        updatePassword,
        isAuthenticated: !!user,
        isOwner: userRole === 'owner',
        isStaff: userRole === 'staff',
        refetchProfile: () => fetchProfile(user?.id),
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
