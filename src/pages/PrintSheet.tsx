import { Workspace } from '../model';
import { aiDeclarationText, compileSources, hasGrades, labelText, lessonText, supportsText } from '../format';
import { formatDateTime } from '../text';
import { APPB_RUBRIC, MAIN_RUBRIC, sum } from '../rubric';
import { OriginBadge } from '../components/ui';

/** Bản in của một hồ sơ: chỉ dựng khi bấm "In phiếu". */
export default function PrintSheet({ ws }: { ws: Workspace }) {
  const sources = compileSources(ws);
  return (
    <article className="print-only sheet">
      <h1>Phiếu kiểm chứng – AI FactCheck Studio</h1>
      <p>
        <strong>Nhóm / mã:</strong> {ws.name || '(chưa đặt)'} &nbsp; <strong>Lớp:</strong> {ws.classLabel || '…'} &nbsp; <strong>Bài:</strong> {lessonText(ws.case.lesson)} &nbsp; <strong>In lúc:</strong>{' '}
        {formatDateTime(Date.now())}
      </p>
      <p>
        <strong>Tình huống:</strong> {ws.case.title}. <OriginBadge c={ws.case} />
      </p>
      <p className="print-quote">{ws.case.text}</p>

      <h2>Bảng kiểm chứng</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nhận định</th>
            <th>Nguồn</th>
            <th>Bằng chứng</th>
            <th>Nhãn và lí do</th>
            <th>Viết lại; giới hạn còn lại</th>
          </tr>
        </thead>
        <tbody>
          {ws.claims.map((c, i) => (
            <tr key={c.id}>
              <td>{i + 1}</td>
              <td>{c.text}</td>
              <td>
                {c.source.noSourceFound ? <em>Chưa tìm được nguồn. </em> : null}
                {[c.source.author, c.source.title, c.source.locator].filter(Boolean).join('. ')}
                {c.source.accessDate ? ` (truy cập ${c.source.accessDate.split('-').reverse().join('/')})` : ''}
              </td>
              <td>{c.evidence}</td>
              <td>
                <strong>{labelText(c.label)}</strong>
                {c.reason ? `. ${c.reason}` : ''}
              </td>
              <td>
                {c.rewrite}
                {c.remaining ? ` Còn lại: ${c.remaining}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {ws.apps.length > 0 && (
        <>
          <h2>Ứng dụng AI (Phiếu B)</h2>
          <table>
            <thead>
              <tr>
                <th>Bối cảnh</th>
                <th>AI hỗ trợ</th>
                <th>Lợi ích</th>
                <th>Rủi ro/giới hạn</th>
                <th>Con người kiểm tra</th>
                <th>Giảm rủi ro</th>
              </tr>
            </thead>
            <tbody>
              {ws.apps.map((a) => (
                <tr key={a.id}>
                  <td>{a.context}</td>
                  <td>{a.task}</td>
                  <td>{a.benefit}</td>
                  <td>{a.risk}</td>
                  <td>{a.humanCheck}</td>
                  <td>{a.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {ws.claims.some((c) => c.review.reviewer || c.review.comment || c.review.fixed) && (
        <>
          <h2>Phản biện và chỉnh sửa</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nhóm phản biện</th>
                <th>Nguồn có hỗ trợ đúng phạm vi?</th>
                <th>Góp ý</th>
                <th>Nhóm tác giả đã sửa / vì</th>
              </tr>
            </thead>
            <tbody>
              {ws.claims.map((c, i) => (
                <tr key={c.id}>
                  <td>{i + 1}</td>
                  <td>{c.review.reviewer}</td>
                  <td>{supportsText(c.review.supports)}</td>
                  <td>{c.review.comment}</td>
                  <td>
                    {c.review.fixed}
                    {c.review.because ? ` – vì ${c.review.because}` : ''}
                    {c.review.remaining ? ` Còn thiếu chứng cứ: ${c.review.remaining}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Bản công bố</h2>
      <p className="print-pre">{ws.publication || '(chưa viết)'}</p>
      <h2>Danh mục nguồn</h2>
      {sources.length || ws.extraSources ? (
        <ol>
          {sources.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          {ws.extraSources ? <li className="print-pre">{ws.extraSources}</li> : null}
        </ol>
      ) : (
        <p>(chưa có)</p>
      )}
      <h2>Khai báo vai trò của AI</h2>
      <p>{aiDeclarationText(ws)}</p>

      {hasGrades(ws) && (
        <>
          <h2>Chấm của giáo viên</h2>
          <p>
            Rubric sản phẩm kiểm chứng: <strong>{sum(ws.grading.main)}</strong> / {MAIN_RUBRIC.reduce((a, c) => a + c.max, 0)}. Rubric Phiếu B (thang riêng): <strong>{sum(ws.grading.appB)}</strong> /{' '}
            {APPB_RUBRIC.reduce((a, c) => a + c.max, 0)}. Hai thang không cộng với nhau.
          </p>
          {ws.grading.note && <p className="print-pre">{ws.grading.note}</p>}
        </>
      )}
      <p className="print-foot">Công cụ chỉ ghi nhận tiến trình biên tập; không tự xác minh nguồn và không đánh giá đúng/sai.</p>
    </article>
  );
}
