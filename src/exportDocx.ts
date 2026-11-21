// Nạp muộn (dynamic import) từ trang: thư viện docx khá nặng nên không tính vào lần mở đầu.
import { AlignmentType, Document, HeadingLevel, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { Workspace } from './model';
import { aiDeclarationText, compileSources, hasGrades, labelText, lessonText, supportsText } from './format';
import { APPB_RUBRIC, MAIN_RUBRIC, sum } from './rubric';
import { cleanXml, formatDateVN } from './text';

const FONT = 'Times New Roman';
const SZ = 26; // 13pt
const SZ_TABLE = 22; // 11pt

function runs(text: string, opt: { bold?: boolean; italics?: boolean; size?: number } = {}): TextRun[] {
  const lines = cleanXml(text).split(/\r?\n/);
  return lines.map((l, i) => new TextRun({ text: l, break: i > 0 ? 1 : 0, font: FONT, size: opt.size ?? SZ, bold: opt.bold, italics: opt.italics }));
}

const para = (text: string, opt: { bold?: boolean; italics?: boolean; size?: number; after?: number } = {}) =>
  new Paragraph({ children: runs(text, opt), spacing: { after: opt.after ?? 120 } });

const heading = (text: string) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: cleanXml(text), font: FONT, size: 28, bold: true })] });

function cell(text: string, w: number, bold = false): TableCell {
  return new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: runs(text || '', { bold, size: SZ_TABLE }) })],
  });
}

function table(head: string[], widths: number[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: false, children: r.map((t, i) => cell(t, widths[i])) })),
    ],
  });
}

export async function buildDocx(ws: Workspace): Promise<Blob> {
  const kids: (Paragraph | Table)[] = [];
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: 'PHIẾU KIỂM CHỨNG – AI FACTCHECK STUDIO', bold: true, font: FONT, size: 32 })] }));
  kids.push(para(`Nhóm / mã: ${ws.name || '(chưa đặt)'}    Lớp: ${ws.classLabel || '…'}    Bài: ${lessonText(ws.case.lesson)}`));
  kids.push(para(`Tình huống: ${ws.case.title}`, { bold: true, after: 40 }));
  kids.push(
    para(
      ws.case.origin === 'real'
        ? `Đầu ra AI thật (${ws.case.realTool}), giáo viên đã kiểm tra và được phép dùng.`
        : 'GIẢ ĐỊNH do giáo viên biên soạn, không phải đầu ra của công cụ AI thật.',
      { italics: true },
    ),
  );
  kids.push(para(ws.case.text, { italics: true }));

  kids.push(heading('1. Bảng kiểm chứng'));
  kids.push(
    table(
      ['#', 'Nhận định', 'Nguồn', 'Bằng chứng', 'Nhãn và lí do', 'Viết lại; giới hạn còn lại'],
      [4, 20, 20, 20, 18, 18],
      ws.claims.map((c, i) => [
        String(i + 1),
        c.text,
        (c.source.noSourceFound ? 'Chưa tìm được nguồn. ' : '') +
          [c.source.author, c.source.title, c.source.locator].filter(Boolean).join('. ') +
          (c.source.accessDate ? ` (truy cập ${formatDateVN(c.source.accessDate)})` : ''),
        c.evidence,
        `${labelText(c.label)}${c.reason ? '. ' + c.reason : ''}`,
        `${c.rewrite}${c.remaining ? ' Còn lại: ' + c.remaining : ''}`,
      ]),
    ),
  );

  if (ws.apps.length) {
    kids.push(heading('2. Ứng dụng AI (Phiếu B)'));
    kids.push(
      table(
        ['Bối cảnh', 'AI hỗ trợ', 'Lợi ích', 'Rủi ro/giới hạn', 'Con người kiểm tra', 'Giảm rủi ro'],
        [12, 20, 17, 17, 17, 17],
        ws.apps.map((a) => [a.context, a.task, a.benefit, a.risk, a.humanCheck, a.mitigation]),
      ),
    );
  }

  if (ws.claims.some((c) => c.review.reviewer || c.review.comment || c.review.fixed)) {
    kids.push(heading('3. Phản biện và chỉnh sửa'));
    kids.push(
      table(
        ['#', 'Nhóm phản biện', 'Nguồn có hỗ trợ đúng phạm vi?', 'Góp ý', 'Nhóm tác giả đã sửa / vì'],
        [4, 16, 18, 31, 31],
        ws.claims.map((c, i) => [
          String(i + 1),
          c.review.reviewer,
          supportsText(c.review.supports),
          c.review.comment,
          `${c.review.fixed}${c.review.because ? ' – vì ' + c.review.because : ''}${c.review.remaining ? ' Còn thiếu chứng cứ: ' + c.review.remaining : ''}`,
        ]),
      ),
    );
  }

  kids.push(heading('4. Bản công bố'));
  kids.push(para(ws.publication || '(chưa viết)'));

  kids.push(heading('5. Danh mục nguồn'));
  const srcs = compileSources(ws);
  if (srcs.length === 0 && !ws.extraSources) kids.push(para('(chưa có)'));
  srcs.forEach((s, i) => kids.push(para(`${i + 1}. ${s}`, { after: 60 })));
  if (ws.extraSources) kids.push(para(ws.extraSources));

  kids.push(heading('6. Khai báo vai trò của AI'));
  kids.push(para(aiDeclarationText(ws)));

  if (hasGrades(ws)) {
    kids.push(heading('7. Chấm của giáo viên'));
    kids.push(
      para(
        `Rubric sản phẩm kiểm chứng: ${sum(ws.grading.main)}/${MAIN_RUBRIC.reduce((a, c) => a + c.max, 0)}. Rubric Phiếu B (thang riêng): ${sum(ws.grading.appB)}/${APPB_RUBRIC.reduce((a, c) => a + c.max, 0)}. Hai thang không cộng với nhau.`,
      ),
    );
    if (ws.grading.note) kids.push(para(ws.grading.note));
  }
  kids.push(para('Công cụ chỉ ghi nhận tiến trình biên tập; không tự xác minh nguồn và không đánh giá đúng/sai.', { italics: true, size: 20 }));

  const doc = new Document({
    creator: 'AI FactCheck Studio',
    title: cleanXml(`Phiếu kiểm chứng – ${ws.name || ws.case.title}`),
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
        children: kids,
      },
    ],
  });
  return Packer.toBlob(doc);
}
