import { clampStr, uid } from './text';

export type Label = 'supported' | 'needs_fix' | 'insufficient';
export const LABELS: Record<Label, string> = {
  supported: 'Được nguồn hỗ trợ',
  needs_fix: 'Cần sửa',
  insufficient: 'Chưa đủ bằng chứng',
};
export const LABEL_HELP: Record<Label, string> = {
  supported: 'Bằng chứng phù hợp với đúng phạm vi của nhận định.',
  needs_fix: 'Bằng chứng cho thấy sai, hoặc diễn đạt quá rộng so với bằng chứng.',
  insufficient: 'Chưa xác minh được. Không tìm thấy nguồn chưa tự chứng minh nhận định là sai.',
};

export type Kind = 'fact' | 'opinion' | '';
export const KINDS: Record<Exclude<Kind, ''>, string> = { fact: 'Sự kiện (kiểm tra được)', opinion: 'Ý kiến (thảo luận bằng lí lẽ)' };

export type Topic = 'ability' | 'application' | 'limit' | 'responsibility' | '';
export const TOPICS: Record<Exclude<Topic, ''>, string> = {
  ability: 'Khả năng / khái niệm AI',
  application: 'Ứng dụng AI',
  limit: 'Giới hạn / rủi ro',
  responsibility: 'Trách nhiệm khi dùng AI',
};

export type Supports = 'yes' | 'partly' | 'no' | 'unchecked' | '';
export const SUPPORTS: Record<Exclude<Supports, ''>, string> = {
  yes: 'Có, đúng phạm vi',
  partly: 'Một phần',
  no: 'Không',
  unchecked: 'Chưa mở được nguồn để kiểm tra',
};

export type Lesson = 'bai1' | 'bai2' | 'both';
export const LESSONS: Record<Lesson, string> = {
  bai1: 'Bài 1 – Làm quen với AI',
  bai2: 'Bài 2 – AI trong khoa học và đời sống',
  both: 'Bài 1–2',
};

export const LIMITS = {
  claims: 30,
  apps: 10,
  short: 300,
  mid: 1000,
  long: 3000,
  title: 200,
  sources: 20,
  seeds: 12,
  cases: 50,
  importBytes: 1_000_000,
  workspaces: 200,
} as const;

export interface Source {
  title: string;
  author: string;
  locator: string; // trang hoặc đường dẫn
  accessDate: string; // yyyy-mm-dd
  noSourceFound: boolean;
}

export interface Review {
  reviewer: string;
  supports: Supports;
  comment: string;
  fixed: string;
  because: string;
  remaining: string;
}

export interface Claim {
  id: string;
  seed: number; // chỉ số trong bản "tách sẵn" của tình huống, -1 nếu tự tách
  text: string;
  kind: Kind;
  topic: Topic;
  broadTerms: string;
  source: Source;
  evidence: string;
  label: Label | '';
  reason: string;
  rewrite: string;
  remaining: string;
  review: Review;
}

export interface AppRow {
  id: string;
  context: string;
  task: string;
  benefit: string;
  risk: string;
  humanCheck: string;
  mitigation: string;
  sources: string;
}

export interface AiDecl {
  used: '' | 'yes' | 'no';
  tool: string;
  help: string;
  selfCheck: string;
  dataProtection: string;
}

export interface Grading {
  main: (number | null)[]; // rubric 10 điểm: 5 tiêu chí
  appB: (number | null)[]; // rubric Phiếu B: 4 tiêu chí
  note: string;
}

export interface SourceItem {
  title: string;
  author: string;
  locator: string;
  note: string;
}
export interface SeedClaim {
  text: string;
  hint: string;
  topic: Topic;
}

export type Origin = 'assumed' | 'real';

export interface Case {
  id: string;
  title: string;
  lesson: Lesson;
  origin: Origin;
  realTool: string;
  realChecked: boolean;
  text: string;
  sources: SourceItem[];
  seeds: SeedClaim[];
  teacherNotes: string;
  builtIn: boolean;
}

export interface Workspace {
  v: 1;
  id: string;
  rev: number;
  createdAt: number;
  updatedAt: number;
  name: string;
  classLabel: string;
  case: Case;
  claims: Claim[];
  apps: AppRow[];
  publication: string;
  extraSources: string;
  ai: AiDecl;
  grading: Grading;
}

export const emptySource = (): Source => ({ title: '', author: '', locator: '', accessDate: '', noSourceFound: false });
export const emptyReview = (): Review => ({ reviewer: '', supports: '', comment: '', fixed: '', because: '', remaining: '' });

export function emptyClaim(over: Partial<Claim> = {}): Claim {
  return {
    id: uid(),
    seed: -1,
    text: '',
    kind: '',
    topic: '',
    broadTerms: '',
    source: emptySource(),
    evidence: '',
    label: '',
    reason: '',
    rewrite: '',
    remaining: '',
    review: emptyReview(),
    ...over,
  };
}

export const emptyApp = (): AppRow => ({
  id: uid(),
  context: '',
  task: '',
  benefit: '',
  risk: '',
  humanCheck: '',
  mitigation: '',
  sources: '',
});

export const emptyAi = (): AiDecl => ({ used: '', tool: '', help: '', selfCheck: '', dataProtection: '' });
export const emptyGrading = (): Grading => ({ main: [null, null, null, null, null], appB: [null, null, null, null], note: '' });

export function newWorkspace(c: Case, name = ''): Workspace {
  const now = Date.now();
  return {
    v: 1,
    id: uid(),
    rev: 0,
    createdAt: now,
    updatedAt: now,
    name,
    classLabel: '',
    case: structuredCloneSafe(c),
    claims: [],
    apps: [],
    publication: '',
    extraSources: '',
    ai: emptyAi(),
    grading: emptyGrading(),
  };
}

export function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// ---------- Chuẩn hóa dữ liệu lạ (nhập file, đọc localStorage hỏng) ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], dflt: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : dflt;
const score = (v: unknown, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 2) / 2 : null;

function sanSource(v: unknown): Source {
  const o = isObj(v) ? v : {};
  return {
    title: clampStr(o.title, LIMITS.mid),
    author: clampStr(o.author, LIMITS.short),
    locator: clampStr(o.locator, LIMITS.mid),
    accessDate: /^\d{4}-\d{2}-\d{2}$/.test(String(o.accessDate ?? '')) ? String(o.accessDate) : '',
    noSourceFound: o.noSourceFound === true,
  };
}

function sanReview(v: unknown): Review {
  const o = isObj(v) ? v : {};
  return {
    reviewer: clampStr(o.reviewer, LIMITS.short),
    supports: oneOf<Supports>(o.supports, ['yes', 'partly', 'no', 'unchecked', ''], ''),
    comment: clampStr(o.comment, LIMITS.long),
    fixed: clampStr(o.fixed, LIMITS.long),
    because: clampStr(o.because, LIMITS.long),
    remaining: clampStr(o.remaining, LIMITS.long),
  };
}

function sanClaim(v: unknown, used: Set<string>): Claim {
  const o = isObj(v) ? v : {};
  let id = clampStr(o.id, 80) || uid();
  if (used.has(id)) id = uid();
  used.add(id);
  return {
    id,
    seed: typeof o.seed === 'number' && Number.isInteger(o.seed) && o.seed >= -1 && o.seed < 50 ? o.seed : -1,
    text: clampStr(o.text, LIMITS.mid),
    kind: oneOf<Kind>(o.kind, ['fact', 'opinion', ''], ''),
    topic: oneOf<Topic>(o.topic, ['ability', 'application', 'limit', 'responsibility', ''], ''),
    broadTerms: clampStr(o.broadTerms, LIMITS.short),
    source: sanSource(o.source),
    evidence: clampStr(o.evidence, LIMITS.long),
    label: oneOf<Label | ''>(o.label, ['supported', 'needs_fix', 'insufficient', ''], ''),
    reason: clampStr(o.reason, LIMITS.long),
    rewrite: clampStr(o.rewrite, LIMITS.long),
    remaining: clampStr(o.remaining, LIMITS.long),
    review: sanReview(o.review),
  };
}

function sanApp(v: unknown, used: Set<string>): AppRow {
  const o = isObj(v) ? v : {};
  let id = clampStr(o.id, 80) || uid();
  if (used.has(id)) id = uid();
  used.add(id);
  return {
    id,
    context: clampStr(o.context, LIMITS.short),
    task: clampStr(o.task, LIMITS.long),
    benefit: clampStr(o.benefit, LIMITS.long),
    risk: clampStr(o.risk, LIMITS.long),
    humanCheck: clampStr(o.humanCheck, LIMITS.long),
    mitigation: clampStr(o.mitigation, LIMITS.long),
    sources: clampStr(o.sources, LIMITS.long),
  };
}

export function sanCase(v: unknown): Case | null {
  if (!isObj(v)) return null;
  const origin = oneOf<Origin>(v.origin, ['assumed', 'real'], 'assumed');
  const realChecked = v.realChecked === true;
  const realTool = clampStr(v.realTool, LIMITS.short);
  // Không cho "đầu ra AI thật" nếu thiếu tên công cụ hoặc chưa xác nhận đã kiểm tra: hạ về giả định.
  const trulyReal = origin === 'real' && realChecked && realTool.trim() !== '';
  return {
    id: clampStr(v.id, 80) || uid(),
    title: clampStr(v.title, LIMITS.title) || 'Tình huống chưa đặt tên',
    lesson: oneOf<Lesson>(v.lesson, ['bai1', 'bai2', 'both'], 'both'),
    origin: trulyReal ? 'real' : 'assumed',
    realTool: trulyReal ? realTool : '',
    realChecked: trulyReal,
    text: clampStr(v.text, LIMITS.long),
    sources: arr(v.sources)
      .slice(0, LIMITS.sources)
      .map((s) => {
        const o = isObj(s) ? s : {};
        return {
          title: clampStr(o.title, LIMITS.mid),
          author: clampStr(o.author, LIMITS.short),
          locator: clampStr(o.locator, LIMITS.mid),
          note: clampStr(o.note, LIMITS.mid),
        };
      }),
    seeds: arr(v.seeds)
      .slice(0, LIMITS.seeds)
      .map((s) => {
        const o = isObj(s) ? s : {};
        return {
          text: clampStr(o.text, LIMITS.mid),
          hint: clampStr(o.hint, LIMITS.long),
          topic: oneOf<Topic>(o.topic, ['ability', 'application', 'limit', 'responsibility', ''], ''),
        };
      }),
    teacherNotes: clampStr(v.teacherNotes, LIMITS.long),
    builtIn: false, // dữ liệu nhập/đọc từ máy luôn là "của giáo viên", không giả danh bản có sẵn
  };
}

export function sanWorkspace(v: unknown): Workspace | null {
  if (!isObj(v)) return null;
  const c = sanCase(v.case);
  if (!c) return null;
  const ai = isObj(v.ai) ? v.ai : {};
  const gr = isObj(v.grading) ? v.grading : {};
  const mainMax = [2, 2, 3, 2, 1];
  const mainArr = arr(gr.main);
  const bArr = arr(gr.appB);
  const used = new Set<string>();
  const usedApps = new Set<string>();
  const now = Date.now();
  return {
    v: 1,
    id: clampStr(v.id, 80) || uid(),
    rev: typeof v.rev === 'number' && Number.isInteger(v.rev) && v.rev >= 0 ? v.rev : 0,
    createdAt: typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) ? v.createdAt : now,
    updatedAt: typeof v.updatedAt === 'number' && Number.isFinite(v.updatedAt) ? v.updatedAt : now,
    name: clampStr(v.name, LIMITS.short),
    classLabel: clampStr(v.classLabel, 60),
    case: c,
    claims: arr(v.claims)
      .slice(0, LIMITS.claims)
      .map((x) => sanClaim(x, used)),
    apps: arr(v.apps)
      .slice(0, LIMITS.apps)
      .map((x) => sanApp(x, usedApps)),
    publication: clampStr(v.publication, LIMITS.long),
    extraSources: clampStr(v.extraSources, LIMITS.long),
    ai: {
      used: oneOf<'' | 'yes' | 'no'>(ai.used, ['yes', 'no', ''], ''),
      tool: clampStr(ai.tool, LIMITS.short),
      help: clampStr(ai.help, LIMITS.long),
      selfCheck: clampStr(ai.selfCheck, LIMITS.long),
      dataProtection: clampStr(ai.dataProtection, LIMITS.long),
    },
    grading: {
      main: mainMax.map((m, i) => score(mainArr[i], m)),
      appB: [0, 1, 2, 3].map((i) => score(bArr[i], 2)),
      note: clampStr(gr.note, LIMITS.long),
    },
  };
}
