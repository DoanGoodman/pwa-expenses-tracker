import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import ForgotPasswordBottomSheet from '../components/auth/ForgotPasswordBottomSheet'

const Login = () => {
    const { signIn, signUp } = useAuth()
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForgotPassword, setShowForgotPassword] = useState(false)
    const [registrationSuccess, setRegistrationSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                // Đăng nhập
                const result = await signIn(email, password)
                if (!result.success) {
                    setError(result.error || 'Có lỗi xảy ra')
                }
            } else {
                // Đăng ký
                const result = await signUp(email, password)
                if (result.success) {
                    // Hiển thị màn hình thành công
                    setRegistrationSuccess(true)
                } else {
                    setError(result.error || 'Có lỗi xảy ra')
                }
            }
        } catch (err) {
            setError('Lỗi kết nối. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    const handleBackToLogin = () => {
        setRegistrationSuccess(false)
        setIsLogin(true)
        setEmail('')
        setPassword('')
        setError('')
    }

    // Màn hình thông báo đăng ký thành công
    if (registrationSuccess) {
        return (
            <div className="login-container">
                <div className="login-content">
                    <div className="registration-success">
                        <div className="registration-success-icon">
                            <CheckCircle size={64} />
                        </div>
                        <h2>Đăng ký thành công!</h2>
                        <p>
                            Chúng tôi đã gửi email xác nhận đến <strong>{email}</strong>.
                            Vui lòng kiểm tra hộp thư (bao gồm cả thư mục Spam) và nhấn vào link để kích hoạt tài khoản.
                        </p>
                        <button
                            onClick={handleBackToLogin}
                            className="login-btn-primary"
                        >
                            Quay lại Đăng nhập
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="login-container">
            <div className="login-content">
                {/* Logo & Title */}
                <div className="login-header">
                    <img
                        src="/logo-qswings.png"
                        alt="qswings logo"
                        className="h-16 w-auto mx-auto mb-2 object-contain"
                        style={{ mixBlendMode: 'multiply' }}
                    />
                    <h1 className="login-title">Cost Tracker</h1>
                    <p className="login-subtitle">
                        {isLogin ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* Email Input */}
                    <div className="login-input-group">
                        <Mail size={20} className="login-input-icon" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="login-input"
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div className="login-input-group">
                        <Lock size={20} className="login-input-icon" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mật khẩu"
                            className="login-input"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="login-password-toggle"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Remember Me & Forgot Password - Only for Login */}
                    {isLogin && (
                        <div className="login-options">
                            <label className="login-remember">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="login-checkbox"
                                />
                                <span>Ghi nhớ đăng nhập</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="login-forgot-password"
                            >
                                Quên mật khẩu?
                            </button>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="login-btn-primary"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            isLogin ? 'Đăng nhập' : 'Đăng ký'
                        )}
                    </button>

                    {/* Toggle Login/Register */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setError('')
                        }}
                        className="login-btn-secondary"
                    >
                        {isLogin ? 'Tạo tài khoản' : 'Đã có tài khoản? Đăng nhập'}
                    </button>
                </form>
            </div>

            {/* Forgot Password Bottom Sheet */}
            <ForgotPasswordBottomSheet
                isOpen={showForgotPassword}
                onClose={() => setShowForgotPassword(false)}
            />
        </div>
    )
}

export default Login


