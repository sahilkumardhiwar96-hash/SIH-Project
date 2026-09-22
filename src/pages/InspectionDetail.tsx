import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, Package, FileText, Scan, Type, Boxes, Shield, Download, ChevronDown, ChevronUp, FileDown, Camera, Loader2, Trash2, Check, XCircle, HelpCircle, UserCheck, Eye, EyeOff, Scale, Printer, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Inspection, Product, InspectionResult, Violation, EvidenceArtifact, AuditLogEntry, ComplianceRule, Page } from '@/types';
import { inspectionStatusConfig, severityConfig, resultStatusConfig, ruleCategoryConfig, cn, formatDateTime, timeAgo } from '@/lib/utils';
import { exportComplianceReportPDF } from '@/lib/pdf-export';
import { exportComplianceReportDocx } from '@/lib/docx-export';
import { uploadFile, isImageFile } from '@/lib/upload';
import { useToast } from '@/lib/toast';

type NavigateFn = (page: Page, inspectionId?: string) => void;

interface BBoxWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface BBoxArtifactContent {
  words?: BBoxWord[];
  image_width_px?: number;
  image_height_px?: number;
}

export default function InspectionDetail({ inspectionId, navigate }: { inspectionId: string; navigate: NavigateFn }) {
  const { success, error: toastError } = useToast();
  const [inspection, setInspection] = useState<(Inspection & { product?: Product }) | null>(null);
  const [results, setResults] = useState<(InspectionResult & { rule?: ComplianceRule })[]>([]);
  const [violations, setViolations] = useState<(Violation & { rule?: ComplianceRule })[]>([]);
  const [evidence, setEvidence] = useState<EvidenceArtifact[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'violations' | 'evidence' | 'audit'>('results');
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<BBoxWord | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: insp }, { data: res }, { data: viols }, { data: ev }, { data: audit }] = await Promise.all([
      supabase.from('inspections').select('*, product:products(*)').eq('id', inspectionId).maybeSingle(),
      supabase.from('inspection_results').select('*, rule:compliance_rules(*)').eq('inspection_id', inspectionId).order('created_at'),
      supabase.from('violations').select('*, rule:compliance_rules(*)').eq('inspection_id', inspectionId).order('created_at'),
      supabase.from('evidence_artifacts').select('*').eq('inspection_id', inspectionId).order('created_at'),
      supabase.from('audit_log').select('*').eq('inspection_id', inspectionId).order('created_at', { ascending: false }),
    ]);

    if (insp) setInspection(insp as Inspection & { product?: Product });
    setResults((res ?? []) as (InspectionResult & { rule?: ComplianceRule })[]);
    setViolations((viols ?? []) as (Violation & { rule?: ComplianceRule })[]);
    setEvidence((ev ?? []) as EvidenceArtifact[]);
    setAuditLog((audit ?? []) as AuditLogEntry[]);
    setLoading(false);
  }, [inspectionId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function updateInspectionStatus(newStatus: Inspection['status']) {
    if (!inspection) return;
    try {
      await supabase.from('inspections').update({ status: newStatus }).eq('id', inspection.id);
      await supabase.from('audit_log').insert({
        inspection_id: inspection.id,
        action: 'status_changed',
        actor: 'Authorized Officer',
        details: { previous: inspection.status, current: newStatus },
      });
      setInspection((prev) => (prev ? { ...prev, status: newStatus } : null));
      success(`Inspection status officially determined as ${newStatus.replace('_', ' ').toUpperCase()}.`);
    } catch {
      toastError('Failed to update inspection status.');
    }
  }

  async function updateResultStatus(resultId: string, newStatus: InspectionResult['status']) {
    try {
      await supabase.from('inspection_results').update({ status: newStatus }).eq('id', resultId);
      await supabase.from('audit_log').insert({
        inspection_id: inspectionId,
        action: 'result_status_overridden',
        actor: 'Authorized Officer',
        details: { result_id: resultId, new_status: newStatus },
      });
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, status: newStatus } : r))
      );
      success(`Finding status updated to ${newStatus.toUpperCase()}.`);
    } catch {
      toastError('Failed to update finding.');
    }
  }

  async function toggleResolveViolation(violId: string, currentResolved: boolean) {
    try {
      await supabase.from('violations').update({ is_resolved: !currentResolved }).eq('id', violId);
      await supabase.from('audit_log').insert({
        inspection_id: inspectionId,
        action: !currentResolved ? 'violation_marked_resolved' : 'violation_reopened',
        actor: 'Authorized Officer',
        details: { violation_id: violId },
      });
      setViolations((prev) =>
        prev.map((v) => (v.id === violId ? { ...v, is_resolved: !currentResolved } : v))
      );
      success(!currentResolved ? 'Violation marked as resolved/closed.' : 'Violation reopened.');
    } catch {
      toastError('Failed to update violation resolution.');
    }
  }

  async function attachEvidencePhoto(file: File) {
    if (!isImageFile(file)) {
      setAttachError('Please choose an image file (JPG, PNG, or WEBP).');
      return;
    }
    setAttachError(null);
    setAttaching(true);
    try {
      const { url } = await uploadFile('evidence-photos', file);
      await supabase.from('evidence_artifacts').insert({
        inspection_id: inspectionId,
        artifact_type: 'user_photo',
        label: file.name,
        content: { url, filename: file.name, attached_by: 'inspector' },
        confidence: 100,
      });
      await supabase.from('audit_log').insert({
        inspection_id: inspectionId,
        action: 'evidence_photo_attached',
        actor: 'inspector',
        details: { filename: file.name },
      });
      await fetchAll();
      success('Evidence photograph attached to inspection dossier.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setAttachError(msg);
      toastError(msg);
    } finally {
      setAttaching(false);
    }
  }

  async function removeEvidence(id: string) {
    await supabase.from('evidence_artifacts').delete().eq('id', id);
    await fetchAll();
    success('Evidence artifact removed.');
  }

  async function handleExportPDF() {
    if (!inspection) return;
    try {
      await exportComplianceReportPDF(inspection, results, violations, evidence);
      success('Legal Metrology PDF Certificate downloaded.');
    } catch {
      toastError('Could not generate PDF.');
    }
  }

  async function handleExportDocx() {
    if (!inspection) return;
    try {
      await exportComplianceReportDocx(inspection, results, violations, evidence);
      success('Editable Word (.docx) Statutory Notice downloaded.');
    } catch {
      toastError('Could not generate Word document.');
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="skeleton h-8 w-32 mb-4" />
        <div className="skeleton h-32 w-full mb-4 rounded-xl" />
        <div className="skeleton h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <p className="text-ink-500">Inspection not found.</p>
        <button onClick={() => navigate('inspections')} className="btn-secondary mt-4">Back to Inspections</button>
      </div>
    );
  }

  const cfg = inspectionStatusConfig[inspection.status];
  const passRate = inspection.total_checks > 0 ? Math.round((inspection.passed_checks / inspection.total_checks) * 100) : 0;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warning').length;

  const tabs = [
    { key: 'results' as const, label: 'Results', count: results.length, icon: CheckCircle },
    { key: 'violations' as const, label: 'Violations', count: violations.length, icon: AlertTriangle },
    { key: 'evidence' as const, label: 'Evidence', count: evidence.length, icon: FileText },
    { key: 'audit' as const, label: 'Audit Trail', count: auditLog.length, icon: Shield },
  ];

  const evidenceIconMap: Record<string, typeof FileText> = {
    ocr_text: Type,
    bounding_box: Boxes,
    font_analysis: Type,
    image_region: Scan,
    color_analysis: Scan,
    user_photo: Camera,
  };

  // Find OCR bounding box artifact if available
  const bboxArtifact = evidence.find((e) => e.artifact_type === 'bounding_box');
  const bboxContent = (bboxArtifact?.content as BBoxArtifactContent | undefined) ?? {};
  const bboxWords = bboxContent.words ?? [];
  const imgW = bboxContent.image_width_px || 1000;
  const imgH = bboxContent.image_height_px || 1000;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <button onClick={() => navigate('inspections')} className="btn-ghost -ml-2 self-start">
          <ArrowLeft className="w-4 h-4" />
          Back to Inspections
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowNoticeModal(true)}
            className="btn-secondary text-xs py-2 px-3.5 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
          >
            <Scale className="w-3.5 h-3.5 text-amber-700" />
            Statutory Notice Preview
          </button>
          <button onClick={handleExportPDF} className="btn-primary text-xs py-2 px-3.5 shadow-sm">
            <FileDown className="w-3.5 h-3.5" />
            Export Official PDF
          </button>
          <button onClick={handleExportDocx} className="btn-secondary text-xs py-2 px-3.5">
            <Download className="w-3.5 h-3.5" />
            Editable Notice (.docx)
          </button>
        </div>
      </div>

      {/* Officer Verification & Legal Determination Card */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-amber-50/70 via-sky-50/50 to-primary-50/50 border border-amber-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink-900 text-sm">Authorized Officer Statutory Determination</h3>
                <span className="badge bg-amber-100 text-amber-800 text-[10px] uppercase font-bold">AI-Assisted Finding</span>
              </div>
              <p className="text-xs text-ink-600 mt-1 max-w-2xl leading-relaxed">
                Automated computer vision and OCR findings are evidentiary aids under Legal Metrology (Packaged Commodities) Rules, 2011. Confirm or adjust the final legal status below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            <button
              onClick={() => updateInspectionStatus('compliant')}
              className={cn(
                'text-xs font-semibold px-3 py-2 rounded-lg border transition-all inline-flex items-center gap-1.5',
                inspection.status === 'compliant'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-ink-700 border-ink-200 hover:bg-emerald-50 hover:text-emerald-700'
              )}
            >
              <Check className="w-3.5 h-3.5" />
              Mark Compliant
            </button>
            <button
              onClick={() => updateInspectionStatus('non_compliant')}
              className={cn(
                'text-xs font-semibold px-3 py-2 rounded-lg border transition-all inline-flex items-center gap-1.5',
                inspection.status === 'non_compliant'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-ink-700 border-ink-200 hover:bg-rose-50 hover:text-rose-700'
              )}
            >
              <XCircle className="w-3.5 h-3.5" />
              Confirm Non-Compliant
            </button>
            <button
              onClick={() => updateInspectionStatus('review')}
              className={cn(
                'text-xs font-semibold px-3 py-2 rounded-lg border transition-all inline-flex items-center gap-1.5',
                inspection.status === 'review'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-ink-700 border-ink-200 hover:bg-amber-50 hover:text-amber-700'
              )}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Mark For Review
            </button>
          </div>
        </div>
      </div>

      {/* Header card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image with Interactive Bounding Box Overlay */}
          <div className="w-full lg:w-60 shrink-0">
            <div className="relative aspect-square rounded-xl bg-ink-900 overflow-hidden border border-ink-200 shadow-inner group">
              {inspection.image_url ? (
                <>
                  <img
                    src={inspection.image_url}
                    alt={inspection.product?.name ?? 'Packaging label'}
                    className="w-full h-full object-contain"
                  />
                  {/* Bounding Box Visual Overlay */}
                  {showBoundingBoxes && bboxWords.length > 0 && (
                    <div className="absolute inset-0 pointer-events-auto">
                      {bboxWords.map((word, idx) => {
                        const leftPct = (word.bbox.x0 / imgW) * 100;
                        const topPct = (word.bbox.y0 / imgH) * 100;
                        const widthPct = ((word.bbox.x1 - word.bbox.x0) / imgW) * 100;
                        const heightPct = ((word.bbox.y1 - word.bbox.y0) / imgH) * 100;
                        const isHovered = hoveredWord?.text === word.text;

                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setHoveredWord(word)}
                            onMouseLeave={() => setHoveredWord(null)}
                            title={`"${word.text}" (${word.confidence}%)`}
                            className={cn(
                              'absolute border cursor-pointer transition-all duration-150',
                              isHovered
                                ? 'border-amber-400 bg-amber-400/30 ring-2 ring-amber-300 z-30'
                                : word.confidence >= 80
                                ? 'border-emerald-400/80 bg-emerald-500/10 hover:bg-emerald-500/25 z-10'
                                : 'border-rose-400/80 bg-rose-500/10 hover:bg-rose-500/25 z-10'
                            )}
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${Math.max(widthPct, 2)}%`,
                              height: `${Math.max(heightPct, 2)}%`,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {/* Bounding box hover tool-tip */}
                  {hoveredWord && (
                    <div className="absolute bottom-2 left-2 right-2 bg-ink-950/90 backdrop-blur-xs text-white text-[11px] p-2 rounded shadow-lg border border-ink-700 z-40">
                      <div className="font-mono truncate font-semibold text-amber-300">"{hoveredWord.text}"</div>
                      <div className="text-[10px] text-ink-300 mt-0.5 flex justify-between">
                        <span>Confidence: {hoveredWord.confidence}%</span>
                        <span>{Math.round(hoveredWord.bbox.x1 - hoveredWord.bbox.x0)}x{Math.round(hoveredWord.bbox.y1 - hoveredWord.bbox.y0)}px</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-ink-300" />
                </div>
              )}
            </div>

            {/* Bounding Box Toggle Controls */}
            {bboxWords.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={cn(
                    'text-xs font-medium px-2.5 py-1.5 rounded-lg border w-full flex items-center justify-center gap-1.5 transition-colors',
                    showBoundingBoxes
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-50'
                  )}
                >
                  {showBoundingBoxes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showBoundingBoxes ? 'Hide OCR Bounding Boxes' : `Show OCR Boxes (${bboxWords.length})`}
                </button>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xl font-bold text-ink-900">{inspection.product?.name ?? 'Unknown Product'}</h2>
                <p className="text-sm text-ink-500">{inspection.product?.brand} - {inspection.product?.category}</p>
              </div>
              <span className={cn('badge', cfg.badgeClass)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotClass)} />
                {cfg.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-ink-50">
                <p className="text-xs text-ink-500 mb-1">Checks Passed</p>
                <p className="text-lg font-bold text-success-600">{passed}/{results.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-ink-50">
                <p className="text-xs text-ink-500 mb-1">Violations</p>
                <p className="text-lg font-bold text-error-600">{failed}</p>
              </div>
              <div className="p-3 rounded-lg bg-ink-50">
                <p className="text-xs text-ink-500 mb-1">Warnings</p>
                <p className="text-lg font-bold text-warning-600">{warnings}</p>
              </div>
              <div className="p-3 rounded-lg bg-ink-50">
                <p className="text-xs text-ink-500 mb-1">Confidence</p>
                <p className="text-lg font-bold text-primary-600">{Number(inspection.overall_confidence).toFixed(1)}%</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {timeAgo(inspection.created_at)}</span>
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {inspection.inspector_name}</span>
              {inspection.completed_at && <span>Completed {formatDateTime(inspection.completed_at)}</span>}
            </div>
          </div>
        </div>

        {/* Pass rate bar */}
        <div className="mt-4 pt-4 border-t border-ink-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-700">Compliance Score</span>
            <span className="text-sm font-bold text-ink-900">{passRate}%</span>
          </div>
          <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-700',
              passRate === 100 ? 'bg-success-500' : passRate >= 80 ? 'bg-warning-500' : 'bg-error-500'
            )} style={{ width: `${passRate}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-ink-900 text-white'
                  : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={cn('text-xs', activeTab === tab.key ? 'text-ink-300' : 'text-ink-400')}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="card p-6">
        {activeTab === 'results' && (
          <div className="space-y-2">
            {results.length === 0 ? (
              <p className="text-center text-ink-400 py-8">No results recorded.</p>
            ) : (
              results.map((r) => {
                const rCfg = resultStatusConfig[r.status];
                const catCfg = ruleCategoryConfig[r.rule?.category ?? 'presence'];
                const isExpanded = expandedResult === r.id;
                return (
                  <div key={r.id} className="border border-ink-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedResult(isExpanded ? null : r.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-ink-50 transition-colors text-left"
                    >
                      <div className={cn('w-2 h-2 rounded-full shrink-0',
                        r.status === 'pass' ? 'bg-success-500' : r.status === 'fail' ? 'bg-error-500' : r.status === 'warning' ? 'bg-warning-500' : 'bg-ink-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-900 truncate">{r.rule?.title}</p>
                        <p className="text-xs text-ink-500">{r.rule?.rule_code} - {catCfg.label}</p>
                      </div>
                      <span className="text-xs font-mono text-ink-500 hidden sm:block">{r.confidence.toFixed(1)}%</span>
                      <span className={cn('badge text-xs', rCfg.badgeClass)}>{rCfg.label}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-ink-100 bg-ink-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          {r.detected_value && (
                            <div>
                              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Detected</p>
                              <p className="text-sm text-ink-800 font-mono bg-white rounded px-2 py-1.5 border border-ink-200">{r.detected_value}</p>
                            </div>
                          )}
                          {r.expected_value && (
                            <div>
                              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Expected</p>
                              <p className="text-sm text-ink-800 font-mono bg-white rounded px-2 py-1.5 border border-ink-200">{r.expected_value}</p>
                            </div>
                          )}
                        </div>
                        {r.message && <p className="text-sm text-ink-600 mt-3">{r.message}</p>}
                        <div className="mt-4 pt-3 border-t border-ink-200/80 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Officer Finding Override:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateResultStatus(r.id, 'pass')}
                              className={cn(
                                'text-[11px] font-medium px-2 py-1 rounded border transition-colors',
                                r.status === 'pass'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-ink-600 border-ink-200 hover:bg-emerald-50 hover:text-emerald-700'
                              )}
                            >
                              Pass
                            </button>
                            <button
                              onClick={() => updateResultStatus(r.id, 'fail')}
                              className={cn(
                                'text-[11px] font-medium px-2 py-1 rounded border transition-colors',
                                r.status === 'fail'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-white text-ink-600 border-ink-200 hover:bg-rose-50 hover:text-rose-700'
                              )}
                            >
                              Fail
                            </button>
                            <button
                              onClick={() => updateResultStatus(r.id, 'warning')}
                              className={cn(
                                'text-[11px] font-medium px-2 py-1 rounded border transition-colors',
                                r.status === 'warning'
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-ink-600 border-ink-200 hover:bg-amber-50 hover:text-amber-700'
                              )}
                            >
                              Warning
                            </button>
                            <button
                              onClick={() => updateResultStatus(r.id, 'skipped')}
                              className={cn(
                                'text-[11px] font-medium px-2 py-1 rounded border transition-colors',
                                r.status === 'skipped'
                                  ? 'bg-ink-700 text-white border-ink-700'
                                  : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-100'
                              )}
                            >
                              Not Applicable
                            </button>
                          </div>
                        </div>
                        {r.rule?.description && <p className="text-xs text-ink-500 mt-2">{r.rule.description}</p>}
                        {r.rule?.regulation_reference && (
                          <p className="text-xs text-primary-600 mt-1 font-medium">Regulation: {r.rule.regulation_reference}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="space-y-3">
            {violations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
                <p className="text-ink-600 font-medium">No violations detected</p>
                <p className="text-sm text-ink-400 mt-1">This label passed all compliance checks.</p>
              </div>
            ) : (
              violations.map((v) => {
                const sev = severityConfig[v.severity];
                return (
                  <div key={v.id} className="p-4 rounded-lg border border-ink-200">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('badge', sev.badgeClass)}>{sev.label}</span>
                        <span className="text-xs font-mono text-ink-500">{v.rule?.rule_code}</span>
                      </div>
                      <span className="text-xs text-ink-400">{timeAgo(v.created_at)}</span>
                    </div>
                    <p className="text-sm text-ink-800 mb-2">{v.description}</p>
                    {v.evidence_data && Object.keys(v.evidence_data).length > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-ink-50 border border-ink-200">
                        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Evidence</p>
                        <pre className="text-xs text-ink-700 font-mono overflow-x-auto scrollbar-thin">{JSON.stringify(v.evidence_data, null, 2)}</pre>
                      </div>
                    )}
                    {v.recommendation && (
                      <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs text-ink-600 flex-1"><span className="font-semibold text-ink-700">Recommendation:</span> {v.recommendation}</p>
                        <button
                          onClick={() => toggleResolveViolation(v.id, v.is_resolved)}
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors shrink-0',
                            v.is_resolved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-50'
                          )}
                        >
                          {v.is_resolved ? '✓ Notice Closed / Resolved' : 'Mark Notice Resolved'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-4">
            {/* Attach supporting evidence photo */}
            <div className="p-4 rounded-lg border border-dashed border-ink-300 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-ink-900">Attach supporting evidence</p>
                <p className="text-xs text-ink-500">Add close-up photographs (e.g. of an MRP sticker or missing declaration) to this inspection's record.</p>
                {attachError && <p className="text-xs text-error-600 mt-1">{attachError}</p>}
              </div>
              <input
                ref={evidenceFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) attachEvidencePhoto(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => evidenceFileInputRef.current?.click()}
                disabled={attaching}
                className="btn-secondary shrink-0 disabled:opacity-50"
              >
                {attaching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {attaching ? 'Uploading...' : 'Attach Photo'}
              </button>
            </div>

            {/* Primary Packaging Photo Evidence Card */}
            {(inspection.image_url || inspection.product?.image_url) && (
              <div className="p-4 rounded-xl border-2 border-primary-200 bg-gradient-to-r from-primary-50/50 to-sky-50/40 shadow-xs mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-xs">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900">Primary Packaging Photographic Evidence</p>
                      <p className="text-xs text-ink-500">Official physical packaging photo attached to statutory dossier</p>
                    </div>
                  </div>
                  <span className="badge bg-primary-100 text-primary-800 text-xs font-mono font-bold">LMPCR 2011 Rule 6 Scope</span>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-primary-200/80 bg-ink-950 flex items-center justify-center max-h-96">
                  <img
                    src={inspection.image_url || inspection.product?.image_url}
                    alt="Primary Packaging Evidence"
                    className="w-full max-h-96 object-contain"
                  />
                  <div className="absolute bottom-2 left-2 right-2 py-1.5 px-3 rounded-lg bg-ink-950/80 backdrop-blur-xs text-xs text-white flex items-center justify-between">
                    <span className="font-medium truncate">{inspection.product?.name || 'Packaged Commodity Sample'}</span>
                    <span className="text-[10px] text-primary-300 font-mono">Verified Ingestion Frame</span>
                  </div>
                </div>
              </div>
            )}

            {evidence.length === 0 && !(inspection.image_url || inspection.product?.image_url) ? (
              <p className="text-center text-ink-400 py-8">No evidence artifacts collected.</p>
            ) : (
              evidence.map((e) => {
                const Icon = evidenceIconMap[e.artifact_type] ?? FileText;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const content = e.content as any;
                const isPhoto = e.artifact_type === 'user_photo' || e.artifact_type === 'photo_evidence' || Boolean(content?.url) || Boolean(content?.image_url);
                const photoUrl = content?.url || content?.image_url;

                return (
                  <div key={e.id} className="p-4 rounded-xl border border-ink-200 bg-white shadow-xs mb-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-ink-900">{e.label ?? e.artifact_type}</p>
                        <p className="text-xs text-ink-500 capitalize">{e.artifact_type.replace(/_/g, ' ')}</p>
                      </div>
                      <span className="badge bg-ink-100 text-ink-700 text-xs font-mono font-semibold">{e.confidence.toFixed(1)}% confidence</span>
                      {e.artifact_type === 'user_photo' && (
                        <button onClick={() => removeEvidence(e.id)} className="text-ink-400 hover:text-error-600 ml-2" aria-label="Remove evidence photo">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Formatted View (No raw JSON dump!) */}
                    {isPhoto && photoUrl ? (
                      <div className="rounded-xl overflow-hidden border border-ink-200 bg-ink-900 flex items-center justify-center max-h-80">
                        <img src={photoUrl} alt={e.label ?? 'Evidence photo'} className="w-full max-h-80 object-contain" />
                      </div>
                    ) : e.artifact_type === 'ocr_text' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-ink-500">
                          <span>Extracted Declarations ({content?.word_count || 0} tokens · {content?.language || 'en'})</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-ink-50 border border-ink-200 font-mono text-xs text-ink-800 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto scrollbar-thin">
                          {content?.text || 'No text extracted'}
                        </div>
                      </div>
                    ) : e.artifact_type === 'font_analysis' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-ink-50 border border-ink-200 text-center">
                        <div className="p-2 rounded-lg bg-white border border-ink-200/80">
                          <p className="text-[10px] uppercase font-bold text-ink-400">Min Font Height</p>
                          <p className="text-base font-bold text-ink-900 mt-0.5">{content?.min_height_mm ?? '--'} mm</p>
                          <span className={cn('text-[10px] font-semibold', (content?.min_height_mm ?? 0) >= 1.6 ? 'text-emerald-600' : 'text-amber-600')}>
                            {(content?.min_height_mm ?? 0) >= 1.6 ? '✓ Rule 13 Compliant' : '⚠ Below 1.6mm'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-ink-200/80">
                          <p className="text-[10px] uppercase font-bold text-ink-400">Avg Font Height</p>
                          <p className="text-base font-bold text-ink-900 mt-0.5">{content?.avg_height_mm ?? '--'} mm</p>
                          <span className="text-[10px] text-ink-500">Readable Scale</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-ink-200/80">
                          <p className="text-[10px] uppercase font-bold text-ink-400">Max Font Height</p>
                          <p className="text-base font-bold text-ink-900 mt-0.5">{content?.max_height_mm ?? '--'} mm</p>
                          <span className="text-[10px] text-ink-500">Header Text</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-ink-200/80">
                          <p className="text-[10px] uppercase font-bold text-ink-400">Scan Resolution</p>
                          <p className="text-base font-bold text-ink-900 mt-0.5">{content?.assumed_dpi ?? 300} DPI</p>
                          <span className="text-[10px] text-primary-600 font-semibold">Standard Baseline</span>
                        </div>
                      </div>
                    ) : e.artifact_type === 'bounding_box' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-ink-500">
                          <span>Top Detected Tokens ({content?.words?.length || 0} spatial anchors)</span>
                          <span className="font-mono text-[11px]">{content?.image_width_px} × {content?.image_height_px} px</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-ink-50 border border-ink-200 max-h-48 overflow-y-auto scrollbar-thin">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(content?.words || []).map((w: any, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-ink-200 text-xs font-mono text-ink-700">
                              <span className="font-bold text-primary-700">{w.text}</span>
                              <span className="text-[10px] text-ink-400">{w.confidence}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-ink-50 border border-ink-200 text-xs text-ink-700 font-mono overflow-x-auto scrollbar-thin">
                        {typeof content === 'object' && content
                          ? Object.entries(content).map(([k, v]) => `${k}: ${v}`).join(' | ')
                          : String(content)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <p className="text-center text-ink-400 py-8">No audit trail entries.</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-ink-200" />
                {auditLog.map((entry) => (
                  <div key={entry.id} className="relative mb-4">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                    <div className="ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink-900">{entry.action.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-ink-400">{formatDateTime(entry.created_at)}</span>
                      </div>
                      <p className="text-xs text-ink-500 mt-0.5">by {entry.actor}</p>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <pre className="text-xs text-ink-600 font-mono mt-1 p-2 rounded bg-ink-50 border border-ink-200 overflow-x-auto scrollbar-thin">{JSON.stringify(entry.details, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={() => setShowNoticeModal(true)}
          className="btn-secondary flex-1 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
        >
          <Scale className="w-4 h-4 text-amber-700" />
          Statutory Notice Preview
        </button>
        <button onClick={handleExportPDF} className="btn-primary flex-1 shadow-sm">
          <FileDown className="w-4 h-4" />
          Export Official PDF
        </button>
        <button onClick={handleExportDocx} className="btn-secondary flex-1">
          <Download className="w-4 h-4" />
          Export Editable Notice (.docx)
        </button>
        <button onClick={() => navigate('new-inspection')} className="btn-secondary flex-1">
          New Inspection
        </button>
      </div>

      {/* Statutory Violation Notice Preview Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-ink-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-ink-100 bg-gradient-to-r from-amber-50 to-orange-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink-900 text-base">Statutory Notice Preview</h3>
                  <p className="text-xs text-ink-600">Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011</p>
                </div>
              </div>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="text-ink-400 hover:text-ink-700 p-1.5 rounded-lg hover:bg-ink-100 transition-colors"
                aria-label="Close modal"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Official Notice Document Preview */}
            <div className="p-6 overflow-y-auto space-y-6 text-ink-800 text-xs sm:text-sm font-sans">
              <div className="text-center border-b border-ink-200 pb-4">
                <p className="font-bold uppercase tracking-wider text-xs text-ink-500">Government of India / State Legal Metrology Department</p>
                <h2 className="text-lg font-bold text-ink-950 mt-1">OFFICE OF THE CONTROLLER OF LEGAL METROLOGY</h2>
                <p className="text-xs text-ink-600">Form IV: Notice of Compoundable Offence / Show Cause Notice</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-ink-50 p-4 rounded-xl border border-ink-200 text-xs">
                <div>
                  <span className="text-ink-500 block">Dossier Reference ID:</span>
                  <span className="font-mono font-bold text-ink-900">{inspection.id.slice(0, 13).toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Inspection Date:</span>
                  <span className="font-semibold text-ink-900">{formatDateTime(inspection.created_at)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Product / Brand:</span>
                  <span className="font-semibold text-ink-900">{inspection.product?.name ?? 'Packaging Unit'} ({inspection.product?.brand ?? 'N/A'})</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Authorized Officer:</span>
                  <span className="font-semibold text-ink-900">{inspection.inspector_name ?? 'Senior Inspector'}</span>
                </div>
              </div>

              {/* Violations Summary in Notice */}
              <div>
                <h4 className="font-bold text-ink-900 text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Recorded Non-Compliances & Grounds of Notice ({violations.length})
                </h4>
                {violations.length === 0 ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs">
                    ✓ No non-compliances recorded. Product packaging meets statutory declaration standards.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {violations.map((v, i) => (
                      <div key={v.id} className="p-3 bg-rose-50/70 rounded-lg border border-rose-200 text-xs">
                        <div className="flex items-center justify-between font-semibold text-rose-900">
                          <span>{i + 1}. {v.rule?.title ?? 'Statutory Violation'}</span>
                          <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-rose-300 uppercase">{v.rule?.rule_code ?? 'LMR-RULE'}</span>
                        </div>
                        <p className="text-ink-700 mt-1">{v.description}</p>
                        {v.recommendation && (
                          <p className="text-amber-800 mt-1 text-[11px]"><span className="font-bold">Required Rectification:</span> {v.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statutory Clause */}
              <div className="p-4 bg-ink-50 rounded-xl border border-ink-200 text-[11px] text-ink-600 space-y-2 leading-relaxed">
                <p>
                  <strong>Notice under Section 36 of Legal Metrology Act, 2009:</strong> Whoever manufactures, packs, imports, sells, distributes, or exposes for sale any pre-packaged commodity which does not conform to all declarations prescribed under Rule 6 shall be punishable with fine which may extend to twenty-five thousand rupees, and for second offence up to fifty thousand rupees.
                </p>
                <p>
                  You are hereby required to furnish your written explanation and show cause within fifteen (15) days of receipt of this notice, failing which ex-parte legal proceedings under the Act shall be initiated.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-ink-100 bg-ink-50/50 flex items-center justify-end gap-2.5">
              <button onClick={() => setShowNoticeModal(false)} className="btn-secondary text-xs py-2 px-3.5">
                Close Preview
              </button>
              <button onClick={handleExportDocx} className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Word Notice (.docx)
              </button>
              <button onClick={handleExportPDF} className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm">
                <Printer className="w-3.5 h-3.5" />
                Print / Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
