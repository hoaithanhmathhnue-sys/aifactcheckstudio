# Thẩm định của Hội đồng – AI FactCheck Studio (Vòng 3–5)

Nguồn bằng chứng: 20 kiểm thử đơn vị (`npm test`) + 52 kiểm tra trình duyệt thật (`e2e/run.mjs`, Chromium) + đọc mã. Chưa thử trên Safari/iOS/Firefox và chưa có học sinh dùng thật.

## Vòng 3 – Lỗi từng ghế nêu và tình trạng

**Ghế 5 – Kiểm thử viên**
| # | Vị trí | Mức | Lỗi | Trạng thái |
|---|---|---|---|---|
| 5.1 | `src/text.ts` (biểu thức từ tuyệt đối) | Chặn | `\%` là escape không hợp lệ ở chế độ Unicode: **app sập ngay khi mở**. `npm run build` không bắt được, kiểm thử đơn vị bắt được | Đã sửa |
| 5.2 | `Workspace.tsx` `removeClaim` / `removeApp` | Nặng | Bấm đúp "Xóa": dòng dồn lên, cú bấm thứ hai xóa luôn dòng kế tiếp (đo được: 5 → 3 nhận định) | Đã sửa: `src/guard.ts` bỏ qua cú bấm xóa trong 700 ms; áp dụng cả Home, Cases |
| 5.3 | `useWorkspace.ts` | Nặng | Hai tab cùng sửa: cần tránh ghi đè lặng lẽ | Đạt: tab không gõ dở tự cập nhật; tab gõ dở và lưu sau bị báo xung đột, giữ nguyên chữ trên màn hình, có "Ghi đè"/"Tải bản mới" |
| 5.4 | Ca biên khác | — | 0 nhận định, 30 nhận định (giới hạn), 200 hồ sơ, tên có dấu + emoji, ký tự điều khiển trong Word, file nhập rác / quá 1 MB, mất mạng, trình duyệt chặn lưu | Đạt |

**Ghế 6 – Săn lỗi hiệu năng** (cách đo lại: `node e2e/run.mjs`)
| # | Vị trí | Mức | Phát hiện | Số đo |
|---|---|---|---|---|
| 6.1 | Mở app | — | 4G giả lập + CPU chậm ×4 | 1,2–1,3 s (mốc 2 s). JS ban đầu 93 KB gzip |
| 6.2 | `Verify.tsx` | Nhẹ | 30 thẻ × ~12 ô nhập = hơn 300 điều khiển | Gõ p95 17 ms, đổi tab 83 ms (mốc 300 ms). Đã thu gọn thẻ, chỉ thẻ đầu mở sẵn |
| 6.3 | `validate.ts` khi bảng "Kiểm tra" mở | Nhẹ | Chạy lại mỗi lần gõ (regex trên mọi ô) | Đã đo cùng ca 30 nhận định: không thấy chậm |
| 6.4 | Listener / rò bộ nhớ | — | Vào/ra hồ sơ 40 lần | Listener không tăng (1341 → 172 sau GC) |
| 6.5 | `Home.tsx` `reconcile` | Nhẹ | 200 hồ sơ, mất chỉ mục | Dựng lại 191 ms |
| 6.6 | Gói `docx` | Nhẹ | 183 KB (53 KB gzip), nạp muộn, nhưng service worker tải sẵn nền để dùng offline | Chấp nhận |

**Ghế 7 – An toàn và phân quyền**
| # | Vị trí | Mức | Lỗi | Trạng thái |
|---|---|---|---|---|
| 7.1 | `Home.tsx` | Nặng | Máy phòng tin dùng chung: nhóm sau thấy/sửa hồ sơ nhóm trước | Giảm nhẹ: banner cảnh báo + nút "Xóa tất cả hồ sơ" 2 bước. **Không thể chặn hẳn khi không có tài khoản** |
| 7.2 | `vercel.json` | Nặng | Thiếu CSP và tiêu đề bảo mật | Đã thêm CSP (`script-src 'self'`, `connect-src 'self'`), nosniff, no-referrer, DENY frame |
| 7.3 | `storage.ts` `parseImport`, `model.ts` `san*` | Nặng | File nhập độc: nhãn lạ, chuỗi quá dài, id trùng, "AI thật" giả | Đã chặn: ép kiểu, cắt độ dài, tạo bản mới không ghi đè; kiểm thử đơn vị + e2e |
| 7.4 | `ui.tsx` `Locator` | Nặng | `javascript:` trong đường dẫn nguồn | Chỉ http/https mới thành liên kết; e2e xác nhận |
| 7.5 | Chế độ giáo viên | Nhẹ | Học sinh tự bật được | Nêu rõ không phải khóa bảo mật; gợi ý xử lí không phải đáp án chấm |
| 7.6 | Mã nguồn | — | Khóa/bí mật | Không có; `npm audit --omit=dev`: 0 lỗ hổng |

**Ghế 8 – Giáo viên dùng thật (3 phút đầu)**
| # | Vị trí | Mức | Ức chế | Trạng thái |
|---|---|---|---|---|
| 8.1 | `Verify.tsx` | Nặng | Mỗi thẻ nhận định dài hơn 1 màn hình; 4 nhận định phải cuộn rất nhiều trong tiết 45 phút | Đã thu gọn thẻ, "Mở tất cả" |
| 8.2 | Toast "sẵn sàng dùng offline" | Nhẹ | Hiện ngay lần mở đầu | Giữ (4 giây, đóng được) |
| 8.3 | Phân vai 4–5 em (biên tập, kiểm chứng nguồn, phản biện, báo cáo) | Nhẹ | App chưa ghi vai | Chưa làm: biện pháp 4.2 không yêu cầu; có thể thêm |
| 8.4 | Phản biện chéo giữa hai nhóm | Nhẹ | Phải đổi máy hoặc dùng phiếu giấy; chưa gộp file phản biện | Ghi rõ trong tab Phản biện |
| 8.5 | Thiết bị | Nhẹ | Ô ngày theo định dạng của trình duyệt | Chấp nhận |

**Ghế 1/2/3 tự rà** (Tổ sản xuất)
- 1.1 `storage.ts` — Nhẹ: hồ sơ bị xóa ở tab khác rồi tab này lưu sẽ tạo lại hồ sơ. Chấp nhận, ghi lại.
- 1.2 `model.ts` — Nhẹ: có `v: 1` nhưng chưa có đường nâng cấp schema; làm khi đổi cấu trúc.
- 2.1 `Workspace.tsx` — Nhẹ: giới hạn 30 viết cứng → đã dùng `LIMITS`.
- 2.2 `Draft.tsx` — Nhẹ: `document.querySelectorAll` để chuyển con trỏ, phụ thuộc DOM. Chấp nhận.
- 3.1 Chưa đo trên máy yếu thật; đã đo CPU chậm ×4.

## Vòng 4 – Chấm lại (thang 10)

| Tiêu chí | Điểm | Căn cứ |
|---|---|---|
| Đúng nghiệp vụ | 8 | Đủ 7 ràng buộc của biện pháp; thiếu phân vai nhóm |
| Chính xác dữ liệu | 8 | `rev` chống ghi đè, nhập file được làm sạch, chỉ mục tự chữa lành; dữ liệu theo từng máy |
| Mượt | 9 | Mở 1,2 s (throttle), gõ 17 ms, đổi tab 83 ms |
| Ổn định | 7 | 72 kiểm tra đạt, nhưng mới chạy Chromium; chưa Safari/iOS/Firefox |
| Dễ dùng | 7 | Đã rút gọn màn hình, vẫn chưa có học sinh dùng thật |

Không tiêu chí nào dưới 7, không cần quay lại vòng 3.

## Vòng 5 – Bảng ưu tiên sửa còn lại

| Lỗi | Nguyên nhân gốc | Cách sửa | Công sức | Rủi ro nếu không sửa |
|---|---|---|---|---|
| Máy dùng chung lộ hồ sơ giữa các nhóm | Không có tài khoản (đúng yêu cầu bản đầu) | Dọn máy cuối tiết; nếu cần bền hơn thì làm bản có đăng nhập | Ít (quy trình) / Nhiều (bản đăng nhập) | Trung bình |
| Chưa thử Safari/iOS/Firefox | Môi trường kiểm thử chỉ có Chromium | Cô thử 1 iPhone + 1 máy Firefox | Ít | Trung bình |
| Chưa gộp phản biện chéo qua file | Lưu cục bộ | Thêm "nhập phản biện từ file" nếu lớp hay đổi máy | Vừa | Thấp |
| Chưa có phân vai trong nhóm | Ngoài phạm vi 4.2 | Thêm ô "vai" cho mỗi thành viên | Ít | Thấp |
| UNESCO chưa mở kiểm được | Trang chặn công cụ đọc | Cô mở thử trước khi dùng | Ít | Thấp |
| Chưa có số liệu hiệu quả | Chưa dạy thật | Thu theo mục 5.5 của biện pháp | — | Cao nếu khẳng định hiệu quả |
