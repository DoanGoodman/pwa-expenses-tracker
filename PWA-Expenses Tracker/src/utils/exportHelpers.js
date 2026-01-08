import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatVND, formatDateVN } from './formatters'

// Helper: Format data for export
const formatDataForExport = (expenses) => {
    return expenses.map((item, index) => ({
        STT: index + 1,
        'Ngày': formatDateVN(item.date || item.expense_date),
        'Nội dung': item.description,
        'Dự án': item.project?.name || 'N/A',
        'Hạng mục': item.category?.name || 'N/A',
        'Số tiền': item.amount,
        'Ghi chú': item.note || ''
    }))
}

// Export to Excel with iOS Safari support
export const exportToExcel = async (expenses, fileName = 'Danh_sach_chi_phi') => {
    try {
        const data = formatDataForExport(expenses)
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()

        // Adjust column widths
        const wscols = [
            { wch: 5 },  // STT
            { wch: 12 }, // Ngày
            { wch: 30 }, // Nội dung
            { wch: 20 }, // Dự án
            { wch: 15 }, // Hạng mục
            { wch: 15 }, // Số tiền
            { wch: 20 }  // Ghi chú
        ]
        worksheet['!cols'] = wscols

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi phi')

        // Generate file as base64
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        // Check if Web Share API is available (works well on iOS)
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], `${fileName}.xlsx`, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Xuất danh sách chi phí',
                })
                return true
            }
        }

        // Fallback: Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}.xlsx`

        // For iOS Safari, we need to open in same window
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        if (isIOS) {
            // Open blob URL in new tab for iOS
            window.open(url, '_blank')
            alert('File Excel đã mở. Nhấn giữ và chọn "Tải về" hoặc "Mở trong Numbers" để lưu.')
        } else {
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }

        // Cleanup after delay
        setTimeout(() => URL.revokeObjectURL(url), 5000)

        return true
    } catch (error) {
        console.error('Export Excel Error:', error)
        alert('Lỗi xuất Excel: ' + error.message)
        return false
    }
}

// Export to PDF
export const exportToPDF = (expenses, fileName = 'Danh_sach_chi_phi') => {
    try {
        const doc = new jsPDF()

        // Add font support for Vietnamese (this assumes standard font, for full support need custom font)
        // Since custom font loading is complex in client-side w/o assets, we'll try to use standard font
        // Note: Default fonts don't support Vietnamese well. 
        // We will try to rely on autoTable's font handling or simply accept basic ascii if font not present.
        // For distinct Vietnamese support in jsPDF, we usually need to add a font file.
        // For this streamlined impl, we focus on structure.

        doc.text('DANH SÁCH CHI PHÍ', 14, 20)

        const tableColumn = ["STT", "Ngày", "Nội dung", "Dự án", "Hạng mục", "Số tiền"]
        const tableRows = []

        expenses.forEach((item, index) => {
            const expenseData = [
                index + 1,
                formatDateVN(item.date || item.expense_date),
                item.description,
                item.project?.name || '',
                item.category?.name || '',
                formatVND(item.amount)
            ]
            tableRows.push(expenseData)
        })

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            styles: { font: 'helvetica', fontSize: 10 },
            headStyles: { fillColor: [0, 169, 157] }
        })

        doc.save(`${fileName}.pdf`)
        return true
    } catch (error) {
        console.error('Export PDF Error:', error)
        return false
    }
}
