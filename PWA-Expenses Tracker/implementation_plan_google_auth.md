# Kế hoạch triển khai: Đăng nhập bằng Google (Google OAuth)

Để tích hợp tính năng đăng nhập bằng Google, chúng ta cần thực hiện các bước cấu hình trên Google Cloud Platform và Supabase trước khi cập nhật Code.

## Giai đoạn 1: Cấu hình Google Cloud Platform (GCP)
*(Bạn cần thực hiện bước này)*

1.  Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2.  Tạo một Project mới (nếu chưa có).
3.  **Cấu hình OAuth Consent Screen:**
    *   Truy cập **APIs & Services** > **OAuth consent screen**.
    *   Chọn **External** > **Create**.
    *   Điền **App Name** (ví dụ: Cost Tracker), **User support email**, và **Developer contact information**.
    *   Nhấn **Save and Continue** (có thể bỏ qua các bước Scopes và Test users).
4.  **Tạo Credentials (Lấy API Keys):**
    *   Truy cập **APIs & Services** > **Credentials**.
    *   Nhấn **Create Credentials** > **OAuth client ID**.
    *   **Application type:** Chọn **Web application**.
    *   **Name:** Web Client 1 (hoặc tên tùy ý).
    *   **Authorized JavaScript origins:** Thêm các URL sau:
        *   `http://localhost:5173`
        *   `https://qswings.xyz` (Domain production của bạn)
        *   `https://<your-vercel-project>.vercel.app` (Domain Vercel của bạn)
    *   **Authorized redirect URIs:** Bạn cần lấy URL này từ Supabase (xem Giai đoạn 2 bên dưới).
        *   Thường có dạng: `https://<supabase-project-id>.supabase.co/auth/v1/callback`
    *   Nhấn **Create**.
    *   **LƯU LẠI:** Copy `Client ID` và `Client Secret`.

## Giai đoạn 2: Cấu hình Supabase
*(Bạn cần thực hiện bước này)*

1.  Truy cập **Supabase Dashboard** > Project của bạn.
2.  Vào **Authentication** > **Providers** > **Google**.
3.  Bật **Enable Google**.
4.  Điền thông tin từ Google Cloud:
    *   **Client ID:** Dán Client ID vừa copy.
    *   **Client Secret:** Dán Client Secret vừa copy.
5.  **Copy "Callback URL (for OAuth)"**:
    *   Copy dòng URL này và quay lại **Google Cloud Console** (Bước 4 ở trên), dán vào mục **Authorized redirect URIs**.
6.  Nhấn **Save** trên Supabase.

## Giai đoạn 3: Cập nhật Code (Tôi sẽ thực hiện)

1.  **Cập nhật `src/contexts/AuthContext.jsx`:**
    *   Thêm hàm `signInWithGoogle` sử dụng `supabase.auth.signInWithOAuth`.
    *   Cấu hình `redirectTo` sử dụng `window.location.origin` để hỗ trợ cả localhost và production.

2.  **Cập nhật `src/pages/Login.jsx`:**
    *   Thêm nút "Tiếp tục với Google" vào giao diện.
    *   Thêm divider "Hoặc".
    *   Xử lý sự kiện click để gọi hàm `signInWithGoogle`.

3.  **Cập nhật `src/styles/index.css`:**
    *   Thêm style cho nút Google (màu trắng, viền xám, icon Google màu, hover effect).
    *   Thêm style cho Divider.

## Ghi chú quan trọng
*   Đăng nhập bằng Google sẽ tự động bỏ qua bước xác thực email (vì Google đã xác thực rồi).
*   Nếu email Google trùng với email đã đăng ký thủ công, Supabase sẽ tự động liên kết tài khoản (nếu được cấu hình cho phép, mặc định là có).
