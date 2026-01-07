const PageHeader = ({ title, subtitle, rightAction }) => {
    return (
        <div className="mb-5">
            {/* Title với shape decoration */}
            <div className="text-center">
                <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                {/* Decorative shape dưới title */}
                <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="w-8 h-1 bg-primary rounded-full"></span>
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                </div>
            </div>

            {/* Subtitle và action */}
            {(subtitle || rightAction) && (
                <div className="flex items-center justify-center mt-3">
                    {subtitle && (
                        <p className="text-sm text-gray-500">{subtitle}</p>
                    )}
                    {rightAction && (
                        <div className="absolute right-5">
                            {rightAction}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default PageHeader
