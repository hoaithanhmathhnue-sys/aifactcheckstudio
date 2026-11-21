import { BUILT_IN_CASES } from '../cases';
import { store } from '../ctx';
import { OriginBadge, Locator } from '../components/ui';
import { APPB_RUBRIC, MAIN_RUBRIC, RUBRIC_NOTE } from '../rubric';

const dots = (n = 3) => Array.from({ length: n }, (_, i) => <div key={i} className="line" />);

/** Bản phát một tình huống (giấy), kèm bộ nguồn. */
export function CaseHandout({ id }: { id: string }) {
  const c = [...BUILT_IN_CASES, ...store.loadCases()].find((x) => x.id === id);
  if (!c) return <p className="card">Không tìm thấy tình huống.</p>;
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
        <h1>Bản thảo cần kiểm chứng</h1>
        <p>
          <strong>{c.title}</strong>
        </p>
        <p>
          <OriginBadge c={c} />
        </p>
        <p className="print-quote">{c.text}</p>
        <p>
          <strong>Nhiệm vụ:</strong> tách từng nhận định có thể kiểm tra, khoanh các từ như "mọi", "luôn", "không bao giờ"; tìm nguồn, ghi bằng chứng; chọn một nhãn: được nguồn hỗ trợ / cần sửa / chưa đủ bằng chứng; viết lại cho an toàn hơn.
        </p>
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
        <h2>Ghi chép của nhóm</h2>
        {dots(10)}
      </article>
    </div>
  );
}

/** Phiếu A, Phiếu B trắng và rubric: phương án thay thế khi không dùng được app. */
export default function PrintDocs() {
  return (
    <div>
      <div className="no-print card">
        <h1>Tài liệu in</h1>
        <p className="muted">Phiếu giấy là phương án thay thế đầy đủ khi chưa có thiết bị hoặc mất mạng. Mỗi phiếu nằm trên một trang.</p>
        <button className="btn primary" onClick={() => window.print()}>
          In tất cả (Phiếu A, Phiếu B, Rubric)
        </button>
      </div>

      <article className="sheet print-page">
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

      <article className="sheet print-page">
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

      <article className="sheet print-page">
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
    </div>
  );
}
