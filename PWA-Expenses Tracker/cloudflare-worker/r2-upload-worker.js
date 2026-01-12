/**
 * Cloudflare Worker - R2 Direct Upload
 * 
 * Bindings required in wrangler.toml or Cloudflare Dashboard:
 * - MY_BUCKET: R2 Bucket binding (cost-tracker-pwa)
 * - R2_PUBLIC_DOMAIN: Secret/Variable (https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev)
 * 
 * Usage:
 * PUT https://r2-signer.aiqswings87.workers.dev?file=receipts/user123/1234567890.jpg
 * Body: binary image data
 * 
 * Returns: { success: true, url: "https://pub-xxx.r2.dev/receipts/..." }
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS
            });
        }

        const url = new URL(request.url);

        // Health check
        if (request.method === 'GET' && url.pathname === '/') {
            return jsonResponse({
                status: 'ok',
                message: 'R2 Upload Worker is running',
                publicDomain: env.R2_PUBLIC_DOMAIN || 'NOT_SET'
            });
        }

        // Handle PUT - Direct upload to R2
        if (request.method === 'PUT') {
            return handleUpload(request, env, url);
        }

        // Handle GET with file param - Get file info
        if (request.method === 'GET' && url.searchParams.has('file')) {
            return handleGetInfo(request, env, url);
        }

        return jsonResponse({ error: 'Method not allowed' }, 405);
    }
};

/**
 * Handle direct file upload to R2
 */
async function handleUpload(request, env, url) {
    try {
        const filename = url.searchParams.get('file');

        if (!filename) {
            return jsonResponse({ error: 'Missing ?file parameter' }, 400);
        }

        // Validate filename format
        if (!isValidFilename(filename)) {
            return jsonResponse({ error: 'Invalid filename format. Expected: receipts/{userId}/{timestamp}.jpg' }, 400);
        }

        // Get content type from header or default to image/jpeg
        const contentType = request.headers.get('Content-Type') || 'image/jpeg';

        // Get the file body
        const body = await request.arrayBuffer();

        if (!body || body.byteLength === 0) {
            return jsonResponse({ error: 'Empty file body' }, 400);
        }

        // Check file size (max 5MB)
        if (body.byteLength > 5 * 1024 * 1024) {
            return jsonResponse({ error: 'File too large. Max 5MB allowed.' }, 400);
        }

        // Upload to R2 using native binding
        await env.MY_BUCKET.put(filename, body, {
            httpMetadata: {
                contentType: contentType
            }
        });

        // Get public domain from environment variable
        const publicDomain = env.R2_PUBLIC_DOMAIN || 'https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev';

        // Construct full public URL
        const publicUrl = `${publicDomain}/${filename}`;

        return jsonResponse({
            success: true,
            url: publicUrl,
            filename: filename,
            size: body.byteLength,
            contentType: contentType
        });

    } catch (error) {
        console.error('Upload error:', error);
        return jsonResponse({
            success: false,
            error: 'Upload failed',
            details: error.message
        }, 500);
    }
}

/**
 * Handle file info request
 */
async function handleGetInfo(request, env, url) {
    try {
        const filename = url.searchParams.get('file');

        if (!filename) {
            return jsonResponse({ error: 'Missing ?file parameter' }, 400);
        }

        const object = await env.MY_BUCKET.head(filename);

        if (!object) {
            return jsonResponse({ error: 'File not found' }, 404);
        }

        const publicDomain = env.R2_PUBLIC_DOMAIN || 'https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev';

        return jsonResponse({
            exists: true,
            filename: filename,
            url: `${publicDomain}/${filename}`,
            size: object.size,
            uploaded: object.uploaded,
            contentType: object.httpMetadata?.contentType
        });

    } catch (error) {
        console.error('Get info error:', error);
        return jsonResponse({ error: 'Failed to get file info' }, 500);
    }
}

/**
 * Validate filename to prevent path traversal
 * Allowed pattern: receipts/{userId}/{timestamp}.{jpg|jpeg|png|webp}
 */
function isValidFilename(filename) {
    // Reject path traversal attempts
    if (filename.includes('..') || filename.startsWith('/')) {
        return false;
    }
    // Only allow specific patterns: receipts/userId/timestamp.extension
    const validPattern = /^receipts\/[a-zA-Z0-9-_]+\/\d+\.(jpg|jpeg|png|webp)$/i;
    return validPattern.test(filename);
}

/**
 * JSON response helper with CORS headers
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json'
        }
    });
}
