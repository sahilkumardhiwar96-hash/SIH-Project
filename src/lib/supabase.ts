/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_PRODUCTS,
  INITIAL_RULES,
  INITIAL_INSPECTIONS,
  INITIAL_RESULTS,
  INITIAL_VIOLATIONS,
  INITIAL_EVIDENCE,
  INITIAL_AUDIT_LOG,
  DEFAULT_USER_PROFILE,
} from './mock-data';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Determine if we should use real Supabase or local browser store
const isRealSupabaseConfigured =
  Boolean(rawUrl && rawKey) &&
  rawUrl !== 'https://YOUR-PROJECT-ID.supabase.co' &&
  !rawUrl?.includes('YOUR-PROJECT-ID') &&
  Boolean(rawUrl?.startsWith('https://'));

export const isLocalMode = !isRealSupabaseConfigured;

// ---------------------------------------------------------------------
// Local Browser Database (localStorage + in-memory store)
// ---------------------------------------------------------------------
type StorageMap = {
  products: any[];
  compliance_rules: any[];
  inspections: any[];
  inspection_results: any[];
  violations: any[];
  evidence_artifacts: any[];
  audit_log: any[];
  user_profiles: any[];
};

const STORAGE_PREFIX = 'labelguard_v3_';

function getStoredTable<K extends keyof StorageMap>(table: K, fallback: any[]): any[] {
  if (typeof window === 'undefined') return fallback;
  try {
    // Clear legacy v1/v2 storage keys if present in browser
    ['labelguard_', 'labelguard_v2_'].forEach((pref) => {
      try { localStorage.removeItem(pref + table); } catch (_) {}
    });

    const raw = localStorage.getItem(STORAGE_PREFIX + table);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`Failed reading table ${table} from localStorage:`, err);
  }
  return fallback;
}

function saveStoredTable<K extends keyof StorageMap>(table: K, data: any[]) {
  if (typeof window === 'undefined') return;
  try {
    // For large tables (>500 rows), store only the latest 500 in localStorage
    // to avoid QuotaExceededError (~5MB quota), while keeping full 50,000 in memory!
    const slice = data.length > 500 ? data.slice(0, 500) : data;
    localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(slice));
  } catch (err) {
    console.warn(`Failed saving table ${table} to localStorage:`, err);
  }
}

// Initial memory cache
const storedRules = getStoredTable('compliance_rules', INITIAL_RULES);
// Merge to ensure any newly added rules in INITIAL_RULES (like Rule 6(10) ecommerce) are loaded
const mergedRules = [...storedRules];
for (const initRule of INITIAL_RULES) {
  if (!mergedRules.some((r) => r.rule_code === initRule.rule_code)) {
    mergedRules.push(initRule);
  }
}

const store: StorageMap = {
  products: getStoredTable('products', INITIAL_PRODUCTS),
  compliance_rules: mergedRules,
  inspections: getStoredTable('inspections', INITIAL_INSPECTIONS),
  inspection_results: getStoredTable('inspection_results', INITIAL_RESULTS),
  violations: getStoredTable('violations', INITIAL_VIOLATIONS),
  evidence_artifacts: getStoredTable('evidence_artifacts', INITIAL_EVIDENCE),
  audit_log: getStoredTable('audit_log', INITIAL_AUDIT_LOG),
  user_profiles: getStoredTable('user_profiles', [DEFAULT_USER_PROFILE]),
};

// Clean storage initialized

export function clearAllData() {
  store.inspections = [];
  store.inspection_results = [];
  store.violations = [];
  store.evidence_artifacts = [];
  store.audit_log = [];
  store.products = [];
  saveStoredTable('inspections', []);
  saveStoredTable('inspection_results', []);
  saveStoredTable('violations', []);
  saveStoredTable('evidence_artifacts', []);
  saveStoredTable('audit_log', []);
  saveStoredTable('products', []);
}

export function reseedAllInspections() {
  clearAllData();
}

// Helper to attach joined relations (e.g. product:products(*), rule:compliance_rules(*))
function attachJoins(table: string, rows: any[], selectStr?: string): any[] {
  if (!selectStr) return rows.map((r) => ({ ...r }));

  return rows.map((row) => {
    const copy = { ...row };
    if (selectStr.includes('product:products')) {
      copy.product = store.products.find((p) => p.id === row.product_id) || null;
    }
    if (selectStr.includes('rule:compliance_rules')) {
      copy.rule = store.compliance_rules.find((r) => r.id === row.rule_id) || null;
    }
    return copy;
  });
}

// Query builder mimicking PostgREST
class MockQueryBuilder {
  private tableName: keyof StorageMap;
  private filters: ((row: any) => boolean)[] = [];
  private eqValues: Record<string, any> = {};
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private selectCols: string | null = null;
  private isHeadOnly = false;
  private isCountExact = false;

  constructor(tableName: string) {
    this.tableName = tableName as keyof StorageMap;
  }

  select(columns = '*', options?: { count?: string; head?: boolean }) {
    this.selectCols = columns;
    if (options?.head) this.isHeadOnly = true;
    if (options?.count === 'exact') this.isCountExact = true;
    return this;
  }

  eq(column: string, value: any) {
    this.eqValues[column] = value;
    this.filters.push((row) => {
      return row[column] === value;
    });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  private execute() {
    let rows = (store[this.tableName] || []) as any[];

    // Apply filters
    for (const f of this.filters) {
      rows = rows.filter(f);
    }

    // Dynamic resolution for inspection_results on 1000 dataset runs
    if (this.tableName === 'inspection_results' && rows.length === 0 && this.eqValues['inspection_id']) {
      const eqInsp = this.eqValues['inspection_id'];
      const targetInsp = store.inspections.find((i) => i.id === eqInsp);
      const isNonCompliant = targetInsp?.status === 'non_compliant';
      const isReview = targetInsp?.status === 'review';
      rows = store.compliance_rules.map((rule) => {
        const isFailed = (isNonCompliant && ['FR-004', 'FT-001'].includes(rule.rule_code)) ||
                         (isReview && rule.rule_code === 'FR-003');
        return {
          id: `res-${eqInsp}-${rule.id}`,
          inspection_id: eqInsp,
          rule_id: rule.id,
          status: isFailed ? 'fail' : 'pass',
          confidence: isFailed ? 88 : 94,
          detected_value: isFailed ? 'Non-compliant declaration' : 'Compliant format',
          expected_value: rule.regulation_reference ?? 'As per regulation',
          message: isFailed ? `${rule.title}: statutory violation flagged.` : `${rule.title}: verified compliant.`,
          created_at: targetInsp?.created_at || new Date().toISOString(),
        };
      });
    }

    // Dynamic resolution for evidence_artifacts on 1000 dataset runs
    if (this.tableName === 'evidence_artifacts' && rows.length === 0 && this.eqValues['inspection_id']) {
      const eqInsp = this.eqValues['inspection_id'];
      const targetInsp = store.inspections.find((i) => i.id === eqInsp);
      const targetProduct = store.products.find((p) => p.id === targetInsp?.product_id);
      const date = targetInsp?.created_at || new Date().toISOString();
      rows = [
        {
          id: `ev-ocr-${eqInsp}`,
          inspection_id: eqInsp,
          artifact_type: 'ocr_text',
          label: 'Full Label OCR',
          content: { text: `${targetProduct?.name || 'Packaged Commodity'}\nMRP Rs. 199 (Incl. of all taxes)\nNet Qty: Standard Metric\nFSSAI: 10018022001234\nDate of Packing: 15/03/2024\nCustomer Care: 1800-200-1000\nVegetarian`, language: 'en', word_count: 28 },
          confidence: 90,
          created_at: date,
        },
        {
          id: `ev-font-${eqInsp}`,
          inspection_id: eqInsp,
          artifact_type: 'font_analysis',
          label: 'Font Size Analysis',
          content: { min_height_mm: 1.8, max_height_mm: 3.6, avg_height_mm: 2.4, sample_size: 24, assumed_dpi: 300, note: 'Heights estimated at 300 DPI baseline.' },
          confidence: 88,
          created_at: date,
        },
        {
          id: `ev-color-${eqInsp}`,
          inspection_id: eqInsp,
          artifact_type: 'color_analysis',
          label: 'Contrast Ratio Analysis',
          content: { avg_ratio: 4.85, min_ratio: 3.2, max_ratio: 7.1, sample_size: 20, threshold: 3.0, method: 'WCAG relative-luminance formula on OCR word bounding boxes vs. surrounding pixels' },
          confidence: 85,
          created_at: date,
        },
      ];
    }

    const count = rows.length;

    // Apply sorting
    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      rows = [...rows].sort((a, b) => {
        const valA = a[col] ?? '';
        const valB = b[col] ?? '';
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    // Apply range pagination
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
    }

    // Apply relations/joins
    rows = attachJoins(this.tableName, rows, this.selectCols || undefined);

    if (this.isHeadOnly) {
      return { data: null, error: null, count };
    }

    return { data: rows, error: null, count: this.isCountExact ? count : undefined };
  }

  async single() {
    const res = this.execute();
    return { data: res.data?.[0] ?? null, error: res.data?.[0] ? null : { message: 'Row not found' } };
  }

  async maybeSingle() {
    const res = this.execute();
    return { data: res.data?.[0] ?? null, error: null };
  }

  // Makes this thenable so `await query` works directly
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    const result = this.execute();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

// Local mock client
const localMockClient = {
  from(tableName: string) {
    const tableKey = tableName as keyof StorageMap;

    return {
      select(columns = '*', options?: { count?: string; head?: boolean }) {
        const q = new MockQueryBuilder(tableName);
        return q.select(columns, options);
      },

      insert(payload: any | any[]) {
        const items = Array.isArray(payload) ? payload : [payload];
        const insertedItems: any[] = [];

        for (const item of items) {
          const newItem = {
            id: item.id || `local-${crypto.randomUUID()}`,
            created_at: item.created_at || new Date().toISOString(),
            ...item,
          };
          insertedItems.push(newItem);
        }

        const current = store[tableKey] || [];
        store[tableKey] = [...insertedItems, ...current];
        saveStoredTable(tableKey, store[tableKey]);

        const singleItem = insertedItems[0] || null;
        const resultData = Array.isArray(payload) ? insertedItems : singleItem;

        const chainable = {
          data: resultData,
          error: null,
          select(_columns = '*') {
            return {
              data: resultData,
              error: null,
              single: async () => ({ data: singleItem, error: null }),
              maybeSingle: async () => ({ data: singleItem, error: null }),
              then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
                return Promise.resolve({ data: resultData, error: null }).then(onfulfilled, onrejected);
              },
            };
          },
          single: async () => ({ data: singleItem, error: null }),
          maybeSingle: async () => ({ data: singleItem, error: null }),
          then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
            return Promise.resolve({ data: resultData, error: null }).then(onfulfilled, onrejected);
          },
        };

        return chainable;
      },

      update(payload: Record<string, any>) {
        return {
          eq(column: string, value: any) {
            const current = store[tableKey] || [];
            let updatedItem: any = null;

            store[tableKey] = current.map((row) => {
              if (row[column] === value) {
                updatedItem = { ...row, ...payload, updated_at: new Date().toISOString() };
                return updatedItem;
              }
              return row;
            });

            saveStoredTable(tableKey, store[tableKey]);
            const res = { data: updatedItem, error: null };
            return {
              ...res,
              select(_columns = '*') {
                return {
                  data: updatedItem,
                  error: null,
                  single: async () => ({ data: updatedItem, error: null }),
                  maybeSingle: async () => ({ data: updatedItem, error: null }),
                  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
                    return Promise.resolve({ data: [updatedItem], error: null }).then(onfulfilled, onrejected);
                  },
                };
              },
              single: async () => ({ data: updatedItem, error: null }),
              maybeSingle: async () => ({ data: updatedItem, error: null }),
              then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
                return Promise.resolve(res).then(onfulfilled, onrejected);
              },
            };
          },
        };
      },

      delete() {
        return {
          eq(column: string, value: any) {
            const current = store[tableKey] || [];
            store[tableKey] = current.filter((row) => row[column] !== value);
            saveStoredTable(tableKey, store[tableKey]);
            const res = { data: null, error: null };
            return {
              ...res,
              then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
                return Promise.resolve(res).then(onfulfilled, onrejected);
              },
            };
          },
        };
      },

      upsert: async (payload: any) => {
        const current = store[tableKey] || [];
        const id = payload.id;
        const existsIndex = current.findIndex((r) => r.id === id);

        if (existsIndex >= 0) {
          current[existsIndex] = { ...current[existsIndex], ...payload };
        } else {
          current.unshift({ id: id || `local-${crypto.randomUUID()}`, ...payload });
        }
        store[tableKey] = current;
        saveStoredTable(tableKey, current);
        return { data: payload, error: null };
      },
    };
  },

  auth: {
    async getSession() {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      try {
        // Clear any legacy persistent localStorage auth token so opening the site always starts on Login
        localStorage.removeItem('labelguard_auth_session');
        const raw = sessionStorage.getItem('labelguard_auth_session');
        if (raw) {
          const session = JSON.parse(raw);
          return { data: { session }, error: null };
        }
      } catch (_) {}
      return { data: { session: null }, error: null };
    },

    onAuthStateChange(cb: (event: string, session: any) => void) {
      if (typeof window !== 'undefined') {
        const handler = (e: StorageEvent) => {
          if (e.key === 'labelguard_auth_session') {
            try {
              const newSession = e.newValue ? JSON.parse(e.newValue) : null;
              cb(newSession ? 'SIGNED_IN' : 'SIGNED_OUT', newSession);
            } catch (_) {}
          }
        };
        window.addEventListener('storage', handler);
        return {
          data: {
            subscription: {
              unsubscribe: () => window.removeEventListener('storage', handler),
            },
          },
        };
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },

    async signInWithPassword({ email }: { email: string; password?: string }) {
      const activeUser = {
        ...DEFAULT_USER_PROFILE,
        id: `usr-${crypto.randomUUID().slice(0, 8)}`,
        full_name: email.split('@')[0] || 'Inspector Sharma',
      };
      const session = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: activeUser.id,
          email,
          user_metadata: { full_name: activeUser.full_name },
          app_metadata: {},
          aud: 'authenticated',
          created_at: activeUser.created_at,
        },
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('labelguard_auth_session', JSON.stringify(session));
      }
      return { data: { user: session.user, session }, error: null };
    },

    async signUp({ email, options }: { email: string; password?: string; options?: { data?: { full_name?: string } } }) {
      const fullName = options?.data?.full_name || 'Inspector';
      const user = {
        id: `usr-${crypto.randomUUID().slice(0, 8)}`,
        email,
        user_metadata: { full_name: fullName },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
      const session = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user,
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('labelguard_auth_session', JSON.stringify(session));
      }
      return {
        data: {
          user,
          session,
        },
        error: null,
      };
    },

    async signOut() {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('labelguard_auth_session');
        localStorage.removeItem('labelguard_auth_session');
      }
      return { error: null };
    },
  },

  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, _file: File, _options?: any) {
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: path } };
        },
      };
    },
  },
};

// Export active supabase client (real or local mock)
export const supabase = isRealSupabaseConfigured
  ? createClient(rawUrl!, rawKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (localMockClient as any);
