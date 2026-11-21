import { memo, useState } from 'react';
import { Claim, KINDS, LIMITS, TOPICS, Workspace, emptyClaim } from '../../model';
import { OriginBadge, SelectField, TextArea } from '../../components/ui';
import { findBroadTerms, highlightBroad, splitSentences } from '../../text';

interface Props {
  ws: Workspace;
  hints: boolean;
  setHints: (v: boolean) => void;
  addClaims: (cs: Claim[]) => void;
  patchClaim: (id: string, p: Partial<Claim>) => void;
  removeClaim: (id: string) => void;
}

export default function Draft({ ws, hints, setHints, addClaims, patchClaim, removeClaim }: Props) {
  const [focusId, setFocusId] = useState<string>('');
  const pieces = hints ? highlightBroad(ws.case.text) : null;
  const full = ws.claims.length >= LIMITS.claims;

  const addBlank = () => {
    const last = ws.claims[ws.claims.length - 1];
    if (last && !last.text.trim()) {
      // Đã có một dòng trống: chuyển con trỏ tới đó thay vì thêm dòng trống nữa
      const all = document.querySelectorAll<HTMLTextAreaElement>('[data-claim-text]');
      all[all.length - 1]?.focus();
      return;
    }
    const c = emptyClaim();
    setFocusId(c.id);
    addClaims([c]);
  };

  const addSeeded = () => {
    const have = new Set(ws.claims.map((c) => c.seed).filter((s) => s >= 0));
    const texts = new Set(ws.claims.map((c) => c.text.trim()));
    const fresh: Claim[] = [];
    if (ws.case.seeds.length) {
      ws.case.seeds.forEach((s, i) => {
        if (!have.has(i) && !texts.has(s.text.trim())) fresh.push(emptyClaim({ seed: i, text: s.text, topic: s.topic }));
      });
    } else {
      for (const t of splitSentences(ws.case.text)) if (!texts.has(t)) fresh.push(emptyClaim({ text: t }));
    }
    if (fresh.length) addClaims(fresh);
  };

  return (
    <div>
      <section className="card">
        <div className="row between wrap">
          <h2>Bước 1–2. Bản thảo cần kiểm chứng</h2>
          <OriginBadge c={ws.case} />
        </div>
        <p className="muted">Đọc bản thảo, xác định đoạn đang nói về khả năng, ứng dụng hay rủi ro của AI. Mỗi dòng bên dưới chỉ chứa <strong>một</strong> nhận định có thể kiểm tra.</p>
        <blockquote className="draft" aria-label="Bản thảo">
          {pieces
            ? pieces.map((p, i) => (p.hit ? <mark key={i} title="Từ ngữ làm phạm vi rộng: cần bằng chứng rất rộng">{p.t}</mark> : <span key={i}>{p.t}</span>))
            : ws.case.text}
        </blockquote>
        <label className="check">
          <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} />
          <span>
            Gợi ý hỗ trợ: tô các từ tuyệt đối ("mọi", "luôn", "không bao giờ"…). <span className="muted">Nên tắt để học sinh tự khoanh trước.</span>
          </span>
        </label>
      </section>

      <section className="card">
        <div className="row between wrap">
          <h2>Các nhận định đã tách ({ws.claims.length})</h2>
          <div className="row wrap">
            <button className="btn" onClick={addSeeded} disabled={full}>
              Tách sẵn theo bản thảo (hỗ trợ)
            </button>
            <button className="btn primary" onClick={addBlank} disabled={full}>
              + Thêm nhận định
            </button>
          </div>
        </div>
        {ws.claims.length === 0 && <p className="empty">Chưa có nhận định. Bấm "+ Thêm nhận định" rồi gõ một câu có thể kiểm tra, hoặc dùng "Tách sẵn" nếu cần hỗ trợ.</p>}
        <ol className="claim-list">
          {ws.claims.map((c, i) => (
            <ClaimRow key={c.id} c={c} n={i + 1} hints={hints} autoFocus={c.id === focusId} patchClaim={patchClaim} removeClaim={removeClaim} />
          ))}
        </ol>
        {full && <p className="warn-text">Đã đạt tối đa {LIMITS.claims} nhận định.</p>}
      </section>
    </div>
  );
}

const ClaimRow = memo(function ClaimRow({
  c,
  n,
  hints,
  autoFocus,
  patchClaim,
  removeClaim,
}: {
  c: Claim;
  n: number;
  hints: boolean;
  autoFocus: boolean;
  patchClaim: (id: string, p: Partial<Claim>) => void;
  removeClaim: (id: string) => void;
}) {
  const terms = hints ? findBroadTerms(c.text) : [];
  return (
    <li className="claim-row">
      <TextArea
        label={`Nhận định ${n}`}
        value={c.text}
        rows={2}
        max={LIMITS.mid}
        autoFocus={autoFocus}
        dataAttr="1"
        onChange={(v) => patchClaim(c.id, { text: v })}
        hint={terms.length ? <>Từ phạm vi rộng: {terms.map((t) => <mark key={t}>{t}</mark>)}</> : undefined}
      />
      <div className="grid2">
        <SelectField label="Loại" value={c.kind} onChange={(v) => patchClaim(c.id, { kind: v as Claim['kind'] })} options={Object.entries(KINDS)} />
        <SelectField label="Chủ đề" value={c.topic} onChange={(v) => patchClaim(c.id, { topic: v as Claim['topic'] })} options={Object.entries(TOPICS)} />
      </div>
      <button className="btn small danger" onClick={() => removeClaim(c.id)} aria-label={`Xóa nhận định ${n}`}>
        Xóa nhận định {n}
      </button>
    </li>
  );
});
