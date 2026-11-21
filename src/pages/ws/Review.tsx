import { memo } from 'react';
import { Claim, LIMITS, Review as R, SUPPORTS, Supports, Workspace } from '../../model';
import { LabelBadge, TextArea, TextInput } from '../../components/ui';

interface Props {
  ws: Workspace;
  patchReview: (id: string, p: Partial<R>) => void;
}

export default function Review({ ws, patchReview }: Props) {
  return (
    <div>
      <section className="card">
        <h2>Bước 6. Phản biện và tự điều chỉnh</h2>
        <p className="muted">
          Đổi máy (hoặc đổi phiếu in) giữa hai nhóm. Nhóm phản biện kiểm tra ít nhất một nguồn, nói rõ nguồn có hỗ trợ đúng phạm vi không, rồi góp ý cụ thể. Nhóm tác giả sửa, hoặc nêu lí do giữ nguyên.
        </p>
      </section>
      {ws.claims.length === 0 && <p className="empty card">Chưa có nhận định để phản biện.</p>}
      {ws.claims.map((c, i) => (
        <ReviewCard key={c.id} c={c} n={i + 1} patchReview={patchReview} />
      ))}
    </div>
  );
}

const ReviewCard = memo(function ReviewCard({ c, n, patchReview }: { c: Claim; n: number; patchReview: (id: string, p: Partial<R>) => void }) {
  const r = c.review;
  return (
    <section className="card" id={'claim-' + c.id} aria-label={`Phản biện nhận định ${n}`}>
      <header className="row between wrap">
        <h3>Nhận định {n}</h3>
        <LabelBadge label={c.label} />
      </header>
      <blockquote className="claim-quote">{c.text}</blockquote>
      {c.reason && (
        <p className="muted">
          <strong>Lí do của nhóm tác giả:</strong> {c.reason}
        </p>
      )}
      <fieldset className="source">
        <legend>Nhóm phản biện</legend>
        <TextInput label="Tên nhóm phản biện (hoặc mã ẩn danh)" value={r.reviewer} onChange={(v) => patchReview(c.id, { reviewer: v })} />
        <fieldset className="inline-radio">
          <legend>Nguồn có hỗ trợ đúng phạm vi không?</legend>
          {(Object.keys(SUPPORTS) as Exclude<Supports, ''>[]).map((k) => (
            <label key={k} className="radio compact">
              <input type="radio" name={'sup-' + c.id} checked={r.supports === k} onChange={() => patchReview(c.id, { supports: k })} />
              <span>{SUPPORTS[k]}</span>
            </label>
          ))}
        </fieldset>
        <TextArea label="Góp ý cụ thể" value={r.comment} onChange={(v) => patchReview(c.id, { comment: v })} max={LIMITS.long} />
      </fieldset>
      <fieldset className="source">
        <legend>Nhóm tác giả</legend>
        <TextArea label="Nhóm đã sửa" value={r.fixed} onChange={(v) => patchReview(c.id, { fixed: v })} max={LIMITS.long} rows={2} />
        <TextArea label="Vì sao sửa (hoặc vì sao giữ nguyên)" value={r.because} onChange={(v) => patchReview(c.id, { because: v })} max={LIMITS.long} rows={2} />
        <TextArea label="Điểm còn chưa đủ chứng cứ" value={r.remaining} onChange={(v) => patchReview(c.id, { remaining: v })} max={LIMITS.long} rows={2} />
      </fieldset>
    </section>
  );
});
