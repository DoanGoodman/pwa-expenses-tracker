import { useState } from 'react'
import { Search, Check, Building2 } from 'lucide-react'
import BottomSheet from './BottomSheet'

/**
 * ProjectBottomSheet - Bottom Sheet để chọn dự án
 * 
 * @param {boolean} isOpen - Trạng thái mở/đóng
 * @param {function} onClose - Callback khi đóng
 * @param {Array} projects - Danh sách dự án từ Supabase
 * @param {string} selectedId - ID dự án đang được chọn
 * @param {function} onSelect - Callback khi chọn dự án
 */
const ProjectBottomSheet = ({
    isOpen,
    onClose,
    projects = [],
    selectedId,
    onSelect
}) => {
    const [searchTerm, setSearchTerm] = useState('')

    // Filter projects by search term
    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Handle project selection
    const handleSelect = (projectId) => {
        onSelect(projectId)
        onClose()
        setSearchTerm('') // Reset search
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={() => {
                onClose()
                setSearchTerm('')
            }}
            title="Chọn dự án"
            maxHeight="70vh"
        >
            {/* Search Input */}
            <div className="project-sheet-search">
                <Search size={18} className="project-sheet-search-icon" />
                <input
                    type="text"
                    placeholder="Tìm kiếm dự án..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="project-sheet-search-input"
                    autoFocus={false}
                />
            </div>

            {/* Project List */}
            <div className="project-sheet-list">
                {/* All Projects Option */}
                <button
                    className={`project-sheet-item ${selectedId === 'all' ? 'selected' : ''}`}
                    onClick={() => handleSelect('all')}
                >
                    <div className="project-sheet-item-icon all">
                        <Building2 size={20} />
                    </div>
                    <div className="project-sheet-item-info">
                        <span className="project-sheet-item-name">Tất cả dự án</span>
                        <span className="project-sheet-item-count">{projects.length} dự án</span>
                    </div>
                    {selectedId === 'all' && (
                        <div className="project-sheet-item-check">
                            <Check size={18} />
                        </div>
                    )}
                </button>

                {/* Individual Projects */}
                {filteredProjects.map((project) => (
                    <button
                        key={project.id}
                        className={`project-sheet-item ${String(selectedId) === String(project.id) ? 'selected' : ''}`}
                        onClick={() => handleSelect(project.id)}
                    >
                        <div className="project-sheet-item-icon">
                            <Building2 size={20} />
                        </div>
                        <div className="project-sheet-item-info">
                            <span className="project-sheet-item-name">{project.name}</span>
                        </div>
                        {String(selectedId) === String(project.id) && (
                            <div className="project-sheet-item-check">
                                <Check size={18} />
                            </div>
                        )}
                    </button>
                ))}

                {/* Empty State */}
                {filteredProjects.length === 0 && searchTerm && (
                    <div className="project-sheet-empty">
                        <p>Không tìm thấy dự án "{searchTerm}"</p>
                    </div>
                )}
            </div>
        </BottomSheet>
    )
}

export default ProjectBottomSheet
