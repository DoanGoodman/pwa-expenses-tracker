import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Component hiển thị thông báo khi có bản cập nhật PWA mới
 * Sử dụng Service Worker API để phát hiện và kích hoạt cập nhật
 */
const UpdateNotification = () => {
    const [waitingWorker, setWaitingWorker] = useState(null);
    const [showUpdate, setShowUpdate] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const isUpdatingRef = useRef(false); // Dùng ref để tránh stale closure

    /**
     * Kiểm tra SW đang chờ và thiết lập listeners
     */
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        // Lắng nghe khi có SW mới được cài đặt
        const handleRegistration = (registration) => {
            // Kiểm tra nếu đã có SW đang chờ sẵn
            if (registration.waiting) {
                setWaitingWorker(registration.waiting);
                setShowUpdate(true);
                return;
            }

            // Lắng nghe khi có SW mới đang cài đặt
            if (registration.installing) {
                const installingWorker = registration.installing;
                installingWorker.addEventListener('statechange', () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        setWaitingWorker(installingWorker);
                        setShowUpdate(true);
                    }
                });
            }

            // Lắng nghe sự kiện updatefound cho các cập nhật tương lai
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            setWaitingWorker(newWorker);
                            setShowUpdate(true);
                        }
                    });
                }
            });
        };

        // Lấy registration hiện tại
        navigator.serviceWorker.ready.then(handleRegistration);

        // 🆕 Auto-check update khi app khởi động (quan trọng cho PWA standalone)
        const checkForUpdates = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    console.log('SW update check completed');
                }
            } catch (err) {
                console.log('SW update check failed:', err);
            }
        };

        // Check ngay khi mount
        checkForUpdates();

        // Check định kỳ mỗi 5 phút (cho PWA standalone luôn mở)
        const intervalId = setInterval(checkForUpdates, 5 * 60 * 1000);

        // Lắng nghe sự kiện controllerchange để reload trang
        // Sử dụng ref để tránh vấn đề stale closure
        const controllerChangeHandler = () => {
            console.log('Controller changed, isUpdating:', isUpdatingRef.current);
            if (isUpdatingRef.current) {
                window.location.reload();
            }
        };

        navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);

        // Cleanup
        return () => {
            clearInterval(intervalId);
            navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
        };
    }, []); // Không có dependency để handler được đăng ký 1 lần duy nhất

    /**
     * Gửi message SKIP_WAITING tới SW đang chờ
     */
    const handleUpdate = useCallback(() => {
        if (!waitingWorker) return;

        console.log('Sending SKIP_WAITING message...');

        // Update cả state và ref
        setIsUpdating(true);
        isUpdatingRef.current = true;

        // Gửi message tới SW
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });

        // Fallback: Nếu controllerchange không fire sau 3 giây, force reload
        setTimeout(() => {
            if (isUpdatingRef.current) {
                console.log('Fallback: Force reloading...');
                window.location.reload();
            }
        }, 3000);
    }, [waitingWorker]);

    /**
     * Đóng thông báo (ẩn tạm thời)
     */
    const handleDismiss = () => {
        setShowUpdate(false);
    };

    if (!showUpdate) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-4 mx-auto max-w-md">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-white/20 p-2 rounded-xl shrink-0">
                            <RefreshCw className={`w-5 h-5 text-white ${isUpdating ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white font-medium text-sm leading-tight">
                                Đã có phiên bản mới
                            </p>
                            <p className="text-white/70 text-xs mt-0.5">
                                Cập nhật để có trải nghiệm tốt nhất
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-semibold 
                         hover:bg-white/90 active:scale-95 transition-all duration-200
                         disabled:opacity-70 disabled:cursor-not-allowed
                         shadow-lg shadow-black/10"
                        >
                            {isUpdating ? 'Đang cập nhật...' : 'Cập nhật ngay'}
                        </button>

                        <button
                            onClick={handleDismiss}
                            disabled={isUpdating}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                            aria-label="Đóng thông báo"
                        >
                            <X className="w-5 h-5 text-white/80" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateNotification;
