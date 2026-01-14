import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

// Register Service Worker for PWA with update checking
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration)

        // Kiểm tra cập nhật định kỳ mỗi 60 giây khi app đang hoạt động
        // Điều này giúp người dùng PWA trên Home Screen phát hiện bản mới nhanh hơn
        setInterval(() => {
          registration.update()
            .then(() => console.log('SW update check completed'))
            .catch((err) => console.log('SW update check failed:', err))
        }, 60 * 1000) // 60 seconds

        // Kiểm tra cập nhật ngay khi app được focus trở lại
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update()
          }
        })
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
