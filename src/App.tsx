import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useApp } from './ctx';
import { useRoute } from './router';
import { TabId } from './validate';
import Home from './pages/Home';
import Cases from './pages/Cases';
import CaseEditor from './pages/CaseEditor';
import WorkspacePage from './pages/Workspace';
import PrintDocs, { CaseHandout } from './pages/PrintDocs';

const TAB_IDS: TabId[] = ['draft', 'verify', 'apps', 'review', 'publish', 'grade'];

export default function App() {
  const { parts, query } = useRoute();
  const { prefs, setPrefs, needRefresh, applyUpdate, registerUpdate, toast } = useApp();
  const [a, b, c] = parts;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [a, b, c]);

  // PWA: chạy offline sau lần mở đầu; bản mới chỉ áp dụng khi người dùng bấm (không tự tải lại, tránh mất chữ đang gõ)
  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        registerUpdate(() => void update(true));
      },
      onOfflineReady() {
        toast('App đã sẵn sàng dùng khi không có mạng.');
      },
    });
  }, [registerUpdate, toast]);

  let page;
  if (a === 'ws' && b) {
    const tab = (TAB_IDS.includes(c as TabId) ? c : 'draft') as TabId;
    page = <WorkspacePage key={b} id={b} tab={tab} focusClaim={query.get('c') ?? ''} />;
  } else if (a === 'cases' && b === 'edit' && c) {
    page = <CaseEditor key={c + (query.get('from') ?? '')} id={c} from={query.get('from') ?? ''} />;
  } else if (a === 'cases' && b === 'print' && c) {
    page = <CaseHandout id={c} />;
  } else if (a === 'cases') {
    page = <Cases />;
  } else if (a === 'print') {
    page = <PrintDocs />;
  } else {
    page = <Home />;
  }

  return (
    <>
      <a className="skip no-print" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Bỏ qua, tới nội dung
      </a>
      <header className="top no-print">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true">✎</span> AI FactCheck Studio
        </a>
        <nav aria-label="Chính">
          <a href="#/" aria-current={!a ? 'page' : undefined}>Hồ sơ nhóm</a>
          <a href="#/cases" aria-current={a === 'cases' ? 'page' : undefined}>Tình huống</a>
          <a href="#/print" aria-current={a === 'print' ? 'page' : undefined}>Tài liệu in</a>
        </nav>
        <div className="modes">
          <label className="check inline">
            <input type="checkbox" checked={prefs.teacher} onChange={(e) => setPrefs({ teacher: e.target.checked })} />
            <span title="Chỉ đổi cách hiển thị (hiện gợi ý xử lí, chấm rubric). Không phải khóa bảo mật.">Chế độ giáo viên</span>
          </label>
          <label className="check inline">
            <input type="checkbox" checked={prefs.projector} onChange={(e) => setPrefs({ projector: e.target.checked })} />
            <span>Chữ lớn (chiếu)</span>
          </label>
        </div>
      </header>
      {needRefresh && (
        <div className="banner no-print" role="status">
          Có phiên bản mới của app. Dữ liệu của bạn đã được lưu.{' '}
          <button className="btn small primary" onClick={applyUpdate}>
            Cập nhật ngay
          </button>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        {page}
      </main>
      <footer className="foot no-print">
        Công cụ ghi nhận tiến trình biên tập: không tự tìm nguồn, không xác minh sự thật, không gọi AI và không chấm đúng/sai. Tình huống có sẵn là giả định do giáo viên biên soạn.
      </footer>
    </>
  );
}
