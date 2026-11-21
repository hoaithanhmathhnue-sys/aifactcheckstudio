import { FormEvent, useEffect, useRef, useState } from 'react';
import { checkLogin, saveLogin } from '../auth';
import { TEACHER } from '../teacher';

const MAX_TRIES = 5;
const LOCK_SECONDS = 30;

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [fails, setFails] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = window.setTimeout(() => setLockLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [lockLeft]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (lockLeft > 0) return;
    if (!user.trim() || !pass) {
      setError('Vui lòng nhập đủ tên đăng nhập và mật khẩu.');
      (!user.trim() ? userRef : passRef).current?.focus();
      return;
    }
    if (checkLogin(user, pass)) {
      saveLogin(remember);
      onSuccess();
      return;
    }
    const n = fails + 1;
    setPass('');
    passRef.current?.focus();
    if (n >= MAX_TRIES) {
      setFails(0);
      setLockLeft(LOCK_SECONDS);
      setError(`Sai thông tin ${MAX_TRIES} lần liên tiếp. Vui lòng chờ ${LOCK_SECONDS} giây rồi thử lại.`);
    } else {
      setFails(n);
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  const locked = lockLeft > 0;

  return (
    <main id="main" className="login-wrap" tabIndex={-1}>
      <div className="login-card">
        <section className="login-side" aria-label="Thông tin tác giả">
          <img className="login-logo" src={TEACHER.logo} alt={`Logo ${TEACHER.name}`} width={150} height={150} />
          <p className="login-app">AI FactCheck Studio</p>
          <p className="login-sub">Phòng biên tập kiểm chứng thông tin trong dạy học trí tuệ nhân tạo – Tin học 12</p>
          <div className="login-teacher">
            <img src={TEACHER.avatar} alt={`Ảnh giáo viên ${TEACHER.name}`} width={64} height={64} />
            <div>
              <strong>GV. {TEACHER.name}</strong>
              <span>{TEACHER.school}</span>
              <span>{TEACHER.address}</span>
            </div>
          </div>
        </section>

        <form className="login-form" onSubmit={submit} noValidate>
          <h1>Đăng nhập</h1>
          <p className="muted">Nhập tài khoản được giáo viên cung cấp để sử dụng app.</p>

          <label className="field">
            <span>Tên đăng nhập</span>
            <input
              ref={userRef}
              type="text"
              name="afs-user"
              value={user}
              onChange={(e) => { setUser(e.target.value); setError(''); }}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              disabled={locked}
              aria-invalid={!!error}
            />
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <input
              ref={passRef}
              type="password"
              name="afs-pass"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(''); }}
              autoComplete="off"
              disabled={locked}
              aria-invalid={!!error}
            />
          </label>

          <label className="check inline">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Ghi nhớ đăng nhập trên máy này</span>
          </label>

          <p className="login-error" role="alert" aria-live="assertive">
            {locked ? `Tạm khóa, thử lại sau ${lockLeft} giây.` : error}
          </p>

          <button className="btn primary login-btn" type="submit" disabled={locked}>
            Đăng nhập
          </button>
          <p className="hint">Máy dùng chung: bỏ chọn "Ghi nhớ" hoặc bấm "Đăng xuất" ở đầu trang khi dùng xong.</p>
        </form>
      </div>
    </main>
  );
}
