import { useState, useEffect } from 'react'
import { Search, MapPin, X, Calendar, Check } from 'lucide-react'
import BottomSheet from '../common/BottomSheet'
import { formatDateVN } from '../../utils/formatters'

const SelectionBottomSheet = ({
    isOpen,
    onClose,
    projects = [],
    categories = [],
    initialData = {}, // { projectId, categoryId, date }
    onApply
}) => {
    // Internal state
    const [projectId, setProjectId] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [date, setDate] = useState('')

    // Search state for projects
    const [projectSearch, setProjectSearch] = useState('')

    // Sync state when opening
    useEffect(() => {
        if (isOpen) {
            setProjectId(initialData.projectId || '')
            setCategoryId(initialData.categoryId || '')
            setDate(initialData.date || new Date().toISOString().split('T')[0])
            setProjectSearch('')
        }
    }, [isOpen, initialData])

    const handleApply = () => {
        onApply({
            projectId,
            categoryId,
            date
        })
        onClose()
    }

    // Filter projects
    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase())
    )

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Thông tin chi phí"
            maxHeight="85vh" // Cao hơn bình thường để chứa nhiều nội dung
        >
            <div className="selection-sheet-content">

                {/* 1. Chọn ngày (Đặt lên đầu hoặc dưới cùng? Theo flow nhập liệu nên để đầu hoặc cuối. 
                       Để cuối cùng danh sách Input hoặc nhóm chung)
                       Người dùng thường nghĩ: Dự án -> Hạng mục -> Ngày. OK.
                */}

                {/* --- SELECTION GROUP 1: DỰ ÁN --- */}
                <div className="sheet-section">
                    <div className="section-header">
                        <MapPin size={16} className="text-gray-500" />
                        <span className="section-title">Chọn dự án</span>
                    </div>

                    {/* Search Input */}
                    <div className="project-search-box">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm dự án..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="project-search-input"
                        />
                        {projectSearch && (
                            <button onClick={() => setProjectSearch('')} className="search-clear-btn">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Project List */}
                    <div className="project-list-window">
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map(proj => (
                                <button
                                    key={proj.id}
                                    className={`project-item-row ${projectId === proj.id ? 'selected' : ''}`}
                                    onClick={() => setProjectId(proj.id)}
                                >
                                    <span className="project-name">{proj.name}</span>
                                    {projectId === proj.id && <Check size={16} className="check-icon" />}
                                </button>
                            ))
                        ) : (
                            <div className="empty-state-text">Không tìm thấy dự án</div>
                        )}
                    </div>
                </div>

                <div className="sheet-divider"></div>

                {/* --- SELECTION GROUP 2: DANH MỤC --- */}
                <div className="sheet-section">
                    <div className="section-header">
                        <span className="section-title">Chọn danh mục</span>
                    </div>

                    <div className="category-tags-grid">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-tag-chip ${categoryId === cat.id ? 'selected' : ''}`}
                                onClick={() => setCategoryId(cat.id)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sheet-divider"></div>

                {/* --- SELECTION GROUP 3: NGÀY CHI --- */}
                <div className="sheet-section">
                    <div className="section-header">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="section-title">Ngày chi</span>
                    </div>

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="date-picker-input-large"
                    />
                </div>
            </div>

            {/* Footer Actions */}
            <div className="sheet-footer-actions">
                <button className="btn-sheet-apply" onClick={handleApply}>
                    <Check size={18} />
                    <span>Áp dụng</span>
                </button>
            </div>
        </BottomSheet>
    )
}

export default SelectionBottomSheet
