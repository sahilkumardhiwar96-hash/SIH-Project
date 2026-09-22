import type { InspectionStatus, ResultStatus } from '@/types';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export const inspectionStatusConfig: Record<InspectionStatus, { label: string; badgeClass: string; dotClass: string }> = {
  pending: { label: 'Pending', badgeClass: 'bg-ink-100 text-ink-600', dotClass: 'bg-ink-400' },
  analyzing: { label: 'Analyzing', badgeClass: 'bg-accent-100 text-accent-700', dotClass: 'bg-accent-500' },
  compliant: { label: 'Compliant', badgeClass: 'bg-success-100 text-success-700', dotClass: 'bg-success-500' },
  non_compliant: { label: 'Non-Compliant', badgeClass: 'bg-error-100 text-error-700', dotClass: 'bg-error-500' },
  review: { label: 'Under Review', badgeClass: 'bg-warning-100 text-warning-700', dotClass: 'bg-warning-500' },
};

export const resultStatusConfig: Record<ResultStatus, { label: string; badgeClass: string }> = {
  pass: { label: 'Pass', badgeClass: 'bg-success-100 text-success-700' },
  fail: { label: 'Fail', badgeClass: 'bg-error-100 text-error-700' },
  warning: { label: 'Warning', badgeClass: 'bg-warning-100 text-warning-700' },
  skipped: { label: 'Skipped', badgeClass: 'bg-ink-100 text-ink-500' },
  pending: { label: 'Pending', badgeClass: 'bg-ink-100 text-ink-500' },
};

export const severityConfig: Record<string, { label: string; badgeClass: string }> = {
  critical: { label: 'Critical', badgeClass: 'bg-error-100 text-error-700 border border-error-200' },
  major: { label: 'Major', badgeClass: 'bg-warning-100 text-warning-700 border border-warning-200' },
  minor: { label: 'Minor', badgeClass: 'bg-ink-100 text-ink-600 border border-ink-200' },
};

export const ruleCategoryConfig: Record<string, { label: string; color: string; icon: string }> = {
  presence: { label: 'Presence', color: 'primary', icon: 'CheckCircle' },
  format: { label: 'Format', color: 'accent', icon: 'Type' },
  quantity: { label: 'Quantity', color: 'secondary', icon: 'Scale' },
  mrp: { label: 'MRP', color: 'success', icon: 'Tag' },
  font: { label: 'Font', color: 'warning', icon: 'FontSize' },
  placement: { label: 'Placement', color: 'error', icon: 'Layout' },
  ecommerce: { label: 'E-Commerce (Rule 6(10))', color: 'accent', icon: 'ShoppingBag' },
};

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
