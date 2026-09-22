import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  ArrowRight,
  Sparkles,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Globe,
  ChevronRight,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Inspection, Page, Product } from '@/types';
import { inspectionStatusConfig, timeAgo, cn } from '@/lib/utils';

type NavigateFn = (page: Page, inspectionId?: string) => void;

type Stats = {
  totalProducts: number;
  totalInspections: number;
  compliantCount: number;
  nonCompliantCount: number;
  pendingCount: number;
  reviewCount: number;
  totalViolations: number;
  criticalViolations: number;
  avgConfidence: number;
};

export default function Dashboard({ navigate }: { navigate: NavigateFn }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentInspections, setRecentInspections] = useState<(Inspection & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'violations' | 'compliant'>('all');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const [
      { count: totalProducts },
      { count: totalInspections },
      { count: compliantCount },
      { count: nonCompliantCount },
      { count: pendingCount },
      { count: reviewCount },
      { data: violationsData },
      { data: inspectionsData },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('inspections').select('*', { count: 'exact', head: true }),
      supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'compliant'),
      supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'non_compliant'),
      supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'review'),
      supabase.from('violations').select('severity'),
      supabase.from('inspections').select('*, product:products(*)').order('created_at', { ascending: false }).limit(10),
    ]);

    const violationsList = (violationsData ?? []) as { severity: string }[];
    const inspectionsList = (inspectionsData ?? []) as { status: string; overall_confidence?: number }[];
    const criticalViolations = violationsList.filter((v) => v.severity === 'critical').length;
    const compliantInspections = inspectionsList.filter((i) => i.status === 'compliant');
    const avgConfidence =
      compliantInspections.length > 0
        ? compliantInspections.reduce((sum, i) => sum + (i.overall_confidence || 0), 0) / compliantInspections.length
        : 0;

    setStats({
      totalProducts: totalProducts ?? 0,
      totalInspections: totalInspections ?? 0,
      compliantCount: compliantCount ?? 0,
      nonCompliantCount: nonCompliantCount ?? 0,
      pendingCount: pendingCount ?? 0,
      reviewCount: reviewCount ?? 0,
      totalViolations: violationsData?.length ?? 0,
      criticalViolations,
      avgConfidence,
    });
    setRecentInspections((inspectionsData ?? []) as (Inspection & { product?: Product })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const complianceRate =
    stats && stats.totalInspections > 0
      ? Math.round((stats.compliantCount / stats.totalInspections) * 100)
      : 0;

  const filteredRecent = useMemo(() => {
    if (filterMode === 'violations') {
      return recentInspections.filter((i) => i.status === 'non_compliant');
    }
    if (filterMode === 'compliant') {
      return recentInspections.filter((i) => i.status === 'compliant');
    }
    return recentInspections;
  }, [recentInspections, filterMode]);

  const statCards = [
    {
      label: 'Products Monitored',
      value: stats?.totalProducts.toLocaleString() ?? '0',
      subtext: 'Indian FMCG commodities',
      icon: Package,
      color: 'accent',
      trend: { up: true, value: '+4 added' },
    },
    {
      label: 'Total Inspections',
      value: stats?.totalInspections.toLocaleString() ?? '0',
      subtext: 'Surveillance runs',
      icon: ClipboardList,
      color: 'primary',
      trend: { up: true, value: 'Real-time' },
    },
    {
      label: 'Statutory Compliance',
      value: `${complianceRate}%`,
      subtext: 'LMPCR 2011 & FSSAI',
      icon: CheckCircle2,
      color: 'success',
      trend: { up: true, value: '+8.4%' },
    },
    {
      label: 'Flagged Violations',
      value: stats?.totalViolations.toLocaleString() ?? '0',
      subtext: `${stats?.criticalViolations ?? 0} critical notices`,
      icon: AlertTriangle,
      color: 'error',
      trend: { up: false, value: 'Enforce' },
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-700', iconBg: 'bg-primary-600' },
    accent: { bg: 'bg-accent-50', text: 'text-accent-700', iconBg: 'bg-accent-600' },
    success: { bg: 'bg-success-50', text: 'text-success-700', iconBg: 'bg-success-600' },
    error: { bg: 'bg-error-50', text: 'text-error-700', iconBg: 'bg-error-600' },
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Executive Briefing Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-950 via-ink-900 to-primary-950 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-ink-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Legal Metrology (Packaged Commodities) Rules, 2011
              </span>
              <span className="hidden sm:inline-flex text-xs text-ink-400 font-mono">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-2">
              Packaged Commodity Compliance Intelligence
            </h1>
            <p className="text-ink-300 text-sm sm:text-base leading-relaxed">
              Automated computer vision and OCR inspection engine verifying statutory declarations, metric quantity standards, maximum retail price compliance, and mandatory manufacturer details.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('new-inspection')}
                className="btn-primary text-sm py-2.5 px-4 shadow-md hover:shadow-primary-500/25"
              >
                <ScanLine className="w-4 h-4" />
                Start Label Inspection
              </button>
              <button
                onClick={() => navigate('inspections')}
                className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm py-2.5 px-4"
              >
                <Globe className="w-4 h-4 text-sky-400" />
                Surveillance Catalog
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Radial Compliance Gauge */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shrink-0 w-full sm:w-auto">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${complianceRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white">{complianceRate}%</span>
                <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">Pass Rate</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-emerald-400 mt-2">National Health Index</p>
            <p className="text-[11px] text-ink-400">Benchmark: 72% statutory</p>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const c = colorMap[card.color];
          return (
            <div
              key={i}
              className="card p-5 hover:shadow-soft transition-all duration-200 hover:-translate-y-0.5 border border-ink-200/80"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-xs text-white', c.iconBg)}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.trend && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md',
                      card.trend.up ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'
                    )}
                  >
                    {card.trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {card.trend.value}
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight mb-0.5">
                {loading ? <span className="skeleton inline-block w-20 h-8" /> : card.value}
              </p>
              <p className="text-sm font-semibold text-ink-700">{card.label}</p>
              <p className="text-xs text-ink-400 mt-0.5">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Two-Column Core Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Recent Inspections with Tabbed Filter */}
        <div className="lg:col-span-2 card p-5 sm:p-6 border border-ink-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-ink-100">
            <div>
              <h2 className="font-bold text-ink-900 text-lg">Recent Enforcement Inspections</h2>
              <p className="text-xs text-ink-500">Live feed of label compliance checks and violation detections</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-ink-100/80 p-1 rounded-lg">
              {(['all', 'violations', 'compliant'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-md transition-colors capitalize',
                    filterMode === mode ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                  )}
                >
                  {mode === 'all' ? 'All' : mode}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredRecent.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-ink-400" />
              </div>
              <p className="text-sm font-bold text-ink-700">No inspections match this filter</p>
              <p className="text-xs text-ink-500 mt-1">Try switching tabs or start a new label inspection.</p>
              <button
                onClick={() => navigate('new-inspection')}
                className="btn-primary text-xs mt-4 py-2 px-3"
              >
                <ScanLine className="w-3.5 h-3.5" />
                Scan Product
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {filteredRecent.map((insp) => {
                const cfg = inspectionStatusConfig[insp.status];
                return (
                  <button
                    key={insp.id}
                    onClick={() => navigate('inspection-detail', insp.id)}
                    className="w-full flex items-center gap-3 sm:gap-4 py-3.5 px-2 rounded-xl hover:bg-ink-50/80 transition-all text-left group"
                  >
                    <div className="w-11 h-11 rounded-lg bg-ink-100 border border-ink-200 overflow-hidden shrink-0">
                      {insp.image_url ? (
                        <img src={insp.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-ink-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-ink-900 text-sm truncate group-hover:text-primary-600 transition-colors">
                          {insp.product?.name ?? 'Unknown Product'}
                        </p>
                        {insp.failed_checks > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-error-50 text-error-700 border border-error-200 shrink-0">
                            {insp.failed_checks} Failed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-500 mt-0.5 truncate">
                        {insp.product?.brand} • {timeAgo(insp.created_at)}
                      </p>
                    </div>

                    <div className="hidden sm:flex flex-col items-end shrink-0">
                      <span className="text-xs font-semibold text-ink-700">
                        {insp.passed_checks}/{insp.total_checks} Passed
                      </span>
                      <span className="text-[11px] text-ink-400 font-mono">
                        {Number(insp.overall_confidence).toFixed(1)}% conf
                      </span>
                    </div>

                    <span className={cn('badge shrink-0', cfg.badgeClass)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotClass)} />
                      {cfg.label}
                    </span>

                    <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-primary-600 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between">
            <span className="text-xs text-ink-500 font-medium">Showing latest inspections</span>
            <button
              onClick={() => navigate('inspections')}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View Full Surveillance Registry <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Compliance Health Breakdown & Categories */}
        <div className="space-y-6">
          {/* Status Breakdown Card */}
          <div className="card p-5 sm:p-6 border border-ink-200/80">
            <h3 className="font-bold text-ink-900 text-base mb-4 flex items-center justify-between">
              <span>Status Distribution</span>
              <span className="text-xs font-normal text-ink-400">Total: {stats?.totalInspections.toLocaleString()}</span>
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {[
                  { label: 'Compliant', count: stats?.compliantCount ?? 0, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                  { label: 'Non-Compliant', count: stats?.nonCompliantCount ?? 0, color: 'bg-rose-500', textColor: 'text-rose-700' },
                  { label: 'Under Review', count: stats?.reviewCount ?? 0, color: 'bg-amber-500', textColor: 'text-amber-700' },
                  { label: 'Pending / Processing', count: stats?.pendingCount ?? 0, color: 'bg-slate-400', textColor: 'text-slate-600' },
                ].map((item) => {
                  const total = stats?.totalInspections || 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={cn('font-bold', item.textColor)}>{item.label}</span>
                        <span className="text-ink-500 font-mono">{item.count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', item.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Critical notice callout */}
            {(stats?.criticalViolations ?? 0) > 0 && (
              <div className="mt-5 p-3 rounded-xl bg-error-50 border border-error-200/80 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-error-900">
                    {stats?.criticalViolations} Critical Statutory Violations
                  </p>
                  <p className="text-[11px] text-error-700 leading-snug mt-0.5">
                    Requires immediate show cause notice under Section 38 FSS Act & Legal Metrology PCR.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Category Performance Leaderboard */}
          <div className="card p-5 sm:p-6 border border-ink-200/80">
            <h3 className="font-bold text-ink-900 text-base mb-3">Commodity Compliance</h3>
            <p className="text-xs text-ink-500 mb-4">Adherence rates across key packaged commodities</p>

            <div className="space-y-3">
              {[
                { category: 'Dairy Products', rate: 96, samples: 'Amul, Mother Dairy' },
                { category: 'Edible Oils', rate: 92, samples: 'Parachute, Fortune' },
                { category: 'Staples & Flours', rate: 88, samples: 'Aashirvaad, Tata' },
                { category: 'Snacks & Namkeen', rate: 74, samples: 'Lays, Kurkure' },
              ].map((cat) => (
                <div key={cat.category} className="p-2.5 rounded-lg bg-ink-50 border border-ink-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-ink-800">{cat.category}</span>
                    <span className="font-bold text-primary-700">{cat.rate}% Pass</span>
                  </div>
                  <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-primary-600 rounded-full" style={{ width: `${cat.rate}%` }} />
                  </div>
                  <p className="text-[10px] text-ink-400 truncate">Samples: {cat.samples}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Enforcement Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: 'Product Repository',
            desc: 'Search 40+ registered FMCG items by barcode, brand, or SKU',
            icon: Package,
            page: 'products' as Page,
            color: 'accent',
            badge: '40 Registered',
          },
          {
            title: 'Statutory Ruleset',
            desc: 'Configure FSSAI 2020 & LMPCR 2011 mandatory declaration checks',
            icon: BookOpen,
            page: 'rules' as Page,
            color: 'primary',
            badge: '20+ Active Rules',
          },
          {
            title: 'Enforcement Reports',
            desc: 'Export formal compliance certificates in PDF & Word formats',
            icon: BarChart3,
            page: 'reports' as Page,
            color: 'success',
            badge: 'Export PDF/DOCX',
          },
        ].map((item) => {
          const Icon = item.icon;
          const c = colorMap[item.color];
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.page)}
              className="card p-5 text-left hover:shadow-soft transition-all duration-200 hover:-translate-y-0.5 border border-ink-200/80 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs', c.iconBg)}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors">
                  {item.badge}
                </span>
              </div>
              <h4 className="font-bold text-ink-900 text-sm mb-1 group-hover:text-primary-600 transition-colors">
                {item.title}
              </h4>
              <p className="text-xs text-ink-500 leading-relaxed">{item.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
