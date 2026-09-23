import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Download, ClipboardList, AlertTriangle, CheckCircle, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Inspection, Violation, ComplianceRule, Product } from '@/types';
import { cn, severityConfig, ruleCategoryConfig, formatDate } from '@/lib/utils';
import { useToast } from '@/lib/toast';

export default function Reports() {
  const { success } = useToast();
  const [inspections, setInspections] = useState<(Inspection & { product?: Product })[]>([]);
  const [violations, setViolations] = useState<(Violation & { rule?: ComplianceRule })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [{ data: insp }, { data: viols }] = await Promise.all([
      supabase.from('inspections').select('*, product:products(*)').order('created_at', { ascending: false }),
      supabase.from('violations').select('*, rule:compliance_rules(*)').order('created_at', { ascending: false }),
    ]);
    setInspections((insp ?? []) as (Inspection & { product?: Product })[]);
    setViolations((viols ?? []) as (Violation & { rule?: ComplianceRule })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 w-full rounded-xl" />)}
        </div>
        <div className="skeleton h-96 w-full rounded-xl" />
      </div>
    );
  }

  const total = inspections.length;
  const compliant = inspections.filter((i) => i.status === 'compliant').length;
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;
  const avgConfidence = total > 0 ? Math.round(inspections.reduce((s, i) => s + (i.overall_confidence || 0), 0) / total) : 0;

  // Violations by severity
  const violationsBySeverity = {
    critical: violations.filter((v) => v.severity === 'critical').length,
    major: violations.filter((v) => v.severity === 'major').length,
    minor: violations.filter((v) => v.severity === 'minor').length,
  };

  // Violations by category
  const violationsByCategory: Record<string, number> = {};
  violations.forEach((v) => {
    const cat = v.rule?.category ?? 'other';
    violationsByCategory[cat] = (violationsByCategory[cat] ?? 0) + 1;
  });

  // Most common violations (top 5)
  const violationCounts: Record<string, { count: number; title: string; code: string }> = {};
  violations.forEach((v) => {
    const key = v.rule?.rule_code ?? 'unknown';
    if (!violationCounts[key]) {
      violationCounts[key] = { count: 0, title: v.rule?.title ?? 'Unknown', code: key };
    }
    violationCounts[key].count++;
  });
  const topViolations = Object.values(violationCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  // Products with most violations (optimized with Map for large 50,000 datasets)
  const inspectionMap = new Map<string, Inspection & { product?: Product }>();
  inspections.forEach((i) => inspectionMap.set(i.id, i));

  const productViolationCounts: Record<string, { count: number; name: string; brand: string }> = {};
  violations.forEach((v) => {
    const insp = inspectionMap.get(v.inspection_id);
    if (insp?.product) {
      const key = insp.product.id;
      if (!productViolationCounts[key]) {
        productViolationCounts[key] = { count: 0, name: insp.product.name, brand: insp.product.brand };
      }
      productViolationCounts[key].count++;
    }
  });
  const topProducts = Object.values(productViolationCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const summaryCards = [
    { label: 'Total Inspections', value: total, icon: ClipboardList, color: 'primary', trend: '+12%' },
    { label: 'Compliance Rate', value: `${complianceRate}%`, icon: CheckCircle, color: 'success', trend: '+8%' },
    { label: 'Avg Confidence', value: `${avgConfidence}%`, icon: TrendingUp, color: 'accent', trend: '+3%' },
    { label: 'Total Violations', value: violations.length, icon: AlertTriangle, color: 'error', trend: '-5%' },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-700', iconBg: 'bg-primary-500' },
    accent: { bg: 'bg-accent-50', text: 'text-accent-700', iconBg: 'bg-accent-500' },
    success: { bg: 'bg-success-50', text: 'text-success-700', iconBg: 'bg-success-500' },
    error: { bg: 'bg-error-50', text: 'text-error-700', iconBg: 'bg-error-500' },
  };

  function exportCSV() {
    const rows = [
      ['Product', 'Brand', 'Status', 'Checks Passed', 'Checks Failed', 'Confidence', 'Date'],
      ...inspections.map((i) => [
        i.product?.name ?? 'Unknown',
        i.product?.brand ?? '',
        i.status,
        String(i.passed_checks),
        String(i.failed_checks),
        String(i.overall_confidence),
        formatDate(i.created_at),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success('Compliance analytics CSV exported.');
  }

  function exportPDF() {
    const win = window.open('', '_blank');
    if (!win) return;
    success('Compliance analytics report opened for print/save.');
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Compliance Analytics Report</title>
    <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:Helvetica,Arial,sans-serif;color:#1e293b;padding:40px;line-height:1.6}
    .header{border-bottom:3px solid #0d9488;padding-bottom:20px;margin-bottom:30px}
    h1{font-size:22px;color:#0f172a}.subtitle{font-size:12px;color:#64748b;margin-top:4px}
    .date{text-align:right;font-size:12px;color:#64748b;margin-bottom:20px}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:30px}
    .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center}
    .stat .v{font-size:28px;font-weight:700}.stat .l{font-size:12px;color:#64748b;margin-top:4px}
    h3{font-size:16px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-top:24px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}
    th{text-align:left;padding:8px;background:#f1f5f9;font-size:10px;text-transform:uppercase;color:#475569}
    td{padding:8px;border-bottom:1px solid #f1f5f9}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center}
    </style></head><body>
    <div class="header"><h1>LabelGuard - Compliance Analytics Report</h1><p class="subtitle">Legal Metrology (Packaged Commodities) Rules, 2011</p></div>
    <p class="date">Generated: ${dateStr}</p>
    <div class="stats">
    <div class="stat"><div class="v">${total}</div><div class="l">Total Inspections</div></div>
    <div class="stat"><div class="v">${complianceRate}%</div><div class="l">Compliance Rate</div></div>
    <div class="stat"><div class="v">${avgConfidence}%</div><div class="l">Avg Confidence</div></div>
    <div class="stat"><div class="v">${violations.length}</div><div class="l">Total Violations</div></div>
    </div>
    <h3>Violations by Severity</h3>
    <table><tr><th>Critical</th><th>Major</th><th>Minor</th></tr>
    <tr><td>${violationsBySeverity.critical}</td><td>${violationsBySeverity.major}</td><td>${violationsBySeverity.minor}</td></tr></table>
    <h3>Inspection History</h3>
    <table><tr><th>Product</th><th>Brand</th><th>Status</th><th>Pass Rate</th><th>Confidence</th><th>Date</th></tr>
    ${inspections.slice(0, 20).map((i) => `<tr><td>${i.product?.name ?? 'Unknown'}</td><td>${i.product?.brand ?? ''}</td><td>${i.status.replace(/_/g, ' ')}</td><td>${i.passed_checks}/${i.total_checks}</td><td>${Number(i.overall_confidence).toFixed(1)}%</td><td>${formatDate(i.created_at)}</td></tr>`).join('')}
    </table>
    <div class="footer"><p><strong>LabelGuard Compliance Platform</strong></p><p>System-generated report for enforcement purposes</p></div>
    <script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  }

  const maxViolations = Math.max(...Object.values(violationsBySeverity), 1);
  const maxCatViolations = Math.max(...Object.values(violationsByCategory), 1);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink-900">Compliance Reports & Analytics</h2>
          <p className="text-sm text-ink-500 mt-1">Aggregate compliance metrics and violation analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn-primary">
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          const c = colorMap[card.color];
          return (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.iconBg)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-success-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> {card.trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-ink-900">{card.value}</p>
              <p className="text-sm text-ink-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Violations by severity */}
        <div className="card p-6">
          <h3 className="font-bold text-ink-900 text-lg mb-5">Violations by Severity</h3>
          <div className="space-y-4">
            {(['critical', 'major', 'minor'] as const).map((sev) => {
              const cfg = severityConfig[sev];
              const count = violationsBySeverity[sev];
              const pct = maxViolations > 0 ? (count / maxViolations) * 100 : 0;
              const barColor = sev === 'critical' ? 'bg-error-500' : sev === 'major' ? 'bg-warning-500' : 'bg-ink-400';
              return (
                <div key={sev}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn('text-sm font-medium', sev === 'critical' ? 'text-error-700' : sev === 'major' ? 'text-warning-700' : 'text-ink-600')}>
                      {cfg.label}
                    </span>
                    <span className="text-sm text-ink-500">{count}</span>
                  </div>
                  <div className="h-3 bg-ink-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-ink-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-error-600">{violationsBySeverity.critical}</p>
              <p className="text-xs text-ink-500">Critical</p>
            </div>
            <div>
              <p className="text-xl font-bold text-warning-600">{violationsBySeverity.major}</p>
              <p className="text-xs text-ink-500">Major</p>
            </div>
            <div>
              <p className="text-xl font-bold text-ink-600">{violationsBySeverity.minor}</p>
              <p className="text-xs text-ink-500">Minor</p>
            </div>
          </div>
        </div>

        {/* Violations by category */}
        <div className="card p-6">
          <h3 className="font-bold text-ink-900 text-lg mb-5">Violations by Category</h3>
          {Object.keys(violationsByCategory).length === 0 ? (
            <p className="text-center text-ink-400 py-8">No violations recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(violationsByCategory).sort(([, a], [, b]) => b - a).map(([cat, count]) => {
                const cfg = ruleCategoryConfig[cat] ?? { label: cat, color: 'primary', icon: '' };
                const pct = maxCatViolations > 0 ? (count / maxCatViolations) * 100 : 0;
                const barColors: Record<string, string> = {
                  primary: 'bg-primary-500', accent: 'bg-accent-500', secondary: 'bg-secondary-500',
                  success: 'bg-success-500', warning: 'bg-warning-500', error: 'bg-error-500',
                };
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-ink-700 capitalize">{cfg.label}</span>
                      <span className="text-sm text-ink-500">{count}</span>
                    </div>
                    <div className="h-3 bg-ink-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700', barColors[cfg.color] ?? 'bg-primary-500')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top violations */}
        <div className="card p-6">
          <h3 className="font-bold text-ink-900 text-lg mb-4">Most Common Violations</h3>
          {topViolations.length === 0 ? (
            <p className="text-center text-ink-400 py-8">No violations recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topViolations.map((v, i) => (
                <div key={v.code} className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                    i === 0 ? 'bg-error-100 text-error-700' : i === 1 ? 'bg-warning-100 text-warning-700' : 'bg-ink-100 text-ink-600'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{v.title}</p>
                    <p className="text-xs text-ink-500 font-mono">{v.code}</p>
                  </div>
                  <span className="text-sm font-bold text-ink-700">{v.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products with most violations */}
        <div className="card p-6">
          <h3 className="font-bold text-ink-900 text-lg mb-4">Products with Most Issues</h3>
          {topProducts.length === 0 ? (
            <p className="text-center text-ink-400 py-8">No violations recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                    i === 0 ? 'bg-error-100 text-error-700' : i === 1 ? 'bg-warning-100 text-warning-700' : 'bg-ink-100 text-ink-600'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{p.name}</p>
                    <p className="text-xs text-ink-500">{p.brand}</p>
                  </div>
                  <span className="text-sm font-bold text-error-600">{p.count} violations</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent inspections summary table */}
      <div className="card p-6 mt-6">
        <h3 className="font-bold text-ink-900 text-lg mb-4">Inspection History</h3>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Pass Rate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Confidence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {inspections.slice(0, 10).map((i) => {
                const passPct = i.total_checks > 0 ? Math.round((i.passed_checks / i.total_checks) * 100) : 0;
                const statusBadge = i.status === 'compliant' ? 'bg-success-100 text-success-700'
                  : i.status === 'non_compliant' ? 'bg-error-100 text-error-700'
                  : i.status === 'review' ? 'bg-warning-100 text-warning-700'
                  : 'bg-ink-100 text-ink-600';
                return (
                  <tr key={i.id} className="hover:bg-ink-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink-900">{i.product?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-ink-500">{i.product?.brand}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs capitalize', statusBadge)}>{i.status.replace('_', '-')}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-ink-700">{i.passed_checks}/{i.total_checks} ({passPct}%)</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-ink-700">{Number(i.overall_confidence).toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-500 hidden lg:table-cell">{formatDate(i.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
