import { useState, useEffect } from 'react'
import { X, CheckSquare, Square, Briefcase, Loader2, Save } from 'lucide-react'
import { useProjects } from '../../hooks/useSupabase'

/**
 * Modal để phân quyền dự án cho nhân viên
 */
const ProjectAssignmentModal = ({ isOpen, onClose, staff, onSaved }) => {
    const { projects, getStaffAssignments, updateStaffAssignments } = useProjects()
    const [assignedInfo, setAssignedInfo] = useState([]) // Array of assigned project IDs
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Load assignments khi modal mở
    useEffect(() => {
        if (isOpen && staff) {
            const loadAssignments = async () => {
                setLoading(true)
                const assignedIds = await getStaffAssignments(staff.id)
                setAssignedInfo(assignedIds)
                setLoading(false)
            }
            loadAssignments()
        }
    }, [isOpen, staff, getStaffAssignments])

    const toggleProject = (projectId) => {
        setAssignedInfo(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId)
            } else {
                return [...prev, projectId]
            }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        const result = await updateStaffAssignments(staff.id, assignedInfo)
        setSaving(false)

        if (result.success) {
            onSaved && onSaved(`Đã cập nhật quyền dự án cho ${staff.username}`)
            onClose()
        } else {
            alert('Lỗi cập nhật: ' + result.error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
                <div className="bg-slate-100 p-4 flex items-center justify-between border-b border-slate-200">
                    <div>
                        <h3 className="font-semibold text-slate-800">Phân quyền dự án</h3>
                        <p className="text-xs text-slate-500">Nhân viên: {staff?.username}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                            <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p>Bạn chưa có dự án nào.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {projects.map(project => {
                                const isSelected = assignedInfo.includes(project.id)
                                return (
                                    <div
                                        key={project.id}
                                        onClick={() => toggleProject(project.id)}
                                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all
                                            ${isSelected
                                                ? 'bg-indigo-50 border-indigo-200'
                                                : 'bg-white border-slate-200 hover:border-indigo-200'
                                            }`}
                                    >
                                        {isSelected ? (
                                            <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                                        ) : (
                                            <Square className="w-5 h-5 text-slate-300 shrink-0" />
                                        )}
                                        <span className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                                            {project.name}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors
                                 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProjectAssignmentModal
