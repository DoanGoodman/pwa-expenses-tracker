import { ShieldCheck, Key, Cloud } from 'lucide-react'
import BottomSheet from '../common/BottomSheet'

const PrivacySheet = ({ isOpen, onClose }) => {
    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Bảo mật & Riêng tư"
            maxHeight="90vh"
        >
            <div className="p-4 pb-8 space-y-6">
                <header className="mb-2">
                    <p className="text-sm text-gray-500">Cam kết bảo vệ dữ liệu nghiệp vụ QS của bạn.</p>
                </header>

                <div className="space-y-4">
                    {/* Data Ownership */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 mb-1">Quyền sở hữu dữ liệu</h3>
                                <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                    Mọi dữ liệu về dự án, đơn giá và khối lượng bạn nhập vào thuộc quyền sở hữu tuyệt đối của bạn. Chúng tôi không sử dụng dữ liệu này cho bất kỳ mục đích thương mại nào khác.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RLS Security */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                <Key size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 mb-1">Công nghệ bảo mật lớp (RLS)</h3>
                                <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                    Ứng dụng áp dụng chính sách <strong>Row Level Security</strong>. Mỗi người dùng có một không gian lưu trữ riêng biệt. Không ai (kể cả quản trị viên) có thể truy cập trái phép vào "két sắt" dữ liệu của bạn nếu không có mã định danh cá nhân (Auth ID).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                <Cloud size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 mb-1">Hạ tầng tiêu chuẩn Quốc tế</h3>
                                <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                    Hệ thống chạy trên nền tảng Supabase, lưu trữ tại các trung tâm dữ liệu của Amazon Web Services (AWS) đạt chứng chỉ bảo mật ISO 27001 và SOC2. Toàn bộ đường truyền dữ liệu được mã hóa SSL 256-bit.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Commitment */}
                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 italic">
                        <p className="text-xs text-teal-700 leading-relaxed">
                            "Với tư cách là người phát triển và cũng là một đồng nghiệp trong ngành QS, tôi cam kết bảo mật thông tin dự án của bạn như chính hồ sơ thầu của bản thân mình."
                        </p>
                    </div>
                </div>
            </div>
        </BottomSheet>
    )
}

export default PrivacySheet
