import { FileText, Upload, FolderOpen } from 'lucide-react'
import Header from '../components/layout/Header'

const Documents = () => {
    return (
        <div className="page-container">
            {/* Header */}
            <Header title="🤖 qswings" />

            {/* Coming Soon Card */}
            <div className="card-soft-lg text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-light flex items-center justify-center">
                    <FileText size={32} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    Sắp ra mắt
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                    Tính năng quản lý tài liệu đang được phát triển
                </p>

                {/* Feature Preview */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <Upload size={24} className="text-primary mx-auto mb-2" />
                        <p className="text-xs text-gray-600">Upload hóa đơn</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <FolderOpen size={24} className="text-primary mx-auto mb-2" />
                        <p className="text-xs text-gray-600">Phân loại tài liệu</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Documents
