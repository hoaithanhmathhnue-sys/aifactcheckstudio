import { useState } from 'react';
import { BUILT_IN_CASES, SURVEY_TASKS, isSurvey } from '../cases';
import { store } from '../ctx';
import { OriginBadge, Locator } from '../components/ui';
import { APPB_RUBRIC, MAIN_RUBRIC, RUBRIC_NOTE } from '../rubric';

const dots = (n = 3) => Array.from({ length: n }, (_, i) => <div key={i} className="line" />);

/** Bản phát một tình huống (giấy), kèm bộ nguồn. Đề khảo sát có thêm ô mã ẩn danh và yêu cầu riêng. */
export function CaseHandout({ id }: { id: string }) {
  const c = [...BUILT_IN_CASES, ...store.loadCases()].find((x) => x.id === id);
  if (!c) return <p className="card">Không tìm thấy tình huống.</p>;
  const survey = isSurvey(c);
  return (
    <div>
      <div className="no-print row wrap card">
        <button className="btn primary" onClick={() => window.print()}>
          In bản phát
        </button>
        <a className="btn" href="#/cases">
          Về thư viện
        </a>
      </div>
      <article className="sheet print-page">
        <h1>{survey ? 'Khảo sát cá nhân' : 'Bản thảo cần kiểm chứng'}</h1>
        <p>
          <strong>{c.title}</strong>
        </p>
        {survey && <p>Mã ẩn danh: ……………… &nbsp; Lớp: ……… &nbsp; Ngày: ……… &nbsp; Thời gian: 10–12 phút, làm cá nhân.</p>}
        <p>
          <OriginBadge c={c} />
        </p>
        <p className="print-quote">{c.text}</p>
        {survey ? (
          <>
            <p>
              <strong>Yêu cầu:</strong>
            </p>
            <ol>
              {SURVEY_TASKS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </>
        ) : (
          <p>
            <strong>Nhiệm vụ:</strong> tách từng nhận định có thể kiểm tra, khoanh các từ như "mọi", "luôn", "không bao giờ"; tìm nguồn, ghi bằng chứng; chọn một nhãn: được nguồn hỗ trợ / cần sửa / chưa đủ bằng chứng; viết lại cho an toàn hơn.
          </p>
        )}
        {c.sources.length > 0 && (
          <>
            <h2>Bộ nguồn của giáo viên</h2>
            <ol>
              {c.sources.map((s, i) => (
                <li key={i}>
                  {s.title}
                  {s.author ? ` – ${s.author}` : ''}
                  {s.locator ? ' – ' : ''}
                  {s.locator && <Locator value={s.locator} />}
                  {s.note ? <em> ({s.note})</em> : null}
                </li>
              ))}
            </ol>
          </>
        )}
        <h2>{survey ? 'Bài làm' : 'Ghi chép của nhóm'}</h2>
        {dots(survey ? 14 : 10)}
      </article>
    </div>
  );
}

export const PRINT_DOCS = [
  { id: 'a', name: 'Phiếu A – Kiểm chứng nhận định' },
  { id: 'b', name: 'Phiếu B – Ứng dụng AI và phản biện' },
  { id: 'rubric', name: 'Rubric 10 điểm + rubric Phiếu B' },
  { id: 'exit1', name: 'Phiếu cá nhân cuối Tiết 1 (Bài 1)' },
  { id: 'exit2', name: 'Phiếu cá nhân cuối Tiết 2 (Bài 2)' },
  { id: 'tally', name: 'Bảng tổng hợp trước – sau (mã ẩn danh)' },
] as const;
type DocId = (typeof PRINT_DOCS)[number]['id'];
const ALL = (): Set<DocId> => new Set(PRINT_DOCS.map((d) => d.id));

const TALLY_INDICATORS: [string, string][] = [
  ['Số bài hợp lệ', 'Danh sách mã ẩn danh'],
  ['Số học sinh tách đúng tối thiểu hai nhận định', 'Phiếu cá nhân'],
  ['Số học sinh có nhãn và lí do phù hợp với nguồn', 'Rubric'],
  ['Số học sinh nêu được một cách bảo vệ dữ liệu', 'Câu trả lời cá nhân'],
  ['Điểm trung bình theo rubric', 'Bảng chấm'],
];

/** Phiếu A, Phiếu B, rubric, phiếu cá nhân cuối tiết, bảng tổng hợp trước – sau: phương án thay thế khi không dùng được app. */
export default function PrintDocs() {
  const [pick, setPick] = useState<Set<DocId>>(ALL);
  const cls = (id: DocId) => `sheet print-page${pick.has(id) ? '' : ' no-print skipped'}`;
  const toggle = (id: DocId, on: boolean) =>
    setPick((old) => {
      const n = new Set(old);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <div>
      <div className="no-print card">
        <h1>Tài liệu in</h1>
        <p className="muted">
          Phiếu giấy là phương án thay thế đầy đủ khi chưa có thiết bị hoặc mất mạng. Mỗi tài liệu nằm trên một trang. Đề trước / Đề sau in từ mục Tình huống (nút "In bản phát").
        </p>
        <fieldset>
          <legend>Chọn tài liệu cần in</legend>
          <div className="pick-grid">
            {PRINT_DOCS.map((d) => (
              <label key={d.id} className="check">
                <input type="checkbox" checked={pick.has(d.id)} onChange={(e) => toggle(d.id, e.target.checked)} />
                <span>{d.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row wrap">
          <button className="btn primary" disabled={pick.size === 0} onClick={() => window.print()}>
            {pick.size === PRINT_DOCS.length ? 'In tất cả' : `In ${pick.size} tài liệu đã chọn`}
          </button>
          <button className="btn small ghost" onClick={() => setPick(ALL())}>
            Chọn tất cả
          </button>
          <button className="btn small ghost" onClick={() => setPick(new Set())}>
            Bỏ chọn
          </button>
        </div>
      </div>

      <article className={cls('a')}>
        <h1>Phiếu A – Kiểm chứng nhận định</h1>
        <p>
          Nhóm / mã: ………………… Bài học: ………………… Nhận định số: ……
        </p>
        <ol className="form">
          <li>Viết lại một nhận định cần kiểm tra: {dots(2)}</li>
          <li>Từ ngữ làm nhận định có phạm vi rộng hoặc chưa rõ: {dots(1)}</li>
          <li>Nguồn: tên tài liệu/tác giả hoặc cơ quan ……………… trang hoặc đường dẫn ……………… ngày truy cập (nếu trực tuyến) ………</li>
          <li>Nội dung nguồn thực sự hỗ trợ hoặc mâu thuẫn: {dots(3)}</li>
          <li>
            Kết luận: ☐ Được nguồn hỗ trợ &nbsp; ☐ Cần sửa &nbsp; ☐ Chưa đủ bằng chứng. Lí do: {dots(2)}
          </li>
          <li>Đề xuất cách viết lại và giới hạn còn lại: {dots(3)}</li>
          <li>AI có được sử dụng trong quá trình này không? ☐ Có ☐ Không. Nếu có: công cụ, công việc AI hỗ trợ, phần nhóm tự kiểm tra: {dots(2)}</li>
        </ol>
      </article>

      <article className={cls('b')}>
        <h1>Phiếu B – Ứng dụng AI và phản biện</h1>
        <p>Bối cảnh sử dụng (giáo dục / giao thông / y tế): ……………………………… </p>
        <p className="note-box">Với y tế chỉ bàn về AI hỗ trợ bác sĩ, không giao AI tự chẩn đoán hay thay bác sĩ. Không dùng thông tin bệnh án thật.</p>
        <ol className="form">
          <li>Công việc AI có thể hỗ trợ: {dots(2)}</li>
          <li>Một lợi ích cụ thể: {dots(1)}</li>
          <li>Một rủi ro/giới hạn: {dots(1)}</li>
          <li>Việc con người cần kiểm tra hoặc quyết định: {dots(1)}</li>
          <li>Cách giảm rủi ro: {dots(1)}</li>
          <li>Nguồn liên quan: {dots(1)}</li>
        </ol>
        <h2>Phần nhóm phản biện</h2>
        <p>Nhận định được kiểm tra: ……… Nguồn có hỗ trợ đúng phạm vi không: ……… Góp ý cụ thể:</p>
        {dots(2)}
        <h2>Phần nhóm tác giả</h2>
        <p>Nhóm đã sửa ……………… vì ……………… ; điểm còn chưa đủ chứng cứ ………………</p>
      </article>

      <article className={cls('rubric')}>
        <h1>Rubric chấm sản phẩm kiểm chứng – 10 điểm</h1>
        <table>
          <thead>
            <tr>
              <th>Tiêu chí</th>
              <th>Tối đa</th>
              <th>Cách cho điểm</th>
            </tr>
          </thead>
          <tbody>
            {MAIN_RUBRIC.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.max}</td>
                <td>
                  {r.levels.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Rubric Phiếu B (thang riêng)</h2>
        <p>{APPB_RUBRIC.map((r) => `${r.name} (0–${r.max})`).join('; ')}.</p>
        <p className="muted">{RUBRIC_NOTE}</p>
      </article>

      <article className={cls('exit1')}>
        <h1>Phiếu cá nhân cuối Tiết 1 – Bài 1</h1>
        <p>Mã ẩn danh: ……………… &nbsp; Lớp: ……… &nbsp; Nhóm: ……… &nbsp; Ngày: ………</p>
        <p className="note-box">Làm cá nhân trong 3 phút cuối tiết. Không ghi họ tên thật; dùng mã ẩn danh giáo viên đã phát.</p>
        <ol className="form">
          <li>Nêu một biểu hiện của AI ở trợ lí văn bản (ví dụ: xử lí ngôn ngữ, học từ dữ liệu, giải quyết vấn đề): {dots(3)}</li>
          <li>Nêu một điều chưa thể kết luận chỉ từ việc trợ lí trả lời trôi chảy: {dots(3)}</li>
          <li>Một từ ngữ tuyệt đối em đã khoanh trong bản thảo và vì sao cần kiểm tra: {dots(2)}</li>
        </ol>
      </article>

      <article className={cls('exit2')}>
        <h1>Phiếu cá nhân cuối Tiết 2 – Bài 2</h1>
        <p>Mã ẩn danh: ……………… &nbsp; Lớp: ……… &nbsp; Nhóm: ……… &nbsp; Ngày: ………</p>
        <p>Bối cảnh ứng dụng AI em chọn: ☐ Giáo dục &nbsp; ☐ Giao thông &nbsp; ☐ Y tế (chỉ bàn về hỗ trợ bác sĩ) &nbsp; ☐ Khác: ………</p>
        <ol className="form">
          <li>Một lợi ích cụ thể: {dots(2)}</li>
          <li>Một rủi ro hoặc giới hạn cụ thể: {dots(2)}</li>
          <li>Một cách kiểm tra hoặc giảm rủi ro đó: {dots(2)}</li>
          <li>Một lưu ý bảo vệ dữ liệu cá nhân khi dùng công cụ AI: {dots(1)}</li>
        </ol>
      </article>

      <article className={cls('tally')}>
        <h1>Bảng tổng hợp kết quả trước – sau tác động</h1>
        <p>Lớp: ……… &nbsp; Năm học: ……… &nbsp; Ngày làm Đề trước: ……… &nbsp; Ngày làm Đề sau: ………</p>
        <p className="muted">Ghi theo mã ẩn danh để đối chiếu bài của cùng một học sinh. Đánh dấu ✓ khi đạt; cột "Điểm" chấm bằng rubric 10 điểm. Chỉ ghi số liệu thật.</p>
        <table className="tally">
          <thead>
            <tr>
              <th rowSpan={2}>Mã ẩn danh</th>
              <th colSpan={4}>Đề trước</th>
              <th colSpan={4}>Đề sau</th>
            </tr>
            <tr>
              {['t', 's'].flatMap((k) => [
                <th key={k + 1}>Tách ≥ 2 nhận định</th>,
                <th key={k + 2}>Nhãn + lí do phù hợp nguồn</th>,
                <th key={k + 3}>Nêu cách bảo vệ dữ liệu</th>,
                <th key={k + 4}>Điểm</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 16 }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 9 }, (_, j) => (
                  <td key={j}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Tổng hợp (Bảng 1 của biện pháp)</h2>
        <table>
          <thead>
            <tr>
              <th>Chỉ báo</th>
              <th>Trước (Đề trước)</th>
              <th>Sau (Đề sau)</th>
              <th>Nguồn minh chứng</th>
            </tr>
          </thead>
          <tbody>
            {TALLY_INDICATORS.map(([a, b]) => (
              <tr key={a}>
                <td>{a}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          Tỉ lệ = số học sinh đạt ÷ số bài hợp lệ cùng thời điểm × 100%. Báo cáo thay đổi bằng điểm phần trăm, giữ nguyên số lượng gốc; ghi rõ học sinh vắng và khác biệt điều kiện.
        </p>
      </article>
    </div>
  );
}
