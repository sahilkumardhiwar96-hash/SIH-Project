import React from 'react';
import {
  Globe,
  Upload,
  Cpu,
  ScanLine,
  FileText,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowDown,
  UserCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import type { EcommerceListingData, EcommercePlatform } from '@/lib/ecommerce-engine';
import type { ComplianceRule, InspectionResult, Violation } from '@/types';
import { cn } from '@/lib/utils';

interface PipelineVisualizerProps {
  listing: EcommerceListingData;
  ocrResult: any | null;
  results: (InspectionResult & { rule?: ComplianceRule })[];
  violations: Violation[];
  score: number;
  audited: boolean;
  onSelectPersona: (persona: 'seller' | 'officer') => void;
}

export const EcommercePipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  listing,
  ocrResult,
  results,
  violations,
  score,
  audited,
  onSelectPersona,
}) => {
  const criticalCount = violations.filter((v) => v.severity === 'critical').length;
  const statusColor =
    score === 100 ? 'text-emerald-600 bg-emerald-50 border-emerald-300' :
    score >= 70 ? 'text-amber-600 bg-amber-50 border-amber-300' :
    'text-rose-600 bg-rose-50 border-rose-300';

  return (
    <div className="card p-6 border border-ink-200/80 bg-gradient-to-b from-white via-ink-50/30 to-ink-100/40 space-y-6">
      {/* Visualizer Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Cpu className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-ink-900 text-base">
              End-to-End Legal Metrology AI Pipeline
            </h3>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Architecture from Marketplace Ingestion $\to$ OpenCV $\to$ PaddleOCR $\to$ NLP Extraction $\to$ Rule Engine $\to$ Dual Dashboards
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-ink-500">Live Status:</span>
          <span className={cn('text-xs font-extrabold px-2.5 py-1 rounded-full border', audited ? statusColor : 'bg-ink-100 text-ink-600 border-ink-300')}>
            {audited ? `${score}% Statutory Compliance` : 'Ready for Ingestion'}
          </span>
        </div>
      </div>

      {/* Interactive Pipeline Flow */}
      <div className="flex flex-col items-center space-y-3 max-w-2xl mx-auto py-2">
        {/* Stage 1: E-Commerce Site */}
        <div className="w-full card p-4 border border-ink-200 bg-white shadow-xs hover:border-primary-400 transition-all text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-extrabold text-ink-900 uppercase tracking-wider">
              Stage 1: E-Commerce Site (Product Listing / Seller)
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <span className="badge bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">Amazon India</span>
            <span className="badge bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">Flipkart</span>
            <span className="badge bg-yellow-50 text-yellow-800 border border-yellow-200 text-[11px] font-bold">Blinkit</span>
            <span className="badge bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">Zepto</span>
            <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">JioMart</span>
          </div>
          <p className="text-[11px] text-ink-500 mt-2">
            Active Source: <span className="font-bold text-ink-800">{listing.platform.toUpperCase()}</span> ({listing.sellerName || 'Marketplace Seller'})
          </p>
        </div>

        <ArrowDown className="w-4 h-4 text-ink-400" />

        {/* Stage 2: Product Data Ingestion */}
        <div className="w-full card p-4 border border-ink-200 bg-white shadow-xs hover:border-primary-400 transition-all">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Upload className="w-4 h-4 text-primary-600" />
            <span className="text-xs font-extrabold text-ink-900 uppercase tracking-wider">
              Stage 2: Product Data Ingestion
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block font-medium">Title:</span>
              <span className="font-bold text-ink-800 truncate block">{listing.title || 'Pending'}</span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block font-medium">Pricing:</span>
              <span className="font-bold text-ink-800 truncate block">MRP: {listing.mrp || '--'}</span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block font-medium">Quantity:</span>
              <span className="font-bold text-ink-800 truncate block">{listing.netQuantity || '--'}</span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block font-medium">Gallery Image:</span>
              <span className="font-bold text-ink-800 truncate block">{listing.imageUrl ? 'Photo Attached' : 'None'}</span>
            </div>
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-ink-400" />

        {/* Stage 3: Image Preprocessing (OpenCV) */}
        <div className="w-full card p-4 border border-ink-200 bg-white shadow-xs hover:border-primary-400 transition-all">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-accent-600" />
            <span className="text-xs font-extrabold text-ink-900 uppercase tracking-wider">
              Stage 3: Image Preprocessing (OpenCV Engine)
            </span>
          </div>
          <p className="text-[11px] text-ink-500 text-center mb-2">
            Normalizes physical label scans and web product gallery crops for high-precision text extraction
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-1.5 rounded-md bg-accent-50/70 border border-accent-200 text-accent-800 font-bold">
              • 300 DPI Scaling
            </div>
            <div className="p-1.5 rounded-md bg-accent-50/70 border border-accent-200 text-accent-800 font-bold">
              • Bilateral Denoising
            </div>
            <div className="p-1.5 rounded-md bg-accent-50/70 border border-accent-200 text-accent-800 font-bold">
              • Sigmoid Contrast
            </div>
            <div className="p-1.5 rounded-md bg-accent-50/70 border border-accent-200 text-accent-800 font-bold">
              • Perspective Dewarp
            </div>
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-ink-400" />

        {/* Stage 4: OCR Engine (PaddleOCR PP-OCRv4) */}
        <div className="w-full card p-4 border border-ink-200 bg-white shadow-xs hover:border-primary-400 transition-all text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ScanLine className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-extrabold text-ink-900 uppercase tracking-wider">
              Stage 4: Deep Learning OCR Engine (PaddleOCR PP-OCRv4)
            </span>
          </div>
          <p className="text-[11px] text-ink-500">
            <strong>DBNet</strong> (Differentiable Binarization text detection at arbitrary angles) + <strong>SVTR</strong> (Vision Transformer character recognition)
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Backend Active on http://127.0.0.1:8000
            {ocrResult && ` (${ocrResult.lines?.length || 0} regions detected, ${Math.round(ocrResult.confidence || 0)}% conf)`}
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-ink-400" />

        {/* Stage 5: Information Extraction (NLP & Lexicon) */}
        <div className="w-full card p-4 border border-ink-200 bg-white shadow-xs hover:border-primary-400 transition-all">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-extrabold text-ink-900 uppercase tracking-wider">
              Stage 5: Information Extraction (NLP & Semantic Lexicon)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-[11px]">
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block text-[10px]">Country of Origin:</span>
              <span className={cn('font-bold', listing.countryOfOrigin ? 'text-emerald-700' : 'text-rose-600')}>
                {listing.countryOfOrigin || 'MISSING'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block text-[10px]">Unit Sale Price (USP):</span>
              <span className={cn('font-bold', listing.unitSalePrice ? 'text-emerald-700' : 'text-rose-600')}>
                {listing.unitSalePrice || 'MISSING'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block text-[10px]">Manufacturer Address:</span>
              <span className={cn('font-bold truncate block', listing.manufacturerAddress ? 'text-emerald-700' : 'text-rose-600')}>
                {listing.manufacturerAddress ? `${listing.manufacturerAddress.slice(0, 20)}...` : 'MISSING'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block text-[10px]">Net Quantity:</span>
              <span className={cn('font-bold', listing.netQuantity ? 'text-emerald-700' : 'text-rose-600')}>
                {listing.netQuantity || 'MISSING'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block text-[10px]">Tax Statement:</span>
              <span className={cn('font-bold', listing.hasInclusiveOfTaxes ? 'text-emerald-700' : 'text-rose-600')}>
                {listing.hasInclusiveOfTaxes ? 'Incl. of all taxes' : 'MISSING'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-ink-50 border border-ink-200/60">
              <span className="text-ink-400 block text-[10px]">Consumer Care:</span>
              <span className={cn('font-bold truncate block', (listing.consumerCarePhone || listing.consumerCareEmail) ? 'text-emerald-700' : 'text-rose-600')}>
                {listing.consumerCarePhone || listing.consumerCareEmail || 'MISSING'}
              </span>
            </div>
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-ink-400" />

        {/* Stage 6: Legal Metrology Rule Engine */}
        <div className="w-full card p-4 border border-ink-200 bg-white shadow-xs hover:border-primary-400 transition-all text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-extrabold text-ink-900 uppercase tracking-wider">
              Stage 6: Legal Metrology Rule Engine (Rule 6(10) & 6(11))
            </span>
          </div>
          <p className="text-[11px] text-ink-500">
            Validates statutory declarations, metric format standards, tax disclosure, and digital vs packaging image consistency
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-001: Origin</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-002: USP</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-003: Address</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-004: Metric Qty</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-005: Taxes</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-006: Expiry</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-007: Care</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 text-ink-700">EC-008: Image Match</span>
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-ink-400" />

        {/* Stage 7: Compliance Scoring */}
        <div className={cn('w-full card p-4 border text-center transition-all', statusColor)}>
          <span className="text-xs font-extrabold uppercase tracking-wider block mb-1">
            Stage 7: Compliance Scoring
          </span>
          <div className="text-3xl font-black">{score}%</div>
          <div className="text-xs font-bold mt-1">
            {score === 100
              ? '✅ 100% Fully Compliant'
              : score >= 70
              ? `⚠️ Partially Compliant (${violations.length} violations)`
              : `❌ Non-Compliant (${criticalCount} Critical Infractions)`}
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-ink-400" />

        {/* Stage 8: Dual Persona Dashboards Split */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Seller Dashboard */}
          <div
            onClick={() => onSelectPersona('seller')}
            className="card p-4 border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50/80 cursor-pointer transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
                <UserCheck className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                Vendor Action
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-ink-900">Seller Dashboard</h4>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Step-by-step remediation guide to fix missing PDP declarations on Amazon/Flipkart Seller Central before penalties.
            </p>
            <div className="mt-3 text-xs font-bold text-emerald-700 flex items-center gap-1">
              Open Seller Remediation Hub →
            </div>
          </div>

          {/* Officer Dashboard */}
          <div
            onClick={() => onSelectPersona('officer')}
            className="card p-4 border-2 border-primary-200 hover:border-primary-500 bg-primary-50/50 hover:bg-primary-50/80 cursor-pointer transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-primary-600 text-white group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold text-primary-800 bg-primary-200/70 px-2 py-0.5 rounded-full">
                Regulatory Action
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-ink-900">Officer Dashboard</h4>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Official Legal Metrology Act Section 36 Notice generation, compounding fines, inspection repository, and PDF exports.
            </p>
            <div className="mt-3 text-xs font-bold text-primary-700 flex items-center gap-1">
              Open Officer Inspection Dossier →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default EcommercePipelineVisualizer;
