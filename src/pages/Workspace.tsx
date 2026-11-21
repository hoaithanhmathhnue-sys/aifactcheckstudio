import { KeyboardEvent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AppRow, Claim, LIMITS, Review as R, Source, Workspace as W, LESSONS, emptyApp } from '../model';
import { store, useApp } from '../ctx';
import { useWorkspace } from '../useWorkspace';
import { OriginBadge, SaveStatus, TextInput } from '../components/ui';
import { Issue, TabId, validateWorkspace } from '../validate';
import { backupFileName, exportJson } from '../storage';
import { downloadBlob, downloadText } from '../download';
import { slug } from '../text';
import { allowDelete } from '../guard';
import Draft from './ws/Draft';
import Verify from './ws/Verify';
import Apps from './ws/Apps';
import Review from './ws/Review';
import Publish from './ws/Publish';

const Grade = lazy(() => import('./ws/Grade'));
const PrintSheet = lazy(() => import('./PrintSheet'));

const TABS: { id: TabId; label: string; teacherOnly?: boolean }[] = [
  { id: 'draft', label: '1. Bản thảo' },
  { id: 'verify', label: '2. Kiểm chứng' },
  { id: 'apps', label: '3. Ứng dụng AI' },
  { id: 'review', label: '4. Phản biện' },
  { id: 'publish', label: '5. Công bố & xuất' },
  { id: 'grade', label: 'Chấm điểm', teacherOnly: true },
];

export default function WorkspacePage({ id, tab, focusClaim }: { id: string; tab: TabId; focusClaim: string }) {
  const h = useWorkspace(id);
  const { prefs, setPrefs, toast } = useApp();
  const [showCheck, setShowCheck] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { ws, update } = h;

  // Cuộn tới nhận định được chỉ định (từ danh sách cảnh báo)
  useEffect(() => {
    if (!focusClaim) return;
    const t = window.setTimeout(() => document.getElementById('claim-' + focusClaim)?.scrollIntoView({ block: 'center' }), 50);
    return () => window.clearTimeout(t);
  }, [focusClaim, tab]);

  // In: dựng bản in rồi gọi hộp thoại in của trình duyệt
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const t = window.setTimeout(() => window.print(), 120);
    return () => {
      window.removeEventListener('afterprint', done);
      window.clearTimeout(t);
    };
  }, [printing]);

  const patch = useCallback((p: Partial<W>) => update((w) => ({ ...w, ...p })), [update]);
  const patchAi = useCallback((p: Partial<W['ai']>) => update((w) => ({ ...w, ai: { ...w.ai, ...p } })), [update]);

  const patchClaim = useCallback(
    (cid: string, p: Partial<Claim>) => update((w) => ({ ...w, claims: w.claims.map((c) => (c.id === cid ? { ...c, ...p } : c)) })),
    [update],
  );
  const patchSource = useCallback(
    (cid: string, p: Partial<Source>) => update((w) => ({ ...w, claims: w.claims.map((c) => (c.id === cid ? { ...c, source: { ...c.source, ...p } } : c)) })),
    [update],
  );
  const patchReview = useCallback(
    (cid: string, p: Partial<R>) => update((w) => ({ ...w, claims: w.claims.map((c) => (c.id === cid ? { ...c, review: { ...c.review, ...p } } : c)) })),
    [update],
  );
  const addClaims = useCallback(
    (cs: Claim[]) => update((w) => ({ ...w, claims: [...w.claims, ...cs].slice(0, LIMITS.claims) })),
    [update],
  );
  const removeClaim = useCallback(
    (cid: string) => {
      if (!allowDelete()) return;
      const box: { c: Claim | null; i: number } = { c: null, i: -1 };
      update((w) => {
        const i = w.claims.findIndex((c) => c.id === cid);
        if (i < 0) return w; // bấm liên tục: lần sau không còn gì để xóa
        box.c = w.claims[i];
        box.i = i;
        return { ...w, claims: w.claims.filter((c) => c.id !== cid) };
      });
      if (box.c) {
        const removed = box.c;
        const at = box.i;
        toast('Đã xóa nhận định', () =>
          update((w) => {
            if (w.claims.some((c) => c.id === removed.id)) return w;
            const cl = [...w.claims];
            cl.splice(Math.min(at, cl.length), 0, removed);
            return { ...w, claims: cl };
          }),
        );
      }
    },
    [update, toast],
  );
  const addApp = useCallback(() => update((w) => (w.apps.length >= LIMITS.apps ? w : { ...w, apps: [...w.apps, emptyApp()] })), [update]);
  const patchApp = useCallback((aid: string, p: Partial<AppRow>) => update((w) => ({ ...w, apps: w.apps.map((a) => (a.id === aid ? { ...a, ...p } : a)) })), [update]);
  const removeApp = useCallback(
    (aid: string) => {
      if (!allowDelete()) return;
      const box: { a: AppRow | null; i: number } = { a: null, i: -1 };
      update((w) => {
        const i = w.apps.findIndex((a) => a.id === aid);
        if (i < 0) return w;
        box.a = w.apps[i];
        box.i = i;
        return { ...w, apps: w.apps.filter((a) => a.id !== aid) };
      });
      if (box.a) {
        const removed = box.a;
        const at = box.i;
        toast('Đã xóa ứng dụng', () =>
          update((w) => {
            if (w.apps.some((a) => a.id === removed.id)) return w;
            const l = [...w.apps];
            l.splice(Math.min(at, l.length), 0, removed);
            return { ...w, apps: l };
          }),
        );
      }
    },
    [update, toast],
  );
  const setScore = useCallback(
    (which: 'main' | 'appB', i: number, v: number | null) =>
      update((w) => {
        const arr = [...w.grading[which]];
        arr[i] = v;
        return { ...w, grading: { ...w.grading, [which]: arr } };
      }),
    [update],
  );
  const setNote = useCallback((v: string) => update((w) => ({ ...w, grading: { ...w.grading, note: v } })), [update]);

  const issues: Issue[] | null = useMemo(() => (showCheck && ws ? validateWorkspace(ws) : null), [showCheck, ws]);
  const runCheck = useCallback(() => setShowCheck(true), []);

  const onBackup = useCallback(() => {
    if (!ws) return;
    downloadText(exportJson(ws), backupFileName(ws));
  }, [ws]);

  const onDocx = useCallback(async () => {
    if (!ws) return;
    try {
      const { buildDocx } = await import('../exportDocx');
      const blob = await buildDocx(ws);
      downloadBlob(blob, `PhieuKiemChung_${slug(ws.name || ws.case.title)}.docx`);
    } catch {
      toast('Không tạo được file Word. Hãy thử "In phiếu" hoặc tải file sao lưu.');
    }
  }, [ws, toast]);

  const tabs = useMemo(() => TABS.filter((t) => !t.teacherOnly || prefs.teacher), [prefs.teacher]);

  if (!ws) {
    return (
      <section className="card">
        <h1>Không tìm thấy hồ sơ</h1>
        <p>Hồ sơ này không còn trên máy (có thể đã bị xóa hoặc nằm ở trình duyệt/máy khác). Nếu có file sao lưu, hãy nhập lại ở trang chủ.</p>
        <a className="btn primary" href="#/">
          Về trang chủ
        </a>
      </section>
    );
  }

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.id === tab);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    window.location.hash = `/ws/${id}/${n.id}`;
    window.setTimeout(() => document.getElementById('tab-' + n.id)?.focus(), 0);
  };

  const effTab: TabId = tab === 'grade' && !prefs.teacher ? 'draft' : tab;

  return (
    <div>
      <div className="no-print">
        <section className="card ws-head">
          <div className="row between wrap">
            <h1 className="ws-title">{ws.case.title}</h1>
            <SaveStatus status={h.status} savedAt={h.savedAt} persistent={store.persistent} onRetry={h.retry} />
          </div>
          <div className="row wrap">
            <OriginBadge c={ws.case} />
            <span className="badge muted">{LESSONS[ws.case.lesson]}</span>
          </div>
          <div className="grid2">
            <TextInput
              label="Tên nhóm hoặc mã ẩn danh"
              hint="Không nhập họ tên đầy đủ hay thông tin cá nhân. Dùng mã (ví dụ N3-12A2) để đối chiếu trước–sau."
              value={ws.name}
              max={80}
              onChange={(v) => patch({ name: v })}
            />
            <TextInput label="Lớp" value={ws.classLabel} max={30} onChange={(v) => patch({ classLabel: v })} />
          </div>
          {h.status === 'conflict' && (
            <div className="banner bad" role="alert">
              <p>
                <strong>Hồ sơ này vừa được sửa ở một tab khác của trình duyệt.</strong> Chọn bản nào để giữ? (Phần bạn vừa gõ chưa bị mất, vẫn đang nằm trên màn hình này.)
              </p>
              <div className="row wrap">
                <button className="btn" onClick={h.useTheirs}>
                  Tải bản mới (bỏ phần vừa gõ ở tab này)
                </button>
                <button className="btn primary" onClick={h.keepMine}>
                  Ghi đè bằng bản ở tab này
                </button>
                <button className="btn" onClick={onBackup}>
                  Tải bản của tôi về máy trước
                </button>
              </div>
            </div>
          )}
          <div className="row wrap">
            <button className="btn" onClick={runCheck} aria-expanded={showCheck}>
              Kiểm tra điền đủ chưa
            </button>
            <label className="check inline">
              <input
                type="checkbox"
                checked={prefs.hints}
                onChange={(e) => setPrefs({ hints: e.target.checked })}
              />
              <span>Gợi ý hỗ trợ (tô từ tuyệt đối)</span>
            </label>
          </div>
          {issues && (
            <div className="banner" role="region" aria-label="Kết quả kiểm tra điền đủ chưa" aria-live="polite">
              <div className="row between wrap">
                <strong>{issues.filter((i) => i.level === 'warn').length === 0 ? 'Các trường bắt buộc đã được điền.' : `${issues.filter((i) => i.level === 'warn').length} chỗ cần xem lại`}</strong>
                <button className="btn small ghost" onClick={() => setShowCheck(false)}>
                  Đóng
                </button>
              </div>
              <p className="muted">Kiểm tra này chỉ xem đã điền đủ trường hay chưa. Nó không đánh giá nhận định đúng hay sai và không xác minh nguồn. Cảnh báo không chặn việc lưu hay xuất.</p>
              <ul className="issue-list">
                {issues.map((i) => (
                  <li key={i.key} className={i.level}>
                    {i.level === 'warn' ? '⚠' : 'ℹ'} {i.message}{' '}
                    <a href={`#/ws/${id}/${i.tab}${i.claimId ? '?c=' + i.claimId : ''}`}>Đi tới</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="tabs" role="tablist" aria-label="Các bước trong phòng biên tập" onKeyDown={onTabKey}>
          {tabs.map((t) => (
            <a
              key={t.id}
              id={'tab-' + t.id}
              role="tab"
              aria-selected={effTab === t.id}
              tabIndex={effTab === t.id ? 0 : -1}
              className={'tab' + (effTab === t.id ? ' on' : '')}
              href={`#/ws/${id}/${t.id}`}
            >
              {t.label}
            </a>
          ))}
        </div>

        <div role="tabpanel" aria-labelledby={'tab-' + effTab}>
          {effTab === 'draft' && <Draft ws={ws} hints={prefs.hints} setHints={(v) => setPrefs({ hints: v })} addClaims={addClaims} patchClaim={patchClaim} removeClaim={removeClaim} />}
          {effTab === 'verify' && (
            <Verify ws={ws} teacher={prefs.teacher} hints={prefs.hints} patchClaim={patchClaim} patchSource={patchSource} goDraft={() => (window.location.hash = `/ws/${id}/draft`)} focusClaim={focusClaim} />
          )}
          {effTab === 'apps' && <Apps ws={ws} addApp={addApp} patchApp={patchApp} removeApp={removeApp} />}
          {effTab === 'review' && <Review ws={ws} patchReview={patchReview} />}
          {effTab === 'publish' && <Publish ws={ws} patch={patch} patchAi={patchAi} onPrint={() => setPrinting(true)} onDocx={onDocx} onBackup={onBackup} onCheck={runCheck} />}
          {effTab === 'grade' && (
            <Suspense fallback={<p>Đang tải…</p>}>
              <Grade ws={ws} setScore={setScore} setNote={setNote} />
            </Suspense>
          )}
        </div>
      </div>
      {printing && (
        <Suspense fallback={null}>
          <PrintSheet ws={ws} />
        </Suspense>
      )}
    </div>
  );
}
