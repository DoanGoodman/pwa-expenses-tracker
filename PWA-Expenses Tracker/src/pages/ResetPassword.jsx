import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/**
 * ResetPassword - Trang đặt lại mật khẩu
 * Người dùng truy cập từ link trong email
 */
const ResetPassword = () => {
    const navigate = useNavigate()
    const { updatePassword, user } = useAuth()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Auto redirect after success
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                navigate('/login', { replace: true })
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [success, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validate password match
        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp')
            return
        }

        // Validate password length
        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự')
            return
        }

        setLoading(true)

        try {
            const result = await updatePassword(password)

            if (result.success) {
                setSuccess(true)
            } else {
                setError(result.error || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.')
            }
        } catch (err) {
            setError('Lỗi kết nối. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    // Success state
    if (success) {
        return (
            <div className="reset-password-container">
                <div className="reset-password-content">
                    <div className="reset-password-success">
                        <div className="reset-password-success-icon">
                            <CheckCircle size={64} />
                        </div>
                        <h2>Đổi mật khẩu thành công!</h2>
                        <p>
                            Mật khẩu mới đã được lưu. Bạn sẽ được chuyển về
                            trang đăng nhập sau 3 giây...
                        </p>
                        <button
                            onClick={() => navigate('/login', { replace: true })}
                            className="reset-password-btn"
                        >
                            Đăng nhập ngay
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="reset-password-container">
            <div className="reset-password-content">
                {/* Header */}
                <div className="reset-password-header">
                    <img
                        src="/logo-qswings.png"
                        alt="qswings logo"
                        className="h-16 w-auto mx-auto mb-2 object-contain"
                        style={{ mixBlendMode: 'multiply' }}
                    />
                    <h1 className="reset-password-title">Thiết lập mật khẩu mới</h1>
                    <p className="reset-password-subtitle">
                        Nhập mật khẩu mới cho tài khoản của bạn
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="reset-password-error">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="reset-password-form">
                    {/* New Password */}
                    <div className="reset-password-input-group">
                        <Lock size={20} className="reset-password-input-icon" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mật khẩu mới"
                            className="reset-password-input"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="reset-password-toggle"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="reset-password-input-group">
                        <Lock size={20} className="reset-password-input-icon" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Xác nhận mật khẩu"
                            className="reset-password-input"
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="reset-password-btn"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            'Cập nhật mật khẩu'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ResetPassword
