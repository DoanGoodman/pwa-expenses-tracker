import { useState } from 'react'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import BottomSheet from '../common/BottomSheet'
import { useAuth } from '../../contexts/AuthContext'

/**
 * ForgotPasswordBottomSheet - Bottom sheet yêu cầu reset mật khẩu
 * 
 * @param {boolean} isOpen - Trạng thái mở/đóng
 * @param {function} onClose - Callback khi đóng
 */
const ForgotPasswordBottomSheet = ({ isOpen, onClose }) => {
    const { resetPasswordForEmail } = useAuth()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await resetPasswordForEmail(email)

            if (result.success) {
                setSuccess(true)
            } else {
                setError(result.error || 'Không thể gửi email. Vui lòng thử lại.')
            }
        } catch (err) {
            setError('Lỗi kết nối. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        // Reset state when closing
        setEmail('')
        setSuccess(false)
        setError('')
        onClose()
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={handleClose}
            title="Quên mật khẩu"
            maxHeight="50vh"
        >
            {success ? (
                <div className="forgot-password-success">
                    <div className="forgot-password-success-icon">
                        <CheckCircle size={48} />
                    </div>
                    <h4>Đã gửi email!</h4>
                    <p>
                        Vui lòng kiểm tra hộp thư của bạn và nhấn vào link
                        để đặt lại mật khẩu.
                    </p>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="forgot-password-btn"
                    >
                        Đóng
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="forgot-password-form">
                    <p className="forgot-password-desc">
                        Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.
                    </p>

                    {error && (
                        <div className="forgot-password-error">
                            {error}
                        </div>
                    )}

                    <div className="forgot-password-input-group">
                        <Mail size={20} className="forgot-password-input-icon" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email của bạn"
                            className="forgot-password-input"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="forgot-password-btn"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            'Gửi'
                        )}
                    </button>
                </form>
            )}
        </BottomSheet>
    )
}

export default ForgotPasswordBottomSheet
