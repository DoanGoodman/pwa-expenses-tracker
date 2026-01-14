import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, User, Users } from 'lucide-react'
import ForgotPasswordBottomSheet from '../components/auth/ForgotPasswordBottomSheet'

// Google Icon SVG Component
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
)

const Login = () => {
    const { signIn, signUp, signInWithGoogle } = useAuth()
    const [isLogin, setIsLogin] = useState(true)
    const [isStaffLogin, setIsStaffLogin] = useState(false) // Toggle cho Staff login
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('') // Username cho Staff
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForgotPassword, setShowForgotPassword] = useState(false)
    const [registrationSuccess, setRegistrationSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                // Xác định email để đăng nhập
                let loginEmail = email

                // Nếu là Staff login mode, chuyển username thành email ảo
                if (isStaffLogin) {
                    if (!username.trim()) {
                        setError('Vui lòng nhập tên đăng nhập')
                        setLoading(false)
                        return
                    }
                    loginEmail = `${username.toLowerCase()}@qswings.app`
                }

                const result = await signIn(loginEmail, password)
                if (!result.success) {
                    setError(result.error || 'Có lỗi xảy ra')
                }
            } else {
                // Đăng ký (chỉ dành cho Owner mode)
                const result = await signUp(email, password)
                if (result.success) {
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

    const handleGoogleLogin = async () => {
        setError('')
        setGoogleLoading(true)
        try {
            const result = await signInWithGoogle()
            if (!result.success) {
                setError(result.error || 'Không thể đăng nhập bằng Google')
            }
        } catch (err) {
            setError('Lỗi kết nối. Vui lòng thử lại.')
        } finally {
            setGoogleLoading(false)
        }
    }

    const handleBackToLogin = () => {
        setRegistrationSuccess(false)
        setIsLogin(true)
        setEmail('')
        setPassword('')
        setError('')
    }

    const toggleLoginMode = () => {
        setIsStaffLogin(!isStaffLogin)
        setError('')
        setEmail('')
        setUsername('')
        setPassword('')
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
                        {isLogin
                            ? (isStaffLogin ? 'Đăng nhập nhân viên' : 'Đăng nhập để tiếp tục')
                            : 'Tạo tài khoản mới'}
                    </p>
                </div>

                {/* Toggle Owner/Staff Mode (chỉ hiển thị khi Login) */}
                {isLogin && (
                    <div className="flex justify-center mb-4">
                        <div className="inline-flex rounded-xl bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => { setIsStaffLogin(false); setError(''); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${!isStaffLogin
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <User size={16} />
                                Chủ sở hữu
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsStaffLogin(true); setError(''); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isStaffLogin
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Users size={16} />
                                Nhân viên
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                {/* Google Login Button - Chỉ hiển thị cho Owner mode */}
                {!isStaffLogin && (
                    <>
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={googleLoading}
                            className="login-btn-google"
                        >
                            {googleLoading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <GoogleIcon />
                                    <span>Tiếp tục với Google</span>
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="login-divider">
                            <span>hoặc</span>
                        </div>
                    </>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* Username Input - Chỉ cho Staff mode */}
                    {isStaffLogin && isLogin ? (
                        <div className="login-input-group">
                            <User size={20} className="login-input-icon" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="Tên đăng nhập"
                                className="login-input"
                                required
                            />
                        </div>
                    ) : (
                        /* Email Input - Cho Owner mode */
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
                    )}

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

                    {/* Remember Me & Forgot Password - Only for Owner Login */}
                    {isLogin && !isStaffLogin && (
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

                    {/* Staff Login Hint */}
                    {isStaffLogin && isLogin && (
                        <p className="text-xs text-slate-500 text-center mb-3">
                            Nhập tên đăng nhập do chủ sở hữu cung cấp
                        </p>
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

                    {/* Toggle Login/Register - Chỉ cho Owner mode */}
                    {!isStaffLogin && (
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
                    )}
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
