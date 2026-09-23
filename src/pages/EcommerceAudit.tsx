import { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  RotateCw,
  Search,
  Upload,
  Loader2,
  Tag,
  Scale,
  MapPin,
  Calendar,
  PhoneCall,
  Store,
  Camera,
  ScanLine,
  Workflow,
  ShieldCheck,
  UserCheck,
  Cpu,
  ArrowDown,
  ChevronRight,
  FileText,
  Layers,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  evaluateEcommerceListing,
  BENCHMARK_LISTINGS,
  PLATFORM_CONFIG,
  type EcommerceListingData,
  type EcommercePlatform,
} from '@/lib/ecommerce-engine';
import type { Page, ComplianceRule, InspectionResult, Violation } from '@/types';
import { cn, severityConfig, resultStatusConfig } from '@/lib/utils';
import { exportEcommerceStatutoryNoticePDF } from '@/lib/pdf-export';
import { runSmartOcr, type OcrResult } from '@/lib/ocr';
import { uploadFile, isImageFile } from '@/lib/upload';
import { useToast } from '@/lib/toast';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { EcommercePipelineVisualizer } from '@/components/EcommercePipelineVisualizer';
import { SellerRemediationHub } from '@/components/SellerRemediationHub';

type NavigateFn = (page: Page, inspectionId?: string) => void;

export default function EcommerceAudit({ navigate }: { navigate: NavigateFn }) {
  const { success, error: toastError } = useToast();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<EcommercePlatform>('amazon');
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Food & Beverage');
  const [mrp, setMrp] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unitSalePrice, setUnitSalePrice] = useState('');
  const [hasInclusiveOfTaxes, setHasInclusiveOfTaxes] = useState(false);
  const [netQuantity, setNetQuantity] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [manufacturerAddress, setManufacturerAddress] = useState('');
  const [packerDetails, setPackerDetails] = useState('');
  const [importerDetails, setImporterDetails] = useState('');
  const [expiryOrBestBefore, setExpiryOrBestBefore] = useState('');
  const [consumerCarePhone, setConsumerCarePhone] = useState('');
  const [consumerCareEmail, setConsumerCareEmail] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [rawPdpText, setRawPdpText] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // OCR state for gallery image
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Results state
  const [audited, setAudited] = useState(false);
  const [results, setResults] = useState<(InspectionResult & { rule?: ComplianceRule })[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [score, setScore] = useState(0);
  const [createdInspectionId, setCreatedInspectionId] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [activeView, setActiveView] = useState<'audit' | 'pipeline' | 'seller'>('audit');

  useEffect(() => {
    async function loadRules() {
      const { data } = await supabase.from('compliance_rules').select('*').eq('is_active', true);
      setRules((data ?? []) as ComplianceRule[]);
      setLoading(false);
    }
    loadRules();
  }, []);

  function loadBenchmark(preset: typeof BENCHMARK_LISTINGS[0]) {
    setUrl(preset.url);
    setPlatform(preset.platform);
    setTitle(preset.title);
    setBrand(preset.brand);
    setCategory(preset.category);
    setMrp(preset.mrp);
    setSellingPrice(preset.sellingPrice);
    setUnitSalePrice(preset.unitSalePrice);
    setHasInclusiveOfTaxes(preset.hasInclusiveOfTaxes);
    setNetQuantity(preset.netQuantity);
    setCountryOfOrigin(preset.countryOfOrigin);
    setManufacturerName(preset.manufacturerName);
    setManufacturerAddress(preset.manufacturerAddress);
    setPackerDetails(preset.packerDetails);
    setImporterDetails(preset.importerDetails);
    setExpiryOrBestBefore(preset.expiryOrBestBefore);
    setConsumerCarePhone(preset.consumerCarePhone);
    setConsumerCareEmail(preset.consumerCareEmail);
    setSellerName(preset.sellerName);
    setRawPdpText(preset.rawPdpText);
    setImageUrl(preset.imageUrl ?? '');
    setAudited(false);
    setResults([]);
    setViolations([]);
    setOcrResult(null);
    success(`Loaded preset: "${preset.label}"`);
    if (preset.imageUrl) {
      handleScanImageUrl(preset.imageUrl);
    }
  }

  async function handleImageUpload(file: File) {
    if (!isImageFile(file)) {
      toastError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    try {
      setOcrScanning(true);
      const { url: uploadedUrl } = await uploadFile('label-images', file);
      setImageUrl(uploadedUrl);
      const ocr = await runSmartOcr(uploadedUrl);
      setOcrResult(ocr);
      success('Packaging image uploaded & OCR scanned.');
    } catch {
      toastError('Failed to process packaging photo.');
    } finally {
      setOcrScanning(false);
    }
  }

  async function handleScanImageUrl(targetUrl?: string) {
    const imgUrl = (targetUrl || imageUrl).trim();
    if (!imgUrl) {
      toastError('Please enter a valid packaging image URL first.');
      return;
    }
    try {
      setOcrScanning(true);
      const ocr = await runSmartOcr(imgUrl);
      setOcrResult(ocr);
      success(`Scanned image via ${ocr.engine || 'OCR'}: ${ocr.words?.length || 0} words detected.`);
    } catch (err) {
      console.error('URL OCR scan error:', err);
      toastError('Failed to read text from the image link. Ensure URL is direct and accessible.');
    } finally {
      setOcrScanning(false);
    }
  }

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    const trimmed = newUrl.toLowerCase().trim();
    if (trimmed.includes('amazon.')) setPlatform('amazon');
    else if (trimmed.includes('flipkart.')) setPlatform('flipkart');
    else if (trimmed.includes('blinkit.')) setPlatform('blinkit');
    else if (trimmed.includes('zepto.')) setPlatform('zepto');
    else if (trimmed.includes('jiomart.')) setPlatform('jiomart');
    else if (trimmed.includes('bigbasket.')) setPlatform('bigbasket');

    // Auto-derive title/sample info if URL has slug
    try {
      const u = new URL(newUrl);
      const segments = u.pathname.split('/').filter(Boolean);
      const slug = segments[0] === 'dp' ? segments[1] : segments.find((s) => s.length > 5 && !/^[A-Z0-9]{10}$/i.test(s));
      if (slug && !title) {
        const cleanTitle = decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (cleanTitle.length > 3) {
          setTitle(cleanTitle);
        }
      }
    } catch {
      // not a full url yet
    }
  }

  function handleAudit() {
    if (!title.trim()) {
      toastError('Product Title or Listing URL is required for statutory evaluation.');
      return;
    }

    const listing: EcommerceListingData = {
      url: url.trim() || 'https://ecommerce.in/pdp/sample-listing',
      platform,
      title: title.trim(),
      brand: brand.trim(),
      category: category.trim(),
      mrp: mrp.trim(),
      sellingPrice: sellingPrice.trim(),
      unitSalePrice: unitSalePrice.trim(),
      hasInclusiveOfTaxes,
      netQuantity: netQuantity.trim(),
      countryOfOrigin: countryOfOrigin.trim(),
      manufacturerName: manufacturerName.trim(),
      manufacturerAddress: manufacturerAddress.trim(),
      packerDetails: packerDetails.trim(),
      importerDetails: importerDetails.trim(),
      expiryOrBestBefore: expiryOrBestBefore.trim(),
      consumerCarePhone: consumerCarePhone.trim(),
      consumerCareEmail: consumerCareEmail.trim(),
      sellerName: sellerName.trim(),
      rawPdpText: rawPdpText.trim(),
      imageUrl: imageUrl.trim() || undefined,
    };

    const evaluation = evaluateEcommerceListing(listing, rules, ocrResult);
    setResults(evaluation.results);
    setViolations(evaluation.violations);
    setScore(evaluation.complianceScore);
    setAudited(true);
    success(`E-Commerce audit completed. Compliance score: ${evaluation.complianceScore}%`);
  }

  async function saveAsInspectionRecord() {
    try {
      setSavingRecord(true);
      // 1. Ensure product record exists
      const { data: newProd } = await supabase
        .from('products')
        .insert({
          name: `[${platform.toUpperCase()}] ${title.slice(0, 80)}`,
          brand: brand || 'Marketplace Seller',
          category,
          image_url: imageUrl || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      const prodId = newProd?.id;
      if (!prodId) throw new Error('Could not persist e-commerce entity.');

      const passedCount = results.filter((r) => r.status === 'pass').length;
      const failedCount = results.filter((r) => r.status === 'fail').length;

      // 2. Create inspection record
      const { data: insp } = await supabase
        .from('inspections')
        .insert({
          product_id: prodId,
          status: failedCount > 0 ? 'non_compliant' : 'compliant',
          image_url: imageUrl || null,
          overall_confidence: score,
          total_checks: results.length,
          passed_checks: passedCount,
          failed_checks: failedCount,
          inspector_name: 'E-Commerce Digital Surveillance v1.2',
          notes: `E-Commerce PDP Surveillance on ${platform.toUpperCase()} (${url}). Seller: ${sellerName || 'Unspecified'}. Country of Origin: ${countryOfOrigin || 'MISSING'}. USP: ${unitSalePrice || 'MISSING'}.`,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insp?.id) {
        setCreatedInspectionId(insp.id);

        // Insert results & violations
        const resultsToInsert = results.map((r) => ({
          inspection_id: insp.id,
          rule_id: r.rule_id,
          status: r.status,
          confidence: r.confidence,
          detected_value: r.detected_value,
          expected_value: r.expected_value,
          message: r.message,
        }));
        await supabase.from('inspection_results').insert(resultsToInsert);

        const violationsToInsert = violations.map((v) => ({
          inspection_id: insp.id,
          rule_id: v.rule_id,
          severity: v.severity,
          description: v.description,
          evidence_data: v.evidence_data,
          recommendation: v.recommendation,
          is_resolved: false,
        }));
        if (violationsToInsert.length > 0) {
          await supabase.from('violations').insert(violationsToInsert);
        }

        success('E-Commerce surveillance dossier saved to Inspections repository.');
      }
    } catch {
      toastError('Failed to save inspection dossier.');
    } finally {
      setSavingRecord(false);
    }
  }

  function handleExportNotice() {
    exportEcommerceStatutoryNoticePDF(
      {
        title: title || 'E-Commerce Product Listing',
        platform: platform.toUpperCase(),
        url: url || 'N/A',
        sellerName: sellerName || 'Marketplace Seller',
        brand: brand || 'Unspecified',
      },
      violations,
      results.filter((r) => r.status === 'pass').length,
      violations.length,
      score
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="skeleton h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-accent-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight flex items-center gap-2">
                E-Commerce Digital Surveillance Audit
                <span className="badge bg-accent-100 text-accent-800 text-[11px] font-bold border border-accent-200">
                  Rule 6(10) & 6(11) LMPCR
                </span>
              </h1>
              <p className="text-sm text-ink-500 mt-0.5">
                Statutory audit of marketplace Product Display Pages (Amazon, Blinkit, Flipkart, Zepto) for Country of Origin, Unit Sale Price & Mandatory Declarations
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-ink-100/90 rounded-xl border border-ink-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView('audit')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              activeView === 'audit'
                ? 'bg-white text-ink-900 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-accent-600" />
            Audit Workbench
          </button>
          <button
            type="button"
            onClick={() => setActiveView('pipeline')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              activeView === 'pipeline'
                ? 'bg-white text-ink-900 shadow-xs ring-1 ring-accent-400/40'
                : 'text-ink-600 hover:text-ink-900'
            )}
          >
            <Workflow className="w-3.5 h-3.5 text-indigo-600" />
            Architecture Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveView('seller')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              activeView === 'seller'
                ? 'bg-white text-ink-900 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            )}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Seller Hub
          </button>
        </div>
      </div>

      {activeView === 'audit' && (
        <>
          {/* Quick Benchmark Presets Bar */}
      <div className="card p-4 bg-gradient-to-r from-accent-50/80 via-indigo-50/50 to-primary-50/60 border border-accent-200/80">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-accent-600" />
          <span className="text-xs font-bold text-ink-800 uppercase tracking-wider">
            Quick 1-Click Test Listings (Marketplace Benchmarks)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {BENCHMARK_LISTINGS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => loadBenchmark(preset)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white text-ink-700 border-ink-200 hover:border-accent-400 hover:bg-white shadow-2xs transition-all text-left"
            >
              <span>{preset.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  preset.tag === 'error'
                    ? 'bg-rose-100 text-rose-700'
                    : preset.tag === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                )}
              >
                {preset.tag === 'error' ? 'Severe Violations' : preset.tag === 'success' ? '100% Compliant' : 'Missing USP'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: PDP Data Ingestion Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-5 sm:p-6 border border-ink-200/80 space-y-4">
            <h3 className="font-bold text-ink-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary-600" />
                1. Product Display Page (PDP) Parameters
              </span>
              <span className="text-xs font-normal text-ink-400">Section 36 Compliance Check</span>
            </h3>

            {/* Platform & URL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-ink-700 block mb-1">E-Commerce Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as EcommercePlatform)}
                  className="input text-xs py-1.5 font-semibold"
                >
                  <option value="amazon">Amazon India</option>
                  <option value="flipkart">Flipkart</option>
                  <option value="blinkit">Blinkit (Quick Comm)</option>
                  <option value="zepto">Zepto</option>
                  <option value="jiomart">JioMart</option>
                  <option value="bigbasket">BigBasket</option>
                  <option value="other">Other Marketplace</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-ink-700 block mb-1">Product Listing URL</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://www.amazon.in/dp/... or https://blinkit.com/..."
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="input text-xs py-1.5 pr-8"
                  />
                  {url && (
                    <a
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-accent-600"
                      title="Open listing in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Title & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-ink-700 block mb-1">
                  Product Listing Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pure Himalayan Green Tea 100g Whole Leaf"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input text-xs py-1.5 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-ink-700 block mb-1">Brand / Marketer</label>
                <input
                  type="text"
                  placeholder="e.g. NaturePure"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>
            </div>

            {/* Statutory Digital Core: Country of Origin & USP */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Mandatory Statutory Declarations (Rule 6(10) & 6(11))
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-800 block mb-1">
                    Country of Origin <span className="text-rose-600">* (Rule 6(10)(a))</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. India, USA, Thailand (or leave blank if missing)"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    className="input text-xs py-1.5 bg-white"
                  />
                  <p className="text-[10px] text-ink-500 mt-1">Leaving blank flags Critical Rule 6(10)(a) violation</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-800 block mb-1">
                    Unit Sale Price (USP) <span className="text-rose-600">* (Rule 6(11))</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹2.50 / 1 g or ₹15.00 / 100ml"
                    value={unitSalePrice}
                    onChange={(e) => setUnitSalePrice(e.target.value)}
                    className="input text-xs py-1.5 bg-white font-mono"
                  />
                  <p className="text-[10px] text-ink-500 mt-1">Must be declared alongside total price</p>
                </div>
              </div>

              {/* Price & Taxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">MRP (₹)</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹350"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="input text-xs py-1.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Selling / Offer Price (₹)</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹299"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="input text-xs py-1.5 bg-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="tax_incl"
                    checked={hasInclusiveOfTaxes}
                    onChange={(e) => setHasInclusiveOfTaxes(e.target.checked)}
                    className="rounded border-ink-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                  />
                  <label htmlFor="tax_incl" className="text-xs font-semibold text-ink-800 cursor-pointer">
                    "Incl. of all taxes" declared
                  </label>
                </div>
              </div>
            </div>

            {/* Manufacturer, Packer & Seller Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Manufacturer Name & Address</label>
                  <textarea
                    rows={2}
                    placeholder="Full corporate name, unit number, city, state, PIN code"
                    value={manufacturerAddress || manufacturerName}
                    onChange={(e) => setManufacturerAddress(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Packer / Importer Information</label>
                  <textarea
                    rows={2}
                    placeholder="Packer or Importer details (Mandatory for foreign goods)"
                    value={packerDetails || importerDetails}
                    onChange={(e) => setPackerDetails(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Net Quantity</label>
                  <input
                    type="text"
                    placeholder="e.g. 250 g, 500 ml, 10 N"
                    value={netQuantity}
                    onChange={(e) => setNetQuantity(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Expiry / Best Before</label>
                  <input
                    type="text"
                    placeholder="e.g. 12 Months from Mfd"
                    value={expiryOrBestBefore}
                    onChange={(e) => setExpiryOrBestBefore(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Marketplace Seller Name</label>
                  <input
                    type="text"
                    placeholder="e.g. SuperRetailers Pvt Ltd"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Consumer Care Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 1800-111-222"
                    value={consumerCarePhone}
                    onChange={(e) => setConsumerCarePhone(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-700 block mb-1">Consumer Care Email / Grievance</label>
                  <input
                    type="text"
                    placeholder="e.g. care@brand.in"
                    value={consumerCareEmail}
                    onChange={(e) => setConsumerCareEmail(e.target.value)}
                    className="input text-xs py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Raw Specs / Description Text Paste */}
            <div>
              <label className="text-xs font-bold text-ink-700 block mb-1">
                Pasted PDP Description & Technical Specifications
              </label>
              <textarea
                rows={2}
                placeholder="Paste the raw text copied from the product specifications table on Amazon, Flipkart, etc."
                value={rawPdpText}
                onChange={(e) => setRawPdpText(e.target.value)}
                className="input text-xs py-1.5"
              />
            </div>

            {/* Action Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setTitle('');
                  setBrand('');
                  setMrp('');
                  setSellingPrice('');
                  setUnitSalePrice('');
                  setCountryOfOrigin('');
                  setManufacturerAddress('');
                  setPackerDetails('');
                  setNetQuantity('');
                  setAudited(false);
                }}
                className="btn-secondary text-xs py-2 px-3"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Clear Form
              </button>

              <button
                type="button"
                onClick={handleAudit}
                className="btn-primary text-sm py-2.5 px-6 shadow-md shadow-primary-600/20"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                Run Rule 6(10) E-Commerce Audit
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Listing Packaging Image Cross-Verification & Results (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Packaging Gallery Image Card */}
          <div className="card p-5 border border-ink-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-ink-900 text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-primary-600" />
                Gallery Packaging Photo Verification
              </h4>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  disabled={ocrScanning}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  <Camera className="w-3 h-3" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrScanning}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  <Upload className="w-3 h-3 text-primary-600" />
                  {ocrScanning ? 'Scanning...' : 'Upload'}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = '';
              }}
            />

            <div className="aspect-video rounded-xl bg-ink-100 border border-ink-200 overflow-hidden relative flex items-center justify-center">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Packaging" className="w-full h-full object-contain bg-ink-900/10" />
                  {ocrScanning && (
                    <div className="absolute inset-0 bg-ink-950/60 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                      <span>Extracting OCR declarations...</span>
                    </div>
                  )}
                  {ocrResult && (
                    <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded-lg bg-ink-950/80 text-[10px] text-white backdrop-blur-xs flex items-center justify-between">
                      <span>OCR Verified: {ocrResult.words.length} words detected</span>
                      <span className="text-emerald-400 font-bold">{Math.round(ocrResult.avgConfidence)}% Conf</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-4 text-ink-400">
                  <Upload className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs font-semibold">Upload product image from listing</p>
                  <p className="text-[10px]">Cross-checks physical packaging against digital specs</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Or paste listing image URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScanImageUrl();
                  }
                }}
                className="input text-xs py-1.5 flex-1"
              />
              <button
                type="button"
                onClick={() => handleScanImageUrl()}
                disabled={ocrScanning || !imageUrl.trim()}
                className="btn-primary text-xs py-1.5 px-3 shrink-0 whitespace-nowrap"
              >
                {ocrScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-3.5 h-3.5" />
                    Read Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audit Results Panel */}
          {audited && (
            <div className="card p-5 border border-ink-200/80 space-y-4 animate-fade-in shadow-md">
              {/* Score Header */}
              <div
                className={cn(
                  'p-4 rounded-xl border flex items-center justify-between',
                  violations.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-sm',
                      violations.length > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    )}
                  >
                    {score}%
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-ink-900">
                      {violations.length > 0 ? `${violations.length} Statutory Violations` : 'Rule 6(10) Compliant'}
                    </h4>
                    <p className="text-xs text-ink-500">
                      {results.filter((r) => r.status === 'pass').length} verified, {violations.length} failed
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    'badge text-xs font-bold uppercase',
                    violations.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  )}
                >
                  {violations.length > 0 ? 'Non-Compliant' : 'Approved'}
                </span>
              </div>

              {/* Violations List */}
              {violations.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Statutory Rule Breaches
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                    {violations.map((v) => {
                      const sev = severityConfig[v.severity];
                      return (
                        <div key={v.id} className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={cn('badge text-[10px]', sev.badgeClass)}>{sev.label}</span>
                            <span className="font-mono text-[10px] font-bold text-ink-600">{v.rule?.rule_code}</span>
                          </div>
                          <p className="font-bold text-ink-900">{v.rule?.title}</p>
                          <p className="text-ink-700 text-[11px] mt-0.5">{v.description}</p>
                          {v.recommendation && (
                            <p className="text-[10px] text-rose-800 font-semibold mt-1 pt-1 border-t border-rose-200/60">
                              Action: {v.recommendation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Complete Checklist */}
              <div className="space-y-1.5 pt-2 border-t border-ink-100">
                <p className="text-xs font-bold text-ink-700 mb-2">Rule 6(10) Statutory Checks</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin text-xs">
                  {results.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded bg-ink-50/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            r.status === 'pass' ? 'bg-emerald-500' : r.status === 'fail' ? 'bg-rose-500' : 'bg-amber-500'
                          )}
                        />
                        <span className="font-semibold text-ink-900 truncate">{r.rule?.title}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0',
                          r.status === 'pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        )}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-ink-100">
                <div className="flex gap-2">
                  <button
                    onClick={handleExportNotice}
                    className="btn-secondary text-xs flex-1 py-2"
                  >
                    <FileDown className="w-3.5 h-3.5 text-primary-600" />
                    Export Statutory Notice (PDF)
                  </button>

                  <button
                    onClick={saveAsInspectionRecord}
                    disabled={savingRecord || Boolean(createdInspectionId)}
                    className="btn-primary text-xs flex-1 py-2"
                  >
                    {savingRecord ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : createdInspectionId ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    {createdInspectionId ? 'Dossier Saved' : 'Save as Inspection'}
                  </button>
                </div>

                {createdInspectionId && (
                  <button
                    onClick={() => navigate('inspection-detail', createdInspectionId)}
                    className="w-full text-center text-xs font-bold text-primary-600 hover:text-primary-800 py-1"
                  >
                    View in Official Inspections Dossier →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* View 2: Visual Architecture & End-to-End Pipeline */}
      {activeView === 'pipeline' && (
        <EcommercePipelineVisualizer
          listing={{
            url: url.trim() || 'https://ecommerce.in/pdp/sample-listing',
            platform,
            title: title.trim() || 'Sample E-Commerce Listing',
            brand: brand.trim() || 'Brand',
            category: category.trim() || 'General',
            mrp: mrp.trim(),
            sellingPrice: sellingPrice.trim(),
            unitSalePrice: unitSalePrice.trim(),
            hasInclusiveOfTaxes,
            netQuantity: netQuantity.trim(),
            countryOfOrigin: countryOfOrigin.trim(),
            manufacturerName: manufacturerName.trim(),
            manufacturerAddress: manufacturerAddress.trim(),
            packerDetails: packerDetails.trim(),
            importerDetails: importerDetails.trim(),
            expiryOrBestBefore: expiryOrBestBefore.trim(),
            consumerCarePhone: consumerCarePhone.trim(),
            consumerCareEmail: consumerCareEmail.trim(),
            sellerName: sellerName.trim(),
            rawPdpText: rawPdpText.trim(),
            imageUrl: imageUrl.trim() || undefined,
          }}
          ocrResult={ocrResult}
          results={results}
          violations={violations}
          score={score}
          audited={audited}
          onSelectPersona={(persona) => {
            if (persona === 'seller') setActiveView('seller');
            else setActiveView('audit');
          }}
        />
      )}

      {/* View 3: Seller Remediation Hub */}
      {activeView === 'seller' && (
        <SellerRemediationHub
          listing={{
            url: url.trim() || 'https://ecommerce.in/pdp/sample-listing',
            platform,
            title: title.trim() || 'Sample E-Commerce Listing',
            brand: brand.trim() || 'Brand',
            category: category.trim() || 'General',
            mrp: mrp.trim(),
            sellingPrice: sellingPrice.trim(),
            unitSalePrice: unitSalePrice.trim(),
            hasInclusiveOfTaxes,
            netQuantity: netQuantity.trim(),
            countryOfOrigin: countryOfOrigin.trim(),
            manufacturerName: manufacturerName.trim(),
            manufacturerAddress: manufacturerAddress.trim(),
            packerDetails: packerDetails.trim(),
            importerDetails: importerDetails.trim(),
            expiryOrBestBefore: expiryOrBestBefore.trim(),
            consumerCarePhone: consumerCarePhone.trim(),
            consumerCareEmail: consumerCareEmail.trim(),
            sellerName: sellerName.trim(),
            rawPdpText: rawPdpText.trim(),
            imageUrl: imageUrl.trim() || undefined,
          }}
          violations={violations}
          score={score}
          onBackToAudit={() => setActiveView('audit')}
        />
      )}

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl, file) => {
          setImageUrl(dataUrl);
          handleImageUpload(file);
        }}
        title="Live Packaging Camera Scan (E-Commerce PDP Verification)"
      />
    </div>
  );
}
