import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatVND, formatDateVN } from './formatters'

// Primary Teal color for the application
const TEAL_COLOR = '00A99D'

// Helper: Format data for export - Matches Supabase expenses table structure
// Data sorted by date (most recent first)
const formatDataForExport = (expenses) => {
    // Sort by date descending (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => {
        const dateA = new Date(a.date || a.expense_date)
        const dateB = new Date(b.date || b.expense_date)
        return dateB - dateA
    })

    return sortedExpenses.map((item, index) => ({
        stt: index + 1,
        ngayChi: formatDateVN(item.date || item.expense_date),
        ngayNhap: formatDateVN(item.created_at),
        duAn: item.project?.name || 'N/A',
        hangMuc: item.category?.name || 'N/A',
        noiDung: item.description || '',
        dvt: item.unit || '',
        khoiLuong: item.quantity || 1,
        donGia: item.unit_price || 0,
        thanhTien: item.amount || 0
    }))
}

// Export to Excel using ExcelJS with Teal table styling
export const exportToExcel = async (expenses, fileName = 'Danh_sach_chi_phi') => {
    try {
        const data = formatDataForExport(expenses)

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook()
        workbook.creator = 'qswings Expenses Tracker'
        workbook.created = new Date()

        const worksheet = workbook.addWorksheet('Chi phí', {
            views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
        })

        // Define columns with headers
        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 6 },
            { header: 'Ngày chi', key: 'ngayChi', width: 12 },
            { header: 'Ngày nhập', key: 'ngayNhap', width: 12 },
            { header: 'Dự án', key: 'duAn', width: 25 },
            { header: 'Hạng mục', key: 'hangMuc', width: 15 },
            { header: 'Nội dung', key: 'noiDung', width: 35 },
            { header: 'ĐVT', key: 'dvt', width: 8 },
            { header: 'Khối lượng', key: 'khoiLuong', width: 12 },
            { header: 'Đơn giá', key: 'donGia', width: 15 },
            { header: 'Thành tiền', key: 'thanhTien', width: 15 }
        ]

        // Style header row
        const headerRow = worksheet.getRow(1)
        headerRow.height = 24
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: TEAL_COLOR }
            }
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' },
                size: 11
            }
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle'
            }
            cell.border = {
                top: { style: 'thin', color: { argb: '008B85' } },
                left: { style: 'thin', color: { argb: '008B85' } },
                bottom: { style: 'thin', color: { argb: '008B85' } },
                right: { style: 'thin', color: { argb: '008B85' } }
            }
        })

        // Add data rows
        data.forEach((item, index) => {
            const row = worksheet.addRow(item)

            // Alternate row colors for better readability (Teal light stripe)
            const isEvenRow = index % 2 === 0
            row.eachCell((cell, colNumber) => {
                // Light teal for even rows
                if (isEvenRow) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'E6F7F5' } // Very light teal
                    }
                }

                // Border for all cells
                cell.border = {
                    top: { style: 'thin', color: { argb: 'CCCCCC' } },
                    left: { style: 'thin', color: { argb: 'CCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                    right: { style: 'thin', color: { argb: 'CCCCCC' } }
                }

                // Number formatting for currency columns
                if (colNumber === 9 || colNumber === 10) { // Đơn giá, Thành tiền
                    cell.numFmt = '#,##0'
                    cell.alignment = { horizontal: 'right' }
                }

                // Center alignment for some columns
                if (colNumber === 1 || colNumber === 7 || colNumber === 8) { // STT, ĐVT, Khối lượng
                    cell.alignment = { horizontal: 'center' }
                }
            })
        })

        // Add totals row
        const lastRowNum = worksheet.rowCount
        const totalRow = worksheet.addRow({
            stt: '',
            ngayChi: '',
            ngayNhap: '',
            duAn: '',
            hangMuc: '',
            noiDung: 'TỔNG CỘNG',
            dvt: '',
            khoiLuong: '',
            donGia: '',
            thanhTien: { formula: `SUM(J2:J${lastRowNum})` }
        })

        totalRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true }
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: TEAL_COLOR }
            }
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' }
            }
            cell.border = {
                top: { style: 'medium', color: { argb: '008B85' } },
                left: { style: 'thin', color: { argb: '008B85' } },
                bottom: { style: 'medium', color: { argb: '008B85' } },
                right: { style: 'thin', color: { argb: '008B85' } }
            }
            if (colNumber === 10) {
                cell.numFmt = '#,##0'
                cell.alignment = { horizontal: 'right' }
            }
            if (colNumber === 6) {
                cell.alignment = { horizontal: 'right' }
            }
        })

        // Generate blob
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], {
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
            headStyles: { fillColor: [0, 169, 157] } // Teal color
        })

        doc.save(`${fileName}.pdf`)
        return true
    } catch (error) {
        console.error('Export PDF Error:', error)
        return false
    }
}
