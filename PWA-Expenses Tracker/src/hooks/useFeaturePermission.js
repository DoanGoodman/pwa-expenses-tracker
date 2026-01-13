import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const TELEGRAM_WORKER_URL = 'https://telegram-approval.qswings.workers.dev'

/**
 * Hook to manage feature permissions
 * @param {string} featureName - Feature to check permission for (default: 'receipt_scanner')
 * @returns {Object} - { status, requestAccess, loading, error, refetch }
 */
export function useFeaturePermission(featureName = 'receipt_scanner') {
    const [status, setStatus] = useState('loading') // 'loading' | 'none' | 'pending' | 'approved' | 'rejected'
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [requesting, setRequesting] = useState(false)

    // Fetch current permission status
    const fetchPermission = useCallback(async () => {
        try {
            setLoading(true)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setStatus('none')
                setLoading(false)
                return
            }

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
    }, [featureName])

    // Request access to feature
    const requestAccess = useCallback(async () => {
        try {
            setRequesting(true)
            setError(null)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                throw new Error('User not authenticated')
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

            setStatus('pending')
            return { success: true }
        } catch (err) {
            console.error('Error requesting access:', err)
            setError(err.message)
            return { success: false, error: err.message }
        } finally {
            setRequesting(false)
        }
    }, [featureName])

    // Initial fetch
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
