// Format số tiền sang VND (1,000 đ)
export const formatVND = (amount) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' đ'
}

// Format số tiền ngắn gọn (15M, 1.5B) - sử dụng dấu chấm thập phân
export const formatVNDShort = (amount) => {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1) + 'B'
    }
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M'
    }
    if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'K'
    }
    return amount.toString()
}

// Format ngày tháng tiếng Việt
export const formatDateVN = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

// Format tháng năm
export const formatMonthYear = (monthString) => {
    if (!monthString) return ''
    const [year, month] = monthString.split('-')
    return `T${parseInt(month)}/${year}`
}

// Format tháng năm ngắn gọn (T12/26 thay vì T12/2026)
export const formatMonthYearShort = (monthString) => {
    if (!monthString) return ''
    const [year, month] = monthString.split('-')
    const shortYear = year.slice(-2)
    return `T${parseInt(month)}/${shortYear}`
}

// Lấy tháng hiện tại theo dạng YYYY-MM
export const getCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}

// Lấy tháng trước đó n tháng
export const getMonthsAgo = (n) => {
    const now = new Date()
    now.setMonth(now.getMonth() - n)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}

// Tạo danh sách tháng từ startMonth đến endMonth
export const getMonthRange = (startMonth, endMonth) => {
    const months = []
    const [startYear, startM] = startMonth.split('-').map(Number)
    const [endYear, endM] = endMonth.split('-').map(Number)

    let currentYear = startYear
    let currentMonth = startM

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endM)) {
        months.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
        currentMonth++
        if (currentMonth > 12) {
            currentMonth = 1
            currentYear++
        }
    }

    return months
}

// Lấy tên tháng ngắn
export const getShortMonthName = (monthString) => {
    const [, month] = monthString.split('-')
    return `T${parseInt(month)}`
}

// Parse số tiền từ input: loại bỏ dấu phẩy, giữ số nguyên
export const parseAmount = (value) => {
    if (!value) return 0
    // Remove all commas (separators)
    // Example: "1,000" -> "1000"
    const cleanValue = String(value).replace(/,/g, '')
    // Parse integer
    return parseInt(cleanValue) || 0
}

// Format input số tiền: thêm dấu phẩy phân cách hàng nghìn (1,000,000)
export const formatAmountInput = (value) => {
    const number = parseAmount(value)
    if (number === 0 && (value !== '0' && value !== 0)) return ''
    return new Intl.NumberFormat('en-US').format(number)
}

// Parse số thập phân: loại bỏ dấu phẩy (separator), giữ dấu chấm (decimal)
export const parseDecimal = (value) => {
    if (!value) return 0
    // Remove commas
    // Example: "1,000.50" -> "1000.50"
    let normalized = String(value).replace(/,/g, '')
    return parseFloat(normalized) || 0
}

// Format input số thập phân: 1,000.50
export const formatDecimalInput = (value) => {
    if (!value) return ''

    const stringValue = String(value)

    // Allow typing dot at the end (e.g., "12.")
    if (stringValue.endsWith('.')) {
        return stringValue
    }

    // If typing decimals "12.50"
    if (stringValue.includes('.')) {
        const parts = stringValue.split('.')
        const integerPart = parts[0]
        const decimalPart = parts[1]

        // Format integer part with commas
        const formattedInteger = new Intl.NumberFormat('en-US').format(parseInt(integerPart.replace(/,/g, '')) || 0)

        // Return combined
        return `${formattedInteger}.${decimalPart}`
    }

    // Normal number
    return new Intl.NumberFormat('en-US').format(parseDecimal(value))
}
