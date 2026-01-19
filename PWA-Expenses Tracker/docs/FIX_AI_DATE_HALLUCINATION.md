# Fix AI Date Hallucination - n8n Receipt Scanner

## Vấn đề
AI trong n8n workflow đang "bịa" ngày tháng khi hóa đơn không có ngày rõ ràng, dẫn đến data sai lệch trong database.

**Ví dụ**: Hóa đơn viết tay không có ngày → AI tự động tạo date "2024-03-16" → Data bị sai

## Nguyên nhân
Prompt trong n8n workflow có câu: **"If date is missing, use today's date"** → AI bị buộc phải trả về date

## Giải pháp đã triển khai

### 1. ✅ Sửa Prompt trong n8n Workflow
**File**: `n8n/receipt-scanner-workflow.json`

**Thay đổi**:
```json
// CŨ (SAI)
"If date is missing, use today's date"

// MỚI (ĐÚNG)
"IMPORTANT RULES:
- If date is NOT clearly visible on the receipt, return \"date\": null (do NOT guess or make up a date)
- Only extract date if you can see it written on the receipt"
```

**Cách deploy**:
1. Mở n8n workflow editor
2. Tìm node **"Mistral Vision"** hoặc **"Basic LLM Chain"**
3. Copy prompt mới từ file `receipt-scanner-workflow.json`
4. Paste vào field **"Prompt (User Message)"**
5. Save và Activate workflow

### 2. ✅ Xử lý `date: null` trong Backend
**File**: `src/services/receiptService.js`

```javascript
// Validate và handle missing date từ AI
const extractedDate = data.date && data.date !== 'null' ? data.date : null

return {
    success: true,
    data: {
        date: extractedDate, // Keep null nếu AI không tìm thấy date
        items: data.items || []
    }
}
```

### 3. ✅ Thêm Warning trên UI
**File**: `src/components/forms/ReceiptScanner.jsx`

```javascript
// Show warning nếu date được auto-fill
if (dateAutoFilled) {
    setError('⚠️ Không tìm thấy ngày trên hóa đơn - đã tự động điền ngày hôm nay. Vui lòng kiểm tra và chỉnh sửa nếu cần.')
}
```

**UI Behavior**:
- Warning màu vàng (không phải error đỏ)
- Auto clear khi user chỉnh sửa date
- User có thể điều chỉnh date thủ công

## Kết quả

### Trước khi sửa
1. AI scan hóa đơn không có ngày
2. AI tự bịa date → **"2024-03-16"**
3. Data được lưu với ngày sai
4. User không biết date bị sai

### Sau khi sửa
1. AI scan hóa đơn không có ngày
2. AI trả về `date: null`
3. UI tự động điền **ngày hôm nay** + hiển thị **warning màu vàng**
4. User được thông báo và có thể chỉnh sửa
5. Warning tự động biến mất khi user thay đổi date

## Testing

### Test Case 1: Hóa đơn có ngày rõ ràng
- ✅ AI extract đúng date
- ✅ UI hiển thị date extracted
- ✅ Không có warning

### Test Case 2: Hóa đơn không có ngày
- ✅ AI trả về `date: null`
- ✅ UI auto-fill ngày hôm nay
- ✅ Hiển thị warning màu vàng
- ✅ User có thể sửa date
- ✅ Warning biến mất khi user chỉnh sửa

### Test Case 3: Hóa đơn có ngày mơ hồ
- ✅ AI trả về `date: null` (không đoán)
- ✅ Xử lý giống Test Case 2

## Deployment Checklist

- [x] Update `n8n/receipt-scanner-workflow.json`
- [x] Update `src/services/receiptService.js`
- [x] Update `src/components/forms/ReceiptScanner.jsx`
- [ ] Deploy mới n8n workflow (manual update trong n8n editor)
- [ ] Test với hóa đơn thật
- [ ] Monitor AI response quality

## Notes

- **n8n workflow phải được update manual** trong n8n editor (không tự động deploy từ code)
- Prompt mới sẽ cải thiện accuracy nhưng không 100% tránh được hallucination
- Luôn có UI warning để user kiểm tra lại date
- Trong production, nên log các trường hợp `date: null` để monitor AI quality

## Related Issues

- Database records với project_id=19 có date sai (2024-09-16) nhưng UI filter 2025-2026
- Solution: User cần mở rộng date filter hoặc sửa lại date trong database
