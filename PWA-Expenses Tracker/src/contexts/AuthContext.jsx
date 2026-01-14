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
    const [profile, setProfile] = useState(null)
    const [userRole, setUserRole] = useState(null) // 'owner' | 'staff' | null
    const [loading, setLoading] = useState(true)

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
                        return
                    }
                }
                // Nếu chưa có profile, mặc định là owner
                setUserRole('owner')
                return
            }

            setProfile(data)
            setUserRole(data?.role || 'owner')
            console.log('userRole set to:', data?.role || 'owner')
        } catch (err) {
            console.error('Error in fetchProfile:', err)

            // Retry 2 lần sau 500ms nếu timeout
            if (retryCount < 2 && err.message === 'Profile fetch timeout') {
                console.log('Retrying fetchProfile after delay... attempt', retryCount + 1)
                await new Promise(resolve => setTimeout(resolve, 500))
                return fetchProfile(userId, retryCount + 1)
            }

            // Timeout hoặc lỗi khác, mặc định là owner
            setUserRole('owner')
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
                    // Delay 1 giây để đợi session token được verify với RLS
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    await fetchProfile(currentUser.id)
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

    // Sign out
    const signOut = async () => {
        // Clear cached user ID
        clearUserIdCache()

        if (isDemoMode()) {
            localStorage.removeItem('demo_user')
            setUser(null)
            setProfile(null)
            setUserRole(null)
            return { success: true }
        }

        const { error } = await supabase.auth.signOut()
        if (error) {
            return { success: false, error: error.message }
        }
        setUser(null)
        setProfile(null)
        setUserRole(null)
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
