import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
    const fetchProfile = useCallback(async (userId, retryCount = 0) => {
        console.log('fetchProfile called with userId:', userId, 'retry:', retryCount)
        if (!userId) {
            setProfile(null)
            setUserRole(null)
            return
        }

        try {
            // Timeout 2 giây cho mỗi attempt
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
            )

            // Sử dụng RPC function thay vì query trực tiếp (bypass RLS)
            const queryPromise = supabase.rpc('get_my_profile', { user_id: userId }).single()

            const { data, error } = await Promise.race([queryPromise, timeoutPromise])

            console.log('fetchProfile result:', { data, error })

            if (error) {
                console.error('Error fetching profile:', error)
                // Fallback: thử query trực tiếp nếu RPC không tồn tại
                if (error.code === 'PGRST202') {
                    console.log('RPC not found, falling back to direct query')
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
                // Nếu chưa có profile, mặc định là owner
                setUserRole('owner')
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

            // For Staff: Check if they still have a parent (not deleted)
            if (data?.role === 'staff') {
                // Staff without parent_id means they've been removed by owner
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
            console.log('userRole set to:', data?.role || 'owner')
        } catch (err) {
            // Chỉ log warning cho timeout (không phải error nghiêm trọng)
            if (err.message === 'Profile fetch timeout') {
                console.warn('fetchProfile timeout, retry:', retryCount)
            } else {
                console.error('Error in fetchProfile:', err)
            }

            // Retry 2 lần sau 500ms nếu timeout
            if (retryCount < 2 && err.message === 'Profile fetch timeout') {
                await new Promise(resolve => setTimeout(resolve, 500))
                return fetchProfile(userId, retryCount + 1)
            }

            // Timeout hoặc lỗi khác - nếu đã có cache thì không cần set mặc định
            if (!userRole) {
                setUserRole('owner')
            }
        }
    }, [])

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
                        console.log('Using cached profile, role:', userRole)
                        setLoading(false)
                        // Verify lại profile sau (không block UI)
                        fetchProfile(currentUser.id).catch(console.error)
                    } else {
                        // Không có cache - phải fetch và đợi
                        // Delay 1 giây để đợi session token được verify với RLS
                        await new Promise(resolve => setTimeout(resolve, 1000))
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

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null
                setUser(currentUser)

                // Update cache
                if (currentUser?.id) {
                    setUserIdCache(currentUser.id)
                } else {
                    clearUserIdCache()
                }

                if (currentUser) {
                    await fetchProfile(currentUser.id)
                } else {
                    setProfile(null)
                    setUserRole(null)
                }
            }
        )

        return () => {
            subscription.unsubscribe()
            clearTimeout(safetyTimeout)
        }
    }, [fetchProfile])

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
