import { Case, SourceItem } from './model';

// Nội dung lấy nguyên từ biện pháp 04 (mục 3.3 và 5.4). Mọi văn bản ở đây là
// GIẢ ĐỊNH do giáo viên biên soạn, KHÔNG phải trích dẫn đầu ra của công cụ AI thật.

const SOURCES: SourceItem[] = [
  {
    title: 'Sách giáo khoa Tin học 12 – Kết nối tri thức với cuộc sống, Chủ đề 1, Bài 1–2',
    author: '',
    locator: '',
    note: 'Ghi tác giả, nhà xuất bản, năm xuất bản và số trang theo đúng bản sách đang dùng.',
  },
  {
    title: 'Làm quen với trí tuệ nhân tạo (tài liệu tham khảo tóm tắt Bài 1)',
    author: 'thaycai.net',
    locator: 'https://www.thaycai.net/2024/08/ly-thuyet-tin-hoc-12-sach-ket-noi-tri-thuc-bai1.html',
    note: 'Bản tóm tắt tham khảo; nên đối chiếu với SGK. Ghi ngày truy cập.',
  },
  {
    title: 'Trí tuệ nhân tạo trong khoa học và đời sống (tài liệu tham khảo tóm tắt Bài 2)',
    author: 'thaycai.net',
    locator: 'https://www.thaycai.net/2024/08/ly-thuyet-tin-hoc-12-sach-ket-noi-tri-thuc-bai2.html',
    note: 'Bản tóm tắt tham khảo; nên đối chiếu với SGK. Ghi ngày truy cập.',
  },
  {
    title: 'Artificial intelligence and the Futures of Learning',
    author: 'UNESCO',
    locator: 'https://www.unesco.org/en/digital-education/ai-future-learning?hub=32618',
    note: 'Chỉ để tham khảo định hướng về AI và giáo dục; không dùng trang giới thiệu dự án làm bằng chứng cho một kết quả thực nghiệm cụ thể.',
  },
];

export const BUILT_IN_CASES: Case[] = [
  {
    id: 'built-in-ban-thao-bai1',
    title: 'Bản thảo mô phỏng: trợ lí AI và khả năng hiểu',
    lesson: 'bai1',
    origin: 'assumed',
    realTool: '',
    realChecked: false,
    text:
      'Trợ lí AI có thể tạo câu trả lời bằng ngôn ngữ tự nhiên. Mọi công cụ AI đều hiểu thế giới giống con người. Kết quả do AI tạo ra luôn chính xác nên không cần kiểm chứng. AI có thể hỗ trợ một số hoạt động học tập.',
    sources: SOURCES,
    seeds: [
      {
        text: 'Trợ lí AI có thể tạo câu trả lời bằng ngôn ngữ tự nhiên.',
        topic: 'ability',
        hint: 'Có thể đánh dấu "được nguồn hỗ trợ" khi SGK hoặc nguồn mô tả rõ chức năng này; ghi đúng tên nguồn/trang. Kết luận chỉ nói "có thể", không nói mọi hệ thống AI đều làm được.',
      },
      {
        text: 'Mọi công cụ AI đều hiểu thế giới giống con người.',
        topic: 'ability',
        hint: 'Cụm "mọi" và "giống con người" đòi hỏi bằng chứng rất rộng. Chỉ quan sát trả lời trôi chảy không đủ xác lập điều đó. Với bộ nguồn bài học không có bằng chứng hỗ trợ, ghi "chưa đủ bằng chứng", hoặc "cần sửa" nếu nguồn được kiểm tra trực tiếp cho thấy mâu thuẫn. Viết lại theo biểu hiện có thể quan sát, không khẳng định máy có/không có trải nghiệm chủ quan như một điều được chứng minh bởi bài tập.',
      },
      {
        text: 'Kết quả do AI tạo ra luôn chính xác nên không cần kiểm chứng.',
        topic: 'limit',
        hint: 'Nếu học sinh có một trường hợp sai đã kiểm tra bằng nguồn đáng tin, có thể gắn "cần sửa"; nếu chưa có phản ví dụ xác minh, ghi "chưa đủ bằng chứng", không tự bịa ví dụ. Viết lại an toàn: "Kết quả có thể sai hoặc thiếu; người dùng cần đối chiếu trước khi sử dụng".',
      },
      {
        text: 'AI có thể hỗ trợ một số hoạt động học tập.',
        topic: 'application',
        hint: 'SGK Bài 2 nêu ví dụ trợ lí và nền tảng học tập; ghi "được nguồn hỗ trợ" trong phạm vi được mô tả. Tránh suy ra mọi ứng dụng đều hiệu quả với mọi học sinh.',
      },
    ],
    teacherNotes:
      'Bản thảo do giáo viên tự viết để mô phỏng, không phải trích dẫn đầu ra AI thật. Dùng cho tiết 1 (Bài 1) và tiết 2 (Bài 2). Nên có cả nhận định hợp lí lẫn phát biểu quá tuyệt đối để học sinh không mặc định "AI luôn sai".',
    builtIn: true,
  },
  {
    id: 'built-in-de-truoc',
    title: 'Đề khảo sát cá nhân – ĐỀ TRƯỚC',
    lesson: 'both',
    origin: 'assumed',
    realTool: '',
    realChecked: false,
    text: 'Một trợ lí AI có thể tạo văn bản. Mọi câu trả lời của trợ lí AI đều chính xác. AI có thể hỗ trợ việc học.',
    sources: SOURCES,
    seeds: [
      { text: 'Một trợ lí AI có thể tạo văn bản.', topic: 'ability', hint: '' },
      { text: 'Mọi câu trả lời của trợ lí AI đều chính xác.', topic: 'limit', hint: '' },
      { text: 'AI có thể hỗ trợ việc học.', topic: 'application', hint: '' },
    ],
    teacherNotes:
      'Yêu cầu: tách tối thiểu hai nhận định; chọn một nhận định kiểm tra theo bộ nguồn; ghi nhãn, lí do và cách viết lại; nêu một lưu ý bảo vệ thông tin cá nhân. Mỗi bài 10–12 phút, làm cá nhân, dùng cùng loại nguồn giáo viên phát. Chấm bằng rubric 10 điểm. Học sinh dùng mã ẩn danh để đối chiếu trước–sau.',
    builtIn: true,
  },
  {
    id: 'built-in-de-sau',
    title: 'Đề khảo sát cá nhân – ĐỀ SAU',
    lesson: 'both',
    origin: 'assumed',
    realTool: '',
    realChecked: false,
    text: 'Một hệ thống AI có thể hỗ trợ nhận dạng hình ảnh. Mọi kết quả nhận dạng đều chính xác. AI có thể hỗ trợ một số công việc trong y tế.',
    sources: [],
    seeds: [
      { text: 'Một hệ thống AI có thể hỗ trợ nhận dạng hình ảnh.', topic: 'ability', hint: '' },
      { text: 'Mọi kết quả nhận dạng đều chính xác.', topic: 'limit', hint: '' },
      { text: 'AI có thể hỗ trợ một số công việc trong y tế.', topic: 'application', hint: '' },
    ],
    teacherNotes:
      'Học sinh không dùng thông tin bệnh án thật. Giáo viên tự chuẩn bị bộ nguồn có cả thông tin về ứng dụng lẫn một tài liệu nêu giới hạn, rồi thêm vào bằng "Sao chép & sửa". Nếu nguồn không đủ để bác bỏ câu tuyệt đối, chấp nhận kết luận "chưa đủ bằng chứng" có lập luận. Hai đề được thiết kế tương đương về cấu trúc nhưng cần thử trước hoặc nhờ đồng nghiệp rà soát độ khó.',
    builtIn: true,
  },
];

export const MEDICAL_NOTE =
  'Với y tế chỉ bàn về AI hỗ trợ bác sĩ; không giao AI tự chẩn đoán hay thay bác sĩ. Không dùng thông tin bệnh án thật.';

export function newCustomCase(from?: Case): Case {
  const base: Case = from
    ? JSON.parse(JSON.stringify(from))
    : { id: '', title: '', lesson: 'both', origin: 'assumed', realTool: '', realChecked: false, text: '', sources: [], seeds: [], teacherNotes: '', builtIn: false };
  return { ...base, id: '', builtIn: false, title: from ? `${from.title} (bản sao)` : '' };
}

/** Đề khảo sát cá nhân (Phụ lục 2 của biện pháp): Đề trước / Đề sau và các bản sao của chúng. */
export const isSurvey = (c: Pick<Case, 'id' | 'title'>): boolean => c.id.startsWith('built-in-de-') || /đề khảo sát/i.test(c.title);

export const SURVEY_TASKS = [
  'Tách tối thiểu hai nhận định có thể kiểm tra.',
  'Chọn một nhận định và kiểm tra theo bộ nguồn giáo viên phát.',
  'Ghi nhãn (được nguồn hỗ trợ / cần sửa / chưa đủ bằng chứng), lí do và cách viết lại.',
  'Nêu một lưu ý bảo vệ thông tin cá nhân khi dùng công cụ AI.',
];
