import { LABELS, SUPPORTS, Source, Workspace, LESSONS } from './model';
import { formatDateVN } from './text';

export function formatSource(s: Pick<Source, 'title' | 'author' | 'locator' | 'accessDate'>): string {
  const parts = [s.author.trim(), s.title.trim(), s.locator.trim()].filter(Boolean);
  let out = parts.join('. ');
  if (s.accessDate) out += (out ? ' ' : '') + `(truy cập ${formatDateVN(s.accessDate)})`;
  return out;
}

/** Danh mục nguồn gom từ các nhận định, bỏ trùng. */
export function compileSources(ws: Workspace): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of ws.claims) {
    if (!c.source.title.trim() && !c.source.locator.trim()) continue;
    const f = formatSource(c.source);
    if (!seen.has(f)) {
      seen.add(f);
      out.push(f);
    }
  }
  return out;
}

export const labelText = (l: keyof typeof LABELS | ''): string => (l ? LABELS[l] : '(chưa chọn)');
export const supportsText = (s: keyof typeof SUPPORTS | ''): string => (s ? SUPPORTS[s] : '');
export const lessonText = (l: keyof typeof LESSONS): string => LESSONS[l];

export function aiDeclarationText(ws: Workspace): string {
  const a = ws.ai;
  if (a.used === 'no') return 'Nhóm không sử dụng AI.' + (a.dataProtection ? ` Bảo vệ dữ liệu: ${a.dataProtection}` : '');
  if (a.used === 'yes') {
    return [
      `Nhóm có sử dụng AI. Công cụ: ${a.tool || '(chưa ghi)'}.`,
      `Phần việc AI hỗ trợ: ${a.help || '(chưa ghi)'}.`,
      `Phần nhóm tự kiểm tra: ${a.selfCheck || '(chưa ghi)'}.`,
      a.dataProtection ? `Bảo vệ dữ liệu: ${a.dataProtection}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
  return '(chưa khai báo)';
}

export function hasGrades(ws: Workspace): boolean {
  return ws.grading.main.some((x) => x !== null) || ws.grading.appB.some((x) => x !== null) || ws.grading.note.trim() !== '';
}
