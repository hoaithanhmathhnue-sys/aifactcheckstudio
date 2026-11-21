import { useMemo, useState } from 'react';
import { BUILT_IN_CASES, newCustomCase } from '../cases';
import { Case, LESSONS, LIMITS, SourceItem, SeedClaim, TOPICS, sanCase } from '../model';
import { store, useApp } from '../ctx';
import { SelectField, TextArea, TextInput } from '../components/ui';
import { go } from '../router';
import { uid } from '../text';

export default function CaseEditor({ id, from }: { id: string; from: string }) {
  const { toast } = useApp();
  const initial = useMemo<Case | null>(() => {
    if (id === 'new') {
      const src = from ? [...BUILT_IN_CASES, ...store.loadCases()].find((c) => c.id === from) : undefined;
      return newCustomCase(src);
    }
    return store.loadCases().find((c) => c.id === id) ?? null;
  }, [id, from]);
  const [c, setC] = useState<Case | null>(initial);
  const [err, setErr] = useState('');

  if (!c) {
    return (
      <section className="card">
        <h1>Không tìm thấy tình huống</h1>
        <a className="btn primary" href="#/cases">
          Về thư viện
        </a>
      </section>
    );
  }
  const set = (p: Partial<Case>) => setC((x) => (x ? { ...x, ...p } : x));
  const setSource = (i: number, p: Partial<SourceItem>) => set({ sources: c.sources.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const setSeed = (i: number, p: Partial<SeedClaim>) => set({ seeds: c.seeds.map((s, k) => (k === i ? { ...s, ...p } : s)) });

  const save = () => {
    if (!c.title.trim()) return setErr('Hãy đặt tên tình huống.');
    if (!c.text.trim()) return setErr('Hãy nhập nội dung bản thảo.');
    if (c.origin === 'real' && (!c.realTool.trim() || !c.realChecked)) {
      return setErr('Đầu ra AI thật cần ghi tên công cụ và tích xác nhận đã kiểm tra, được phép dùng. Nếu không chắc, hãy chọn "Giả định do giáo viên biên soạn".');
    }
    const clean = sanCase({ ...c, id: c.id || uid(), builtIn: false });
    if (!clean) return setErr('Nội dung không hợp lệ.');
    const list = store.loadCases();
    const idx = list.findIndex((x) => x.id === clean.id);
    if (idx >= 0) list[idx] = clean;
    else {
      if (list.length >= LIMITS.cases) return setErr('Đã có quá nhiều tình huống của giáo viên. Hãy xóa bớt.');
      list.push(clean);
    }
    if (!store.saveCases(list)) return setErr('Không lưu được (bộ nhớ trình duyệt đầy hoặc bị chặn).');
    toast('Đã lưu tình huống');
    go('/cases');
  };

  return (
    <div>
      <section className="card">
        <h1>{id === 'new' ? 'Tạo tình huống' : 'Sửa tình huống'}</h1>
        <p className="muted">Bản thảo có thể do giáo viên tự viết (gắn nhãn giả định) hoặc là đầu ra AI thật đã được kiểm tra và được phép dùng. Tuyệt đối không gán văn bản giả định cho một công cụ AI.</p>
        <TextInput label="Tên tình huống" value={c.title} max={LIMITS.title} onChange={(v) => set({ title: v })} />
        <SelectField label="Bài" value={c.lesson} onChange={(v) => set({ lesson: (v || 'both') as Case['lesson'] })} options={Object.entries(LESSONS)} empty="Bài 1–2" />
        <TextArea label="Bản thảo (không nhập thông tin cá nhân của người thật)" value={c.text} rows={6} max={LIMITS.long} onChange={(v) => set({ text: v })} />

        <fieldset className="labels">
          <legend>Nguồn gốc của bản thảo</legend>
          <label className={`radio origin-assumed${c.origin === 'assumed' ? ' on' : ''}`}>
            <input type="radio" name="origin" checked={c.origin === 'assumed'} onChange={() => set({ origin: 'assumed', realTool: '', realChecked: false })} />
            <span>
              <strong>Giả định do giáo viên biên soạn</strong>
              <small>Sẽ luôn hiện nhãn "không phải đầu ra của công cụ AI thật".</small>
            </span>
          </label>
          <label className={`radio origin-real${c.origin === 'real' ? ' on' : ''}`}>
            <input type="radio" name="origin" checked={c.origin === 'real'} onChange={() => set({ origin: 'real' })} />
            <span>
              <strong>Đầu ra AI thật, đã kiểm tra và được phép sử dụng</strong>
              <small>Cần ghi tên công cụ và xác nhận.</small>
            </span>
          </label>
        </fieldset>
        {c.origin === 'real' && (
          <>
            <TextInput label="Tên công cụ AI đã tạo ra văn bản" value={c.realTool} onChange={(v) => set({ realTool: v })} />
            <label className="check">
              <input type="checkbox" checked={c.realChecked} onChange={(e) => set({ realChecked: e.target.checked })} />
              <span>Tôi xác nhận văn bản này đúng là đầu ra của công cụ trên và được phép dùng trong lớp.</span>
            </label>
          </>
        )}
      </section>

      <section className="card">
        <div className="row between wrap">
          <h2>Bộ nguồn phát sẵn</h2>
          <button className="btn" disabled={c.sources.length >= LIMITS.sources} onClick={() => set({ sources: [...c.sources, { title: '', author: '', locator: '', note: '' }] })}>
            + Thêm nguồn
          </button>
        </div>
        <p className="muted">Học sinh chọn từ danh sách này khi ghi nguồn. Kiểm tra trước các đường dẫn còn mở được; nếu không có mạng, in nguồn ra giấy.</p>
        {c.sources.map((s, i) => (
          <fieldset key={i} className="source">
            <legend>Nguồn {i + 1}</legend>
            <TextInput label="Tên tài liệu" value={s.title} max={LIMITS.mid} onChange={(v) => setSource(i, { title: v })} />
            <div className="grid2">
              <TextInput label="Tác giả/cơ quan" value={s.author} onChange={(v) => setSource(i, { author: v })} />
              <TextInput label="Trang hoặc đường dẫn" value={s.locator} max={LIMITS.mid} onChange={(v) => setSource(i, { locator: v })} />
            </div>
            <TextInput label="Lưu ý cho học sinh" value={s.note} max={LIMITS.mid} onChange={(v) => setSource(i, { note: v })} />
            <button className="btn small danger" onClick={() => set({ sources: c.sources.filter((_, k) => k !== i) })}>
              Xóa nguồn {i + 1}
            </button>
          </fieldset>
        ))}
      </section>

      <section className="card">
        <div className="row between wrap">
          <h2>Nhận định tách sẵn và gợi ý xử lí (tùy chọn)</h2>
          <button className="btn" disabled={c.seeds.length >= LIMITS.seeds} onClick={() => set({ seeds: [...c.seeds, { text: '', hint: '', topic: '' }] })}>
            + Thêm nhận định
          </button>
        </div>
        <p className="muted">Dùng cho học sinh cần hỗ trợ. Gợi ý xử lí chỉ hiện khi bật chế độ giáo viên.</p>
        {c.seeds.map((s, i) => (
          <fieldset key={i} className="source">
            <legend>Nhận định {i + 1}</legend>
            <TextArea label="Nhận định" value={s.text} rows={2} max={LIMITS.mid} onChange={(v) => setSeed(i, { text: v })} />
            <SelectField label="Chủ đề" value={s.topic} onChange={(v) => setSeed(i, { topic: v as SeedClaim['topic'] })} options={Object.entries(TOPICS)} />
            <TextArea label="Gợi ý xử lí (cho giáo viên)" value={s.hint} rows={3} max={LIMITS.long} onChange={(v) => setSeed(i, { hint: v })} />
            <button className="btn small danger" onClick={() => set({ seeds: c.seeds.filter((_, k) => k !== i) })}>
              Xóa nhận định {i + 1}
            </button>
          </fieldset>
        ))}
        <TextArea label="Ghi chú chung cho giáo viên" value={c.teacherNotes} rows={3} max={LIMITS.long} onChange={(v) => set({ teacherNotes: v })} />
      </section>

      {err && (
        <p className="banner bad" role="alert">
          {err}
        </p>
      )}
      <div className="row wrap">
        <button className="btn primary big" onClick={save}>
          Lưu tình huống
        </button>
        <a className="btn big" href="#/cases">
          Hủy
        </a>
      </div>
    </div>
  );
}
