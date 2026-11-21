# AI FactCheck Studio – Kiến trúc (Vòng 2, Ghế 1 chốt trước khi viết code)

Biện pháp 04, Tin học 12 (KNTT), Chủ đề 1, Bài 1–2. App là **công cụ ghi nhận tiến trình biên tập**: không tự tìm nguồn, không xác minh sự thật, không gọi AI, không chấm đúng/sai.

## 1. Quyết định công nghệ và lý do

| Quyết định | Lý do |
|---|---|
| Vite + React 19 + TypeScript, hash-router tự viết | Giống các app trước của cô; hash-router chạy được trên Vercel tĩnh và khi offline, không cần rewrite |
| Không backend, không tài khoản, không khóa API | Đúng mục 4.1 và 4.3 của biện pháp; không có gì để lộ khóa; không có dữ liệu học sinh rời máy |
| Lưu bằng `localStorage`, mỗi hồ sơ một khóa | Dữ liệu chỉ là chữ (vài chục KB/hồ sơ); đọc đồng bộ, không cần thư viện; chặn ghi đè nhờ số phiên bản `rev` |
| Sao lưu/khôi phục bằng file JSON | Cách duy nhất để chuyển hồ sơ giữa các máy và để giáo viên gom bài nộp khi không có máy chủ |
| PWA (service worker, kiểu "hỏi trước khi cập nhật") | Chạy offline sau lần mở đầu; **không tự tải lại trang** để không mất chữ đang gõ |
| Xuất Word bằng `docx`, nạp muộn (dynamic import) | Không làm chậm lúc mở app; chỉ tải khi bấm "Xuất Word" |
| In bằng CSS `@media print` | Không thêm thư viện; là phương án thay thế khi không dùng được Word |
| CSS tự viết, phông hệ thống | Không tải phông ngoài (offline, nhanh); chữ có dấu tiếng Việt hiển thị chuẩn |

## 2. Mô hình dữ liệu (`src/model.ts`)

```
Workspace (Hồ sơ nhóm)             1 khóa: afs.v1.ws.<id>
  id, rev, createdAt, updatedAt
  name            tên nhóm hoặc MÃ ẨN DANH (không họ tên đầy đủ)
  classLabel      lớp (tùy chọn)
  caseSnapshot    bản chụp tình huống tại lúc tạo (sửa thư viện không làm đổi hồ sơ đã có)
  claims[]        Claim  (tối đa 30)
  apps[]          AppRow (Phiếu B, tối đa 10)
  publication     bản công bố 80–120 từ
  extraSources    nguồn bổ sung viết tay
  ai              khai báo: used (yes/no), tool, help, selfCheck, dataProtection
  grading         điểm rubric của giáo viên (tùy chọn)

Claim: id, text, kind(fact|opinion), topic, broadTerms,
       source{title,author,locator,accessDate,noSourceFound},
       evidence, label(supported|needs_fix|insufficient|""), reason,
       rewrite, remaining,
       review{reviewer, supports(yes|partly|no|unchecked), comment, fixed, because, remaining}

AppRow: context, task, benefit, risk, humanCheck, mitigation, sources

Case (Tình huống)
  built-in (trong mã, 3 tình huống lấy từ mục 3.3 và 5.4 của biện pháp)
  hoặc của giáo viên: khóa afs.v1.cases
  origin: assumed | real  (assumed luôn hiện nhãn "GIẢ ĐỊNH do giáo viên biên soạn";
          real bắt buộc ghi tên công cụ và tích "đã kiểm tra, được phép dùng")
```

Khóa phụ: `afs.v1.index` (danh sách hồ sơ để vẽ trang chủ), `afs.v1.prefs` (chế độ chiếu, chế độ giáo viên).

## 3. Mỗi màn hình đọc bao nhiêu bản ghi (cam kết)

| Màn hình | Đọc | Ghi |
|---|---|---|
| Trang chủ (danh sách hồ sơ) | 1 khóa `index` | không |
| Thư viện tình huống | tình huống có sẵn (trong mã) + 1 khóa `cases` | khi lưu/xóa tình huống của giáo viên |
| Mở một hồ sơ | đúng 1 khóa `ws.<id>` (không đụng hồ sơ khác) | gộp mỗi 500 ms khi sửa: 1 khóa `ws.<id>` + 1 khóa `index` |
| Tài liệu in (phiếu trắng, rubric) | 0 | không |

Thứ tự ghi: **hồ sơ trước, chỉ mục sau**. Nếu bị ngắt giữa chừng, lần mở sau tự dựng lại chỉ mục từ các khóa `ws.*` (tự chữa lành).

## 4. Chống mất dữ liệu / ghi đè

1. **Tự lưu gộp 500 ms**, đồng thời lưu ngay khi trang ẩn (`visibilitychange`, `pagehide`).
2. **Hai tab cùng một trình duyệt:** trước khi ghi so `rev` đã đọc với `rev` đang lưu. Lệch → không ghi đè lặng lẽ, hiện thanh báo với hai lựa chọn "Tải bản mới" / "Ghi đè bằng bản của tôi". Sự kiện `storage` báo sớm.
3. **Hai máy khác nhau:** dữ liệu nằm riêng từng máy (app nói rõ điều này). Gộp bằng sao lưu JSON.
4. **Bộ nhớ đầy / chế độ riêng tư chặn lưu:** bắt lỗi `setItem`, giữ dữ liệu trong bộ nhớ trang, hiện thanh báo đỏ + nút "Tải file sao lưu"; không làm mất chữ đang gõ.
5. **Xóa có hoàn tác** (thanh "Hoàn tác" 8 giây) thay cho hộp thoại xác nhận; bấm nút liên tục không nhân đôi hay làm hỏng dữ liệu.
6. **Nhập file JSON:** giới hạn 1 MB, kiểm tra kiểu, ép nhãn về giá trị hợp lệ, cắt độ dài, sinh `id` mới nếu trùng; không bao giờ ghi đè hồ sơ cũ (luôn tạo bản mới).

## 5. Mốc hiệu năng (Ghế 3 đặt trước, Ghế 6 sẽ đo lại)

- Mở app dưới 2 giây trên mạng 4G giả lập: JS ban đầu ≤ 130 KB gzip; `docx` (nạp muộn) không tính.
- Mọi thao tác phản hồi dưới 300 ms, kể cả hồ sơ 30 nhận định.
- Mỗi thẻ nhận định là `React.memo`; gõ vào một thẻ không dựng lại thẻ khác.
- Không có ảnh lớn; biểu tượng PWA là PNG nhỏ; không phông ngoài.
- Listener (`storage`, `visibilitychange`, `pagehide`, hash) đều gỡ khi gỡ component.

## 6. Quy tắc nghiệp vụ không được vi phạm (lấy từ biện pháp)

1. Nhãn "chưa đủ bằng chứng" luôn chọn được, kể cả khi chưa có nguồn.
2. Nhận định cần nguồn mà chưa điền → **cảnh báo**, vẫn cho tích "Chưa tìm được nguồn" và vẫn lưu/xuất, không ép kết luận.
3. Nút "Kiểm tra" chỉ xem đã điền đủ trường; không nói nhận định đúng hay sai.
4. Tình huống giả định luôn gắn nhãn giả định; không bao giờ ghi là đầu ra của một công cụ AI.
5. Không nhập họ tên đầy đủ/thông tin nhạy cảm: nhãn trường "mã ẩn danh" + cảnh báo khi phát hiện email, số điện thoại, dãy số giống số định danh.
6. Phiếu B và rubric 10 điểm tách riêng; **không cộng hai thang** thành điểm chính thức.
7. Y tế: chỉ bàn AI **hỗ trợ bác sĩ**; ô bối cảnh y tế có nhắc cố định.

## 7. Cấu trúc thư mục

```
src/model.ts       kiểu dữ liệu, hàm tạo, chuẩn hóa/cắt/ép giá trị (dùng cho cả nhập file)
src/storage.ts     đọc/ghi localStorage, rev, chỉ mục tự chữa lành, import/export JSON
src/text.ts        từ tuyệt đối, đếm từ, phát hiện dữ liệu cá nhân, làm sạch ký tự điều khiển
src/validate.ts    nút "Kiểm tra" (chỉ kiểm tra điền đủ trường)
src/cases.ts       3 tình huống có sẵn + bộ nguồn phát sẵn
src/rubric.ts      rubric 10 điểm (mục 5.3) và rubric Phiếu B (4 tiêu chí 0–2)
src/exportDocx.ts  xuất Word (nạp muộn)
src/store.ts       hook useWorkspace: reducer + tự lưu + phát hiện xung đột
src/pages/*        Home, Cases, CaseEditor, Workspace (+ các tab), Print
tests/*.test.ts    kiểm thử đơn vị
e2e/run.mjs        kiểm thử trình duyệt thật (Playwright) cho các ca biên
```
