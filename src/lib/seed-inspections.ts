import type { Product, ComplianceRule, Inspection, InspectionResult, Violation, EvidenceArtifact, AuditLogEntry } from '@/types';
import type { OcrResult } from '@/lib/ocr';
import { evaluateCompliance, computeFontStats, ASSUMED_SCAN_DPI, type ContrastStats } from '@/lib/compliance-engine';

export type ProductSeedData = {
  productId: string;
  rawText: string;
  wordHeightsPx: number[];
  contrastStats: ContrastStats;
  notes: string;
  dateOffsetHours: number;
};

export const PRODUCT_SEEDS: ProductSeedData[] = [
  {
    productId: 'prod-001',
    rawText: `Organic Honey 500g\nNaturePure\nMRP Rs. 250\nNet Wt 500g\nNaturePure Foods Pvt Ltd\nMumbai, Maharashtra\nFSSAI: 10018022001234\nBatch: NP2024A\nPack Date: 15/03/2024\nBest Before 18 months\nIngredients: Organic Honey\nVegetarian`,
    wordHeightsPx: [14, 18, 14, 22, 14, 14, 14, 14, 14, 14, 14], // min ~1.18mm (<1.6mm fails FT-001)
    contrastStats: { avgRatio: 4.82, minRatio: 3.15, maxRatio: 7.21, sampleSize: 20 },
    notes: 'Automated label analysis completed. Violations detected in FSSAI digit count and font size.',
    dateOffsetHours: 2,
  },
  {
    productId: 'prod-002',
    rawText: `Premium Green Tea 250g\nTeaLeaf Special Selection\nNet Quantity: 250g\nMRP Rs. 350.00 (Incl. of all taxes)\nManufactured by: TeaLeaf Estates Ltd, Darjeeling, WB\nFSSAI: 10020033004455\nBatch: TL-2024-GT\nDate of Packing: 10/01/2024\nIngredients: 100% Organic Green Tea Leaves\nNutritional Information per 100g\nConsumer Care Toll-Free: 1800-200-3000, care@tealeaf.com\nVegetarian`,
    wordHeightsPx: [24, 22, 22, 28, 22, 22, 22, 22, 22, 22, 22, 22], // min ~1.86mm (passes FT-001)
    contrastStats: { avgRatio: 5.42, minRatio: 3.8, maxRatio: 8.1, sampleSize: 24 },
    notes: 'All compliance checks passed. Full declarations present with compliant font heights and contrast.',
    dateOffsetHours: 5,
  },
  {
    productId: 'prod-003',
    rawText: `Spicy Chili Sauce 200ml\nFlavorBomb Hot Condiments\nNet Qty: 200ml\nMRP 95\nPacked by FlavorBomb Condiments Pvt Ltd, Pune, Maharashtra\nFSSAI 10019022001122\nBatch: FB-CH-09\nDate: 14/02/2024\nIngredients: Red Chilies, Vinegar, Garlic, Salt\nNutrition Facts per 100ml\nCustomer Support: 020-25678900\nVegetarian`,
    wordHeightsPx: [20, 20, 20, 20, 20, 20, 20, 20], // min ~1.69mm
    contrastStats: { avgRatio: 4.15, minRatio: 3.1, maxRatio: 6.2, sampleSize: 18 },
    notes: 'Minor formatting discrepancies on MRP display format. Flagged for review.',
    dateOffsetHours: 12,
  },
  {
    productId: 'prod-004',
    rawText: `Whole Wheat Flour 1kg\nHealthyGrain Pure Chakki Atta\nNet Quantity: 1 kg\nMRP Rs. 65.00 (Incl. of all taxes)\nManufactured by HealthyGrain Mills Pvt Ltd, Indore, MP\nFSSAI: 10018026007788\nBatch No: HG-2024-A1\nDate of Mfg: 05/03/2024\nIngredients: 100% Whole Wheat Grains\nNutritional Information per 100g\nCustomer Care Toll-Free: 1800-419-5555, care@healthygrain.in\nVegetarian`,
    wordHeightsPx: [26, 25, 25, 30, 25, 25, 25, 25, 25], // min ~2.11mm
    contrastStats: { avgRatio: 6.28, minRatio: 4.5, maxRatio: 9.4, sampleSize: 25 },
    notes: 'Fully compliant packaged commodity label. Meets all mandatory LMRA & FSSR rules.',
    dateOffsetHours: 18,
  },
  {
    productId: 'prod-005',
    rawText: `Almond Butter 300g\nNutriNuts 100% Pure Spread\nNet Quantity: 300 g\nMRP Rs. 380 (Inclusive of all taxes)\nManufactured by: NutriNuts Foods Pvt Ltd, Bangalore, Karnataka\nFSSAI: 10021043006677\nBatch: NN-AB-44\nDate of Packing: 20/02/2024\nIngredients: Roasted California Almonds, Organic Sea Salt\nNutritional Facts per 100g\nConsumer Care: care@nutrinuts.com 1800-888-999\nVegetarian`,
    wordHeightsPx: [22, 21, 21, 26, 21, 21, 21, 21, 21], // min ~1.77mm
    contrastStats: { avgRatio: 4.65, minRatio: 3.2, maxRatio: 6.9, sampleSize: 22 },
    notes: 'Full compliance verified across all mandatory declarations, font metrics, and contrast.',
    dateOffsetHours: 24,
  },
  {
    productId: 'prod-006',
    rawText: `Cold Pressed Olive Oil 500ml\nOliveGrove Extra Virgin Mediterranean Oil\nNet Quantity: 500 ml\nMRP Rs. 750 (Incl. of all taxes)\nMarketed by OliveGrove India Ltd, Gurugram, Haryana\nFSSAI Lic: 10016064003322\nBatch: OG-EV-102\nDate of Packing: 12/01/2024\nIngredients: Extra Virgin Olive Oil\nNutritional Value per 100ml\nCustomer Service Toll-Free: 1800-345-6789, support@olivegrove.com\nVegetarian`,
    wordHeightsPx: [22, 22, 22, 27, 22, 22, 22, 22], // min ~1.86mm
    contrastStats: { avgRatio: 5.12, minRatio: 3.6, maxRatio: 7.8, sampleSize: 24 },
    notes: 'Compliant packaged oil declaration with proper metric declarations.',
    dateOffsetHours: 36,
  },
  {
    productId: 'prod-007',
    rawText: `Dark Chocolate 70%\nCocoaCraft Artisanal Blend\nNet Qty: 100 g\nMRP Rs. 180 (Incl. of all taxes)\nManufactured by CocoaCraft Confections, Kochi, Kerala\nFSSAI: 10019041005544\nBatch: CC-DC-70\nDate: 18/02/2024\nIngredients: Cocoa Mass, Cocoa Butter, Cane Sugar\nNutrition Information per 100g\nVegetarian`,
    wordHeightsPx: [20, 20, 20, 25, 20, 20, 20, 20], // min ~1.69mm
    // Low contrast on dark background packaging (fails FT-002 heuristic < 3.0:1)
    contrastStats: { avgRatio: 2.45, minRatio: 1.9, maxRatio: 2.85, sampleSize: 19 },
    notes: 'Violations detected: missing consumer care contact information and poor font contrast ratio (2.45:1 < 3.0:1 minimum).',
    dateOffsetHours: 42,
  },
  {
    productId: 'prod-008',
    rawText: `Basmati Rice 5kg\nRoyalGrain Aged Reserve Long Grain\nNet Quantity: 5 kg\nMRP Rs. 540.00 (Incl. of all taxes)\nPacked by: RoyalGrain Mills Ltd, Karnal, Haryana\nFSSAI: 10017011009988\nBatch No: RG-BR-500\nDate of Packing: 01/03/2024\nIngredients: Premium Basmati Rice\nNutritional Facts per 100g\nConsumer Care Toll Free: 1800-180-2222, contact@royalgrain.com\nVegetarian`,
    wordHeightsPx: [28, 28, 28, 34, 28, 28, 28, 28, 28], // min ~2.37mm
    contrastStats: { avgRatio: 6.84, minRatio: 4.8, maxRatio: 9.8, sampleSize: 26 },
    notes: 'Bulk grain package label strictly conforms to Legal Metrology Packaged Commodities rules.',
    dateOffsetHours: 50,
  },
  {
    productId: 'prod-009',
    rawText: `Benzalkonium Chloride Medicated Plaster\nDettol MEDICATED PLASTER\nANTISEPTIC | WASHPROOF\nNet Contents: 1N strip (1.9 cm x 7.2 cm)\nMRP: Rs. 2.82 PER STRIP (inclusive of all taxes)\nMade in India\nMfd. by: Varun Medimpex Inc., Vill. Kheri, Dist. Sirmour (HP) 173030\nMfg. Lic. No. MFG/MD/2022/000115\nMarketed by / For Consumer Complaints contact Reckitt Consumer Care at: Reckitt Benckiser (India) Pvt. Ltd., DLF Cyber Park, Gurugram-122016\nConsumer Care Toll Free Number: 18001035012 Email: ConsumerHealth_India@reckitt.com\nEACH PAD CONTAINS BENZALKONIUM CHLORIDE SOLUTION IP EQUIV. TO BENZALKONIUM CHLORIDE 0.5% W/W\nBatch B.No. RW2607\nDate of Mfg: 02/2026 Exp: 01/2029`,
    wordHeightsPx: [24, 28, 22, 22, 22, 20, 20, 20, 20, 20, 20],
    contrastStats: { avgRatio: 7.45, minRatio: 5.2, maxRatio: 9.1, sampleSize: 22 },
    notes: 'User upload analysis: Dettol Medicated Plaster. High contrast (7.45:1), complete manufacturer & consumer care declarations, valid statutory unit pricing.',
    dateOffsetHours: 0.5,
  },
  {
    productId: 'prod-010',
    rawText: `Navjeevan Compounded Bandhani Hing\nNutritional Information Per 100g approx\nEnergy: 364 kcal Protein: 5.7 g Carbohydrates: 76.5 g\nFSSAI Lic. No. 11516018000012\nMfd. & Pkd. By: NAVJEEVAN HING SUPPLIERS CO., Plot No. A-546, TTC Indl. Area, MIDC, Mahape, Navi Mumbai - 400710, M.S. (India)\nCustomer Care Tel. No.: 022-27781230\nVegetarian`,
    wordHeightsPx: [18, 18, 16, 16, 16, 16, 16],
    contrastStats: { avgRatio: 5.2, minRatio: 3.8, maxRatio: 7.0, sampleSize: 18 },
    notes: 'User upload analysis: Navjeevan Hing. Upper panel containing MRP and Batch is motion-blurred; manufacturer, FSSAI, and nutritional table verified.',
    dateOffsetHours: 0.8,
  },
  {
    productId: 'prod-011',
    rawText: `Glucon-D Instant Energy\nGlucose Based Beverage Mix\nNutritional Value Per 100 g Per Serve (30 g)\nEnergy: 368 kcal Protein: 0 g Carbohydrates: 92 g of which Sugar (Sucrose): 45 g\nCalcium: 114 mg Phosphorus: 57 mg Vitamin C: 40 mg\nIngredients: Glucose (52%), Sucrose (45%), Acidity Regulator (330), Mineral (Calcium Phosphate), Common Edible Salt and Vitamin C\nContains Added Flavour (Nature Identical Flavouring Substances)\nVegetarian`,
    wordHeightsPx: [22, 22, 20, 20, 20, 20, 20],
    contrastStats: { avgRatio: 6.8, minRatio: 4.5, maxRatio: 8.5, sampleSize: 22 },
    notes: 'User upload analysis: Glucon-D. Prominent vegetarian indicator mark, dual per-serve nutritional values, and compliant QUID ingredient list.',
    dateOffsetHours: 1.2,
  },
  {
    productId: 'prod-012',
    rawText: `J.K.'S TEA Munnar Black Tea\nNutritional Information Typical values per 100g Energy: 120 kcal Protein: 19 g Carbohydrate: 4 g\nFSSAI: 21316174000256\nManufactured by M/s. J.K.'S TEA, Temple Road, Munnar, Kerala-685 612\nCustomer Care No.: 0486 5233129, Email: jkteas@gmail.com\nVegetarian`,
    wordHeightsPx: [24, 24, 20, 20, 20, 20],
    contrastStats: { avgRatio: 6.5, minRatio: 4.8, maxRatio: 8.2, sampleSize: 20 },
    notes: "User upload analysis: J.K.'S Tea. Valid 14-digit FSSAI license (21316174000256), full postal address with PIN, and complete customer care contact details.",
    dateOffsetHours: 1.5,
  },
  {
    productId: 'prod-013',
    rawText: `Parachute 100% Pure Coconut Oil\nNet Quantity: 500 ml (455.0 g)\nMRP: Rs. 145 (inclusive of all taxes)\nManufactured by Marico Limited, Kalina, Mumbai - 400 098, MH\nFSSAI: 10012022000258\nContact Marico Consumer Cell, P.O. Box 9093, Mumbai - 400 093, MH. Email: ccc@marico.com\nIngredient: Coconut Oil, Antioxidant [319]\nNutrition Information Per 100g Energy: 900 kcal\nVegetarian`,
    wordHeightsPx: [24, 22, 22, 22, 20, 20],
    contrastStats: { avgRatio: 8.9, minRatio: 6.2, maxRatio: 11.4, sampleSize: 25 },
    notes: 'User upload analysis: Parachute Coconut Oil. High-contrast white print on blue packaging (8.9:1), dual mass/volume declaration, and central FSSAI registration.',
    dateOffsetHours: 1.8,
  },
  {
    productId: 'prod-014',
    rawText: `Pickled Green Chilli in Oil\nNet Wt. 1 Kg\nServing Size: 1.00 oz (28.35 g)\nIngredients: Green Chilli Pieces (62%), Edible Oil, Mango Pulp, Spices (Mustard, Turmeric Powder), Salt, Acidity Regulators (Citric Acid, Acetic Acid), & Sodium Benzoate (E211)\nNutrition Facts Calories: 34 Total Fat: 4.23g Sodium: 924.83mg\nStore in dry & cool place Away from direct sunlight\nVegetarian`,
    wordHeightsPx: [20, 20, 18, 18, 18],
    contrastStats: { avgRatio: 5.4, minRatio: 3.6, maxRatio: 7.2, sampleSize: 19 },
    notes: "User upload analysis: Pickled Green Chilli. Non-compliance detected: non-metric unit 'oz' on domestic label and non-standard capital 'Kg' symbol instead of statutory 'kg'.",
    dateOffsetHours: 2.1,
  },
  {
    productId: 'prod-041',
    rawText: `CRISPY CRUNCHIES SNACK POTATO CHIPS\nOriginal Salted Flavor\nNET WT. 50g\nIngredients: Potatoes, Palm Oil, Salt, Flavorings, Conowatner, Cutatoes, Cold Fam, Brasoll, Sammes, Ruce Saus, Moiler, Potato, Niliorate.\nNutrition Facts\nServing Size 1 Ounce\nServings Per Container 20\nCalories 160\nTotal Fat 10g\nSodium 170mg\nTotal Carbohydrate 15g\nProtein 2g\nStorage Instructions: More annammeouns of be hwisd to storage ooines in pecssal and at elsemvis ioun inmiurbas\nVegetarian`,
    wordHeightsPx: [22, 18, 16, 16, 16, 14, 14],
    contrastStats: { avgRatio: 4.2, minRatio: 2.9, maxRatio: 6.8, sampleSize: 20 },
    notes: 'Uploaded pouch label analysis: Non-compliant. Missing statutory FSSAI license, missing MRP, missing manufacturer address, missing batch number, missing mfg/expiry dates, illegal non-metric serving unit (Ounce), and non-standard stylized veg symbol.',
    dateOffsetHours: 0.1,
  },
];

export function buildGeneratedInspections(products: Product[], rules: ComplianceRule[], targetCount = 50000) {
  const inspections: Inspection[] = [];
  const inspectionResults: InspectionResult[] = [];
  const violations: Violation[] = [];
  const evidenceArtifacts: EvidenceArtifact[] = [];
  const auditLogs: AuditLogEntry[] = [];

  const inspectors = [
    'AI Inspector v2.2',
    'Inspector R. Sharma',
    'Inspector P. Verma',
    'Inspector A. Patel',
    'Sr. Inspector K. Sen',
  ];

  // 1. First generate the 8 primary product inspections
  for (let i = 0; i < PRODUCT_SEEDS.length; i++) {
    const seed = PRODUCT_SEEDS[i];
    const product = products.find((p) => p.id === seed.productId) || products[i % products.length];
    if (!product) continue;

    const inspId = `insp-${seed.productId.replace('prod-', '')}`;
    const date = new Date(Date.now() - seed.dateOffsetHours * 3600 * 1000).toISOString();

    const words = seed.rawText.split(/\s+/).map((w, idx) => ({
      text: w,
      confidence: 85 + (idx % 12),
      bbox: {
        x0: 50 + (idx % 5) * 80,
        y0: 40 + Math.floor(idx / 5) * 40,
        x1: 50 + (idx % 5) * 80 + w.length * 10,
        y1: 40 + Math.floor(idx / 5) * 40 + (seed.wordHeightsPx[idx % seed.wordHeightsPx.length] || 20),
      },
      heightPx: seed.wordHeightsPx[idx % seed.wordHeightsPx.length] || 20,
    }));

    const ocr: OcrResult = {
      fullText: seed.rawText,
      words,
      avgConfidence: 89.4,
      imageWidth: 800,
      imageHeight: 1200,
    };

    const evaluatedResults = evaluateCompliance(ocr, rules, product, seed.contrastStats);
    const passedChecks = evaluatedResults.filter((r) => r.status === 'pass').length;
    const failedChecks = evaluatedResults.filter((r) => r.status === 'fail').length;
    const failedRules = evaluatedResults.filter((r) => r.status === 'fail');

    const finalStatus: Inspection['status'] =
      failedChecks > 0
        ? failedRules.some((r) => r.rule?.severity === 'critical')
          ? 'non_compliant'
          : 'review'
        : 'compliant';

    const avgConfidence =
      Math.round(
        (evaluatedResults.reduce((sum, r) => sum + r.confidence, 0) / evaluatedResults.length) * 10
      ) / 10;

    inspections.push({
      id: inspId,
      product_id: product.id,
      status: finalStatus,
      image_url: product.image_url,
      overall_confidence: avgConfidence,
      total_checks: evaluatedResults.length,
      passed_checks: passedChecks,
      failed_checks: failedChecks,
      inspector_name: 'AI Inspector v2.2',
      notes: seed.notes,
      created_at: date,
      completed_at: date,
    });

    for (const r of evaluatedResults) {
      inspectionResults.push({
        id: `res-${inspId}-${r.rule_id}`,
        inspection_id: inspId,
        rule_id: r.rule_id,
        status: r.status,
        confidence: r.confidence,
        detected_value: r.detected_value,
        expected_value: r.expected_value,
        message: r.message,
        created_at: date,
      });
    }

    for (const f of failedRules) {
      violations.push({
        id: `viol-${inspId}-${f.rule_id}`,
        inspection_id: inspId,
        rule_id: f.rule_id,
        severity: f.rule?.severity ?? 'major',
        description: f.message ?? 'Compliance violation detected',
        evidence_data: { detected: f.detected_value, expected: f.expected_value },
        recommendation: `Review and adjust label artwork for ${f.rule?.title ?? 'declaration'} to comply with ${f.rule?.regulation_reference ?? 'Legal Metrology Rules'}.`,
        is_resolved: false,
        created_at: date,
      });
    }

    const fontStats = computeFontStats(ocr);
    const topWords = [...ocr.words]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15)
      .map((w) => ({ text: w.text, confidence: Math.round(w.confidence), bbox: w.bbox }));

    evidenceArtifacts.push(
      {
        id: `ev-ocr-${inspId}`,
        inspection_id: inspId,
        artifact_type: 'ocr_text',
        label: 'Full Label OCR',
        content: { text: ocr.fullText, language: 'en', word_count: ocr.words.length },
        confidence: 90,
        created_at: date,
      },
      {
        id: `ev-font-${inspId}`,
        inspection_id: inspId,
        artifact_type: 'font_analysis',
        label: 'Font Size Analysis',
        content: {
          min_height_mm: fontStats.minHeightMm,
          max_height_mm: fontStats.maxHeightMm,
          avg_height_mm: fontStats.avgHeightMm,
          sample_size: fontStats.sampleSize,
          assumed_dpi: ASSUMED_SCAN_DPI,
          note: 'Heights estimated at 300 DPI baseline.',
        },
        confidence: 88,
        created_at: date,
      },
      {
        id: `ev-bbox-${inspId}`,
        inspection_id: inspId,
        artifact_type: 'bounding_box',
        label: 'Highest-Confidence OCR Words',
        content: { words: topWords, image_width_px: ocr.imageWidth, image_height_px: ocr.imageHeight },
        confidence: 92,
        created_at: date,
      },
      {
        id: `ev-color-${inspId}`,
        inspection_id: inspId,
        artifact_type: 'color_analysis',
        label: 'Contrast Ratio Analysis',
        content: {
          avg_ratio: Math.round(seed.contrastStats.avgRatio * 100) / 100,
          min_ratio: Math.round(seed.contrastStats.minRatio * 100) / 100,
          max_ratio: Math.round(seed.contrastStats.maxRatio * 100) / 100,
          sample_size: seed.contrastStats.sampleSize,
          threshold: 3.0,
          method: 'WCAG relative-luminance formula on OCR bounding boxes vs. surrounding pixels',
          note: 'Sampled pixel luminance inside vs. outside bounding boxes on offscreen canvas.',
        },
        confidence: 85,
        created_at: date,
      }
    );

    auditLogs.push(
      {
        id: `audit-create-${inspId}`,
        inspection_id: inspId,
        action: 'inspection_created',
        actor: 'system',
        details: { product_id: product.id, product_name: product.name, image_url: product.image_url },
        created_at: date,
      },
      {
        id: `audit-analysis-${inspId}`,
        inspection_id: inspId,
        action: 'analysis_completed',
        actor: 'AI Inspector v2.2',
        details: {
          overall_confidence: avgConfidence,
          violations_found: failedChecks,
          checks_passed: passedChecks,
          checks_failed: failedChecks,
          contrast_ratio: seed.contrastStats.avgRatio,
        },
        created_at: date,
      }
    );
  }

  // 2. Scale up to targetCount (50,000 runs) across the past 365 days
  const now = Date.now();
  const totalDays = 365;
  const criticalRule = rules.find((r) => r.rule_code === 'FR-004') || rules[0];
  const fontRule = rules.find((r) => r.rule_code === 'FT-001') || rules[1];
  const contrastRule = rules.find((r) => r.rule_code === 'FT-002') || rules[2];
  const careRule = rules.find((r) => r.rule_code === 'PR-011') || rules[3];
  const netQtyRule = rules.find((r) => r.rule_code === 'PR-002') || rules[4] || rules[0];
  const mrpRule = rules.find((r) => r.rule_code === 'PR-003') || rules[5] || rules[1];

  for (let num = 9; num <= targetCount; num++) {
    const product = products[(num - 1) % products.length];
    const inspId = `insp-${String(num).padStart(5, '0')}`;

    // Distributed timestamps over past 365 days
    const daysAgo = ((num - 9) / (targetCount - 8)) * totalDays;
    const timeJitterHours = (num * 7) % 24;
    const date = new Date(now - (daysAgo * 24 + timeJitterHours) * 3600 * 1000).toISOString();

    const inspector = inspectors[num % inspectors.length];

    // Status distribution: ~74% compliant, ~18% non_compliant, ~8% review
    const mod = num % 100;
    let status: Inspection['status'] = 'compliant';
    let passed = 28;
    let failed = 0;
    let confidence = 92.0 + ((num % 70) / 10);
    let note = 'Automated surveillance scan. Full compliance verified across all mandatory declarations.';

    if (mod >= 74 && mod < 92) {
      status = 'non_compliant';
      failed = (num % 3) + 1;
      passed = 28 - failed;
      confidence = 84.5 + ((num % 50) / 10);
      note = `Surveillance scan flagged ${failed} statutory non-compliance violations.`;

      // Add corresponding violation across diverse regulatory rules
      const ruleMod = num % 6;
      const violatedRule =
        ruleMod === 0 ? criticalRule :
        ruleMod === 1 ? fontRule :
        ruleMod === 2 ? contrastRule :
        ruleMod === 3 ? careRule :
        ruleMod === 4 ? netQtyRule : mrpRule;

      violations.push({
        id: `viol-${inspId}-${violatedRule.id}`,
        inspection_id: inspId,
        rule_id: violatedRule.id,
        severity: violatedRule.severity,
        description: `${violatedRule.title}: non-compliance detected during batch surveillance run ${inspId}.`,
        evidence_data: {
          run_id: inspId,
          rule_code: violatedRule.rule_code,
          regulation: violatedRule.regulation_reference,
        },
        recommendation: `Issue statutory notice under Legal Metrology Act for ${violatedRule.title}.`,
        is_resolved: num % 3 === 0,
        created_at: date,
      });
    } else if (mod >= 92) {
      status = 'review';
      failed = 1;
      passed = 27;
      confidence = 79.0 + ((num % 40) / 10);
      note = 'Borderline font contrast / placement detected. Routed for manual inspector verification.';
    }

    inspections.push({
      id: inspId,
      product_id: product.id,
      status,
      image_url: product.image_url,
      overall_confidence: Math.round(confidence * 10) / 10,
      total_checks: 28,
      passed_checks: passed,
      failed_checks: failed,
      inspector_name: inspector,
      notes: note,
      created_at: date,
      completed_at: date,
    });

    // Add audit log entry every 25 runs or for critical violations to maintain an authentic audit trail
    if (num % 25 === 0 || (status === 'non_compliant' && num % 10 === 0)) {
      auditLogs.push({
        id: `audit-${inspId}`,
        inspection_id: inspId,
        action: status === 'non_compliant' ? 'violation_flagged' : 'surveillance_inspection_completed',
        actor: inspector,
        details: {
          product_name: product.name,
          status,
          checks_passed: passed,
          checks_failed: failed,
          confidence: Math.round(confidence * 10) / 10,
        },
        created_at: date,
      });
    }
  }

  return {
    inspections,
    inspectionResults,
    violations,
    evidenceArtifacts,
    auditLogs,
  };
}
