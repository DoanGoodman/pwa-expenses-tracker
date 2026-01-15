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

    // Fetch user profile using RPC function (bypass RLS for faster fetch)
    // SIMPLIFIED VERSION: No timeout race, no retry logic - just simple await
    const fetchProfile = useCallback(async (userId) => {
        if (!userId) {
            setProfile(null)
            setUserRole(null)
            return
        }

        // Strong debounce: Không fetch lại nếu vừa fetch trong 10 giây
        const now = Date.now()
        if (lastUserIdRef.current === userId && now - lastFetchTimeRef.current < 10000) {
            return
        }

        // Block concurrent fetches
        if (isFetchingRef.current) {
            return
        }

        isFetchingRef.current = true
        lastUserIdRef.current = userId
        lastFetchTimeRef.current = now

        try {
            // Simple await - no Promise.race (which was buggy with Supabase)
            const { data, error } = await supabase
                .rpc('get_my_profile', { user_id: userId })
                .single()

            if (error) {
                // Fallback: direct query if RPC doesn't exist
                if (error.code === 'PGRST202') {
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single()

                    if (!fallbackError && fallbackData) {
                        setProfile(fallbackData)
                        setUserRole(fallbackData?.role || 'owner')
                        cacheProfile(fallbackData, fallbackData?.role || 'owner')
                        return
                    }
                }
                // Default to owner if no profile
                if (!userRoleRef.current) {
                    setUserRole('owner')
                }
                return
            }

            setProfile(data)

            // Check if account is disabled
            if (data?.is_active === false) {
                console.warn('Account is disabled, logging out...')
                alert('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.')
                await supabase.auth.signOut()
                return
            }

            // For Staff: Check if they still have a parent
            if (data?.role === 'staff') {
                if (!data?.parent_id) {
                    console.warn('Staff account has no parent, logging out...')
                    alert('Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ quản trị viên.')
                    await supabase.auth.signOut()
                    return
                }

                // Check if parent (owner) is also active
                const { data: parentData, error: parentError } = await supabase
                    .from('profiles')
                    .select('is_active')
                    .eq('id', data.parent_id)
                    .single()

                if (!parentError && parentData?.is_active === false) {
                    console.warn('Parent account is disabled, logging out staff...')
                    alert('Tài khoản chủ sở hữu đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.')
                    await supabase.auth.signOut()
                    return
                }
            }

            setUserRole(data?.role || 'owner')
            cacheProfile(data, data?.role || 'owner')
        } catch (err) {
            console.error('Error in fetchProfile:', err)
            // Use cached role or default to owner
            if (!userRoleRef.current) {
                setUserRole('owner')
            }
        } finally {
            isFetchingRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sync userRoleRef với userRole state
    useEffect(() => {
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
                        setLoading(false)
                    } else {
                        // Không có cache - fetch profile
                        await fetchProfile(currentUser.id)
                    }
                }
            } catch (err) {
                console.error('Error in getSession:', err)
            } finally {
                setLoading(false)
            }
        }

        getSession()

        // Safety timeout: nếu sau 5 giây vẫn loading, force set loading = false
        const safetyTimeout = setTimeout(() => {
            setLoading(false)
        }, 5000)

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
                    await fetchProfile(currentUser.id)
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null)
                    setUserRole(null)
                }
            }
        )

        return () => {
            subscription.unsubscribe()
            clearTimeout(safetyTimeout)
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
        // Clear cached user ID ngay lập tức
        clearUserIdCache()

        // Clear state và cache ngay lập tức để UI phản hồi nhanh
        setUser(null)
        setProfile(null)
        setUserRole(null)
        cacheProfile(null, null)

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
