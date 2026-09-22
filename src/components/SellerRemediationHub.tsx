import React from 'react';
import {
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  RotateCw,
  HelpCircle
} from 'lucide-react';
import type { EcommerceListingData } from '@/lib/ecommerce-engine';
import type { Violation } from '@/types';
import { cn } from '@/lib/utils';

interface SellerRemediationHubProps {
  listing: EcommerceListingData;
  violations: Violation[];
  score: number;
  onBackToAudit: () => void;
}

export const SellerRemediationHub: React.FC<SellerRemediationHubProps> = ({
  listing,
  violations,
  score,
  onBackToAudit,
}) => {
  const isClean = violations.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Seller Header Banner */}
      <div className="card p-6 border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-sky-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-ink-900">Seller Compliance & Remediation Hub</h2>
                <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                  Vendor Self-Audit
                </span>
              </div>
              <p className="text-xs text-ink-600 mt-1">
                Remediation guide for marketplace sellers on {listing.platform.toUpperCase()} to prevent listing delisting and statutory penalties.
              </p>
            </div>
          </div>
          <button
            onClick={onBackToAudit}
            className="btn-secondary text-xs py-2 px-3 self-start sm:self-auto"
          >
            ← Return to Audit Workbench
          </button>
        </div>
      </div>

      {/* Risk Assessment & Statutory Penalty Warning */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border border-ink-200 bg-white">
          <span className="text-xs font-bold text-ink-500 block mb-1">Current Listing Status</span>
          <div className="text-2xl font-black text-ink-900">{score}% Compliant</div>
          <span className={cn(
            'inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-2 border',
            isClean ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          )}>
            {isClean ? 'Ready for Marketplace' : `${violations.length} Infractions Detected`}
          </span>
        </div>

        <div className="card p-5 border border-ink-200 bg-white">
          <span className="text-xs font-bold text-ink-500 block mb-1">Statutory Risk Exposure</span>
          <div className="text-2xl font-black text-rose-600">
            {isClean ? 'Zero Risk' : 'High Risk'}
          </div>
          <p className="text-[11px] text-ink-500 mt-1">
            Section 36 fines up to ₹25,000 for first offense / ₹50,000 for subsequent violations.
          </p>
        </div>

        <div className="card p-5 border border-ink-200 bg-white">
          <span className="text-xs font-bold text-ink-500 block mb-1">Target Marketplace</span>
          <div className="text-2xl font-black text-ink-900 capitalize">{listing.platform}</div>
          <p className="text-[11px] text-ink-500 mt-1 truncate">
            Seller: {listing.sellerName || 'Marketplace Seller'}
          </p>
        </div>
      </div>

      {/* Actionable Fix-It Checklist */}
      <div className="card p-6 border border-ink-200 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ink-100">
          <div>
            <h3 className="text-base font-extrabold text-ink-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Step-by-Step Listing Remediation Checklist
            </h3>
            <p className="text-xs text-ink-500">
              Apply these changes in your Seller Central catalog to ensure 100% legal compliance
            </p>
          </div>
          <span className="text-xs font-bold text-ink-400">
            {violations.length === 0 ? 'All Clear' : `${violations.length} Actions Required`}
          </span>
        </div>

        {isClean ? (
          <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-emerald-900">Congratulations! Your Listing is Fully Compliant</h4>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              All mandatory declarations under Rule 6(10) & 6(11) of Legal Metrology (Packaged Commodities) Rules, 2011 are properly satisfied.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {violations.map((v, idx) => (
              <div key={v.id || idx} className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-rose-950">
                        Fix {v.rule?.title || 'Statutory Declaration'}
                      </h4>
                      <p className="text-xs text-rose-800 font-medium mt-0.5">
                        {v.description}
                      </p>
                    </div>
                  </div>
                  <span className="badge bg-rose-100 text-rose-800 border border-rose-300 text-[10px] uppercase font-bold shrink-0">
                    {v.severity}
                  </span>
                </div>

                {/* Specific Seller Instructions */}
                <div className="p-3 rounded-lg bg-white border border-rose-200/80 text-xs text-ink-700 space-y-1 mt-2">
                  <div className="font-bold text-ink-900 flex items-center gap-1.5 text-xs text-primary-700">
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to fix in {listing.platform.toUpperCase()} Seller Portal:
                  </div>
                  <p className="text-[11px] text-ink-600">
                    {v.recommendation || 'Update product specifications table on the digital product page.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default SellerRemediationHub;
