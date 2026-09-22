import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ClipboardList, ChevronRight, Package, RotateCw, Sparkles, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Inspection, Page, Product, InspectionStatus } from '@/types';
import { inspectionStatusConfig, cn, formatDate } from '@/lib/utils';

type NavigateFn = (page: Page, inspectionId?: string) => void;

export default function Inspections({ navigate }: { navigate: NavigateFn }) {
  const [inspections, setInspections] = useState<(Inspection & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inspections')
      .select('*, product:products(*)')
      .order('created_at', { ascending: false });
    if (!error && data) setInspections(data as (Inspection & { product?: Product })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return inspections.filter((i) => {
      const matchesSearch =
        !q ||
        (i.product?.name ?? '').toLowerCase().includes(q) ||
        (i.product?.brand ?? '').toLowerCase().includes(q) ||
        (i.inspector_name ?? '').toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inspections, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: inspections.length };
    for (const i of inspections) {
      counts[i.status] = (counts[i.status] ?? 0) + 1;
    }
    return counts;
  }, [inspections]);

  const statusTabs: { key: InspectionStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'compliant', label: 'Compliant' },
    { key: 'non_compliant', label: 'Non-Compliant' },
    { key: 'review', label: 'Under Review' },
    { key: 'pending', label: 'Pending' },
    { key: 'analyzing', label: 'Analyzing' },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink-900">Inspections</h2>
          <p className="text-sm text-ink-500 mt-1">
            {inspections.length > 0
              ? `${inspections.length.toLocaleString()} compliance inspection${inspections.length === 1 ? '' : 's'} recorded`
              : 'No inspections recorded yet. Start a new packaging scan below.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-ink-500">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="input py-1 px-2.5 text-xs bg-white w-auto"
            >
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <button
            onClick={() => navigate('new-inspection')}
            className="btn-primary text-sm flex items-center gap-2 py-2 px-4 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            New Inspection
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search by product, brand, inspector, or inspection ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-thin pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              statusFilter === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
            )}
          >
            {tab.label}
            <span className={cn('ml-2 text-xs', statusFilter === tab.key ? 'text-primary-100' : 'text-ink-400')}>
              {statusCounts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-ink-300 mx-auto mb-4" />
          <p className="text-ink-500 font-medium">No inspections found</p>
          <p className="text-sm text-ink-400 mt-1">Try adjusting your filters or start a new inspection</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-ink-50 border-b border-ink-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Checks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Confidence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {paginated.map((i) => {
                  const cfg = inspectionStatusConfig[i.status];
                  const passRate = i.total_checks > 0 ? Math.round((i.passed_checks / i.total_checks) * 100) : 0;
                  return (
                    <tr
                      key={i.id}
                      onClick={() => navigate('inspection-detail', i.id)}
                      className="hover:bg-ink-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-ink-100 overflow-hidden shrink-0">
                            {i.image_url ? <img src={i.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-ink-400" /></div>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-900 text-sm truncate group-hover:text-primary-600 transition-colors">{i.product?.name ?? 'Unknown'}</p>
                            <p className="text-xs text-ink-500">{i.product?.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', cfg.badgeClass)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotClass)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', passRate === 100 ? 'bg-success-500' : passRate >= 80 ? 'bg-warning-500' : 'bg-error-500')} style={{ width: `${passRate}%` }} />
                          </div>
                          <span className="text-xs text-ink-600 font-medium">{i.passed_checks}/{i.total_checks}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm font-medium text-ink-700">{Number(i.overall_confidence).toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-500 hidden lg:table-cell">{formatDate(i.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-primary-600 inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-ink-50 border-t border-ink-200">
              <p className="text-xs text-ink-600 font-medium">
                Showing <span className="font-semibold text-ink-900">{((page - 1) * pageSize + 1).toLocaleString()}</span> to{' '}
                <span className="font-semibold text-ink-900">{Math.min(page * pageSize, filtered.length).toLocaleString()}</span> of{' '}
                <span className="font-semibold text-ink-900">{filtered.length.toLocaleString()}</span> inspections
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-50"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5 inline mr-1" />
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-ink-700 font-medium px-2">
                  Page <span className="font-semibold">{page}</span> of {totalPages.toLocaleString()}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-50"
                  title="Last Page"
                >
                  Last
                  <ChevronsRight className="w-3.5 h-3.5 inline ml-1" />
                </button>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const p = parseInt(jumpPage, 10);
                    if (!isNaN(p) && p >= 1 && p <= totalPages) {
                      setPage(p);
                      setJumpPage('');
                    }
                  }}
                  className="flex items-center gap-1 ml-2"
                >
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder="Jump..."
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    className="input py-0.5 px-2 text-xs w-16 h-7 bg-white text-center"
                  />
                  <button type="submit" className="btn-secondary py-1 px-2 text-xs h-7">
                    Go
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
