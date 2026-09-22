import { useState, useEffect, useCallback } from 'react';
import { FileClock, Search, Shield, User, Cpu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AuditLogEntry } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
    if (!error && data) setLogs(data as AuditLogEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return !q || l.action.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q);
  });

  const actorIconMap: Record<string, typeof Shield> = {
    system: Cpu,
    AI: Cpu,
    user: User,
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink-900">Audit Trail</h2>
        <p className="text-sm text-ink-500 mt-1">Complete log of all compliance decisions and system actions</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Search by action or actor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileClock className="w-12 h-12 text-ink-300 mx-auto mb-4" />
          <p className="text-ink-500 font-medium">No audit entries found</p>
        </div>
      ) : (
        <div className="card p-6">
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-ink-200" />
            {filtered.map((entry) => {
              const Icon = actorIconMap[entry.actor.toLowerCase()] ?? Shield;
              const actionLabel = entry.action.replace(/_/g, ' ');
              return (
                <div key={entry.id} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-white shadow-sm" />
                  <div className="ml-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-ink-100 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-ink-600" />
                      </div>
                      <span className="text-sm font-medium text-ink-900 capitalize">{actionLabel}</span>
                      <span className="text-xs text-ink-400">{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="text-xs text-ink-500 ml-8">by {entry.actor}</p>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <div className="ml-8 mt-2 p-2 rounded-lg bg-ink-50 border border-ink-200">
                        <pre className="text-xs text-ink-600 font-mono overflow-x-auto scrollbar-thin">{JSON.stringify(entry.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
