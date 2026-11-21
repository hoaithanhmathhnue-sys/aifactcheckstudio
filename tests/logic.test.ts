import { describe, expect, it } from 'vitest';
import { countWords, detectPersonalData, findBroadTerms, highlightBroad, clampStr, cleanXml, slug, splitSentences, isHttpUrl } from '../src/text';
import { sanWorkspace, newWorkspace, emptyClaim, LIMITS } from '../src/model';
import { BUILT_IN_CASES } from '../src/cases';
import { MemoryKV, createStore, exportJson, parseImport, K, KV } from '../src/storage';
import { validateWorkspace } from '../src/validate';

const mk = () => newWorkspace(BUILT_IN_CASES[0], 'N1');

describe('text', () => {
  it('tìm từ tuyệt đối có dấu, hoa/thường, cả dạng NFD', () => {
    expect(findBroadTerms('Mọi công cụ AI đều hiểu. Kết quả luôn chính xác.')).toEqual(['mọi', 'đều', 'luôn']);
    expect(findBroadTerms('MỌI người'.normalize('NFD'))).toEqual(['mọi']);
  });
  it('không bắt nhầm từ chứa "luôn" hay "mọi" bên trong từ khác', () => {
    expect(findBroadTerms('luônluôn không bao giờ tới')).toEqual(['không bao giờ']);
    expect(findBroadTerms('Các bạn đang mơi mọi')).toEqual(['mọi']);
    expect(findBroadTerms('thường xuyên, hoàn toàn khác')).toEqual(['hoàn toàn']);
  });
  it('highlight bảo toàn nguyên văn', () => {
    const t = 'AI luôn đúng 😀 và mọi thứ';
    expect(highlightBroad(t).map((p) => p.t).join('')).toBe(t.normalize('NFC'));
  });
  it('đếm từ: bỏ ký hiệu đứng riêng, chịu được emoji và xuống dòng', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('Một  hai\nba — 😀 bốn')).toBe(4);
  });
  it('phát hiện dữ liệu cá nhân nhưng không báo nhầm ngày, năm, URL', () => {
    expect(detectPersonalData('Liên hệ 0912345678 hoặc a.b@gmail.com')).toEqual(['địa chỉ email', 'số điện thoại']);
    expect(detectPersonalData('CCCD 079123456789')).toEqual(['dãy số giống số định danh']);
    expect(detectPersonalData('Truy cập 21/11/2026, trang 15, năm 2024')).toEqual([]);
    expect(detectPersonalData('https://x.vn/bai/123456789012345')).toEqual([]);
  });
  it('clampStr không cắt đôi emoji; cleanXml bỏ ký tự điều khiển', () => {
    const s = clampStr('ab😀', 3);
    expect(s).toBe('ab');
    expect(cleanXml('a\u0000b\u0008c\ud800d')).toBe('abcd');
    expect(clampStr(5 as unknown, 10)).toBe('');
  });
  it('slug an toàn cho tên file tiếng Việt và emoji', () => {
    expect(slug('Nhóm Đỗ Thị 😀 12A2')).toBe('Nhom-Do-Thi-12A2');
    expect(slug('😀😀')).toBe('hoso');
  });
  it('tách câu và kiểm tra URL', () => {
    expect(splitSentences('Một câu. Câu hai! Câu ba?').length).toBe(3);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('https://a.vn/x')).toBe(true);
  });
});

describe('model: chuẩn hóa dữ liệu lạ', () => {
  it('ép nhãn lạ về rỗng, cắt độ dài, bỏ vượt số lượng', () => {
    const ws = mk();
    const raw = JSON.parse(JSON.stringify(ws));
    raw.claims = Array.from({ length: 80 }, (_, i) => ({ ...emptyClaim({ text: 'x'.repeat(5000) }), label: i === 0 ? 'hack' : 'supported' }));
    const s = sanWorkspace(raw)!;
    expect(s.claims.length).toBe(LIMITS.claims);
    expect(s.claims[0].label).toBe('');
    expect(s.claims[1].text.length).toBe(LIMITS.mid);
  });
  it('id trùng được sinh lại; điểm ngoài khoảng bị bỏ', () => {
    const ws = mk();
    const c = emptyClaim({ text: 'a' });
    const raw = JSON.parse(JSON.stringify({ ...ws, claims: [c, c], grading: { main: [9, 2, -1, 'x', 1], appB: [1, 1, 1, 3], note: '' } }));
    const s = sanWorkspace(raw)!;
    expect(s.claims[0].id).not.toBe(s.claims[1].id);
    expect(s.grading.main).toEqual([null, 2, null, null, 1]);
    expect(s.grading.appB).toEqual([1, 1, 1, null]);
  });
  it('tình huống "AI thật" thiếu công cụ hoặc chưa xác nhận bị hạ về giả định', () => {
    const ws = JSON.parse(JSON.stringify(mk()));
    ws.case.origin = 'real';
    ws.case.realTool = '';
    expect(sanWorkspace(ws)!.case.origin).toBe('assumed');
    ws.case.realTool = 'X';
    ws.case.realChecked = true;
    expect(sanWorkspace(ws)!.case.origin).toBe('real');
  });
  it('rác không làm app sập', () => {
    for (const v of [null, 5, 'x', [], {}, { case: 5 }]) expect(sanWorkspace(v)).toBeNull();
  });
});

describe('storage', () => {
  it('lưu/đọc/chỉ mục; xung đột rev không ghi đè lặng lẽ', () => {
    const st = createStore(new MemoryKV());
    const ws = mk();
    const r1 = st.saveWorkspace(ws, 0);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.ws.rev).toBe(1);
    // "tab khác" ghi trước
    const r2 = st.saveWorkspace({ ...r1.ws, name: 'tab B' }, 1);
    expect(r2.ok).toBe(true);
    // tab A vẫn nghĩ rev=1
    const r3 = st.saveWorkspace({ ...r1.ws, name: 'tab A' }, 1);
    expect(r3.ok).toBe(false);
    if (!r3.ok) expect(r3.reason).toBe('conflict');
    expect(st.loadWorkspace(ws.id)!.name).toBe('tab B');
    // ghi đè có chủ ý
    const r4 = st.saveWorkspace({ ...r1.ws, name: 'tab A' }, 1, true);
    expect(r4.ok).toBe(true);
    expect(st.loadWorkspace(ws.id)!.name).toBe('tab A');
    expect(st.loadIndex().length).toBe(1);
  });
  it('chỉ mục tự chữa lành khi bị ngắt giữa chừng hoặc hỏng', () => {
    const kv = new MemoryKV();
    const st = createStore(kv);
    const a = mk();
    const b = mk();
    st.saveWorkspace(a, 0);
    st.saveWorkspace(b, 0);
    kv.removeItem(K.index); // mất chỉ mục
    expect(st.reconcile().length).toBe(2);
    kv.setItem(K.index, '{hỏng');
    expect(st.reconcile().length).toBe(2);
    kv.removeItem(K.ws(a.id)); // chỉ mục còn, hồ sơ mất
    expect(st.reconcile().map((i) => i.id)).toEqual([b.id]);
  });
  it('hết bộ nhớ: báo quota, không ném lỗi, không mất dữ liệu cũ', () => {
    let full = false;
    const mem = new MemoryKV();
    const kv: KV = {
      get length() { return mem.length; },
      getItem: (k) => mem.getItem(k),
      removeItem: (k) => mem.removeItem(k),
      key: (i) => mem.key(i),
      setItem: (k, v) => {
        if (full) { const e = new Error('q'); e.name = 'QuotaExceededError'; throw e; }
        mem.setItem(k, v);
      },
    };
    const st = createStore(kv);
    const ws = mk();
    const r = st.saveWorkspace(ws, 0);
    expect(r.ok).toBe(true);
    full = true;
    const r2 = st.saveWorkspace({ ...ws, name: 'mới' }, 1);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('quota');
    expect(st.loadWorkspace(ws.id)!.name).toBe('N1');
  });
  it('nhập file: luôn tạo hồ sơ mới, không ghi đè; từ chối file lạ/quá lớn', () => {
    const st = createStore(new MemoryKV());
    const ws = mk();
    const saved = st.saveWorkspace(ws, 0);
    if (!saved.ok) throw new Error('x');
    const parsed = parseImport(exportJson(saved.ws));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const imp = st.importWorkspace(parsed.workspace);
    expect(imp.ok && imp.ws.id !== ws.id).toBe(true);
    expect(st.loadIndex().length).toBe(2);
    expect(parseImport('{}').ok).toBe(false);
    expect(parseImport('không phải json').ok).toBe(false);
    expect(parseImport('x', 2_000_000).ok).toBe(false);
    expect(parseImport(JSON.stringify({ app: 'ai-factcheck-studio', workspace: 5 })).ok).toBe(false);
  });
  it('localStorage hỏng giữa chừng không làm sập loadCases/loadPrefs', () => {
    const kv = new MemoryKV();
    kv.setItem(K.cases, '{{');
    kv.setItem(K.prefs, '123');
    const st = createStore(kv);
    expect(st.loadCases()).toEqual([]);
    expect(st.loadPrefs().teacher).toBe(false);
  });
});

describe('validate: nút "Kiểm tra" chỉ kiểm tra điền đủ, không phán đúng/sai', () => {
  it('thiếu nguồn + chọn "được nguồn hỗ trợ" thì cảnh báo; "chưa đủ bằng chứng" thì không bắt buộc nguồn', () => {
    const ws = mk();
    ws.claims = [
      emptyClaim({ text: 'A', label: 'supported', reason: 'r' }),
      emptyClaim({ text: 'B', label: 'insufficient', reason: 'r', source: { title: '', author: '', locator: '', accessDate: '', noSourceFound: true } }),
      emptyClaim({ text: 'C', label: 'insufficient', reason: 'r' }),
    ];
    const msgs = validateWorkspace(ws).map((i) => i.message);
    expect(msgs.some((m) => m.includes('Nhận định 1') && m.includes('chưa ghi nguồn'))).toBe(true);
    expect(msgs.some((m) => m.includes('Nhận định 2') && m.includes('chưa ghi nguồn'))).toBe(false);
    // C chưa ghi nguồn cũng chỉ là cảnh báo (không chặn), vẫn cho kết luận
    expect(msgs.some((m) => m.includes('Nhận định 3'))).toBe(true);
  });
  it('mâu thuẫn "chưa tìm được nguồn" + "được nguồn hỗ trợ"; nguồn online thiếu ngày truy cập', () => {
    const ws = mk();
    ws.claims = [
      emptyClaim({ text: 'A', label: 'supported', reason: 'r', source: { title: 't', author: '', locator: 'https://a.vn', accessDate: '', noSourceFound: true }, evidence: 'e' }),
    ];
    const msgs = validateWorkspace(ws).map((i) => i.message).join('|');
    expect(msgs).toContain('mâu thuẫn');
    expect(msgs).toContain('ngày truy cập');
  });
  it('bản công bố ngoài 80–120 từ và thiếu khai báo AI bị nhắc; có email thì nhắc dữ liệu cá nhân', () => {
    const ws = mk();
    ws.publication = 'ngắn quá a@b.vn';
    const msgs = validateWorkspace(ws).map((i) => i.message).join('|');
    expect(msgs).toContain('yêu cầu 80–120 từ');
    expect(msgs).toContain('khai báo');
    expect(msgs).toContain('địa chỉ email');
  });
});
