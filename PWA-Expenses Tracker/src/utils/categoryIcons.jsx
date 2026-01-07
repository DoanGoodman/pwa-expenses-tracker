import {
    Hammer,
    Users,
    Wrench,
    Truck,
    Package,
    Paintbrush,
    Zap,
    Building2,
    Droplets,
    TreeDeciduous,
    BrickWall
} from 'lucide-react'

// Category icon mapping based on category name (Vietnamese)
// Maps category names to their corresponding Lucide React icons
export const getCategoryIcon = (categoryName) => {
    if (!categoryName) return Package

    const nameLower = categoryName.toLowerCase()

    // Vật tư (Materials) - BrickWall
    if (nameLower.includes('vật tư') || nameLower.includes('vat tu') || nameLower.includes('material')) {
        return BrickWall
    }

    // Nhân công (Labor) - Users/Workers
    if (nameLower.includes('nhân công') || nameLower.includes('nhan cong') || nameLower.includes('labor') || nameLower.includes('công nhân')) {
        return Users
    }

    // Thiết bị, Dụng cụ (Equipment, Tools, MMTB, CCDC) - Wrench
    if (nameLower.includes('thiết bị') || nameLower.includes('thiet bi') ||
        nameLower.includes('dụng cụ') || nameLower.includes('dung cu') ||
        nameLower.includes('equipment') || nameLower.includes('tool') ||
        nameLower.includes('mmtb') || nameLower.includes('ccdc')) {
        return Wrench
    }

    // Vận chuyển (Transportation) - Truck
    if (nameLower.includes('vận chuyển') || nameLower.includes('van chuyen') ||
        nameLower.includes('transport') || nameLower.includes('logistics')) {
        return Truck
    }

    // Sơn (Paint)
    if (nameLower.includes('sơn') || nameLower.includes('son') || nameLower.includes('paint')) {
        return Paintbrush
    }

    // Điện (Electrical)
    if (nameLower.includes('điện') || nameLower.includes('dien') || nameLower.includes('electric')) {
        return Zap
    }

    // Xây dựng (Construction)
    if (nameLower.includes('xây') || nameLower.includes('xay') || nameLower.includes('construct')) {
        return Building2
    }

    // Nước (Water/Plumbing)
    if (nameLower.includes('nước') || nameLower.includes('nuoc') || nameLower.includes('water') || nameLower.includes('plumb')) {
        return Droplets
    }

    // Cây xanh (Landscaping)
    if (nameLower.includes('cây') || nameLower.includes('cay') || nameLower.includes('landscape') || nameLower.includes('garden')) {
        return TreeDeciduous
    }

    // Default - Package
    return Package
}

// Get icon color class based on category name
export const getCategoryIconColor = (categoryName) => {
    if (!categoryName) return 'text-gray-500'

    const nameLower = categoryName.toLowerCase()

    if (nameLower.includes('vật tư') || nameLower.includes('vat tu')) {
        return 'text-amber-600'
    }
    if (nameLower.includes('nhân công') || nameLower.includes('nhan cong')) {
        return 'text-blue-500'
    }
    if (nameLower.includes('thiết bị') || nameLower.includes('thiet bi') ||
        nameLower.includes('dụng cụ') || nameLower.includes('dung cu') ||
        nameLower.includes('mmtb') || nameLower.includes('ccdc')) {
        return 'text-purple-600'
    }
    if (nameLower.includes('vận chuyển') || nameLower.includes('van chuyen')) {
        return 'text-green-600'
    }
    if (nameLower.includes('khác') || nameLower.includes('khac') || nameLower.includes('other')) {
        return 'text-teal-600'
    }

    // Additional colors for other potential categories if needed, otherwise default gray
    if (nameLower.includes('sơn') || nameLower.includes('son')) {
        return 'text-pink-600'
    }
    if (nameLower.includes('điện') || nameLower.includes('dien')) {
        return 'text-yellow-600'
    }
    if (nameLower.includes('nước') || nameLower.includes('nuoc')) {
        return 'text-cyan-600'
    }

    return 'text-gray-500'
}

// Get progress bar background style based on category name
export const getCategoryProgressColor = (categoryName) => {
    if (!categoryName) return { background: '#9ca3af' } // gray-400

    const nameLower = categoryName.toLowerCase()

    // Vật tư - Amber
    if (nameLower.includes('vật tư') || nameLower.includes('vat tu')) {
        return { background: 'linear-gradient(90deg, #d97706, #f59e0b)' } // amber-600 to amber-500
    }
    // Nhân công - Blue
    if (nameLower.includes('nhân công') || nameLower.includes('nhan cong')) {
        return { background: 'linear-gradient(90deg, #2563eb, #3b82f6)' } // blue-600 to blue-500
    }
    // Thiết bị, Dụng cụ, MMTB, CCDC - Purple
    if (nameLower.includes('thiết bị') || nameLower.includes('thiet bi') ||
        nameLower.includes('dụng cụ') || nameLower.includes('dung cu') ||
        nameLower.includes('mmtb') || nameLower.includes('ccdc')) {
        return { background: 'linear-gradient(90deg, #7c3aed, #9333ea)' } // purple-600 to purple-500
    }
    // Vận chuyển - Green
    if (nameLower.includes('vận chuyển') || nameLower.includes('van chuyen')) {
        return { background: 'linear-gradient(90deg, #16a34a, #22c55e)' } // green-600 to green-500
    }
    // Khác - Teal
    if (nameLower.includes('khác') || nameLower.includes('khac') || nameLower.includes('other')) {
        return { background: 'linear-gradient(90deg, #0d9488, #14b8a6)' } // teal-600 to teal-500
    }

    // Additional colors
    if (nameLower.includes('sơn') || nameLower.includes('son')) {
        return { background: 'linear-gradient(90deg, #db2777, #ec4899)' } // pink-600 to pink-500
    }
    if (nameLower.includes('điện') || nameLower.includes('dien')) {
        return { background: 'linear-gradient(90deg, #ca8a04, #eab308)' } // yellow-600 to yellow-500
    }
    if (nameLower.includes('nước') || nameLower.includes('nuoc')) {
        return { background: 'linear-gradient(90deg, #0891b2, #06b6d4)' } // cyan-600 to cyan-500
    }

    return { background: '#9ca3af' }
}

// Component to render category icon with proper styling
export const CategoryIconComponent = ({ categoryName, size = 14, className = '' }) => {
    const IconComponent = getCategoryIcon(categoryName)
    const colorClass = getCategoryIconColor(categoryName)

    return <IconComponent size={size} className={`${colorClass} ${className}`} />
}
