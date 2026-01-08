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

// Export to Excel
export const exportToExcel = (expenses, fileName = 'Danh_sach_chi_phi') => {
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

        // Use writeFile for better mobile compatibility
        // This method handles the download process internally
        XLSX.writeFile(workbook, `${fileName}.xlsx`)

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
