import { useState } from 'react';
import { LIMITS, Workspace } from '../../model';
import { TextArea, TextInput, WordCount } from '../../components/ui';
import { countWords } from '../../text';
import { compileSources } from '../../format';
import { PUBLICATION_MAX, PUBLICATION_MIN } from '../../validate';

interface Props {
  ws: Workspace;
  patch: (p: Partial<Workspace>) => void;
  patchAi: (p: Partial<Workspace['ai']>) => void;
  onPrint: () => void;
  onDocx: () => Promise<void>;
  onBackup: () => void;
  onCheck: () => void;
}

export default function Publish({ ws, patch, patchAi, onPrint, onDocx, onBackup, onCheck }: Props) {
  const [busy, setBusy] = useState(false);
  const sources = compileSources(ws);
  const words = countWords(ws.publication);
  return (
    <div>
      <section className="card">
        <h2>Bước 5. Biên tập và công bố</h2>
        <p className="muted">Viết lại bản thảo bằng lời của nhóm: tách nội dung có bằng chứng khỏi nhận xét, nêu một ứng dụng, một lợi ích, một giới hạn, một cách dùng có trách nhiệm và nguồn đã dùng.</p>
        <TextArea label="Bản công bố (80–120 từ)" value={ws.publication} rows={8} max={LIMITS.long} onChange={(v) => patch({ publication: v })} />
        <WordCount n={words} min={PUBLICATION_MIN} max={PUBLICATION_MAX} />
      </section>

      <section className="card">
        <h3>Danh mục nguồn</h3>
        {sources.length === 0 ? (
          <p className="empty">Chưa có nguồn nào được ghi ở tab Kiểm chứng.</p>
        ) : (
          <ol className="src-list">
            {sources.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
        <TextArea label="Nguồn bổ sung (nếu có)" value={ws.extraSources} rows={2} max={LIMITS.long} onChange={(v) => patch({ extraSources: v })} />
      </section>

      <section className="card">
        <h3>Khai báo vai trò của AI</h3>
        <fieldset className="inline-radio">
          <legend>Nhóm có sử dụng AI trong quá trình này không?</legend>
          <label className="radio compact">
            <input type="radio" name="ai-used" checked={ws.ai.used === 'no'} onChange={() => patchAi({ used: 'no' })} />
            <span>Không sử dụng AI</span>
          </label>
          <label className="radio compact">
            <input type="radio" name="ai-used" checked={ws.ai.used === 'yes'} onChange={() => patchAi({ used: 'yes' })} />
            <span>Có sử dụng AI</span>
          </label>
        </fieldset>
        {ws.ai.used === 'yes' && (
          <>
            <TextInput label="Tên công cụ" value={ws.ai.tool} onChange={(v) => patchAi({ tool: v })} />
            <TextArea label="Công việc AI hỗ trợ" value={ws.ai.help} rows={2} max={LIMITS.long} onChange={(v) => patchAi({ help: v })} />
            <TextArea label="Phần nhóm tự kiểm tra" value={ws.ai.selfCheck} rows={2} max={LIMITS.long} onChange={(v) => patchAi({ selfCheck: v })} />
          </>
        )}
        <TextArea
          label="Cách bảo vệ dữ liệu cá nhân"
          hint="Ví dụ: không nhập tên, ảnh, điểm hay thông tin nhạy cảm của người thật vào công cụ AI."
          value={ws.ai.dataProtection}
          rows={2}
          max={LIMITS.long}
          onChange={(v) => patchAi({ dataProtection: v })}
        />
      </section>

      <section className="card">
        <h3>Kiểm tra và xuất</h3>
        <p className="muted">Nút "Kiểm tra" chỉ xem đã điền đủ các trường chưa. Nó không đánh giá nhận định đúng hay sai và không xác minh nguồn.</p>
        <div className="row wrap">
          <button className="btn" onClick={onCheck}>
            Kiểm tra điền đủ chưa
          </button>
          <button className="btn primary" onClick={onPrint}>
            In phiếu
          </button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDocx();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Đang tạo file Word…' : 'Xuất file Word (.docx)'}
          </button>
          <button className="btn" onClick={onBackup}>
            Tải file sao lưu (.json)
          </button>
        </div>
        <p className="muted">Dữ liệu chỉ nằm trên máy này. Muốn chuyển sang máy khác hoặc nộp cho giáo viên: tải file sao lưu hoặc file Word.</p>
      </section>
    </div>
  );
}
