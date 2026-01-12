# Cloudflare R2 Upload Worker

Worker này cho phép upload ảnh trực tiếp từ PWA lên Cloudflare R2.

## Cấu hình

### 1. Bindings (trong Cloudflare Dashboard hoặc wrangler.toml)

| Type | Name | Value |
|------|------|-------|
| R2 Bucket | `MY_BUCKET` | `cost-tracker-pwa` |
| Variable | `R2_PUBLIC_DOMAIN` | `https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev` |

### 2. wrangler.toml (nếu dùng Wrangler CLI)

```toml
name = "r2-signer"
main = "r2-upload-worker.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "cost-tracker-pwa"

[vars]
R2_PUBLIC_DOMAIN = "https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev"
```

## API Endpoints

### Health Check
```
GET https://r2-signer.aiqswings87.workers.dev/
```

Response:
```json
{
  "status": "ok",
  "message": "R2 Upload Worker is running",
  "publicDomain": "https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev"
}
```

### Upload Image
```
PUT https://r2-signer.aiqswings87.workers.dev?file=receipts/{userId}/{timestamp}.jpg
Content-Type: image/jpeg
Body: <binary image data>
```

Response (success):
```json
{
  "success": true,
  "url": "https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev/receipts/user123/1234567890.jpg",
  "filename": "receipts/user123/1234567890.jpg",
  "size": 123456,
  "contentType": "image/jpeg"
}
```

Response (error):
```json
{
  "success": false,
  "error": "Invalid filename format"
}
```

### Get File Info
```
GET https://r2-signer.aiqswings87.workers.dev?file=receipts/{userId}/{timestamp}.jpg
```

Response:
```json
{
  "exists": true,
  "filename": "receipts/user123/1234567890.jpg",
  "url": "https://pub-e97682763d804a55a5acbc3f5a7587a3.r2.dev/receipts/user123/1234567890.jpg",
  "size": 123456,
  "contentType": "image/jpeg"
}
```

## Filename Format

Cho phép pattern: `receipts/{userId}/{timestamp}.{jpg|jpeg|png|webp}`

Ví dụ:
- ✅ `receipts/abc123/1704067200000.jpg`
- ✅ `receipts/user-456/1704067200000.png`
- ❌ `../../../etc/passwd`
- ❌ `/absolute/path.jpg`

## CORS

Worker hỗ trợ đầy đủ CORS:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Deploy

```bash
cd cloudflare-worker
wrangler deploy
```

Hoặc copy nội dung `r2-upload-worker.js` vào Cloudflare Dashboard > Workers > Edit Code.
