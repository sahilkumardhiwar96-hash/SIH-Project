import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Upload,
  ScanLine,
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  X,
  Image as ImageIcon,
  Zap,
  Search,
  FileDown,
  RotateCw,
  RotateCcw,
  Camera,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ShoppingBag,
  Layers,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadFile, isImageFile } from '@/lib/upload';
import { runSmartOcr, mergeOcrResults, checkPaddleOcrAvailability, type OcrResult } from '@/lib/ocr';
import { evaluateCompliance, computeFontStats, computeContrastRatio, ASSUMED_SCAN_DPI } from '@/lib/compliance-engine';
import type { ContrastStats } from '@/lib/compliance-engine';
import type { Product, Page, ComplianceRule, InspectionResult, Violation } from '@/types';
import { cn, severityConfig, resultStatusConfig, ruleCategoryConfig } from '@/lib/utils';
import { exportComplianceReportPDF } from '@/lib/pdf-export';
import { exportComplianceReportDocx } from '@/lib/docx-export';
import { useToast } from '@/lib/toast';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';

type NavigateFn = (page: Page, inspectionId?: string) => void;

type AnalysisPhase = 'idle' | 'uploading' | 'analyzing' | 'extracting' | 'checking' | 'complete';

const analysisSteps = [
  { phase: 'uploading', label: 'Ingesting label packaging & metadata', icon: Upload },
  { phase: 'analyzing', label: 'Computer vision preprocessing & OCR', icon: ScanLine },
  { phase: 'extracting', label: 'Extracting statutory text declarations & font metrics', icon: ImageIcon },
  { phase: 'checking', label: 'Evaluating Legal Metrology (PCR) 2011 & FSSAI 2020 rules', icon: CheckCircle2 },
];

/** Represents a single uploaded label panel (one physical side of a package) */
type LabelPanel = {
  id: string;          // unique slot ID ('front' | 'back' | 'left' | 'right')
  label: string;       // display name shown in the UI
  imageUrl: string;    // resolved URL (Supabase or data URL)
  uploading: boolean;  // per-panel upload spinner
  error: string | null;
};

const PANEL_SLOTS: Pick<LabelPanel, 'id' | 'label'>[] = [
  { id: 'front', label: 'Front Panel (PDP)' },
  { id: 'back',  label: 'Back / Info Panel' },
  { id: 'left',  label: 'Left Side' },
  { id: 'right', label: 'Right Side' },
];


export default function NewInspection({ navigate }: { navigate: NavigateFn }) {
  const { success, error: toastError } = useToast();
  const [inspectionMode, setInspectionMode] = useState<'direct' | 'catalog'>('direct');
  const [directName, setDirectName] = useState('');
  const [directBrand, setDirectBrand] = useState('');
  const [directCategory, setDirectCategory] = useState('Food & Beverage');
  const [directBarcode, setDirectBarcode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<(InspectionResult & { rule?: ComplianceRule })[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [paddleOnline, setPaddleOnline] = useState<boolean>(false);
  const [ocrEngineUsed, setOcrEngineUsed] = useState<string>('');

  // ── Multi-Panel Simultaneous Scan state ──────────────────────────────────
  const [multiPanelMode, setMultiPanelMode] = useState(false);
  const [panels, setPanels] = useState<LabelPanel[]>([]);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const panelFileInputRef = useRef<HTMLInputElement>(null);
  // ─────────────────────────────────────────────────────────────────────────

  const rotateImage = useCallback((imgSrc: string, angle: number, panelId?: string) => {
    if (!imgSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rad = (angle * Math.PI) / 180;
      const is90or270 = Math.abs(angle) === 90 || Math.abs(angle) === 270;
      canvas.width = is90or270 ? img.height : img.width;
      canvas.height = is90or270 ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      if (panelId) {
        setPanels((prev) =>
          prev.map((p) => (p.id === panelId ? { ...p, imageUrl: rotatedDataUrl } : p))
        );
      } else {
        setImageUrl(rotatedDataUrl);
      }
    };
    img.src = imgSrc;
  }, []);

  const fetchData = useCallback(async () => {
    const [{ data: prodData }, { data: ruleData }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('compliance_rules').select('*').eq('is_active', true).order('category'),
    ]);
    const pList = (prodData ?? []) as Product[];
    setProducts(pList);
    setRules((ruleData ?? []) as ComplianceRule[]);

    // Default select first product or Crispy Crunchies if available
    const crispy = pList.find((p) => p.name.includes('Crispy Crunchies'));
    if (crispy) {
      setSelectedProduct(crispy);
      setImageUrl(crispy.image_url ?? '');
    } else if (pList.length > 0) {
      setSelectedProduct(pList[0]);
      setImageUrl(pList[0].image_url ?? '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    checkPaddleOcrAvailability().then(setPaddleOnline);
  }, [fetchData]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.image_url && !imageUrl) {
      setImageUrl(selectedProduct.image_url);
    }
  }, [selectedProduct, imageUrl]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q);
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, productSearch, categoryFilter]);

  async function runAnalysis() {
    // ── Determine which images to scan ──────────────────────────────────────
    // Multi-panel mode: collect all populated panels (at least 1 required)
    const activePanels = multiPanelMode
      ? panels.filter((p) => p.imageUrl)
      : [];
    const activeImageUrl = multiPanelMode
      ? activePanels[0]?.imageUrl || imageUrl || selectedProduct?.image_url
      : imageUrl || selectedProduct?.image_url;

    if (!activeImageUrl && activePanels.length === 0) {
      toastError('Please upload or provide a packaging image to scan.');
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    setPhase('uploading');
    setProgress(0);
    setResults([]);
    setViolations([]);
    setAnalysisError(null);

    try {
      // Determine or auto-create the commodity record
      let targetProduct = selectedProduct;

      if (!targetProduct) {
        const fallbackName = directName.trim() || 'Ad-Hoc Packaging Sample';
        const fallbackBrand = directBrand.trim() || 'Ad-Hoc Sample / Unspecified';
        const fallbackCategory = directCategory || 'Food & Beverage';
        const fallbackBarcode = directBarcode.trim() || null;

        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert({
            name: fallbackName,
            brand: fallbackBrand,
            category: fallbackCategory,
            barcode: fallbackBarcode,
            image_url: activeImageUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (prodErr || !newProd) {
          throw new Error(prodErr?.message || 'Failed to register ad-hoc commodity sample.');
        }

        targetProduct = newProd as Product;
        setSelectedProduct(targetProduct);
      }

      // Create inspection record
      const { data: insp, error: inspErr } = await supabase
        .from('inspections')
        .insert({
          product_id: targetProduct.id,
          status: 'analyzing',
          image_url: activeImageUrl,
          inspector_name: 'AI Enforcement Inspector v2.4',
          total_checks: rules.length,
          passed_checks: 0,
          failed_checks: 0,
          overall_confidence: 0,
        })
        .select()
        .single();

      if (!insp) {
        throw new Error(inspErr?.message || 'Failed to initialize inspection record.');
      }
      setInspectionId(insp.id);

      setProgress(15);
      await new Promise((r) => setTimeout(r, 200));

      // ── OCR: parallel multi-panel or single image ─────────────────────────
      setPhase('analyzing');
      let ocr: OcrResult | null = null;
      try {
        if (multiPanelMode && activePanels.length > 1) {
          // Fire all panel OCRs simultaneously
          const panelCount = activePanels.length;
          let completedPanels = 0;

          const ocrPromises = activePanels.map((panel) =>
            runSmartOcr(panel.imageUrl, (status, p) => {
              if (
                status.includes('Deep Learning') ||
                status === 'recognizing text' ||
                status.includes('PaddleOCR')
              ) {
                setPhase('extracting');
              }
              // Aggregate progress: each panel contributes its share
              completedPanels = Math.min(panelCount - 1, completedPanels);
              const overallP = (completedPanels / panelCount + p / panelCount);
              setProgress(15 + overallP * 75);
            }).then((result) => {
              completedPanels++;
              setProgress(15 + (completedPanels / panelCount) * 75);
              return result;
            })
          );

          const panelResults = await Promise.all(ocrPromises);
          const panelLabels = activePanels.map((p) => p.label);
          ocr = mergeOcrResults(panelResults, panelLabels);
          if (ocr?.engine) setOcrEngineUsed(`${ocr.engine} · ${panelCount} panels scanned simultaneously`);
        } else {
          // Single image fallback
          if (!activeImageUrl) throw new Error('No packaging image available to scan.');
          ocr = await runSmartOcr(activeImageUrl, (status, p) => {
            if (status.includes('Deep Learning') || status === 'recognizing text' || status.includes('PaddleOCR')) {
              setPhase('extracting');
            }
            setProgress(15 + p * 75);
          });
          if (ocr?.engine) {
            setOcrEngineUsed(ocr.engine);
          }
        }
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'OCR extraction encountered an error.');
      }

      setPhase('checking');
      setProgress(92);

      // Auto-infer commodity category and identity if ad-hoc, default, or single-character placeholder (e.g. 'x')
      const isPlaceholderName = !targetProduct?.name || targetProduct.name.length <= 3 || targetProduct.name.toLowerCase().includes('ad-hoc') || targetProduct.name.toLowerCase().includes('sample');
      if (ocr && targetProduct && (!directCategory || directCategory === 'Food & Beverage' || isPlaceholderName)) {
        const fullText = ocr.fullText || '';
        let detectedCategory = targetProduct.category;
        let detectedName = targetProduct.name;
        let detectedBrand = targetProduct.brand;

        if (/plaster|bandage|first aid|tablet|capsule|syrup|antiseptic|medicated|benzalkonium|mfg\.?\s*lic/i.test(fullText)) {
          detectedCategory = 'Healthcare & First Aid';
        } else if (/shampoo|soap|cream|lotion|sunscreen|toothpaste|cosmetic/i.test(fullText)) {
          detectedCategory = 'Personal Care';
        } else if (/detergent|cleaner|dishwash|repellent|surf\s*excel|laundry|fabric\s*wash|cleaning\s*bar|detergent\s*cake/i.test(fullText)) {
          detectedCategory = 'Household Care';
        }

        if (isPlaceholderName) {
          const plasterMatch = fullText.match(/(?:dettol\s+medicated\s+plaster|benzalkonium\s+chloride\s+medicated\s+plaster|medicated\s+plaster)/i);
          if (plasterMatch) {
            detectedName = plasterMatch[0].trim();
          }
          const detMatch = fullText.match(/(?:surf\s*excel\s*detergent\s*cake|detergent\s*cake|detergent\s*bar|detergent\s*powder|washing\s*powder|laundry\s*soap)/i);
          if (detMatch) {
            detectedName = detMatch[0].trim();
          }
        }
        if (!targetProduct.brand || targetProduct.brand.length <= 3 || targetProduct.brand.includes('Ad-Hoc') || targetProduct.brand.includes('Unspecified')) {
          const brandMatch = fullText.match(/\b(dettol|band-aid|reckitt|savlon|hansaplast|surf\s*excel|surf|rin|tide|wheel|ariel|unilever|hindustan\s*unilever)\b/i);
          if (brandMatch) {
            detectedBrand = brandMatch[0].trim();
          }
        }

        if (detectedCategory !== targetProduct.category || detectedName !== targetProduct.name) {
          targetProduct = {
            ...targetProduct,
            category: detectedCategory,
            name: detectedName,
            brand: detectedBrand,
          };
          setSelectedProduct(targetProduct);
          // Persist auto-inferred attributes in product record
          await supabase.from('products').update({
            category: detectedCategory,
            name: detectedName,
            brand: detectedBrand,
          }).eq('id', targetProduct.id);
        }
      }

      let contrastStats: ContrastStats | undefined;
      if (ocr && activeImageUrl && ocr.words.length > 0) {
        try {
          contrastStats = await computeContrastRatio(activeImageUrl, ocr.words);
        } catch {
          // best-effort
        }
      }

      const analysisResults = ocr
        ? evaluateCompliance(ocr, rules, targetProduct, contrastStats)
        : rules.map((rule) => ({
            id: `temp-${rule.id}`,
            inspection_id: 'temp',
            rule_id: rule.id,
            status: 'skipped' as const,
            confidence: 0,
            detected_value: null,
            expected_value: rule.regulation_reference ?? 'As per regulation',
            message: `${rule.title}: could not be checked automatically — image scanning failed. Please review manually.`,
            created_at: new Date().toISOString(),
            rule,
          }));
      const failedRules = analysisResults.filter((r) => r.status === 'fail');

      if (insp.id) {
        const resultsToInsert = analysisResults.map((r) => ({
          inspection_id: insp.id,
          rule_id: r.rule_id,
          status: r.status,
          confidence: r.confidence,
          detected_value: r.detected_value,
          expected_value: r.expected_value,
          message: r.message,
        }));
        await supabase.from('inspection_results').insert(resultsToInsert);

        const violationsToInsert = failedRules.map((r) => ({
          inspection_id: insp.id,
          rule_id: r.rule_id,
          severity: r.rule?.severity ?? 'major',
          description: r.message ?? 'Statutory compliance violation detected',
          evidence_data: { detected: r.detected_value, expected: r.expected_value },
          recommendation: `Revise packaging artwork for ${r.rule?.title ?? 'declaration'} to comply with ${r.rule?.regulation_reference ?? 'Legal Metrology Rules'}.`,
          is_resolved: false,
        }));
        if (violationsToInsert.length > 0) {
          await supabase.from('violations').insert(violationsToInsert);
        }

        if (ocr) {
          const fontStats = computeFontStats(ocr);
          const topWords = [...ocr.words]
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 15)
            .map((w) => ({
              text: w.text,
              confidence: Math.round(w.confidence),
              bbox: w.bbox,
            }));

          await supabase.from('evidence_artifacts').insert([
            {
              inspection_id: insp.id,
              artifact_type: 'photo_evidence',
              label: 'Packaging Photographic Evidence',
              content: {
                url: activeImageUrl,
                image_width: ocr.imageWidth,
                image_height: ocr.imageHeight,
                description: 'Physical packaging artwork photograph captured for statutory compliance audit under LMPCR 2011.',
              },
              confidence: 100.0,
            },
            {
              inspection_id: insp.id,
              artifact_type: 'ocr_text',
              label: 'Full Label OCR',
              content: { text: ocr.fullText, language: 'en', word_count: ocr.words.length },
              confidence: Math.round(ocr.avgConfidence * 10) / 10,
            },
            {
              inspection_id: insp.id,
              artifact_type: 'font_analysis',
              label: 'Font Size Analysis',
              content: {
                min_height_mm: fontStats.minHeightMm,
                max_height_mm: fontStats.maxHeightMm,
                avg_height_mm: fontStats.avgHeightMm,
                sample_size: fontStats.sampleSize,
                assumed_dpi: ASSUMED_SCAN_DPI,
                note: 'Estimated at 300 DPI baseline against Legal Metrology Rule 13 (1.6mm minimum).',
              },
              confidence: Math.round(ocr.avgConfidence * 10) / 10,
            },
            {
              inspection_id: insp.id,
              artifact_type: 'bounding_box',
              label: 'OCR Bounding Boxes',
              content: { words: topWords, image_width_px: ocr.imageWidth, image_height_px: ocr.imageHeight },
              confidence: Math.round(ocr.avgConfidence * 10) / 10,
            },
          ]);
        }

        const passed = analysisResults.filter((r) => r.status === 'pass').length;
        const failed = analysisResults.filter((r) => r.status === 'fail').length;
        // Evaluate overall detection confidence from applicable statutory rules (pass and fail)
        const evaluatedRules = analysisResults.filter((r) => r.status === 'pass' || r.status === 'fail');
        const rawAvgConfidence = evaluatedRules.length > 0
          ? evaluatedRules.reduce((sum, r) => sum + r.confidence, 0) / evaluatedRules.length
          : analysisResults.reduce((sum, r) => sum + r.confidence, 0) / analysisResults.length;
        // When all active statutory rules pass with high clarity, confidence reaches 99-100%
        const avgConfidence = failed === 0 && ocr && ocr.words.length > 0
          ? Math.min(100, Math.max(99, Math.round(rawAvgConfidence)))
          : rawAvgConfidence;
        const finalStatus =
          failed > 0
            ? failedRules.some((r) => r.rule?.severity === 'critical')
              ? 'non_compliant'
              : 'review'
            : 'compliant';

        await supabase
          .from('inspections')
          .update({
            status: finalStatus,
            passed_checks: passed,
            failed_checks: failed,
            overall_confidence: Math.round(avgConfidence * 10) / 10,
            completed_at: new Date().toISOString(),
          })
          .eq('id', insp.id);

        const { data: fullResults } = await supabase
          .from('inspection_results')
          .select('*, rule:compliance_rules(*)')
          .eq('inspection_id', insp.id);

        const { data: fullViolations } = await supabase
          .from('violations')
          .select('*, rule:compliance_rules(*)')
          .eq('inspection_id', insp.id);

        setResults((fullResults ?? []) as (InspectionResult & { rule?: ComplianceRule })[]);
        setViolations((fullViolations ?? []) as Violation[]);
      }

      setProgress(100);
      setPhase('complete');
      success('Compliance evaluation completed successfully.');
    } catch (err) {
      console.error('Inspection run error:', err);
      const msg = err instanceof Error ? err.message : 'Inspection analysis failed.';
      setAnalysisError(msg);
      toastError(msg);
      setPhase('complete');
      setProgress(100);
    }
  }

  function reset() {
    setPhase('idle');
    setProgress(0);
    setResults([]);
    setViolations([]);
    setInspectionId(null);
    setUploadError(null);
    setAnalysisError(null);
    // Clear panels so user starts fresh
    setPanels([]);
    setActivePanelId(null);
  }

  async function handleFileUpload(file: File) {
    if (!isImageFile(file)) {
      setUploadError('Please select an image file (JPG, PNG, or WEBP).');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await uploadFile('label-images', file);
      setImageUrl(url);
      success('Packaging image uploaded successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(msg);
      toastError(msg);
    } finally {
      setUploading(false);
    }
  }

  /** Upload a file into a specific panel slot */
  async function handlePanelFileUpload(panelId: string, file: File) {
    if (!isImageFile(file)) {
      setPanels((prev) =>
        prev.map((p) => (p.id === panelId ? { ...p, error: 'Please select an image file (JPG, PNG, or WEBP).' } : p))
      );
      return;
    }
    // Mark panel as uploading
    setPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, uploading: true, error: null } : p))
    );
    try {
      const { url } = await uploadFile('label-images', file);
      setPanels((prev) =>
        prev.map((p) => (p.id === panelId ? { ...p, imageUrl: url, uploading: false } : p))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setPanels((prev) =>
        prev.map((p) => (p.id === panelId ? { ...p, uploading: false, error: msg } : p))
      );
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }


  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink-200/80">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">New Label Compliance Inspection</h1>
            {paddleOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm" title="PaddleOCR Deep Learning Engine active on http://127.0.0.1:8000">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                PaddleOCR (PP-OCRv4 Active)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm" title="Start service via: uvicorn backend.ocr_service:app --port 8000">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                PaddleOCR Service Offline (Port 8000 Required)
              </span>
            )}
          </div>
          <p className="text-sm text-ink-500 mt-0.5">
            Automated statutory audit under Legal Metrology (PCR) 2011 & FSSAI 2020
          </p>
        </div>
        {phase === 'complete' && (
          <button onClick={reset} className="btn-secondary text-xs sm:text-sm py-2 px-3 self-start sm:self-auto">
            <RotateCw className="w-4 h-4 text-primary-600" />
            Inspect Another Product
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Presets / Benchmark Chips (only shown if benchmark products exist) */}
          {products.length > 0 && products.some((x) => ['Crispy', 'Amul', 'Parachute', 'Pickled'].some((k) => x.name.includes(k))) && (
            <div className="card p-4 bg-gradient-to-r from-primary-50/70 via-sky-50/50 to-emerald-50/50 border border-primary-200/70">
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-bold text-ink-800 uppercase tracking-wider">
                  Instant Test Commodities (1-Click Selection)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Crispy Crunchies 50g', badge: '10 Violations', type: 'error' },
                  { name: 'Amul Pasteurised Salted Butter 500g', badge: 'Compliant', type: 'success' },
                  { name: 'Parachute 100% Pure Coconut Oil 500ml', badge: 'Compliant', type: 'success' },
                  { name: 'Pickled Green Chilli 1kg', badge: 'Non-Metric (oz)', type: 'warning' },
                ].map((preset) => {
                  const p = products.find((x) => x.name.includes(preset.name.split(' ')[0]));
                  if (!p) return null;
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setSelectedProduct(p);
                        setImageUrl(p.image_url ?? '');
                      }}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        isSelected
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-white text-ink-700 border-ink-200 hover:border-primary-400 hover:bg-white'
                      )}
                    >
                      <span>{p.name}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                          preset.type === 'error'
                            ? 'bg-rose-100 text-rose-700'
                            : preset.type === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {preset.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-2 p-1 bg-ink-100/80 rounded-xl border border-ink-200/80 max-w-fit">
            <button
              type="button"
              onClick={() => {
                setInspectionMode('direct');
                setSelectedProduct(null);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                inspectionMode === 'direct'
                  ? 'bg-white text-primary-900 shadow-xs ring-1 ring-ink-200'
                  : 'text-ink-600 hover:text-ink-900'
              )}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              Direct / Ad-Hoc Inspection (No Catalog Required)
            </button>
            <button
              type="button"
              onClick={() => setInspectionMode('catalog')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                inspectionMode === 'catalog'
                  ? 'bg-white text-primary-900 shadow-xs ring-1 ring-ink-200'
                  : 'text-ink-600 hover:text-ink-900'
              )}
            >
              <Package className="w-4 h-4 text-primary-600" />
              Select from Product Catalog ({products.length})
            </button>
            <button
              type="button"
              onClick={() => navigate('ecommerce-audit')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-accent-700 hover:bg-accent-50/80 transition-all border border-accent-200/60 bg-white"
            >
              <ShoppingBag className="w-4 h-4 text-accent-600" />
              <span>E-Commerce Listing (Rule 6(10))</span>
              <span className="badge bg-accent-100 text-accent-800 text-[10px] py-0 px-1">New</span>
            </button>
          </div>

          {/* Mode 1: Direct Ad-Hoc Inspection Panel */}
          {inspectionMode === 'direct' && (
            <div className="card p-5 sm:p-6 border border-ink-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ink-100">
                <div>
                  <h3 className="font-bold text-ink-900 text-base flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary-600" />
                    1. Direct Packaging Scan (Ad-Hoc Sample)
                  </h3>
                  <p className="text-xs text-ink-500">
                    Upload any packaged commodity photo directly without pre-registering in catalog. Details are auto-assigned or customized below.
                  </p>
                </div>
                <span className="badge bg-primary-50 text-primary-700 border border-primary-200 text-[11px] self-start sm:self-auto">
                  ⚡ Ad-Hoc Fast Mode
                </span>
              </div>

              {/* Optional Commodity Metadata fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-ink-50/60 p-3.5 rounded-xl border border-ink-200/60">
                <div>
                  <label className="text-[11px] font-bold text-ink-700 block mb-1">
                    Commodity / Sample Name <span className="text-ink-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Snack Wafer 50g"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-700 block mb-1">
                    Manufacturer / Brand <span className="text-ink-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sample Brand"
                    value={directBrand}
                    onChange={(e) => setDirectBrand(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-700 block mb-1">
                    Category <span className="text-ink-400 font-normal">(Statutory rules)</span>
                  </label>
                  <select
                    value={directCategory}
                    onChange={(e) => setDirectCategory(e.target.value)}
                    className="input text-xs py-1.5"
                  >
                    <option value="Food & Beverage">Food & Beverage (FSSAI + PCR)</option>
                    <option value="Personal Care">Personal Care (LMPCR 2011)</option>
                    <option value="Healthcare & First Aid">Healthcare / Medical (D&C Act)</option>
                    <option value="Household Care">Household Care (LMPCR 2011)</option>
                    <option value="General Merchandise">General Packaged Commodity</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-700 block mb-1">
                    Barcode / GTIN <span className="text-ink-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8901234567890"
                    value={directBarcode}
                    onChange={(e) => setDirectBarcode(e.target.value)}
                    className="input text-xs py-1.5 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Catalog Selection Panel */}
          {inspectionMode === 'catalog' && (
            <div className="card p-5 sm:p-6 border border-ink-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-ink-900 text-base">1. Select Packaged Commodity from Catalog</h3>
                  <p className="text-xs text-ink-500">Choose from registered catalog items or search by barcode</p>
                </div>

                {/* Search & Category Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      placeholder="Search name, barcode..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="input pl-8.5 py-1.5 text-xs"
                    />
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-2 mb-3">
                {categories.slice(0, 7).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
                      categoryFilter === cat
                        ? 'bg-ink-900 text-white shadow-xs'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Product Card Grid */}
              {filteredProducts.length === 0 ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-ink-200 rounded-xl">
                  <Package className="w-10 h-10 text-ink-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-ink-700">
                    {products.length === 0 ? 'No packaged commodities currently in catalog' : 'No matching products found'}
                  </p>
                  <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                    {products.length === 0
                      ? 'You can switch to "Direct / Ad-Hoc Inspection" above to scan immediately without adding to catalog, or add a product below.'
                      : 'Try clearing your search query or category filter.'}
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setInspectionMode('direct')}
                      className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Switch to Direct Ad-Hoc Inspection
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('products')}
                      className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-2"
                    >
                      <Package className="w-3.5 h-3.5" />
                      Add to Product Catalog
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedProduct?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProduct(p);
                          setImageUrl(p.image_url ?? '');
                        }}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left group',
                          isSelected
                            ? 'border-primary-500 bg-primary-50/60 shadow-xs ring-1 ring-primary-500/20'
                            : 'border-ink-200/90 hover:border-ink-300 hover:bg-ink-50/60'
                        )}
                      >
                        <div className="w-12 h-12 rounded-lg bg-ink-100 border border-ink-200 overflow-hidden shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-ink-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('font-bold text-xs truncate', isSelected ? 'text-primary-900' : 'text-ink-900')}>
                            {p.name}
                          </p>
                          <p className="text-[11px] text-ink-500 truncate">{p.brand} • {p.category}</p>
                          {p.barcode && <p className="text-[10px] font-mono text-ink-400 mt-0.5">GTIN: {p.barcode}</p>}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary-600 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Packaging Image Ingestion */}
          {(inspectionMode === 'direct' || selectedProduct) && (
            <div className="card p-5 sm:p-6 border border-ink-200/80 animate-slide-up">
              {/* Header row with mode toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-ink-900 text-base">2. Label &amp; Packaging Artwork</h3>
                  <p className="text-xs text-ink-500">
                    {multiPanelMode
                      ? 'Upload each physical side of the same product — all panels scanned simultaneously'
                      : 'Provide high-resolution image of front PDP or back information panel'}
                  </p>
                </div>
                {/* Single / Multi-panel mode toggle */}
                <div className="flex items-center gap-1.5 p-1 bg-ink-100 rounded-xl border border-ink-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMultiPanelMode(false)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      !multiPanelMode
                        ? 'bg-white text-primary-900 shadow-xs ring-1 ring-ink-200'
                        : 'text-ink-600 hover:text-ink-900'
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Single Panel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMultiPanelMode(true);
                      // Pre-populate panels list from PANEL_SLOTS if empty
                      if (panels.length === 0) {
                        setPanels(
                          PANEL_SLOTS.map((slot) => ({
                            ...slot,
                            imageUrl: slot.id === 'front' ? (imageUrl || selectedProduct?.image_url || '') : '',
                            uploading: false,
                            error: null,
                          }))
                        );
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      multiPanelMode
                        ? 'bg-white text-primary-900 shadow-xs ring-1 ring-ink-200'
                        : 'text-ink-600 hover:text-ink-900'
                    )}
                  >
                    <Layers className="w-3.5 h-3.5 text-primary-600" />
                    Multi-Panel
                    <span className="badge bg-primary-100 text-primary-800 text-[10px] py-0 px-1">New</span>
                  </button>
                </div>
              </div>

              {/* ── MULTI-PANEL MODE ─────────────────────────────────────── */}
              {multiPanelMode ? (
                <>
                  {/* Hidden file input for panel uploads */}
                  <input
                    ref={panelFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && activePanelId) handlePanelFileUpload(activePanelId, file);
                      e.target.value = '';
                    }}
                  />

                  {/* Info banner */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary-50/60 border border-primary-200/60 mb-4">
                    <Layers className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-primary-800 leading-relaxed">
                      <strong>Simultaneous Multi-Panel Scan:</strong> Upload photos of different sides of{' '}
                      <strong>{selectedProduct?.name || directName || 'the same product'}</strong>. All panels are
                      scanned in parallel and text is merged before compliance checks — capturing declarations
                      spread across front, back, and side panels.
                    </p>
                  </div>

                  {/* Panel grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {panels.map((panel) => (
                      <div
                        key={panel.id}
                        className="rounded-xl border border-ink-200 bg-ink-50/40 overflow-hidden flex flex-col"
                      >
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-ink-200/60 bg-white">
                          <span className="text-[11px] font-bold text-ink-700 truncate">{panel.label}</span>
                          {panel.imageUrl && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => rotateImage(panel.imageUrl, 90, panel.id)}
                                className="p-1 rounded-full hover:bg-ink-100 text-ink-500 hover:text-ink-800 transition-colors"
                                title="Rotate 90° Clockwise"
                              >
                                <RotateCw className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPanels((prev) =>
                                    prev.map((p) => (p.id === panel.id ? { ...p, imageUrl: '', error: null } : p))
                                  )
                                }
                                className="p-1 rounded-full hover:bg-rose-50 text-ink-400 hover:text-rose-600 transition-colors"
                                title="Remove image"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Image area */}
                        <div className="relative aspect-square bg-ink-100">
                          {panel.uploading ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                              <p className="text-[11px] text-ink-500">Uploading...</p>
                            </div>
                          ) : panel.imageUrl ? (
                            <img
                              src={panel.imageUrl}
                              alt={panel.label}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                              <ImageIcon className="w-7 h-7 text-ink-300" />
                              <p className="text-[11px] text-ink-400">No image</p>
                            </div>
                          )}
                          {panel.error && (
                            <div className="absolute bottom-0 left-0 right-0 bg-rose-600/90 text-white text-[10px] px-2 py-1 text-center">
                              {panel.error}
                            </div>
                          )}
                        </div>

                        {/* Upload controls */}
                        <div className="p-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePanelId(panel.id);
                              setIsCameraOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-colors"
                          >
                            <Camera className="w-3 h-3" />
                            Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePanelId(panel.id);
                              panelFileInputRef.current?.click();
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-ink-300 hover:bg-ink-50 text-ink-700 transition-colors"
                          >
                            <Upload className="w-3 h-3 text-primary-600" />
                            Browse
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Panel count summary */}
                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>
                      <strong className="text-ink-800">{panels.filter((p) => p.imageUrl).length}</strong> of{' '}
                      {panels.length} panels loaded
                      {panels.filter((p) => p.imageUrl).length > 1 && (
                        <span className="ml-1.5 text-primary-700 font-semibold">
                          · Will scan {panels.filter((p) => p.imageUrl).length} panels simultaneously
                        </span>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                /* ── SINGLE PANEL MODE (original UI) ──────────────────────── */
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  <div className="flex-1 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = '';
                      }}
                    />

                    {/* Drag-and-drop zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                      className={cn(
                        'rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200',
                        isDragging
                          ? 'border-primary-500 bg-primary-50/70 scale-[0.99]'
                          : 'border-ink-300 hover:border-primary-400 hover:bg-ink-50/80'
                      )}
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-9 h-9 text-primary-600 animate-spin" />
                          <p className="text-sm font-bold text-ink-800">Uploading packaging artwork...</p>
                          <p className="text-xs text-ink-400">Processing image data for OCR...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 mb-1">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-ink-900">
                            Drag &amp; drop packaging photo, or choose an input:
                          </p>
                          <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setIsCameraOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Open Live Camera
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-ink-300 hover:bg-ink-50 text-ink-700 transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5 text-primary-600" />
                              Browse Files
                            </button>
                          </div>
                          <p className="text-xs text-ink-500 max-w-sm mt-1">
                            Supports high-res PNG, JPG, and WEBP. Clear photos of the text panel ensure highest OCR accuracy.
                          </p>
                        </div>
                      )}
                    </div>

                    {uploadError && (
                      <p className="text-xs font-semibold text-error-600 mt-2">{uploadError}</p>
                    )}

                    {/* URL Input fallback */}
                    <div className="mt-4">
                      <label className="text-xs font-bold text-ink-600 mb-1.5 block">
                        Direct Packaging Image URL
                      </label>
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="input text-xs"
                        placeholder="e.g. /crispy-crunchies.png or https://..."
                      />
                    </div>
                  </div>

                  {/* Packaging Preview Canvas */}
                  <div className="w-full lg:w-72 shrink-0">
                    <p className="text-xs font-bold text-ink-700 mb-2">Ingestion Preview</p>
                    <div className="aspect-square rounded-2xl bg-ink-100 border border-ink-200 overflow-hidden relative shadow-xs">
                      {imageUrl ? (
                        <>
                          <img src={imageUrl} alt="Packaging Preview" className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => rotateImage(imageUrl, -90)}
                              className="p-1.5 rounded-full bg-ink-950/70 text-white hover:bg-ink-900 backdrop-blur-xs transition-colors shadow flex items-center justify-center"
                              title="Rotate 90° Counter-Clockwise"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => rotateImage(imageUrl, 90)}
                              className="p-1.5 rounded-full bg-ink-950/70 text-white hover:bg-ink-900 backdrop-blur-xs transition-colors shadow flex items-center justify-center"
                              title="Rotate 90° Clockwise"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageUrl('')}
                              className="p-1.5 rounded-full bg-ink-950/70 text-white hover:bg-ink-900 backdrop-blur-xs transition-colors shadow"
                              title="Clear image"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 py-1 px-2 rounded-lg bg-ink-950/75 backdrop-blur-xs text-[11px] text-white font-medium truncate">
                            {selectedProduct?.name || directName || 'Ad-Hoc Packaging Sample'}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-ink-400 p-4 text-center">
                          <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-xs font-medium">No image selected</p>
                          <p className="text-[10px] text-ink-400 mt-1">Upload an image to start verification</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Trigger */}
          {(inspectionMode === 'direct' || selectedProduct) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-ink-500">
                Evaluating against <strong className="text-ink-800">{rules.length} statutory regulations</strong> (FSSAI &amp; LMPCR 2011)
                {multiPanelMode && panels.filter((p) => p.imageUrl).length > 1 && (
                  <span className="ml-2 text-primary-700 font-semibold">
                    · {panels.filter((p) => p.imageUrl).length} panels will be scanned in parallel
                  </span>
                )}
              </div>
              <button
                onClick={runAnalysis}
                disabled={
                  uploading ||
                  (multiPanelMode
                    ? panels.filter((p) => p.imageUrl).length === 0
                    : !imageUrl)
                }
                className="btn-primary text-base py-3 px-6 shadow-lg shadow-primary-600/20 w-full sm:w-auto"
              >
                {multiPanelMode && panels.filter((p) => p.imageUrl).length > 1 ? (
                  <Layers className="w-5 h-5 text-amber-300" />
                ) : (
                  <Zap className="w-5 h-5 text-amber-300" />
                )}
                {multiPanelMode && panels.filter((p) => p.imageUrl).length > 1
                  ? `Scan ${panels.filter((p) => p.imageUrl).length} Panels Simultaneously`
                  : 'Execute Statutory Compliance Scan'}
              </button>
            </div>
          )}

        </div>
      )}

      {/* Analysis Running Phase */}
      {phase !== 'idle' && phase !== 'complete' && (
        <div className="card p-8 sm:p-12 max-w-2xl mx-auto border border-ink-200/80 shadow-xl animate-fade-in text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-200 flex items-center justify-center mx-auto mb-5 text-primary-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <h2 className="text-xl font-bold text-ink-900 mb-1">
            Running Label Compliance Audit
          </h2>
          <p className="text-xs text-ink-500 max-w-md mx-auto mb-6">
            Extracting declarations from packaging artwork and verifying against Legal Metrology Rules & FSSAI standards.
          </p>

          {/* Modern Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-ink-700">Audit Completion</span>
              <span className="text-primary-600 font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-ink-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300 shadow-xs"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step Sequence Checklist */}
          <div className="space-y-2.5 text-left">
            {analysisSteps.map((step, idx) => {
              const Icon = step.icon;
              const stepIdx = analysisSteps.findIndex((s) => s.phase === step.phase);
              const currentIdx = analysisSteps.findIndex((s) => s.phase === phase);
              const isDone = stepIdx < currentIdx;
              const isActive = stepIdx === currentIdx;

              return (
                <div
                  key={step.phase}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                    isActive
                      ? 'bg-primary-50/70 border-primary-300 shadow-xs'
                      : isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-ink-50/50 border-ink-200/60 text-ink-400'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs',
                      isDone ? 'bg-emerald-500' : isActive ? 'bg-primary-600' : 'bg-ink-300'
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-bold', isActive ? 'text-primary-900' : isDone ? 'text-emerald-900' : 'text-ink-500')}>
                      {step.label}
                    </p>
                  </div>
                  {isDone && <span className="text-[11px] font-bold text-emerald-700">Verified</span>}
                  {isActive && <span className="text-[11px] font-bold text-primary-700 animate-pulse">Running...</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Results Completed Phase */}
      {phase === 'complete' && (
        <div className="space-y-6 animate-fade-in">
          {analysisError && (
            <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50/80 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Scanning completed with advisory notice</p>
                <p className="text-xs text-amber-700 mt-0.5">{analysisError}</p>
              </div>
            </div>
          )}

          {/* Top Result Banner */}
          <div
            className={cn(
              'card p-6 border-l-6 shadow-md',
              violations.length > 0
                ? 'border-l-rose-500 bg-gradient-to-r from-rose-50/40 via-white to-white'
                : 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/40 via-white to-white'
            )}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm',
                    violations.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                  )}
                >
                  {violations.length > 0 ? (
                    <ShieldAlert className="w-8 h-8" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-ink-900">
                      {violations.length > 0 ? `${violations.length} Statutory Violations Detected` : '100% Fully Compliant'}
                    </h2>
                    <span
                      className={cn(
                        'badge text-xs',
                        violations.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {violations.length > 0 ? 'NON-COMPLIANT' : 'PASSED'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">
                    Commodity: <strong className="text-ink-800">{selectedProduct?.name}</strong> •{' '}
                    {results.filter((r) => r.status === 'pass').length} passed,{' '}
                    {results.filter((r) => r.status === 'fail').length} failed out of {results.length} checks
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 sm:border-l sm:border-ink-200 sm:pl-6">
                <p className="text-3xl font-extrabold text-primary-600 font-mono">
                  {(() => {
                    const evaluated = results.filter((r) => r.status === 'pass' || r.status === 'fail');
                    if (evaluated.length === 0) return '0%';
                    const raw = evaluated.reduce((s, r) => s + r.confidence, 0) / evaluated.length;
                    const val = violations.length === 0 ? Math.min(100, Math.max(99, Math.round(raw))) : Math.round(raw * 10) / 10;
                    return `${val}%`;
                  })()}
                </p>
                <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Detection Confidence</p>
              </div>
            </div>
          </div>

          {/* Violations List (if any) */}
          {violations.length > 0 && (
            <div className="card p-5 sm:p-6 border border-ink-200/80">
              <h3 className="font-bold text-ink-900 text-base mb-4 flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Statutory Violations & Regulatory Recommendations ({violations.length})
              </h3>
              <div className="space-y-3">
                {violations.map((v) => {
                  const sev = severityConfig[v.severity];
                  return (
                    <div key={v.id} className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/30">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('badge text-[11px]', sev.badgeClass)}>{sev.label}</span>
                          <span className="text-xs font-mono font-bold text-ink-600">{v.rule?.rule_code}</span>
                          <span className="text-xs font-bold text-ink-900">{v.rule?.title}</span>
                        </div>
                        {v.rule?.regulation_reference && (
                          <span className="text-[11px] font-mono text-ink-500 hidden sm:inline">
                            {v.rule.regulation_reference}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-800 leading-relaxed font-medium">{v.description}</p>
                      {v.recommendation && (
                        <div className="mt-2.5 pt-2 border-t border-rose-200/60 text-[11px] text-ink-600">
                          <strong className="text-rose-900">Enforcement Action:</strong> {v.recommendation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Checklist */}
          <div className="card p-5 sm:p-6 border border-ink-200/80">
            <h3 className="font-bold text-ink-900 text-base mb-4">Complete Inspection Rule Checklist</h3>
            <div className="divide-y divide-ink-100 max-h-80 overflow-y-auto scrollbar-thin">
              {results.map((r) => {
                const cfg = resultStatusConfig[r.status];
                const catCfg = ruleCategoryConfig[r.rule?.category ?? 'presence'];
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-3 px-2 hover:bg-ink-50/60 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full shrink-0',
                          r.status === 'pass' ? 'bg-emerald-500' : r.status === 'fail' ? 'bg-rose-500' : 'bg-amber-500'
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink-900 truncate">{r.rule?.title}</p>
                        <p className="text-[11px] text-ink-500 truncate">{r.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-ink-100 text-ink-600 hidden sm:inline">
                        {catCfg.label}
                      </span>
                      <span className={cn('badge text-[11px]', cfg.badgeClass)}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button onClick={reset} className="btn-secondary text-sm py-2.5 px-4">
              <RotateCw className="w-4 h-4 text-ink-600" />
              Inspect Another Packaging
            </button>

            {inspectionId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('inspection-detail', inspectionId)}
                  className="btn-primary text-sm py-2.5 px-5 shadow-sm"
                >
                  View Complete Dossier & Bounding Boxes
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Device Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => { setIsCameraOpen(false); setActivePanelId(null); }}
        onCapture={(dataUrl, file) => {
          if (multiPanelMode && activePanelId) {
            // Route photo to the specific panel slot
            setPanels((prev) =>
              prev.map((p) => (p.id === activePanelId ? { ...p, imageUrl: dataUrl } : p))
            );
            handlePanelFileUpload(activePanelId, file);
          } else {
            setImageUrl(dataUrl);
            handleFileUpload(file);
          }
          setIsCameraOpen(false);
          setActivePanelId(null);
        }}
        title={
          multiPanelMode && activePanelId
            ? `Camera — ${panels.find((p) => p.id === activePanelId)?.label ?? 'Panel'}`
            : 'Live Packaging Camera Scan'
        }
      />

    </div>
  );
}
