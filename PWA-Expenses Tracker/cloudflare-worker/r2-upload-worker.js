/**
 * Cloudflare Worker - R2 Direct Upload with AI Receipt Validation
 * 
 * Bindings required in Cloudflare Dashboard:
 * - MY_BUCKET: R2 Bucket binding
 * - AI: Workers AI binding (for LLaVA vision-language model)
 * - R2_PUBLIC_DOMAIN: Environment variable (e.g., https://pub-xxx.r2.dev)
 * 
 * Flow:
 * 1. Receive image upload
 * 2. AI (LLaVA) analyzes: "Is this a receipt/invoice/bill?"
 * 3. If YES, save to R2 and return public URL
 * 4. If NO, return 403
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

                // --- GATE 1: AI RECEIPT VALIDATION using LLaVA ---
                if (env.AI) {
                    try {
                        // Convert buffer to base64 for LLaVA
                        const base64Image = btoa(
                            new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                        );

                        // Ask LLaVA if this is a receipt/invoice
                        const aiResponse = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
                            image: [...new Uint8Array(imageBuffer)], // Convert to regular array
                            prompt: "Is this image a receipt, invoice, or bill? Answer only YES or NO.",
                            max_tokens: 10
                        });

                        console.log('LLaVA response:', aiResponse);

                        // Check if response contains YES (check both response and description fields, trim spaces)
                        const responseText = (aiResponse?.response || aiResponse?.description || '').trim().toLowerCase();
                        const isReceipt = responseText.includes('yes');

                        if (!isReceipt) {
                            return jsonResponse({
                                success: false,
                                error: "Ảnh này không phải hóa đơn hoặc chứng từ. Vui lòng chụp lại."
                            }, 403, corsHeaders);
                        }

                    } catch (aiError) {
                        console.error('AI validation error:', aiError);
                        // Fallback: Use ResNet-50 for basic document detection
                        try {
                            const resnetResponse = await env.AI.run('@cf/microsoft/resnet-50', {
                                image: [...new Uint8Array(imageBuffer)] // Convert to regular array
                            });

                            const validLabels = ['paper', 'document', 'text', 'receipt', 'menu', 'label', 'envelope', 'notebook', 'book', 'web_site', 'letter_opener'];
                            const isLikelyDocument = resnetResponse && resnetResponse.some(prediction =>
                                validLabels.some(label => prediction.label.toLowerCase().includes(label))
                            );

                            if (!isLikelyDocument) {
                                return jsonResponse({
                                    success: false,
                                    error: "Không nhận diện được hóa đơn trong ảnh."
                                }, 403, corsHeaders);
                            }
                        } catch (resnetError) {
                            console.error('Fallback ResNet also failed:', resnetError);
                            // Both AI methods failed - reject to be safe (fail-closed)
                            return jsonResponse({
                                success: false,
                                error: "Không thể xác minh nội dung ảnh. Vui lòng thử lại."
                            }, 500, corsHeaders);
                        }
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
