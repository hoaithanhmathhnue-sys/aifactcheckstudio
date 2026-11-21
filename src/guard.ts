/**
 * Chống bấm liên tục các nút xóa: sau khi một dòng bị xóa, danh sách dồn lên và
 * cú bấm thứ hai có thể rơi vào nút "Xóa" của dòng kế tiếp. Bỏ qua các cú bấm xóa
 * đến trong khoảng ngắn sau lần xóa trước.
 */
let last = 0;
export function allowDelete(ms = 700): boolean {
  const now = Date.now();
  if (now - last < ms) return false;
  last = now;
  return true;
}
