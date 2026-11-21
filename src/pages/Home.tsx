import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BUILT_IN_CASES } from '../cases';
import { store, useApp } from '../ctx';
import { IndexItem, backupFileName, exportJson, parseImport } from '../storage';
import { LIMITS, newWorkspace } from '../model';
import { downloadText } from '../download';
import { formatDateTime } from '../text';
import { go } from '../router';
import { allowDelete } from '../guard';

export default function Home() {
  const { toast } = useApp();
  const [items, setItems] = useState<IndexItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => setItems(store.reconcile()), []);
  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, [refresh]);

  const start = (caseIdx: number) => {
    if (items.length >= LIMITS.workspaces) {
      toast('Đã có quá nhiều hồ sơ trên máy này. Hãy xóa bớt các hồ sơ cũ.');
      return;
    }
    const ws = newWorkspace(BUILT_IN_CASES[caseIdx]);
    const r = store.saveWorkspace(ws, 0, true);
    if (!r.ok) {
      toast('Không lưu được hồ sơ mới (bộ nhớ trình duyệt đầy hoặc bị chặn).');
      return;
    }
    go(`/ws/${ws.id}/draft`);
  };

  const backup = (id: string) => {
    const ws = store.loadWorkspace(id);
    if (!ws) return toast('Không đọc được hồ sơ này.');
    downloadText(exportJson(ws), backupFileName(ws));
  };

  const remove = (id: string) => {
    if (!allowDelete()) return;
    const ws = store.loadWorkspace(id);
    if (!ws) {
      refresh();
      return;
    }
    store.deleteWorkspace(id);
    refresh();
    toast(`Đã xóa hồ sơ "${ws.name || ws.case.title}"`, () => {
      store.saveWorkspace(ws, ws.rev, true);
      refresh();
    });
  };

  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 6000);
      return;
    }
    const n = store.clearAllWorkspaces();
    setConfirmClear(false);
    refresh();
    toast(`Đã xóa ${n} hồ sơ khỏi máy này. File sao lưu đã tải trước đó vẫn còn.`);
  };

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    let ok = 0;
    const errs: string[] = [];
    for (const f of files.slice(0, 40)) {
      if (f.size > LIMITS.importBytes) {
        errs.push(`${f.name}: file quá lớn`);
        continue;
      }
      const r = parseImport(await f.text(), f.size);
      if (!r.ok) {
        errs.push(`${f.name}: ${r.error}`);
        continue;
      }
      const s = store.importWorkspace(r.workspace);
      if (s.ok) ok++;
      else errs.push(`${f.name}: không lưu được (bộ nhớ đầy)`);
    }
    refresh();
    toast(`Đã nhập ${ok} hồ sơ${errs.length ? `. Lỗi: ${errs.slice(0, 2).join('; ')}` : ''}`);
  };

  return (
    <div>
      <section className="hero">
        <h1>Phòng biên tập kiểm chứng thông tin AI</h1>
        <p>
          Tin học 12 · Chủ đề 1 · Bài 1–2. Cả lớp thành một phòng biên tập nhỏ: nhận một bản thảo có vấn đề, tách nhận định, ghi nguồn và bằng chứng, kết luận có giới hạn, phản biện rồi công bố bản đã sửa.
        </p>
        <div className="row wrap">
          <button className="btn primary big" onClick={() => start(0)}>
            Bắt đầu với bản thảo mô phỏng (Bài 1)
          </button>
          <a className="btn big" href="#/cases">
            Chọn tình huống khác
          </a>
        </div>
      </section>

      <section className="card">
        <div className="row between wrap">
          <h2>Hồ sơ nhóm trên máy này</h2>
          <div className="row wrap">
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Nhập file sao lưu (.json)
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" multiple hidden onChange={onFiles} aria-label="Chọn file sao lưu để nhập" />
          </div>
        </div>
        {!store.persistent && (
          <p className="banner bad" role="alert">
            Trình duyệt đang chặn lưu dữ liệu (chế độ riêng tư hoặc chính sách của máy). Hồ sơ chỉ tồn tại đến khi đóng trang. Hãy tải file sao lưu thường xuyên.
          </p>
        )}
        {items.length === 0 ? (
          <p className="empty">Chưa có hồ sơ nào. Bấm "Bắt đầu" ở trên để tạo hồ sơ đầu tiên.</p>
        ) : (
          <ul className="ws-list">
            {items.map((it) => (
              <li key={it.id} className="ws-item">
                <div>
                  <a className="ws-name" href={`#/ws/${it.id}/draft`}>
                    {it.name || '(chưa đặt tên nhóm)'}
                  </a>
                  <div className="muted">
                    {it.caseTitle} · {it.claims} nhận định, {it.labeled} đã có nhãn · sửa lúc {formatDateTime(it.updatedAt)}
                  </div>
                </div>
                <div className="row wrap">
                  <a className="btn small primary" href={`#/ws/${it.id}/draft`}>
                    Mở
                  </a>
                  <button className="btn small" onClick={() => backup(it.id)}>
                    Tải sao lưu
                  </button>
                  <button className="btn small danger" onClick={() => remove(it.id)}>
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <div className="banner" role="note">
            <strong>Máy dùng chung (phòng tin học)?</strong> Ai mở trình duyệt này cũng thấy và sửa được các hồ sơ ở trên. Cuối tiết, hãy tải file sao lưu rồi xóa hồ sơ khỏi máy.{' '}
            <button className={`btn small ${confirmClear ? 'danger' : ''}`} onClick={clearAll}>
              {confirmClear ? 'Bấm lần nữa để xóa TẤT CẢ hồ sơ trên máy này' : 'Xóa tất cả hồ sơ trên máy này'}
            </button>
          </div>
        )}
        <p className="muted">
          Dữ liệu nằm riêng trên từng máy và từng trình duyệt; app không gửi gì lên mạng. Muốn nộp bài hoặc chuyển máy: tải file sao lưu, rồi nhập lại ở máy khác. Giáo viên có thể nhập nhiều file cùng lúc để xem bài các nhóm.
        </p>
      </section>
    </div>
  );
}
