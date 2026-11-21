import { memo } from 'react';
import { AppRow, LIMITS, Workspace } from '../../model';
import { TextArea, TextInput } from '../../components/ui';
import { MEDICAL_NOTE } from '../../cases';

interface Props {
  ws: Workspace;
  addApp: () => void;
  patchApp: (id: string, p: Partial<AppRow>) => void;
  removeApp: (id: string) => void;
}

export default function Apps({ ws, addApp, patchApp, removeApp }: Props) {
  return (
    <div>
      <section className="card">
        <div className="row between wrap">
          <h2>Phiếu B. Ứng dụng AI</h2>
          <button className="btn primary" onClick={addApp} disabled={ws.apps.length >= LIMITS.apps}>
            + Thêm ứng dụng
          </button>
        </div>
        <p className="muted">Chọn một bối cảnh giáo dục, giao thông hoặc y tế theo SGK: AI hỗ trợ việc gì, con người vẫn phải làm gì, rủi ro và cách giảm rủi ro.</p>
        {ws.apps.length === 0 && <p className="empty">Chưa có ứng dụng nào.</p>}
      </section>
      {ws.apps.map((a, i) => (
        <AppCard key={a.id} a={a} n={i + 1} patchApp={patchApp} removeApp={removeApp} />
      ))}
    </div>
  );
}

const AppCard = memo(function AppCard({ a, n, patchApp, removeApp }: { a: AppRow; n: number; patchApp: (id: string, p: Partial<AppRow>) => void; removeApp: (id: string) => void }) {
  const medical = /y\s*tế/i.test(a.context.normalize('NFC'));
  return (
    <section className="card" aria-label={`Ứng dụng ${n}`}>
      <h3>Ứng dụng {n}</h3>
      <TextInput
        label="Bối cảnh sử dụng"
        value={a.context}
        list="ctx-list"
        placeholder="Giáo dục / Giao thông / Y tế…"
        onChange={(v) => patchApp(a.id, { context: v })}
      />
      <datalist id="ctx-list">
        <option value="Giáo dục" />
        <option value="Giao thông" />
        <option value="Y tế" />
      </datalist>
      {medical && (
        <p className="note-box" role="note">
          {MEDICAL_NOTE}
        </p>
      )}
      <TextArea label="Công việc AI có thể hỗ trợ" value={a.task} onChange={(v) => patchApp(a.id, { task: v })} max={LIMITS.long} />
      <div className="grid2">
        <TextArea label="Một lợi ích cụ thể" value={a.benefit} onChange={(v) => patchApp(a.id, { benefit: v })} max={LIMITS.long} />
        <TextArea label="Một rủi ro hoặc giới hạn" value={a.risk} onChange={(v) => patchApp(a.id, { risk: v })} max={LIMITS.long} />
      </div>
      <TextArea label="Việc con người cần kiểm tra hoặc quyết định" value={a.humanCheck} onChange={(v) => patchApp(a.id, { humanCheck: v })} max={LIMITS.long} />
      <TextArea label="Cách giảm rủi ro / dùng an toàn" value={a.mitigation} onChange={(v) => patchApp(a.id, { mitigation: v })} max={LIMITS.long} />
      <TextArea label="Nguồn liên quan" value={a.sources} onChange={(v) => patchApp(a.id, { sources: v })} max={LIMITS.long} rows={2} />
      <button className="btn small danger" onClick={() => removeApp(a.id)} aria-label={`Xóa ứng dụng ${n}`}>
        Xóa ứng dụng {n}
      </button>
    </section>
  );
});
