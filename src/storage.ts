import { Case, LIMITS, Workspace, sanCase, sanWorkspace } from './model';
import { slug, uid } from './text';

const P = 'afs.v1.';
export const K = {
  index: P + 'index',
  cases: P + 'cases',
  prefs: P + 'prefs',
  ws: (id: string) => P + 'ws.' + id,
};

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key(i: number): string | null;
  readonly length: number;
}

export interface IndexItem {
  id: string;
  name: string;
  caseTitle: string;
  updatedAt: number;
  claims: number;
  labeled: number;
}

export interface Prefs {
  teacher: boolean;
  projector: boolean;
  hints: boolean;
}
export const defaultPrefs: Prefs = { teacher: false, projector: false, hints: false };

export type SaveResult =
  | { ok: true; ws: Workspace }
  | { ok: false; reason: 'conflict'; current: Workspace | null }
  | { ok: false; reason: 'quota' | 'error' };

/** Bộ nhớ trong bộ nhớ trang: dùng khi localStorage bị chặn (chế độ riêng tư, chính sách trường). */
export class MemoryKV implements KV {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null;
  }
}

function probe(): KV | null {
  try {
    const ls = window.localStorage;
    const t = P + 'probe';
    ls.setItem(t, '1');
    ls.removeItem(t);
    return ls;
  } catch {
    return null;
  }
}

function isQuota(e: unknown): boolean {
  const x = e as { name?: string; code?: number };
  return x?.name === 'QuotaExceededError' || x?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || x?.code === 22 || x?.code === 1014;
}

function readJson(kv: KV, key: string): unknown {
  try {
    const raw = kv.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function summarize(ws: Workspace): IndexItem {
  return {
    id: ws.id,
    name: ws.name,
    caseTitle: ws.case.title,
    updatedAt: ws.updatedAt,
    claims: ws.claims.length,
    labeled: ws.claims.filter((c) => c.label !== '').length,
  };
}

export interface Store {
  persistent: boolean;
  kv: KV;
  loadIndex(): IndexItem[];
  reconcile(): IndexItem[];
  loadWorkspace(id: string): Workspace | null;
  saveWorkspace(ws: Workspace, baseRev: number, force?: boolean): SaveResult;
  deleteWorkspace(id: string): void;
  clearAllWorkspaces(): number;
  importWorkspace(ws: Workspace): SaveResult;
  loadCases(): Case[];
  saveCases(cases: Case[]): boolean;
  loadPrefs(): Prefs;
  savePrefs(p: Prefs): void;
}

export function createStore(kvIn?: KV | null): Store {
  const real = kvIn === undefined ? probe() : kvIn;
  const persistent = real !== null;
  const kv: KV = real ?? new MemoryKV();

  const readIndex = (): IndexItem[] | null => {
    const j = readJson(kv, K.index);
    if (!j || typeof j !== 'object' || !Array.isArray((j as { items?: unknown }).items)) return null;
    const out: IndexItem[] = [];
    for (const it of (j as { items: unknown[] }).items) {
      const o = it as Partial<IndexItem>;
      if (o && typeof o.id === 'string') {
        out.push({
          id: o.id,
          name: String(o.name ?? ''),
          caseTitle: String(o.caseTitle ?? ''),
          updatedAt: Number(o.updatedAt) || 0,
          claims: Number(o.claims) || 0,
          labeled: Number(o.labeled) || 0,
        });
      }
    }
    return out;
  };

  const writeIndex = (items: IndexItem[]): boolean => {
    try {
      kv.setItem(K.index, JSON.stringify({ v: 1, items }));
      return true;
    } catch {
      return false;
    }
  };

  const wsIdsOnDisk = (): string[] => {
    const prefix = K.ws('');
    const ids: string[] = [];
    for (let i = 0; i < kv.length; i++) {
      const k = kv.key(i);
      if (k && k.startsWith(prefix)) ids.push(k.slice(prefix.length));
    }
    return ids;
  };

  const store: Store = {
    persistent,
    kv,

    loadIndex() {
      const idx = readIndex();
      return (idx ?? []).slice().sort((a, b) => b.updatedAt - a.updatedAt);
    },

    // Tự chữa lành: dựng lại chỉ mục khi hỏng hoặc lệch so với các khóa ws.* thực tế.
    reconcile() {
      const idx = readIndex();
      const disk = wsIdsOnDisk();
      const diskSet = new Set(disk);
      const have = new Map((idx ?? []).map((i) => [i.id, i]));
      let changed = idx === null;
      const items: IndexItem[] = [];
      for (const id of disk) {
        const known = have.get(id);
        if (known) {
          items.push(known);
        } else {
          const ws = store.loadWorkspace(id);
          if (ws) {
            items.push(summarize(ws));
            changed = true;
          }
        }
      }
      if (idx && idx.some((i) => !diskSet.has(i.id))) changed = true;
      if (changed) writeIndex(items);
      return items.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    loadWorkspace(id) {
      return sanWorkspace(readJson(kv, K.ws(id)));
    },

    saveWorkspace(ws, baseRev, force = false) {
      const stored = store.loadWorkspace(ws.id);
      if (!force && stored && stored.rev !== baseRev) {
        return { ok: false, reason: 'conflict', current: stored };
      }
      const rev = Math.max(baseRev, stored?.rev ?? 0) + 1;
      const next: Workspace = { ...ws, rev, updatedAt: Date.now() };
      try {
        kv.setItem(K.ws(ws.id), JSON.stringify(next)); // hồ sơ trước
      } catch (e) {
        return { ok: false, reason: isQuota(e) ? 'quota' : 'error' };
      }
      const idx = readIndex() ?? [];
      const rest = idx.filter((i) => i.id !== ws.id);
      rest.push(summarize(next));
      writeIndex(rest); // chỉ mục sau; nếu hỏng thì reconcile() chữa
      return { ok: true, ws: next };
    },

    deleteWorkspace(id) {
      try {
        kv.removeItem(K.ws(id));
      } catch {
        /* bỏ qua */
      }
      const idx = readIndex();
      if (idx) writeIndex(idx.filter((i) => i.id !== id));
    },

    // Máy dùng chung ở phòng tin: xóa mọi hồ sơ nhóm (giữ tình huống của giáo viên và tùy chọn hiển thị).
    clearAllWorkspaces() {
      const ids = wsIdsOnDisk();
      for (const id of ids) {
        try {
          kv.removeItem(K.ws(id));
        } catch {
          /* bỏ qua */
        }
      }
      writeIndex([]);
      return ids.length;
    },

    // Nhập hồ sơ: luôn tạo bản mới, không bao giờ ghi đè hồ sơ đang có.
    importWorkspace(ws) {
      const fresh: Workspace = { ...ws, id: uid(), rev: 0, createdAt: Date.now() };
      return store.saveWorkspace(fresh, 0, true);
    },

    loadCases() {
      const j = readJson(kv, K.cases);
      if (!Array.isArray(j)) return [];
      const out: Case[] = [];
      for (const c of j.slice(0, LIMITS.cases)) {
        const s = sanCase(c);
        if (s) out.push(s);
      }
      return out;
    },

    saveCases(cases) {
      try {
        kv.setItem(K.cases, JSON.stringify(cases.slice(0, LIMITS.cases)));
        return true;
      } catch {
        return false;
      }
    },

    loadPrefs() {
      const j = readJson(kv, K.prefs) as Partial<Prefs> | null;
      return { ...defaultPrefs, ...(j && typeof j === 'object' ? { teacher: j.teacher === true, projector: j.projector === true, hints: j.hints === true } : {}) };
    },

    savePrefs(p) {
      try {
        kv.setItem(K.prefs, JSON.stringify(p));
      } catch {
        /* bỏ qua */
      }
    },
  };
  return store;
}

// ---------- File sao lưu ----------

export const APP_TAG = 'ai-factcheck-studio';

export function exportJson(ws: Workspace): string {
  return JSON.stringify({ app: APP_TAG, schema: 1, exportedAt: new Date().toISOString(), workspace: ws }, null, 2);
}

export function backupFileName(ws: Workspace): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `FactCheck_${slug(ws.name || ws.case.title)}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
}

export type ParseResult = { ok: true; workspace: Workspace } | { ok: false; error: string };

export function parseImport(text: string, byteLength = text.length): ParseResult {
  if (byteLength > LIMITS.importBytes) return { ok: false, error: 'File quá lớn (hơn 1 MB). Đây có thể không phải file sao lưu của app.' };
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Không đọc được file: không phải JSON hợp lệ.' };
  }
  const o = j as { app?: unknown; workspace?: unknown };
  if (!o || typeof o !== 'object' || o.app !== APP_TAG) return { ok: false, error: 'File này không phải file sao lưu của AI FactCheck Studio.' };
  const ws = sanWorkspace(o.workspace);
  if (!ws) return { ok: false, error: 'File sao lưu bị thiếu hoặc hỏng phần hồ sơ.' };
  return { ok: true, workspace: ws };
}
