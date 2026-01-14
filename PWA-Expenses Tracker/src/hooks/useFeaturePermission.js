import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TELEGRAM_WORKER_URL = 'https://telegram-approval.aiqswings87.workers.dev'

/**
 * Hook to manage feature permissions
 * @param {string} featureName - Feature to check permission for (default: 'receipt_scanner')
 * @returns {Object} - { status, requestAccess, loading, error, refetch }
 */
export function useFeaturePermission(featureName = 'receipt_scanner') {
    const { user, profile, isStaff } = useAuth()
    const [status, setStatus] = useState('loading') // 'loading' | 'none' | 'pending' | 'approved' | 'rejected'
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [requesting, setRequesting] = useState(false)

    // Fetch current permission status
    const fetchPermission = useCallback(async () => {
        try {
            setLoading(true)

            if (!user) {
                setStatus('none')
                setLoading(false)
                return
            }

            // Demo mode - auto approve for demo users
            if (isDemoMode()) {
                setStatus('approved')
                setLoading(false)
                return
            }

            // Nếu là staff (tài khoản con), check quyền của parent trước
            if (isStaff && profile?.parent_id) {
                const { data: parentPermission, error: parentError } = await supabase
                    .from('feature_permissions')
                    .select('status')
                    .eq('user_id', profile.parent_id)
                    .eq('feature_name', featureName)
                    .single()

                if (!parentError && parentPermission?.status === 'approved') {
                    // Parent có quyền -> con cũng có quyền
                    setStatus('approved')
                    setLoading(false)
                    return
                }
            }

            // Check quyền của chính user
            const { data, error: fetchError } = await supabase
                .from('feature_permissions')
                .select('status')
                .eq('user_id', user.id)
                .eq('feature_name', featureName)
                .single()

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    // No record found - user hasn't requested yet
                    setStatus('none')
                } else {
                    throw fetchError
                }
            } else {
                setStatus(data.status)
            }
        } catch (err) {
            console.error('Error fetching permission:', err)
            setError(err.message)
            setStatus('none')
        } finally {
            setLoading(false)
        }
    }, [featureName, user, profile, isStaff])

    // Request access to feature
    const requestAccess = useCallback(async () => {
        try {
            setRequesting(true)
            setError(null)

            if (!user) {
                throw new Error('User not authenticated')
            }

            // Demo mode - auto approve
            if (isDemoMode()) {
                setStatus('approved')
                return { success: true }
            }

            // Insert or update permission request
            const { error: insertError } = await supabase
                .from('feature_permissions')
                .upsert({
                    user_id: user.id,
                    feature_name: featureName,
                    status: 'pending',
                    requested_at: new Date().toISOString(),
                    user_email: user.email
                }, {
                    onConflict: 'user_id,feature_name'
                })

            if (insertError) throw insertError

            // Notify admin via Telegram
            try {
                const notifyResponse = await fetch(`${TELEGRAM_WORKER_URL}/notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        userEmail: user.email,
                        featureName: featureName
                    })
                })

                if (!notifyResponse.ok) {
                    console.warn('Failed to send Telegram notification')
                }
            } catch (telegramError) {
                console.warn('Telegram notification failed:', telegramError)
            }

            setStatus('pending')
            return { success: true }
        } catch (err) {
            console.error('Error requesting access:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setRequesting(false)
        }
    }, [featureName, user])

    // Fetch permission when user changes
    useEffect(() => {
        fetchPermission()
    }, [fetchPermission])

    return {
        status,
        loading,
        error,
        requesting,
        requestAccess,
        refetch: fetchPermission,
        isApproved: status === 'approved'
    }
}

export default useFeaturePermission
