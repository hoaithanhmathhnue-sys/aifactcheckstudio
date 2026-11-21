import { Claim, Workspace } from './model';
import { countWords, detectPersonalData } from './text';

export type TabId = 'draft' | 'verify' | 'apps' | 'review' | 'publish' | 'grade';

export interface Issue {
  key: string;
  level: 'warn' | 'info';
  tab: TabId;
  claimId?: string;
  message: string;
}

export const PUBLICATION_MIN = 80;
export const PUBLICATION_MAX = 120;
export const MIN_CLAIMS = 3;

const looksOnline = (loc: string) => /^https?:\/\//i.test(loc.trim());

/**
 * Nút "Kiểm tra": CHỈ xem đã điền đủ các trường hay chưa.
 * Không đánh giá nhận định đúng/sai, không xác minh nguồn có thật hay có hỗ trợ không.
 */
export function validateWorkspace(ws: Workspace): Issue[] {
  const out: Issue[] = [];
  const add = (i: Omit<Issue, 'key'>) => out.push({ ...i, key: `${i.tab}:${i.claimId ?? ''}:${out.length}` });

  if (ws.claims.length < MIN_CLAIMS) {
    add({ level: 'warn', tab: 'draft', message: `Mới có ${ws.claims.length} nhận định; bản thảo cần ít nhất ${MIN_CLAIMS}.` });
  }
  if (ws.claims.length > 0 && !ws.claims.some((c) => c.topic === 'limit')) {
    add({ level: 'info', tab: 'draft', message: 'Chưa có nhận định nào gắn chủ đề "Giới hạn / rủi ro" (tiết 2 cần ít nhất một).' });
  }

  ws.claims.forEach((c, i) => claimIssues(c, i + 1, add));

  if (ws.apps.length === 0) {
    add({ level: 'info', tab: 'apps', message: 'Chưa có dòng nào trong bảng ứng dụng AI (Phiếu B).' });
  }
  ws.apps.forEach((a, i) => {
    const miss = (
      [
        ['bối cảnh', a.context],
        ['công việc AI hỗ trợ', a.task],
        ['lợi ích', a.benefit],
        ['rủi ro/giới hạn', a.risk],
        ['việc con người kiểm tra/quyết định', a.humanCheck],
        ['cách giảm rủi ro', a.mitigation],
      ] as const
    )
      .filter(([, v]) => !v.trim())
      .map(([n]) => n);
    if (miss.length) add({ level: 'warn', tab: 'apps', message: `Ứng dụng ${i + 1}: còn thiếu ${miss.join(', ')}.` });
  });

  const words = countWords(ws.publication);
  if (words === 0) {
    add({ level: 'warn', tab: 'publish', message: 'Chưa viết bản công bố.' });
  } else if (words < PUBLICATION_MIN || words > PUBLICATION_MAX) {
    add({ level: 'warn', tab: 'publish', message: `Bản công bố dài ${words} từ; yêu cầu ${PUBLICATION_MIN}–${PUBLICATION_MAX} từ.` });
  }

  if (ws.ai.used === '') {
    add({ level: 'warn', tab: 'publish', message: 'Chưa khai báo có hay không sử dụng AI.' });
  } else if (ws.ai.used === 'yes') {
    if (!ws.ai.tool.trim() || !ws.ai.help.trim()) add({ level: 'warn', tab: 'publish', message: 'Đã chọn "có dùng AI": hãy ghi tên công cụ và phần việc AI hỗ trợ.' });
    if (!ws.ai.selfCheck.trim()) add({ level: 'warn', tab: 'publish', message: 'Hãy ghi phần nhóm tự kiểm tra khi dùng AI.' });
  }
  if (!ws.ai.dataProtection.trim()) {
    add({ level: 'warn', tab: 'publish', message: 'Chưa ghi cách bảo vệ dữ liệu cá nhân khi dùng AI.' });
  }

  const pd = personalData(ws);
  if (pd.length) {
    add({ level: 'warn', tab: 'publish', message: `Có chữ giống ${pd.join(', ')}. Xóa trước khi in hoặc chia sẻ, và không nhập thông tin cá nhân của người thật.` });
  }
  return out;
}

export function claimIssues(c: Claim, n: number, add: (i: Omit<Issue, 'key'>) => void) {
  const tag = `Nhận định ${n}`;
  if (!c.text.trim()) {
    add({ level: 'warn', tab: 'draft', claimId: c.id, message: `${tag}: chưa có nội dung.` });
    return;
  }
  const hasSource = c.source.title.trim() !== '' || c.source.locator.trim() !== '';
  if (!c.label) {
    add({ level: 'warn', tab: 'verify', claimId: c.id, message: `${tag}: chưa chọn nhãn kết luận.` });
  } else {
    if (!c.reason.trim()) add({ level: 'warn', tab: 'verify', claimId: c.id, message: `${tag}: chưa ghi lí do cho nhãn.` });
    if (!hasSource && !c.source.noSourceFound) {
      add({
        level: 'warn',
        tab: 'verify',
        claimId: c.id,
        message: `${tag}: chưa ghi nguồn. Hãy ghi nguồn, hoặc tích "Chưa tìm được nguồn". Nhãn "Chưa đủ bằng chứng" vẫn được chọn.`,
      });
    }
    if (c.source.noSourceFound && c.label === 'supported') {
      add({ level: 'warn', tab: 'verify', claimId: c.id, message: `${tag}: đã tích "chưa tìm được nguồn" nhưng nhãn là "Được nguồn hỗ trợ". Hai điều này mâu thuẫn.` });
    }
  }
  if (hasSource && looksOnline(c.source.locator) && !c.source.accessDate) {
    add({ level: 'warn', tab: 'verify', claimId: c.id, message: `${tag}: nguồn trực tuyến cần ghi ngày truy cập.` });
  }
  if (hasSource && !c.evidence.trim()) {
    add({ level: 'warn', tab: 'verify', claimId: c.id, message: `${tag}: có nguồn nhưng chưa tóm tắt nội dung nguồn nói gì (bằng chứng).` });
  }
  if (c.label && !c.rewrite.trim()) {
    add({ level: 'info', tab: 'verify', claimId: c.id, message: `${tag}: chưa viết lại nhận định cho an toàn hơn.` });
  }
}

function personalData(ws: Workspace): string[] {
  const parts: string[] = [ws.name, ws.classLabel, ws.publication, ws.extraSources, ws.ai.tool, ws.ai.help, ws.ai.selfCheck, ws.ai.dataProtection];
  for (const c of ws.claims) {
    parts.push(c.text, c.broadTerms, c.source.title, c.source.author, c.evidence, c.reason, c.rewrite, c.remaining, c.review.reviewer, c.review.comment, c.review.fixed, c.review.because, c.review.remaining);
  }
  for (const a of ws.apps) parts.push(a.context, a.task, a.benefit, a.risk, a.humanCheck, a.mitigation, a.sources);
  const found = new Set<string>();
  for (const p of parts) for (const f of detectPersonalData(p)) found.add(f);
  return [...found];
}

/** Cảnh báo riêng một nhận định (dùng hiển thị ngay trên thẻ khi đã chọn nhãn). */
export function claimWarnings(c: Claim, n: number): string[] {
  if (!c.label) return [];
  const out: string[] = [];
  claimIssues(c, n, (i) => {
    if (i.level === 'warn') out.push(i.message);
  });
  return out;
}
