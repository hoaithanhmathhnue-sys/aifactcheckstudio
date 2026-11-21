// Rubric theo mục 5.3 của biện pháp. Hai thang tách riêng, KHÔNG cộng thành điểm chính thức.

export interface Criterion {
  name: string;
  max: number;
  levels: string[]; // mô tả theo điểm từ cao xuống thấp
}

export const MAIN_RUBRIC: Criterion[] = [
  { name: 'Tách nhận định', max: 2, levels: ['2: tách rõ các nhận định có thể kiểm tra', '1: tách được nhưng còn ghép/mơ hồ', '0: không xác định được'] },
  {
    name: 'Chọn và ghi nguồn',
    max: 2,
    levels: [
      '2: nguồn phù hợp, truy xuất được bằng tên/trang hoặc URL',
      '1: nguồn có liên quan nhưng ghi thiếu',
      '0: không có nguồn phù hợp. Nếu chưa có nguồn và chọn "chưa đủ bằng chứng", xem lí do ở tiêu chí kết luận, không tự động trừ các tiêu chí khác',
    ],
  },
  {
    name: 'Đối chiếu bằng chứng',
    max: 3,
    levels: ['3: nêu chính xác nội dung liên quan và giải thích phạm vi', '2: có đối chiếu nhưng còn thiếu', '1: dẫn nguồn chưa giải thích', '0: không có đối chiếu'],
  },
  {
    name: 'Kết luận và sửa',
    max: 2,
    levels: [
      '2: nhãn hợp lí, lí do và cách sửa có giới hạn (chọn "chưa đủ bằng chứng" hợp lí vẫn có thể đạt điểm tối đa)',
      '1: nhãn hợp lí nhưng giải thích/sửa còn thiếu',
      '0: kết luận tùy tiện',
    ],
  },
  {
    name: 'Trách nhiệm khi dùng AI',
    max: 1,
    levels: ['1: khai báo trung thực có/không dùng AI và nêu cách kiểm tra hoặc bảo vệ dữ liệu', '0: không khai báo hoặc khai báo không rõ'],
  },
];

export const APPB_RUBRIC: Criterion[] = [
  { name: 'Nêu đúng ứng dụng', max: 2, levels: ['0–2 điểm'] },
  { name: 'Phân tích lợi ích', max: 2, levels: ['0–2 điểm'] },
  { name: 'Nêu rủi ro', max: 2, levels: ['0–2 điểm'] },
  { name: 'Đề xuất kiểm tra/giảm rủi ro', max: 2, levels: ['0–2 điểm'] },
];

export const sum = (xs: (number | null)[]): number => xs.reduce<number>((a, b) => a + (b ?? 0), 0);
export const filled = (xs: (number | null)[]): boolean => xs.every((x) => x !== null);

export const RUBRIC_NOTE =
  'Chấm theo minh chứng thay vì số lượng nguồn; cho học sinh xem rubric trước. Hai thang (10 điểm và Phiếu B) không được cộng thành điểm chính thức nếu chưa quy định cách quy đổi.';
