import { sha256Hex } from './sha256';

/*
 * Cổng đăng nhập phía trình duyệt (không có máy chủ).
 * Mã nguồn chỉ giữ giá trị băm SHA-256, không giữ tên đăng nhập/mật khẩu dạng chữ.
 * Đây là lớp chặn người lạ mở app, KHÔNG phải bảo mật mạnh: ai đọc được mã nguồn và
 * đoán được mật khẩu ngắn vẫn vượt qua được. Muốn bảo mật thật cần máy chủ xác thực.
 */
const USER_HASH = '55773c44eee452aa65c990a9d3cb81a327b182c89aa340b97e76981e6318c9a7';
const PASS_HASH = '8e1e65974f015329a913ea3f0d1419abf9d2f95ecfa9c04a772a357a6748c8f0';
const TOKEN = sha256Hex('afs|session|' + USER_HASH + PASS_HASH);
export const AUTH_KEY = 'afs.v1.auth';

/** Chuẩn hóa tên đăng nhập: dựng sẵn dấu (NFC, gõ Unikey/VNI đều khớp), bỏ khoảng trắng thừa, không phân biệt hoa thường. */
export function normalizeUser(s: string): string {
  return s.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

export function checkLogin(user: string, pass: string): boolean {
  const u = sha256Hex('afs|u|' + normalizeUser(user));
  const p = sha256Hex('afs|p|' + pass);
  return u === USER_HASH && p === PASS_HASH;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
const stores = (): Storage[] => {
  const out: Storage[] = [];
  try { out.push(window.localStorage); } catch { /* bị chặn */ }
  try { out.push(window.sessionStorage); } catch { /* bị chặn */ }
  return out;
};

export function isLoggedIn(): boolean {
  for (const s of stores()) {
    try {
      if (s.getItem(AUTH_KEY) === TOKEN) return true;
    } catch { /* bỏ qua */ }
  }
  return false;
}

/** remember = true: nhớ trên máy này (localStorage); false: chỉ đến khi đóng tab (sessionStorage). */
export function saveLogin(remember: boolean): void {
  const list = stores();
  const target = remember ? list[0] : list[1] ?? list[0];
  try { target?.setItem(AUTH_KEY, TOKEN); } catch { /* bộ nhớ bị chặn: chỉ đăng nhập trong lượt mở này */ }
}

export function logout(): void {
  for (const s of stores()) {
    try { s.removeItem(AUTH_KEY); } catch { /* bỏ qua */ }
  }
}
