import type { ComplianceRule, InspectionResult, Violation } from '@/types';
import type { OcrResult } from '@/lib/ocr';

export type EcommercePlatform = 'amazon' | 'flipkart' | 'blinkit' | 'zepto' | 'jiomart' | 'bigbasket' | 'other';

export type EcommerceListingData = {
  url: string;
  platform: EcommercePlatform;
  title: string;
  brand: string;
  category: string;
  mrp: string;
  sellingPrice: string;
  unitSalePrice: string; // e.g. "₹0.80 / g" or "₹12.50 / 100ml"
  hasInclusiveOfTaxes: boolean;
  netQuantity: string; // e.g. "250 g"
  countryOfOrigin: string; // e.g. "India", "China", "Thailand"
  manufacturerName: string;
  manufacturerAddress: string;
  packerDetails: string;
  importerDetails: string;
  expiryOrBestBefore: string;
  consumerCarePhone: string;
  consumerCareEmail: string;
  sellerName: string;
  rawPdpText: string;
  imageUrl?: string;
};

export type EcommerceEvaluationResult = {
  results: (InspectionResult & { rule?: ComplianceRule })[];
  violations: Violation[];
  complianceScore: number;
  criticalViolationsCount: number;
  passedCount: number;
  failedCount: number;
};

export const PLATFORM_CONFIG: Record<EcommercePlatform, { name: string; domain: string; badgeColor: string }> = {
  amazon: { name: 'Amazon India', domain: 'amazon.in', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
  flipkart: { name: 'Flipkart', domain: 'flipkart.com', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300' },
  blinkit: { name: 'Blinkit', domain: 'blinkit.com', badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
  zepto: { name: 'Zepto', domain: 'zeptonow.com', badgeColor: 'bg-purple-100 text-purple-900 border-purple-300' },
  jiomart: { name: 'JioMart', domain: 'jiomart.com', badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  bigbasket: { name: 'BigBasket', domain: 'bigbasket.com', badgeColor: 'bg-red-100 text-red-900 border-red-300' },
  other: { name: 'General Marketplace', domain: 'ecommerce.in', badgeColor: 'bg-ink-100 text-ink-900 border-ink-300' },
};

export const BENCHMARK_LISTINGS: (EcommerceListingData & { label: string; violationSummary: string; tag: 'error' | 'warning' | 'success' })[] = [
  {
    label: 'Imported Roasted Pistachios 200g (Severe Non-Compliance)',
    violationSummary: 'Missing Country of Origin, Missing USP, Concealed Importer',
    tag: 'error',
    platform: 'amazon',
    url: 'https://www.amazon.in/dp/B09XXXXXX',
    title: 'Crunchy Royal Roasted California Pistachios 200g Vacuum Pack',
    brand: 'Royal Crunchies',
    category: 'Food & Beverage',
    mrp: '₹550',
    sellingPrice: '₹425',
    unitSalePrice: '',
    hasInclusiveOfTaxes: false,
    netQuantity: '200g',
    countryOfOrigin: '',
    manufacturerName: 'Global Nut Corp, CA',
    manufacturerAddress: '',
    packerDetails: '',
    importerDetails: '',
    expiryOrBestBefore: 'Best before 6 months',
    consumerCarePhone: '',
    consumerCareEmail: '',
    sellerName: 'QuickKart Retailers LLC',
    rawPdpText: 'Item Weight: 200 g. Price: Rs 425. Great for snacking. Fast delivery.',
    imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Premium Organic Green Tea 100g (100% Fully Compliant)',
    violationSummary: 'Fully compliant with Rule 6(10) & Rule 6(11)',
    tag: 'success',
    platform: 'blinkit',
    url: 'https://blinkit.com/prn/pure-green-tea/prid/349102',
    title: 'Himalayan Pure Organic Whole Leaf Green Tea 100g',
    brand: 'Himalaya Organics',
    category: 'Food & Beverage',
    mrp: '₹340.00',
    sellingPrice: '₹299.00',
    unitSalePrice: '₹2.99 / 1 g',
    hasInclusiveOfTaxes: true,
    netQuantity: '100 g',
    countryOfOrigin: 'India',
    manufacturerName: 'Himalayan Organic Tea Estates Pvt Ltd',
    manufacturerAddress: 'Plot 44, Tea Garden Road, Palampur, Kangra, Himachal Pradesh - 176061',
    packerDetails: 'Himalayan Organic Packaging Unit 2, Kangra HP',
    importerDetails: 'N/A (Indigenous Product)',
    expiryOrBestBefore: '12 Months from Packaging Date (Exp: 10/2026)',
    consumerCarePhone: '1800-200-4567',
    consumerCareEmail: 'care@himalayaorganics.in',
    sellerName: 'Blinkit Retail Fulfillment Pvt Ltd',
    rawPdpText: 'Net Qty: 100 g. MRP: Rs 340 (Incl. of all taxes). USP: Rs 2.99/g. Country of Origin: India. Mfg: Himalayan Organic Tea Estates Pvt Ltd, Kangra HP 176061.',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Instant Hydrating Face Serum 30ml (Missing Unit Sale Price)',
    violationSummary: 'Rule 6(11) Violation: Missing Price per ml',
    tag: 'warning',
    platform: 'flipkart',
    url: 'https://www.flipkart.com/item/serum-30ml/p/itmxxxx',
    title: 'GlowRevive Hyaluronic Acid 2% Face Hydration Serum 30ml',
    brand: 'GlowRevive',
    category: 'Personal Care',
    mrp: '₹699',
    sellingPrice: '₹499',
    unitSalePrice: '',
    hasInclusiveOfTaxes: true,
    netQuantity: '30 ml',
    countryOfOrigin: 'India',
    manufacturerName: 'Dermacare Labs India Ltd',
    manufacturerAddress: 'Survey No 12/A, Industrial Area, Solan, Himachal Pradesh - 173205',
    packerDetails: 'Dermacare Labs India Ltd',
    importerDetails: '',
    expiryOrBestBefore: '24 Months from Mfd',
    consumerCarePhone: '011-45678900',
    consumerCareEmail: 'support@glowrevive.in',
    sellerName: 'CosmeticHub Online',
    rawPdpText: 'Volume: 30ml. Price: Rs 499 (Incl of all taxes). Mfd by: Dermacare Labs India, Solan HP. Country of Origin: India.',
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
  },
];

export function evaluateEcommerceListing(
  listing: EcommerceListingData,
  rules: ComplianceRule[],
  ocrOnPackaging?: OcrResult | null
): EcommerceEvaluationResult {
  const ecRules = rules.filter((r) => r.category === 'ecommerce' || r.rule_code.startsWith('EC-'));
  const results: (InspectionResult & { rule?: ComplianceRule })[] = [];
  const violations: Violation[] = [];

  const textCorpus = [
    listing.title,
    listing.rawPdpText,
    listing.mrp,
    listing.sellingPrice,
    listing.unitSalePrice,
    listing.countryOfOrigin,
    listing.manufacturerAddress,
    listing.packerDetails,
    listing.importerDetails,
    listing.expiryOrBestBefore,
    listing.consumerCarePhone,
    listing.consumerCareEmail,
  ]
    .join(' ')
    .toLowerCase();

  for (const rule of ecRules) {
    let status: InspectionResult['status'] = 'pass';
    let confidence = 95;
    let detectedValue: string | null = null;
    let expectedValue: string | null = rule.regulation_reference ?? 'Rule 6(10) Statutory Declaration';
    let message = '';
    let violationDescription = '';
    let recommendation = '';

    switch (rule.rule_code) {
      case 'EC-001': {
        const declaredOrigin = listing.countryOfOrigin.trim();
        const originRegex = /(country\s+of\s+origin|origin\s*country|made\s+in)\s*[:-]?\s*([a-zA-Z\s]{3,20})/i;
        const match = declaredOrigin || listing.rawPdpText.match(originRegex)?.[2];

        if (match && match.trim().length > 1) {
          status = 'pass';
          detectedValue = match.trim();
          message = `Country of Origin declared as "${detectedValue}" on digital product page.`;
        } else {
          status = 'fail';
          confidence = 94;
          detectedValue = 'None / Not declared';
          expectedValue = 'Mandatory Country of Origin (e.g. India, USA, etc.)';
          message = 'Violation: Country of Origin is NOT declared on digital product display page (PDP).';
          violationDescription = 'Mandatory Country of Origin declaration missing on e-commerce listing.';
          recommendation = 'Issue statutory notice to E-Commerce Entity and Seller under Rule 6(10)(a) of Legal Metrology (PC) Rules, 2011 to display Country of Origin.';
        }
        break;
      }

      case 'EC-002': {
        const usp = listing.unitSalePrice.trim();
        const uspRegex = /(₹|rs\.?|inr)\s?\d+(\.\d+)?\s*\/\s*(g|gm|kg|ml|l|litre|meter|piece|unit|pc|n)\b/i;
        const detected = usp || listing.rawPdpText.match(uspRegex)?.[0];

        if (detected && detected.length > 2) {
          status = 'pass';
          detectedValue = detected;
          message = `Unit Sale Price (USP) declared as "${detectedValue}".`;
        } else {
          status = 'fail';
          confidence = 92;
          detectedValue = 'Missing USP';
          expectedValue = 'Standard Unit Sale Price (e.g. ₹X.XX / g or ₹X.XX / 100ml)';
          message = 'Violation: Unit Sale Price (USP) is missing alongside total retail price.';
          violationDescription = 'Unit Sale Price (USP) missing on digital listing in violation of Rule 6(11).';
          recommendation = 'Mandate marketplace to calculate and publish standard Unit Sale Price alongside MRP.';
        }
        break;
      }

      case 'EC-003': {
        const mfgName = listing.manufacturerName.trim();
        const mfgAddr = listing.manufacturerAddress.trim();
        const combined = `${mfgName} ${mfgAddr}`.trim();

        if (combined.length > 15 || listing.packerDetails.length > 15 || listing.importerDetails.length > 15) {
          status = 'pass';
          detectedValue = `${mfgName ? mfgName + ', ' : ''}${mfgAddr || listing.packerDetails || listing.importerDetails}`.slice(0, 60);
          message = `Manufacturer/Packer identity & address declared: "${detectedValue}"`;
        } else {
          status = 'fail';
          confidence = 90;
          detectedValue = combined || 'Incomplete / Omitted';
          expectedValue = 'Complete legal name & full physical street address with PIN';
          message = 'Violation: Incomplete or missing physical address of manufacturer/packer/importer.';
          violationDescription = 'Omission of complete manufacturer/packer address on digital listing under Rule 6(10)(b).';
          recommendation = 'Direct seller to furnish registered corporate address with pincode.';
        }
        break;
      }

      case 'EC-004': {
        const netQty = listing.netQuantity.trim();
        const metricRegex = /\b\d+(\.\d+)?\s*(g|gm|gms|kg|ml|l|litre|cm|m|meter|n|units?|pieces?)\b/i;
        const valid = metricRegex.test(netQty) || metricRegex.test(listing.title) || metricRegex.test(listing.rawPdpText);

        if (valid) {
          status = 'pass';
          detectedValue = netQty || (listing.title.match(metricRegex)?.[0] ?? 'Metric declared');
          message = `Net quantity declared in standard metric units: "${detectedValue}"`;
        } else {
          status = 'fail';
          confidence = 88;
          detectedValue = netQty || 'Missing';
          expectedValue = 'Metric units (g, kg, ml, l, cm, m, N)';
          message = 'Violation: Net quantity not declared in standard legal metrology metric units.';
          violationDescription = 'Missing or non-metric quantity declaration on digital listing.';
          recommendation = 'Ensure product title and specifications reflect standard metric units.';
        }
        break;
      }

      case 'EC-005': {
        if (listing.hasInclusiveOfTaxes || /incl\.?\s*(of)?\s*(all)?\s*taxes?/i.test(textCorpus)) {
          status = 'pass';
          detectedValue = `${listing.mrp || listing.sellingPrice} (Incl. of all taxes)`;
          message = 'MRP explicitly declared as inclusive of all taxes.';
        } else {
          status = 'fail';
          confidence = 85;
          detectedValue = listing.mrp || listing.sellingPrice || 'Price not designated as inclusive';
          expectedValue = 'MRP (Inclusive of all taxes)';
          message = 'Violation: Price displayed without mandatory "inclusive of all taxes" declaration.';
          violationDescription = 'Listing fails to declare price as inclusive of all statutory taxes under Rule 6(10)(d).';
          recommendation = 'Update marketplace price rendering to append statutory tax inclusion text.';
        }
        break;
      }

      case 'EC-006': {
        const dateDeclared = listing.expiryOrBestBefore.trim().length > 3 || /(best\s+before|expiry|exp\.?\s*date|shelf\s+life)/i.test(textCorpus);
        if (dateDeclared) {
          status = 'pass';
          detectedValue = listing.expiryOrBestBefore || 'Shelf life / expiry declared';
          message = `Shelf life / Expiry declared: "${detectedValue}"`;
        } else {
          status = 'fail';
          confidence = 85;
          detectedValue = 'Not declared prior to purchase';
          expectedValue = 'Clear expiry date or shelf life statement';
          message = 'Violation: Expiry / Best before information missing prior to consumer purchase.';
          violationDescription = 'Omission of expiry date / shelf life declaration on digital listing under Rule 6(10)(e).';
          recommendation = 'Direct marketplace to display expiry timeline for perishable/consumer commodities.';
        }
        break;
      }

      case 'EC-007': {
        const hasCare =
          listing.consumerCarePhone.trim().length > 6 ||
          listing.consumerCareEmail.trim().length > 5 ||
          /(customer\s+care|consumer\s+care|grievance|support@|helpdesk)/i.test(textCorpus);

        if (hasCare) {
          status = 'pass';
          detectedValue = [listing.consumerCarePhone, listing.consumerCareEmail].filter(Boolean).join(' | ') || 'Customer care declared';
          message = `Consumer grievance contact declared: "${detectedValue}"`;
        } else {
          status = 'fail';
          confidence = 86;
          detectedValue = 'Missing contact info';
          expectedValue = 'Active consumer care phone, email or grievance officer address';
          message = 'Violation: Consumer grievance contact channel missing from product listing.';
          violationDescription = 'Consumer complaint contact details omitted in violation of Rule 6(10)(f).';
          recommendation = 'Publish dedicated grievance officer email and customer care helpline.';
        }
        break;
      }

      case 'EC-008': {
        if (!ocrOnPackaging || !ocrOnPackaging.fullText) {
          status = 'skipped';
          confidence = 50;
          detectedValue = 'No packaging photo OCR provided';
          message = 'Skipped: Ingest packaging photo from gallery to cross-verify physical label vs digital listing.';
        } else {
          const ocrText = ocrOnPackaging.fullText.toLowerCase();
          const brandMatches = !listing.brand || ocrText.includes(listing.brand.toLowerCase().slice(0, 4));
          if (brandMatches) {
            status = 'pass';
            confidence = 88;
            detectedValue = `Brand match confirmed (${ocrOnPackaging.words.length} words verified)`;
            message = 'Physical packaging image declarations match digital product listing.';
          } else {
            status = 'warning';
            confidence = 72;
            detectedValue = 'Discrepancy detected';
            expectedValue = 'Packaging image should match digital product specs';
            message = 'Advisory: Potential mismatch between product packaging image and digital listing text.';
          }
        }
        break;
      }

      default:
        break;
    }

    const item: InspectionResult & { rule?: ComplianceRule } = {
      id: `temp-ec-${rule.id}`,
      inspection_id: 'temp',
      rule_id: rule.id,
      status,
      confidence,
      detected_value: detectedValue,
      expected_value: expectedValue,
      message,
      created_at: new Date().toISOString(),
      rule,
    };
    results.push(item);

    if (status === 'fail') {
      violations.push({
        id: `v-ec-${rule.id}-${Date.now()}`,
        inspection_id: 'temp',
        rule_id: rule.id,
        severity: rule.severity,
        description: violationDescription || message,
        evidence_data: { detected: detectedValue, expected: expectedValue, platform: listing.platform, url: listing.url },
        recommendation,
        is_resolved: false,
        created_at: new Date().toISOString(),
        rule,
      });
    }
  }

  const passedCount = results.filter((r) => r.status === 'pass').length;
  const failedCount = results.filter((r) => r.status === 'fail').length;
  const criticalViolationsCount = violations.filter((v) => v.severity === 'critical').length;
  const complianceScore = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

  return {
    results,
    violations,
    complianceScore,
    criticalViolationsCount,
    passedCount,
    failedCount,
  };
}
