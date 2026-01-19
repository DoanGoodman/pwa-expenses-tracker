# Quick Guide: Update n8n Workflow Prompt

## Vấn đề cần fix
AI đang tự bịa ngày tháng khi hóa đơn không có date → cần sửa prompt để AI trả về `null` thay vì đoán date.

## Bước 1: Mở n8n Workflow
1. Truy cập n8n dashboard của bạn
2. Mở workflow **"Receipt Scanner API"**
3. Tìm node: **"Mistral Vision"** hoặc **"Basic LLM Chain"**

## Bước 2: Copy Prompt Mới

```
Extract data from this receipt image. 
Return a JSON object with this exact structure:
{
  "date": "YYYY-MM-DD or null",
  "items": [
    {
      "description": "Item name",
      "quantity": number,
      "unit": "unit name (kg, m3, bao, cai...)",
      "unit_price": number (in VND),
      "confidence": number (0-1)
    }
  ]
}

IMPORTANT RULES:
- If date is NOT clearly visible on the receipt, return "date": null (do NOT guess or make up a date)
- Only extract date if you can see it written on the receipt
- If unit is missing, leave it as empty string ""
- Return ONLY raw JSON, no markdown formatting.
```

## Bước 3: Update Prompt
1. Click vào node **"Mistral Vision"**
2. Tìm field **"Prompt (User Message)"** hoặc **"Source for Prompt (User Message)"**
3. Xóa prompt cũ
4. Paste prompt mới ở trên
5. Click **Save** (nút ✓)

## Bước 4: Test
1. Click **Test workflow** hoặc **Execute workflow**
2. Upload 1 ảnh hóa đơn **KHÔNG có ngày**
3. Kiểm tra output - phải thấy `"date": null`

## Bước 5: Activate
1. Click nút **Active** ở góc trên bên phải
2. Workflow bây giờ đã sử dụng prompt mới

## Verify

Sau khi update, test trên PWA:
1. Upload hóa đơn không có ngày
2. ✅ Phải thấy warning màu vàng: "⚠️ Không tìm thấy ngày trên hóa đơn"
3. ✅ Date được auto-fill = ngày hôm nay
4. ✅ Có thể chỉnh sửa date thủ công

---

**Lưu ý**: Code đã được update sẵn, chỉ cần update prompt trong n8n workflow editor.
