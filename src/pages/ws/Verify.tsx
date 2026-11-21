import { memo, useCallback, useEffect, useState } from 'react';
import { Claim, KINDS, LABELS, LABEL_HELP, Label, LIMITS, SourceItem, Source, TOPICS, Workspace } from '../../model';
import { LABEL_ICON, LabelBadge, TextArea, TextInput } from '../../components/ui';
import { findBroadTerms } from '../../text';
import { claimWarnings } from '../../validate';

interface Props {
  ws: Workspace;
  teacher: boolean;
  hints: boolean;
  patchClaim: (id: string, p: Partial<Claim>) => void;
  patchSource: (id: string, p: Partial<Source>) => void;
  goDraft: () => void;
  focusClaim: string;
}

export default function Verify({ ws, teacher, hints, patchClaim, patchSource, goDraft, focusClaim }: Props) {
  // Chỉ nhận định đầu tiên mở sẵn: màn hình ngắn gọn, ít phải cuộn; các thẻ thu gọn cũng nhẹ DOM hơn.
  const [open, setOpen] = useState<Set<string>>(() => new Set(ws.claims.slice(0, 1).map((c) => c.id)));
  const toggle = useCallback(
    (id: string) =>
      setOpen((o) => {
        const n = new Set(o);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    [],
  );
  useEffect(() => {
    if (focusClaim) setOpen((o) => (o.has(focusClaim) ? o : new Set(o).add(focusClaim)));
  }, [focusClaim]);

  if (ws.claims.length === 0) {
    return (
      <section className="card">
        <h2>Bước 3–4. Tìm chứng cứ và kết luận có giới hạn</h2>
        <p className="empty">Chưa có nhận định nào để kiểm chứng.</p>
        <button className="btn primary" onClick={goDraft}>
          Quay lại tách nhận định
        </button>
      </section>
    );
  }
  return (
    <div>
      <section className="card">
        <h2>Bước 3–4. Tìm chứng cứ và kết luận có giới hạn</h2>
        <p className="muted">
          Nguồn phải nói đúng vấn đề và bối cảnh, không chỉ trùng từ khóa. Một nguồn duy nhất không tự bảo đảm kết luận đúng. Không tìm thấy nguồn chưa tự chứng minh nhận định là sai: khi đó chọn <strong>Chưa đủ bằng chứng</strong>.
        </p>
        <div className="row wrap">
          <button className="btn small" onClick={() => setOpen(new Set(ws.claims.map((c) => c.id)))}>
            Mở tất cả
          </button>
          <button className="btn small" onClick={() => setOpen(new Set())}>
            Thu gọn tất cả
          </button>
        </div>
      </section>
      {ws.claims.map((c, i) => (
        <ClaimCard
          key={c.id}
          c={c}
          n={i + 1}
          sources={ws.case.sources}
          hint={teacher && c.seed >= 0 ? ws.case.seeds[c.seed]?.hint ?? '' : ''}
          hints={hints}
          open={open.has(c.id)}
          onToggle={toggle}
          patchClaim={patchClaim}
          patchSource={patchSource}
        />
      ))}
    </div>
  );
}

const ClaimCard = memo(function ClaimCard({
  c,
  n,
  sources,
  hint,
  hints,
  open,
  onToggle,
  patchClaim,
  patchSource,
}: {
  open: boolean;
  onToggle: (id: string) => void;
  c: Claim;
  n: number;
  sources: SourceItem[];
  hint: string;
  hints: boolean;
  patchClaim: (id: string, p: Partial<Claim>) => void;
  patchSource: (id: string, p: Partial<Source>) => void;
}) {
  const warns = claimWarnings(c, n);
  const s = c.source;
  const pick = (i: string) => {
    const it = sources[Number(i)];
    if (!it) return;
    patchSource(c.id, { title: it.title, author: it.author, locator: it.locator, noSourceFound: false });
  };
  return (
    <section className="card claim-card" id={'claim-' + c.id} aria-labelledby={'ct-' + c.id}>
      <header className="row between wrap">
        <h3 id={'ct-' + c.id}>
          <button className="claim-toggle" aria-expanded={open} aria-controls={'cb-' + c.id} onClick={() => onToggle(c.id)}>
            <span aria-hidden="true">{open ? '▾' : '▸'}</span> Nhận định {n}
          </button>
        </h3>
        <div className="row wrap">
          {c.kind && <span className="badge muted">{KINDS[c.kind]}</span>}
          {c.topic && <span className="badge muted">{TOPICS[c.topic]}</span>}
          <LabelBadge label={c.label} />
        </div>
      </header>
      <blockquote className="claim-quote">{c.text || <em className="muted">(chưa có nội dung – quay lại bước tách nhận định)</em>}</blockquote>
      {!open && warns.length > 0 && <p className="warn-text">⚠ {warns.length} cảnh báo – mở ra để xem.</p>}
      {open && <div id={'cb-' + c.id}>
      {hint && (
        <aside className="teacher-hint" aria-label="Gợi ý xử lí của giáo viên">
          <strong>Gợi ý xử lí (chế độ giáo viên):</strong> {hint}
        </aside>
      )}

      <TextInput
        label="Từ ngữ làm nhận định có phạm vi rộng hoặc chưa rõ"
        value={c.broadTerms}
        onChange={(v) => patchClaim(c.id, { broadTerms: v })}
        hint={
          hints && !c.broadTerms.trim() && findBroadTerms(c.text).length ? (
            <button className="btn small" type="button" onClick={() => patchClaim(c.id, { broadTerms: findBroadTerms(c.text).join(', ') })}>
              Điền gợi ý: {findBroadTerms(c.text).join(', ')}
            </button>
          ) : undefined
        }
      />

      <fieldset className="source">
        <legend>Nguồn</legend>
        {sources.length > 0 && (
          <div className="field">
            <label htmlFor={'pick-' + c.id}>Chọn từ bộ nguồn giáo viên đã chuẩn bị</label>
            <select id={'pick-' + c.id} value="" onChange={(e) => pick(e.target.value)}>
              <option value="">— chọn để điền sẵn tên, tác giả, đường dẫn —</option>
              {sources.map((it, i) => (
                <option key={i} value={i}>
                  {it.title.slice(0, 90)}
                </option>
              ))}
            </select>
          </div>
        )}
        <TextInput label="Tên tài liệu" value={s.title} max={LIMITS.mid} onChange={(v) => patchSource(c.id, { title: v })} />
        <div className="grid2">
          <TextInput label="Tác giả hoặc cơ quan" value={s.author} onChange={(v) => patchSource(c.id, { author: v })} />
          <TextInput label="Trang hoặc đường dẫn" value={s.locator} max={LIMITS.mid} onChange={(v) => patchSource(c.id, { locator: v })} />
        </div>
        <TextInput label="Ngày truy cập (nếu là nguồn trực tuyến)" type="date" value={s.accessDate} onChange={(v) => patchSource(c.id, { accessDate: v })} />
        <label className="check">
          <input type="checkbox" checked={s.noSourceFound} onChange={(e) => patchSource(c.id, { noSourceFound: e.target.checked })} />
          <span>Chưa tìm được nguồn (ghi rõ như vậy là hợp lệ; không ép phải có kết luận)</span>
        </label>
      </fieldset>

      <TextArea
        label="Nội dung nguồn hỗ trợ hoặc mâu thuẫn"
        hint="Tóm tắt đúng phần liên quan bằng lời của nhóm, không chép nguyên văn dài."
        value={c.evidence}
        onChange={(v) => patchClaim(c.id, { evidence: v })}
        max={LIMITS.long}
      />

      <fieldset className="labels">
        <legend>Kết luận có giới hạn</legend>
        {(Object.keys(LABELS) as Label[]).map((l) => (
          <label key={l} className={`radio lab-${l}${c.label === l ? ' on' : ''}`}>
            <input type="radio" name={'lab-' + c.id} checked={c.label === l} onChange={() => patchClaim(c.id, { label: l })} />
            <span>
              <strong>
                <span aria-hidden="true">{LABEL_ICON[l]}</span> {LABELS[l]}
              </strong>
              <small>{LABEL_HELP[l]}</small>
            </span>
          </label>
        ))}
        {c.label && (
          <button className="btn small ghost" onClick={() => patchClaim(c.id, { label: '' })}>
            Bỏ chọn nhãn
          </button>
        )}
      </fieldset>

      <TextArea label="Lí do" value={c.reason} onChange={(v) => patchClaim(c.id, { reason: v })} max={LIMITS.long} />
      <TextArea label="Cách viết lại nhận định" value={c.rewrite} onChange={(v) => patchClaim(c.id, { rewrite: v })} max={LIMITS.long} />
      <TextArea label="Giới hạn còn lại (điểm chưa chắc chắn)" value={c.remaining} onChange={(v) => patchClaim(c.id, { remaining: v })} max={LIMITS.long} rows={2} />

      {warns.length > 0 && (
        <ul className="warn-list" aria-label="Cảnh báo (không chặn lưu hay xuất)">
          {warns.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
      </div>}
    </section>
  );
});
