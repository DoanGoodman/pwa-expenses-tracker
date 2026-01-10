import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'

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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check for demo mode
        if (isDemoMode()) {
            // Check localStorage for demo user
            const demoUser = localStorage.getItem('demo_user')
            if (demoUser) {
                setUser(JSON.parse(demoUser))
            }
            setLoading(false)
            return
        }

        // Get initial session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            setLoading(false)
        }

        getSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null)
            }
        )

        return () => subscription.unsubscribe()
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

    // Sign out
    const signOut = async () => {
        if (isDemoMode()) {
            localStorage.removeItem('demo_user')
            setUser(null)
            return { success: true }
        }

        const { error } = await supabase.auth.signOut()
        if (error) {
            return { success: false, error: error.message }
        }
        setUser(null)
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
        loading,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        resetPasswordForEmail,
        updatePassword,
        isAuthenticated: !!user
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
