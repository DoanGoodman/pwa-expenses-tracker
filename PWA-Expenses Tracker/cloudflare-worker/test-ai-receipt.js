/**
 * TEST SCRIPT - Dán vào Cloudflare Dashboard Quick Edit để test AI
 * 
 * Cách dùng:
 * 1. Mở Cloudflare Dashboard -> Workers -> r2-signer -> Edit Code
 * 2. Xóa hết code cũ, dán code này vào
 * 3. Bấm Enter trong thanh URL bên phải để test
 * 4. Xem kết quả JSON trả về
 * 
 * SAU KHI TEST XONG, NHỚ RESTORE LẠI CODE GỐC!
 */

export default {
    async fetch(request, env) {
        // ========== CẤU HÌNH ẢNH TEST ==========
        const imageUrl = "https://ketoanthienung.org/pic/general/images/hoa-don-ban-hang.png";
        // ========================================

        try {
            console.log("Bắt đầu fetch ảnh từ:", imageUrl);

            // Fetch ảnh về
            const response = await fetch(imageUrl);
            if (!response.ok) {
                return jsonResponse({ error: `Không thể fetch ảnh: ${response.status}` });
            }

            const imageBuffer = await response.arrayBuffer();
            console.log("Đã fetch ảnh, kích thước:", imageBuffer.byteLength, "bytes");

            // Kiểm tra AI binding
            if (!env.AI) {
                return jsonResponse({ error: "Chưa có AI binding! Vào Settings -> Bindings -> Add Workers AI" });
            }

            console.log("Đang gửi ảnh cho LLaVA...");

            // Gọi LLaVA để phân tích
            const aiResponse = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
                image: [...new Uint8Array(imageBuffer)], // Chuyển thành array thường
                prompt: "Is this image a receipt, invoice, or bill? Answer only YES or NO.",
                max_tokens: 20
            });

            console.log("LLaVA trả về:", aiResponse);

            // Phân tích kết quả
            const responseText = (aiResponse?.response || aiResponse?.description || JSON.stringify(aiResponse)).toLowerCase();
            const isReceipt = responseText.includes('yes');

            return jsonResponse({
                success: true,
                imageUrl: imageUrl,
                aiRawResponse: aiResponse,
                extractedText: responseText,
                isReceipt: isReceipt,
                verdict: isReceipt ? "✅ ĐÂY LÀ HÓA ĐƠN - Cho phép upload" : "❌ KHÔNG PHẢI HÓA ĐƠN - Từ chối upload"
            });

        } catch (err) {
            console.error("Lỗi:", err);
            return jsonResponse({
                success: false,
                error: err.message,
                stack: err.stack
            });
        }
    }
};

function jsonResponse(data) {
    return new Response(JSON.stringify(data, null, 2), {
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
