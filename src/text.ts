// Hàm xử lý chữ thuần túy (không phụ thuộc React) để kiểm thử được.

export const nfc = (s: string): string => s.normalize('NFC');

/** Cắt chuỗi theo độ dài, không cắt đôi cặp surrogate (emoji). */
export function clampStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  let s = v;
  if (s.length > max) {
    s = s.slice(0, max);
    const last = s.charCodeAt(s.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) s = s.slice(0, -1);
  }
  return s;
}

/** Bỏ ký tự điều khiển/surrogate mồ côi mà XML (Word) không chấp nhận. */
export function cleanXml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1');
}

export function uid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Mở qua http trong mạng LAN thì không có randomUUID
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Từ ngữ làm nhận định có phạm vi rộng. Thứ tự: cụm dài trước. */
export const BROAD_TERMS = [
  'không bao giờ',
  'bao giờ cũng',
  'lúc nào cũng',
  'luôn luôn',
  'tất cả',
  'toàn bộ',
  'hoàn toàn',
  'chắc chắn',
  'duy nhất',
  'mọi',
  'luôn',
  'đều',
  '100%',
];

const termRe = new RegExp(
  '(?<![\\p{L}\\p{N}])(' +
    BROAD_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
    ')(?![\\p{L}\\p{N}])',
  'giu',
);

export interface Piece {
  t: string;
  hit: boolean;
}

/** Tách chữ thành các đoạn, đánh dấu đoạn trùng từ tuyệt đối. */
export function highlightBroad(text: string): Piece[] {
  const s = nfc(text);
  const out: Piece[] = [];
  let last = 0;
  termRe.lastIndex = 0;
  for (const m of s.matchAll(termRe)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: s.slice(last, i), hit: false });
    out.push({ t: m[0], hit: true });
    last = i + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last), hit: false });
  return out;
}

export function findBroadTerms(text: string): string[] {
  const seen = new Set<string>();
  const res: string[] = [];
  for (const p of highlightBroad(text)) {
    if (!p.hit) continue;
    const k = p.t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      res.push(k);
    }
  }
  return res;
}

/** Đếm từ theo khoảng trắng (mỗi tiếng tiếng Việt tính một đơn vị); bỏ ký hiệu đứng riêng. */
export function countWords(text: string): number {
  if (!text) return 0;
  return text
    .split(/\s+/u)
    .filter((tok) => /[\p{L}\p{N}]/u.test(tok)).length;
}

/** Tách bản thảo thành câu (gợi ý "tách sẵn"). */
export function splitSentences(text: string): string[] {
  return nfc(text)
    .split(/(?<=[.!?…])\s+/u)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

const URL_RE = /https?:\/\/\S+/giu;

/** Phát hiện chữ giống thông tin cá nhân. Chỉ nhắc, không chặn. */
export function detectPersonalData(text: string): string[] {
  const s = text.replace(URL_RE, ' ');
  const found: string[] = [];
  if (/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)+/u.test(s)) found.push('địa chỉ email');
  if (/(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/.test(s)) found.push('số điện thoại');
  const noPhone = s.replace(/(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/g, ' ');
  if (/(?<!\d)\d{9}(?:\d{3})?(?!\d)/.test(noPhone)) found.push('dãy số giống số định danh');
  return found;
}

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Tên file an toàn: bỏ dấu, chỉ giữ chữ-số-gạch. */
export function slug(s: string, fallback = 'hoso'): string {
  const r = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return r || fallback;
}

export function formatDateTime(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** yyyy-mm-dd -> dd/mm/yyyy; giá trị lạ giữ nguyên. */
export function formatDateVN(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
