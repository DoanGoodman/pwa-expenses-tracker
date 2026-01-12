/**
 * Cloudflare Worker - R2 Direct Upload with AI Classification
 * 
 * Bindings required in Cloudflare Dashboard:
 * - MY_BUCKET: R2 Bucket binding
 * - AI: Workers AI binding (for image classification)
 * - R2_PUBLIC_DOMAIN: Environment variable (e.g., https://pub-xxx.r2.dev)
 * 
 * Flow:
 * 1. Receive image upload
 * 2. AI classifies image (must look like document/receipt)
 * 3. If valid, save to R2 and return public URL
 * 4. If not valid, return 403
 */

export default {
    async fetch(request, env) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method === "PUT") {
            const url = new URL(request.url);
            const fileName = url.searchParams.get('file');

            if (!fileName) {
                return jsonResponse({ success: false, error: "Thiếu tham số ?file=" }, 400, corsHeaders);
            }

            try {
                // Read image data from request
                const imageBuffer = await request.arrayBuffer();

                if (!imageBuffer || imageBuffer.byteLength === 0) {
                    return jsonResponse({ success: false, error: "File rỗng" }, 400, corsHeaders);
                }

                // Check file size (max 5MB)
                if (imageBuffer.byteLength > 5 * 1024 * 1024) {
                    return jsonResponse({ success: false, error: "File quá lớn. Tối đa 5MB." }, 400, corsHeaders);
                }

                // --- GATE 1: AI IMAGE CLASSIFICATION (ResNet-50) ---
                if (env.AI) {
                    try {
                        const aiResponse = await env.AI.run('@cf/microsoft/resnet-50', {
                            image: new Uint8Array(imageBuffer)
                        });

                        // Labels considered as "documents/receipts"
                        const validLabels = ['paper', 'document', 'text', 'receipt', 'menu', 'label', 'envelope', 'notebook', 'book'];

                        // Check if AI detects document-like content
                        const isLikelyDocument = aiResponse && aiResponse.some(prediction =>
                            validLabels.some(label => prediction.label.toLowerCase().includes(label))
                        );

                        // If NOT a document -> REJECT with 403
                        if (!isLikelyDocument) {
                            return jsonResponse({
                                success: false,
                                error: "Ảnh này không giống hóa đơn hoặc tài liệu hợp lệ."
                            }, 403, corsHeaders);
                        }
                    } catch (aiError) {
                        console.error('AI classification error:', aiError);
                        // If AI fails, still allow upload (fail-open for better UX)
                        // You can change to fail-close by returning error here
                    }
                }

                // --- GATE 2: SAVE TO R2 ---
                await env.MY_BUCKET.put(fileName, imageBuffer, {
                    httpMetadata: { contentType: "image/jpeg" }
                });

                // Get public domain from environment variable
                const publicDomain = env.R2_PUBLIC_DOMAIN || 'https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev';
                const publicUrl = `${publicDomain}/${fileName}`;

                return jsonResponse({
                    success: true,
                    url: publicUrl,
                    filename: fileName,
                    size: imageBuffer.byteLength
                }, 200, corsHeaders);

            } catch (err) {
                console.error('Upload error:', err);
                return jsonResponse({
                    success: false,
                    error: err.message || "Lỗi không xác định"
                }, 500, corsHeaders);
            }
        }

        return jsonResponse({ success: false, error: "Chỉ chấp nhận PUT" }, 405, corsHeaders);
    }
};

function jsonResponse(data, status, corsHeaders) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}
