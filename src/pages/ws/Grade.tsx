import { Workspace } from '../../model';
import { APPB_RUBRIC, Criterion, MAIN_RUBRIC, RUBRIC_NOTE, filled, sum } from '../../rubric';
import { TextArea } from '../../components/ui';

interface Props {
  ws: Workspace;
  setScore: (which: 'main' | 'appB', i: number, v: number | null) => void;
  setNote: (v: string) => void;
}

export default function Grade({ ws, setScore, setNote }: Props) {
  return (
    <div>
      <section className="card">
        <h2>Chấm bằng rubric (giáo viên)</h2>
        <p className="muted">{RUBRIC_NOTE}</p>
      </section>
      <RubricBlock title="Rubric sản phẩm kiểm chứng – 10 điểm" crit={MAIN_RUBRIC} scores={ws.grading.main} onScore={(i, v) => setScore('main', i, v)} />
      <RubricBlock title="Rubric Phiếu B (ứng dụng AI và phản biện) – thang riêng, 4 tiêu chí × 0–2" crit={APPB_RUBRIC} scores={ws.grading.appB} onScore={(i, v) => setScore('appB', i, v)} />
      <section className="card">
        <TextArea label="Nhận xét của giáo viên" value={ws.grading.note} onChange={setNote} max={3000} />
      </section>
    </div>
  );
}

function RubricBlock({ title, crit, scores, onScore }: { title: string; crit: Criterion[]; scores: (number | null)[]; onScore: (i: number, v: number | null) => void }) {
  const total = sum(scores);
  const max = crit.reduce((a, c) => a + c.max, 0);
  return (
    <section className="card">
      <h3>{title}</h3>
      {crit.map((c, i) => {
        const opts: number[] = [];
        for (let v = c.max; v >= 0; v--) opts.push(v);
        const id = `g-${title.length}-${i}`;
        return (
          <div key={c.name} className="rubric-row">
            <div className="field">
              <label htmlFor={id}>
                {c.name} (tối đa {c.max})
              </label>
              <select id={id} value={scores[i] === null ? '' : String(scores[i])} onChange={(e) => onScore(i, e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">— chưa chấm —</option>
                {opts.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <ul className="levels">
              {c.levels.map((l, k) => (
                <li key={k}>{l}</li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="total" aria-live="polite">
        Tổng: <strong>{total}</strong> / {max} {filled(scores) ? '' : <span className="muted">(còn tiêu chí chưa chấm)</span>}
      </p>
    </section>
  );
}
