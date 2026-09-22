import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ComplianceRule } from '@/types';
import { severityConfig, ruleCategoryConfig, cn } from '@/lib/utils';
import { useToast } from '@/lib/toast';

export default function Rules() {
  const { success, info } = useToast();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('compliance_rules').select('*').order('category').order('rule_code');
    if (!error && data) setRules(data as ComplianceRule[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function toggleRule(rule: ComplianceRule) {
    const updated = !rule.is_active;
    await supabase.from('compliance_rules').update({ is_active: updated }).eq('id', rule.id);
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: updated } : r)));
    if (updated) {
      success(`Rule ${rule.rule_code} (${rule.title}) activated.`);
    } else {
      info(`Rule ${rule.rule_code} disabled from automated audits.`);
    }
  }

  const filtered = rules.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.rule_code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.regulation_reference ?? '').toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesSev = severityFilter === 'all' || r.severity === severityFilter;
    return matchesSearch && matchesCat && matchesSev;
  });

  const categories = [...new Set(rules.map((r) => r.category))];
  const categoryCounts: Record<string, number> = {};
  rules.forEach((r) => { categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1; });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink-900">Compliance Rules Engine</h2>
        <p className="text-sm text-ink-500 mt-1">{rules.length} active regulatory rules configured across {categories.length} categories</p>
      </div>

      {/* Category overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {categories.map((cat) => {
          const cfg = ruleCategoryConfig[cat] ?? { label: cat, color: 'primary', icon: 'BookOpen' };
          const colorClasses: Record<string, string> = {
            primary: 'bg-primary-50 text-primary-700 border-primary-200',
            accent: 'bg-accent-50 text-accent-700 border-accent-200',
            secondary: 'bg-secondary-50 text-secondary-700 border-secondary-200',
            success: 'bg-success-50 text-success-700 border-success-200',
            warning: 'bg-warning-50 text-warning-700 border-warning-200',
            error: 'bg-error-50 text-error-700 border-error-200',
          };
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                categoryFilter === cat ? colorClasses[cfg.color] : 'bg-white border-ink-200 hover:border-ink-300'
              )}
            >
              <p className="text-2xl font-bold mb-1">{categoryCounts[cat]}</p>
              <p className="text-xs font-medium capitalize">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search rules by code, title, or regulation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="input sm:w-40"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-32 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-12 h-12 text-ink-300 mx-auto mb-4" />
          <p className="text-ink-500 font-medium">No rules found</p>
          <p className="text-sm text-ink-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((rule) => {
            const sev = severityConfig[rule.severity];
            const catCfg = ruleCategoryConfig[rule.category] ?? { label: rule.category, color: 'primary', icon: 'CheckCircle' };
            const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
              primary: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200' },
              accent: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200' },
              secondary: { bg: 'bg-secondary-50', text: 'text-secondary-700', border: 'border-secondary-200' },
              success: { bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-200' },
              warning: { bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-200' },
              error: { bg: 'bg-error-50', text: 'text-error-700', border: 'border-error-200' },
            };
            const cc = colorClasses[catCfg.color] ?? colorClasses.primary;
            return (
              <div key={rule.id} className="card p-5 hover:shadow-soft transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('badge text-xs', cc.bg, cc.text, 'border', cc.border)}>{catCfg.label}</span>
                    <span className="text-xs font-mono text-ink-500">{rule.rule_code}</span>
                  </div>
                  <span className={cn('badge text-xs', sev.badgeClass)}>{sev.label}</span>
                </div>
                <h3 className="font-semibold text-ink-900 text-sm mb-2">{rule.title}</h3>
                <p className="text-sm text-ink-600 mb-3">{rule.description}</p>
                {rule.regulation_reference && (
                  <div className="flex items-center gap-1.5 text-xs text-primary-600 font-medium">
                    <BookOpen className="w-3.5 h-3.5" />
                    {rule.regulation_reference}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between">
                  <span className="text-xs text-ink-500 font-medium">Automated Evaluation:</span>
                  <button
                    onClick={() => toggleRule(rule)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                      rule.is_active
                        ? 'bg-success-50 text-success-700 hover:bg-success-100 border border-success-200'
                        : 'bg-ink-100 text-ink-500 hover:bg-ink-200 border border-ink-200'
                    )}
                  >
                    {rule.is_active ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-success-600" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-ink-400" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
