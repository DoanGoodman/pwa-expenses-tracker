import imageCompression from 'browser-image-compression'

// R2 Upload Configuration
const R2_API_ENDPOINT = import.meta.env.VITE_R2_PRESIGNED_API || ''
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || ''

/**
 * Compress image before upload
 * @param {File} file - Original image file
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = async (file) => {
    const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/jpeg'
    }

    try {
        const compressedFile = await imageCompression(file, options)
        console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
        return compressedFile
    } catch (error) {
        console.error('Image compression failed:', error)
        // Return original file if compression fails
        return file
    }
}

/**
 * Get presigned URL from backend and upload image to R2
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export const uploadToR2 = async (file, userId) => {
    if (!R2_API_ENDPOINT) {
        console.warn('R2 API endpoint not configured, using demo mode')
        // Demo mode: return a placeholder URL
        return {
            success: true,
            imageUrl: URL.createObjectURL(file)
        }
    }

    try {
        // Step 1: Get presigned URL from backend
        const filename = `receipts/${userId}/${Date.now()}.jpg`
        const presignResponse = await fetch(`${R2_API_ENDPOINT}/presign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename,
                contentType: 'image/jpeg'
            })
        })

        if (!presignResponse.ok) {
            throw new Error('Failed to get presigned URL')
        }

        const { uploadUrl, publicUrl } = await presignResponse.json()

        // Step 2: Upload file directly to R2
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': 'image/jpeg'
            }
        })

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload to R2')
        }

        return {
            success: true,
            imageUrl: publicUrl
        }
    } catch (error) {
        console.error('R2 upload error:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Send image URL to n8n webhook for AI processing
 * @param {string} imageUrl - Public URL of the uploaded image
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const analyzeReceipt = async (imageUrl) => {
    if (!N8N_WEBHOOK_URL) {
        console.warn('n8n webhook not configured, using demo data')
        // Demo mode: return mock data
        return getDemoAnalysisResult()
    }

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl })
        })

        if (!response.ok) {
            throw new Error('AI analysis failed')
        }

        const data = await response.json()
        return {
            success: true,
            data: {
                date: data.date || new Date().toISOString().split('T')[0],
                items: data.items || []
            }
        }
    } catch (error) {
        console.error('Receipt analysis error:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Demo analysis result for testing without n8n
 */
const getDemoAnalysisResult = () => {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                data: {
                    date: new Date().toISOString().split('T')[0],
                    items: [
                        {
                            id: crypto.randomUUID(),
                            description: 'Xi măng PCB40',
                            quantity: 50,
                            unit: 'bao',
                            unit_price: 95000,
                            confidence: 0.95
                        },
                        {
                            id: crypto.randomUUID(),
                            description: 'Cát vàng',
                            quantity: 5,
                            unit: 'm3',
                            unit_price: 350000,
                            confidence: 0.72
                        },
                        {
                            id: crypto.randomUUID(),
                            description: 'Thép phi 12',
                            quantity: 200,
                            unit: 'kg',
                            unit_price: 18500,
                            confidence: 0.88
                        }
                    ]
                }
            })
        }, 2000)
    })
}

/**
 * Format currency for display
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value)
}

/**
 * Calculate total from items array
 */
export const calculateTotal = (items) => {
    return items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0
        const price = parseFloat(item.unit_price) || 0
        return sum + (qty * price)
    }, 0)
}
