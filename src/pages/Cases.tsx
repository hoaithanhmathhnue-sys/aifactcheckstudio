import { useEffect, useState } from 'react';
import { BUILT_IN_CASES } from '../cases';
import { Case, LESSONS, newWorkspace } from '../model';
import { store, useApp } from '../ctx';
import { OriginBadge } from '../components/ui';
import { go } from '../router';
import { allowDelete } from '../guard';

export default function Cases() {
  const { prefs, toast } = useApp();
  const [mine, setMine] = useState<Case[]>([]);
  useEffect(() => setMine(store.loadCases()), []);

  const use = (c: Case) => {
    const ws = newWorkspace(c);
    const r = store.saveWorkspace(ws, 0, true);
    if (!r.ok) return toast('Không lưu được hồ sơ mới (bộ nhớ trình duyệt đầy hoặc bị chặn).');
    go(`/ws/${ws.id}/draft`);
  };

  const remove = (c: Case) => {
    if (!allowDelete()) return;
    const before = store.loadCases();
    store.saveCases(before.filter((x) => x.id !== c.id));
    setMine(store.loadCases());
    toast(`Đã xóa tình huống "${c.title}"`, () => {
      store.saveCases(before);
      setMine(store.loadCases());
    });
  };

  const all = [...BUILT_IN_CASES, ...mine];
  return (
    <div>
      <section className="card">
        <div className="row between wrap">
          <h1>Thư viện tình huống</h1>
          <a className="btn primary" href="#/cases/edit/new">
            + Tạo tình huống mới
          </a>
        </div>
        <p className="muted">
          Chọn 3–4 nhận định ngắn gắn với khái niệm, ứng dụng, giới hạn và trách nhiệm khi dùng AI. Bản thảo có cả nội dung hợp lí lẫn phát biểu quá tuyệt đối để học sinh không mặc định "AI luôn sai". Các tình huống có sẵn là <strong>giả định do giáo viên biên soạn</strong>.
        </p>
      </section>
      {all.map((c) => (
        <section key={c.id} className="card" aria-label={c.title}>
          <div className="row between wrap">
            <h2>{c.title}</h2>
            <span className="badge muted">{LESSONS[c.lesson]}</span>
          </div>
          <OriginBadge c={c} />
          <blockquote className="draft">{c.text}</blockquote>
          {prefs.teacher && c.teacherNotes && (
            <aside className="teacher-hint">
              <strong>Ghi chú cho giáo viên:</strong> {c.teacherNotes}
            </aside>
          )}
          <p className="muted">
            {c.seeds.length ? `${c.seeds.length} nhận định tách sẵn · ` : ''}
            {c.sources.length ? `${c.sources.length} nguồn phát sẵn` : 'chưa có bộ nguồn: giáo viên tự chuẩn bị'}
          </p>
          <div className="row wrap">
            <button className="btn primary" onClick={() => use(c)}>
              Dùng tình huống này
            </button>
            <a className="btn" href={`#/cases/print/${c.id}`}>
              In bản phát
            </a>
            <a className="btn" href={`#/cases/edit/new?from=${encodeURIComponent(c.id)}`}>
              Sao chép &amp; sửa
            </a>
            {!c.builtIn && (
              <>
                <a className="btn" href={`#/cases/edit/${c.id}`}>
                  Sửa
                </a>
                <button className="btn danger" onClick={() => remove(c)}>
                  Xóa
                </button>
              </>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
