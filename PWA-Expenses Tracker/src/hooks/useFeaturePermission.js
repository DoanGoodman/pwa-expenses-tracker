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

            // Nếu là staff (tài khoản con), check quyền và trạng thái của parent trước
            if (isStaff && profile?.parent_id) {
                console.log('[useFeaturePermission] Staff detected, checking parent permission...', {
                    staffId: user.id,
                    parentId: profile.parent_id
                })

                // Check if parent is active
                const { data: parentProfile, error: parentProfileError } = await supabase
                    .from('profiles')
                    .select('is_active')
                    .eq('id', profile.parent_id)
                    .maybeSingle()  // Use maybeSingle instead of single

                if (parentProfileError) {
                    console.warn('[useFeaturePermission] Error checking parent profile:', parentProfileError)
                }

                if (!parentProfileError && parentProfile?.is_active === false) {
                    // Parent bị vô hiệu hóa -> Staff không có quyền
                    console.log('[useFeaturePermission] Parent is inactive, denying access')
                    setStatus('none')
                    setLoading(false)
                    return
                }

                // Check parent's permission for this feature
                // Use maybeSingle() to handle case where no record exists
                const { data: parentPermission, error: parentError } = await supabase
                    .from('feature_permissions')
                    .select('status')
                    .eq('user_id', profile.parent_id)
                    .eq('feature_name', featureName)
                    .maybeSingle()  // Use maybeSingle instead of single

                console.log('[useFeaturePermission] Parent permission query result:', {
                    parentPermission,
                    parentError: parentError?.message
                })

                if (parentError) {
                    console.warn('[useFeaturePermission] Error checking parent permission:', parentError)
                    // Continue to check own permission instead of failing
                }

                if (parentPermission?.status === 'approved') {
                    // Parent có quyền -> con cũng có quyền
                    console.log('[useFeaturePermission] Parent has approved permission, granting access to staff')
                    setStatus('approved')
                    setLoading(false)
                    return
                }

                // Parent không có quyền hoặc chưa request -> Staff cũng không có
                // Không cần check tiếp quyền của chính staff vì staff không tự request được
                console.log('[useFeaturePermission] Parent does not have approved permission')
                setStatus('none')
                setLoading(false)
                return
            }

            // Check quyền của chính user (for Owner accounts)
            console.log('[useFeaturePermission] Checking own permission for user:', user.id)
            const { data, error: fetchError } = await supabase
                .from('feature_permissions')
                .select('status')
                .eq('user_id', user.id)
                .eq('feature_name', featureName)
                .maybeSingle()  // Use maybeSingle instead of single

            console.log('[useFeaturePermission] Own permission query result:', {
                data,
                fetchError: fetchError?.message
            })

            if (fetchError) {
                console.error('[useFeaturePermission] Error fetching own permission:', fetchError)
                setStatus('none')
            } else if (data) {
                setStatus(data.status)
            } else {
                // No record found - user hasn't requested yet
                setStatus('none')
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
