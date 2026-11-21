import { ReactNode, memo, useId } from 'react';
import { Case, LABELS, Label } from '../model';
import { SaveState } from '../useWorkspace';
import { formatDateTime, isHttpUrl } from '../text';

interface FieldBase {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  placeholder?: string;
  required?: boolean;
}

export const TextInput = memo(function TextInput({ label, hint, value, onChange, max = 300, placeholder, type = 'text', list }: FieldBase & { type?: string; list?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <div className="hint" id={id + 'h'}>{hint}</div>}
      <input
        id={id}
        type={type}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        list={list}
        aria-describedby={hint ? id + 'h' : undefined}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
});

export const TextArea = memo(function TextArea({ label, hint, value, onChange, max = 1000, placeholder, rows = 3, autoFocus, dataAttr }: FieldBase & { rows?: number; autoFocus?: boolean; dataAttr?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <div className="hint" id={id + 'h'}>{hint}</div>}
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-claim-text={dataAttr}
        aria-describedby={hint ? id + 'h' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
});

export const SelectField = memo(function SelectField({
  label,
  value,
  onChange,
  options,
  empty = '— chọn —',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  empty?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
});

export const LABEL_ICON: Record<Label, string> = { supported: '✓', needs_fix: '✎', insufficient: '?' };

export function LabelBadge({ label }: { label: Label | '' }) {
  if (!label) return <span className="badge muted">Chưa chọn nhãn</span>;
  return (
    <span className={`badge lab-${label}`}>
      <span aria-hidden="true">{LABEL_ICON[label]}</span> {LABELS[label]}
    </span>
  );
}

export function OriginBadge({ c }: { c: Pick<Case, 'origin' | 'realTool'> }) {
  if (c.origin === 'real') {
    return <span className="badge origin-real">Đầu ra AI thật ({c.realTool}) – giáo viên đã kiểm tra, được phép dùng</span>;
  }
  return <span className="badge origin-assumed">GIẢ ĐỊNH do giáo viên biên soạn – không phải đầu ra của công cụ AI thật</span>;
}

export function SaveStatus({ status, savedAt, persistent, onRetry }: { status: SaveState; savedAt: number; persistent: boolean; onRetry: () => void }) {
  let text = '';
  let cls = 'ok';
  if (status === 'dirty') {
    text = 'Đang lưu…';
    cls = 'wait';
  } else if (status === 'saved') {
    text = persistent ? `Đã lưu trên máy này ${formatDateTime(savedAt)}` : 'Chỉ giữ trong trang này (trình duyệt chặn lưu)';
    if (!persistent) cls = 'bad';
  } else if (status === 'quota') {
    text = 'Không lưu được: bộ nhớ trình duyệt đầy. Hãy tải file sao lưu.';
    cls = 'bad';
  } else if (status === 'error') {
    text = 'Không lưu được. Hãy tải file sao lưu.';
    cls = 'bad';
  } else if (status === 'conflict') {
    text = 'Hồ sơ này vừa được sửa ở tab khác.';
    cls = 'bad';
  }
  return (
    <div className={`save ${cls}`} role="status" aria-live="polite">
      {text}
      {(status === 'quota' || status === 'error') && (
        <button className="btn small" onClick={onRetry}>
          Thử lưu lại
        </button>
      )}
    </div>
  );
}

/** Hiển thị đường dẫn: chỉ http/https mới thành liên kết (chặn javascript:). */
export function Locator({ value }: { value: string }) {
  const v = value.trim();
  if (isHttpUrl(v)) {
    return (
      <a href={v} target="_blank" rel="noopener noreferrer">
        {v}
      </a>
    );
  }
  return <>{value}</>;
}

export function WordCount({ n, min, max }: { n: number; min: number; max: number }) {
  const ok = n >= min && n <= max;
  return (
    <div className={`wc ${ok ? 'ok' : n === 0 ? '' : 'warn'}`} aria-live="polite">
      {n} từ <span className="muted">(yêu cầu {min}–{max} từ, tính theo cụm cách nhau bằng khoảng trắng)</span>
    </div>
  );
}
