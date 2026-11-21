# AI FactCheck Studio

Phòng biên tập kiểm chứng thông tin trong dạy học trí tuệ nhân tạo – **Tin học 12 (KNTT), Chủ đề 1, Bài 1–2**. Webapp bổ trợ cho Biện pháp 04.

**Tác giả:** GV. Trần Thị Kim Thoa – Trường THPT Hoàng Diệu – Số 1 Mạc Đĩnh Chi, phường Phú Lợi, thành phố Cần Thơ.

App là công cụ **ghi nhận tiến trình biên tập**: không tự tìm nguồn, không xác minh sự thật, không gọi AI, không chấm đúng/sai. Có màn hình đăng nhập (tài khoản do giáo viên cấp, không hiện trên màn hình); không backend, không khóa API; dữ liệu lưu trên máy (localStorage), có xuất/nhập file sao lưu.

## Luồng dùng

Chọn tình huống → tách nhận định → ghi nguồn, bằng chứng → chọn nhãn (được nguồn hỗ trợ / cần sửa / chưa đủ bằng chứng) → phản biện → công bố → in, xuất Word (.docx) hoặc tải sao lưu (.json).

- Giáo viên: thư viện tình huống (3 tình huống có sẵn lấy từ biện pháp, có thể sao chép và sửa), bản phát in (Đề trước/Đề sau có ô mã ẩn danh và 4 yêu cầu), chế độ giáo viên (gợi ý xử lí, chấm điểm).
- Tài liệu in (chọn in từng tài liệu): Phiếu A, Phiếu B, rubric 10 điểm + rubric Phiếu B, phiếu cá nhân cuối Tiết 1 và Tiết 2, bảng tổng hợp trước – sau theo mã ẩn danh (khớp Bảng 1 của biện pháp).
- Học sinh: làm theo nhóm trên một máy; mã ẩn danh thay họ tên.
- Chạy offline sau lần mở đầu (PWA). Màn hình hẹp và chế độ chữ lớn để chiếu.

## Chạy và kiểm thử

```bash
npm install
npm run dev          # phát triển
npm run build        # kiểm tra kiểu + build
npm test             # kiểm thử đơn vị (vitest)
npm run build && node e2e/run.mjs        # kiểm thử trình duyệt thật (cần Playwright + Chromium)
# thêm AFS_USER=... AFS_PASS=... để chạy cả ca đăng nhập đúng
BASE_URL=https://<link-vercel> node e2e/run.mjs   # chạy cùng bộ kiểm thử trên bản đã deploy
```

## Triển khai

Vercel tự nhận Vite (`vercel.json` đã có tiêu đề bảo mật và cache). Router dùng `#/` nên không cần rewrite.

## Giới hạn cần biết

- Dữ liệu nằm riêng từng máy/trình duyệt. Máy dùng chung: cuối tiết tải sao lưu rồi bấm "Xóa tất cả hồ sơ trên máy này".
- "Chế độ giáo viên" chỉ đổi cách hiển thị, **không phải khóa bảo mật**.
- Đăng nhập kiểm tra ngay trên trình duyệt (mã nguồn chỉ giữ giá trị băm SHA-256, không giữ mật khẩu dạng chữ). Đây là lớp chặn người lạ, **không phải bảo mật mạnh**; muốn bảo mật thật cần máy chủ xác thực (vd. Firebase Auth). Sai 5 lần liên tiếp bị khóa 30 giây. Đổi tài khoản: sửa `USER_HASH`/`PASS_HASH` trong `src/auth.ts`.
- Nút "Kiểm tra" chỉ xem đã điền đủ trường.
- Tình huống có sẵn là **giả định do giáo viên biên soạn**, không phải đầu ra công cụ AI thật.
- Chưa có số liệu hiệu quả; chưa thử trên Safari/iOS, Firefox.

Thiết kế: `docs/KIEN-TRUC.md`. Kết quả thẩm định của Hội đồng: `docs/THAM-DINH.md`.
