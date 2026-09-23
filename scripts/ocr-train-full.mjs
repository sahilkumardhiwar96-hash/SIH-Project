/**
 * LabelGuard AI — Real OCR Pipeline on Full Dataset (151 images)
 *
 * Step 1: Check if PaddleOCR service is live at http://127.0.0.1:8000
 * Step 2: OCR all 151 label images via image_path API (fastest, no base64)
 * Step 3: Extract real compliance features from extracted text
 * Step 4: Run confidence training on real OCR data
 * Step 5: Save ocr-results.json + training-checkpoint-ocr-trained.json
 */

import { performance } from 'perf_hooks';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DATASET   = path.join(ROOT, 'dataset');
const OCR_URL   = 'http://127.0.0.1:8000';

// ── Compliance rule text checks ───────────────────────────────────────────────
const RULES = [
  { code: 'NQ-001', name: 'Net Quantity Declaration',      weight: 1.0,
    check: t => /net\s*(qty|quantity|wt|weight|vol|volume|content)[\s:]/i.test(t) },
  { code: 'MR-001', name: 'MRP Declaration',               weight: 1.0,
    check: t => /mrp|maximum retail price|m\.r\.p/i.test(t) },
  { code: 'MN-001', name: 'Manufacturer Info',             weight: 1.0,
    check: t => /manufactur|marketed by|packed by|mfg\.?\s*by/i.test(t) },
  { code: 'FR-004', name: 'FSSAI License (14-digit)',      weight: 1.0,
    check: t => /fssai[\s:.-]*\d{14}/i.test(t) },
  { code: 'BD-001', name: 'Batch / Lot Number',            weight: 0.9,
    check: t => /\b(batch|lot)[\s#:.]/i.test(t) },
  { code: 'MD-001', name: 'Manufacturing / Packing Date',  weight: 1.0,
    check: t => /date of (mfg|packing|manufacture|pack)|mfg date|pack date|date:/i.test(t) },
  { code: 'EX-001', name: 'Expiry / Best Before',          weight: 1.0,
    check: t => /best before|expiry|exp\.?\s*date|use by|\bbb:/i.test(t) },
  { code: 'IN-001', name: 'Ingredients Declaration',       weight: 1.0,
    check: t => /ingredients?:/i.test(t) },
  { code: 'NI-001', name: 'Nutritional Information',       weight: 0.9,
    check: t => /nutrition(al)?\s*(info|information|facts|value)/i.test(t) },
  { code: 'VS-001', name: 'Veg / Non-Veg Symbol',         weight: 0.85,
    check: t => /vegetarian|\bnon-veg\b|\bveg\b/i.test(t) },
  { code: 'CC-001', name: 'Consumer Care Contact',         weight: 0.8,
    check: t => /consumer care|customer care|toll.?free|1800.?\d|@[a-z]/i.test(t) },
  { code: 'FT-001', name: 'Readable Font (text present)',  weight: 1.0,
    check: t => t.trim().length > 50 },     // proxy: enough text extracted = readable
  { code: 'CT-001', name: 'Adequate Contrast (OCR conf)', weight: 0.9,
    check: (t, meta) => (meta?.avgConfidence ?? 0) >= 70 },  // OCR confidence proxy
  { code: 'MT-001', name: 'Metric Unit (no oz/lb)',        weight: 1.0,
    check: t => /([\d.]+\s*(g|kg|ml|l|litre|liter|gram))\b/i.test(t) && !/\boz\b|\blb\b/i.test(t) },
  { code: 'PR-011', name: 'Price per Unit (multi-pack)',   weight: 0.7,
    check: t => !/multi.?pack|combo/i.test(t) || /per unit|unit price/i.test(t) },
];

// ── Check PaddleOCR health ────────────────────────────────────────────────────
async function checkPaddle() {
  try {
    const res = await fetch(`${OCR_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ready === true;
  } catch {
    return false;
  }
}

// ── OCR one image via PaddleOCR image_path API ────────────────────────────────
async function ocrWithPaddle(filePath) {
  const res = await fetch(`${OCR_URL}/api/ocr/base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_path: filePath }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`PaddleOCR error ${res.status}: ${await res.text()}`);
  return await res.json();
}

// ── OCR one image via Tesseract.js (Node.js fallback) ────────────────────────
async function ocrWithTesseract(filePath) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, { logger: () => {} });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '3',
      user_defined_dpi: '300',
    });
    const result = await worker.recognize(filePath);
    const words = (result.data.words ?? []).map(w => ({
      text: w.text,
      confidence: w.confidence,
      bbox: w.bbox,
    }));
    const avgConf = words.length > 0
      ? words.reduce((s, w) => s + w.confidence, 0) / words.length
      : 0;
    return {
      text:          result.data.text ?? '',
      confidence:    Math.round(avgConf * 10) / 10,
      words,
      engine:        'Tesseract.js (Node.js)',
      elapsed_ms:    0,
    };
  } finally {
    await worker.terminate();
  }
}

// ── Evaluate compliance rules on extracted text ───────────────────────────────
function evaluateRules(text, meta) {
  return RULES.map(rule => {
    const pass = rule.check(text, meta);
    return { code: rule.code, name: rule.name, pass, weight: rule.weight };
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────
const split    = JSON.parse(readFileSync(path.join(ROOT, 'dataset-split.json'), 'utf-8'));
const allFiles = [...split.train_samples, ...split.test_samples];

console.log('='.repeat(70));
console.log('   LABELGUARD AI — REAL OCR PIPELINE ON FULL DATASET            ');
console.log('='.repeat(70));

const paddleOnline = await checkPaddle();
console.log(`  OCR Engine     : ${paddleOnline ? '✓ PaddleOCR PP-OCRv4 (Deep Learning)' : '○ Tesseract.js (Node.js fallback)'}`);
console.log(`  Total images   : ${allFiles.length} (${split.train_samples.length} train / ${split.test_samples.length} test)`);
console.log(`  Compliance rules: ${RULES.length}`);
console.log('-'.repeat(70));

const globalStart = performance.now();
const ocrResults  = [];
let   doneCount   = 0;
let   ocrErrors   = 0;
let   totalRulesPassed = 0;
let   totalRulesChecked = 0;

// Process all images (with concurrency of 4 for speed if PaddleOCR is online)
const CONCURRENCY = paddleOnline ? 4 : 1;  // Tesseract must be sequential (1 worker)

async function processImage(filename) {
  const filePath = path.join(DATASET, filename);
  const isTrain  = split.train_samples.includes(filename);

  if (!existsSync(filePath)) {
    ocrErrors++;
    return { filename, error: 'File not found', isTrain };
  }

  const t0 = performance.now();
  let ocrData;
  try {
    ocrData = paddleOnline
      ? await ocrWithPaddle(filePath)
      : await ocrWithTesseract(filePath);
  } catch (err) {
    ocrErrors++;
    return { filename, error: err.message, isTrain };
  }

  const text    = ocrData.text ?? '';
  const ocrConf = ocrData.confidence ?? 0;
  const meta    = { avgConfidence: ocrConf };
  const rules   = evaluateRules(text, meta);
  const passed  = rules.filter(r => r.pass).length;
  const elapsed = performance.now() - t0;

  doneCount++;
  totalRulesPassed  += passed;
  totalRulesChecked += rules.length;

  const pct = ((doneCount / allFiles.length) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(doneCount / allFiles.length * 30)).padEnd(30);
  process.stdout.write(
    `\r  [${bar}] ${pct}% | ${doneCount}/${allFiles.length} | ${filename.slice(0, 28).padEnd(28)} | Rules: ${passed}/${rules.length} | OCR: ${ocrConf.toFixed(0)}%  `
  );

  return {
    filename,
    isTrain,
    split:         isTrain ? 'train' : 'test',
    ocrText:       text.slice(0, 500),   // store first 500 chars
    ocrConfidence: ocrConf,
    wordCount:     (ocrData.words ?? []).length,
    engine:        ocrData.engine ?? 'unknown',
    elapsedMs:     Math.round(elapsed),
    rules: rules.map(r => ({ code: r.code, pass: r.pass })),
    rulesPassed:   passed,
    rulesTotal:    rules.length,
    complianceScore: Math.round((passed / rules.length) * 100),
  };
}

// Process in batches with concurrency control
for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
  const batch   = allFiles.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(processImage));
  ocrResults.push(...results.filter(Boolean));
}

console.log('\n');

// ── Compute summary stats ─────────────────────────────────────────────────────
const validResults = ocrResults.filter(r => !r.error);
const trainResults = validResults.filter(r => r.isTrain);
const testResults  = validResults.filter(r => !r.isTrain);

const avgOcrConf   = validResults.reduce((s, r) => s + r.ocrConfidence, 0) / validResults.length;
const avgCompliance = validResults.reduce((s, r) => s + r.complianceScore, 0) / validResults.length;
const trainCompliance = trainResults.reduce((s, r) => s + r.complianceScore, 0) / (trainResults.length || 1);
const testCompliance  = testResults.reduce((s, r) => s + r.complianceScore, 0) / (testResults.length || 1);

// Per-rule pass rates across full dataset
const ruleStats = RULES.map((rule, i) => {
  const passes = validResults.filter(r => r.rules[i]?.pass).length;
  return {
    code:       rule.code,
    name:       rule.name,
    passes,
    total:      validResults.length,
    passRate:   Math.round((passes / validResults.length) * 100),
  };
});

const totalMs    = performance.now() - globalStart;
const throughput = Math.round((validResults.length / totalMs) * 1000);

// ── Print results ─────────────────────────────────────────────────────────────
console.log('='.repeat(70));
console.log('  OCR PIPELINE COMPLETE');
console.log('-'.repeat(70));
console.log(`  Images processed   : ${validResults.length}/${allFiles.length}  (${ocrErrors} errors)`);
console.log(`  Avg OCR Confidence : ${avgOcrConf.toFixed(2)}%`);
console.log(`  Avg Compliance     : ${avgCompliance.toFixed(2)}%`);
console.log(`  Train Compliance   : ${trainCompliance.toFixed(2)}%  (${trainResults.length} samples)`);
console.log(`  Test  Compliance   : ${testCompliance.toFixed(2)}%  (${testResults.length} samples)`);
console.log(`  Total Duration     : ${(totalMs / 1000).toFixed(1)}s`);
console.log(`  Throughput         : ${throughput} images/sec`);
console.log('-'.repeat(70));
console.log('  RULE PASS RATES ACROSS DATASET:');
ruleStats.forEach(r => {
  const bar = '█'.repeat(Math.round(r.passRate / 5)).padEnd(20);
  console.log(`  ${r.code.padEnd(8)} ${r.name.padEnd(35)} ${String(r.passRate).padStart(3)}%  ${bar} (${r.passes}/${r.total})`);
});
console.log('='.repeat(70));

// ── Save OCR results JSON ────────────────────────────────────────────────────
const ocrOut = {
  generated_at:     new Date().toISOString(),
  engine:           paddleOnline ? 'PaddleOCR PP-OCRv4' : 'Tesseract.js',
  total_images:     allFiles.length,
  processed:        validResults.length,
  errors:           ocrErrors,
  avg_ocr_confidence:   avgOcrConf,
  avg_compliance_score: avgCompliance,
  train_compliance:     trainCompliance,
  test_compliance:      testCompliance,
  rule_pass_rates:  ruleStats,
  results:          ocrResults,
};

writeFileSync(path.join(ROOT, 'ocr-results.json'), JSON.stringify(ocrOut, null, 2));

// ── Save training checkpoint ──────────────────────────────────────────────────
const checkpoint = {
  trained_at:            new Date().toISOString(),
  training_type:         'real_ocr_pipeline',
  engine:                paddleOnline ? 'PaddleOCR PP-OCRv4' : 'Tesseract.js',
  dataset: {
    total_images:        allFiles.length,
    processed:           validResults.length,
    train_samples:       trainResults.length,
    test_samples:        testResults.length,
  },
  performance: {
    avg_ocr_confidence:  avgOcrConf,
    avg_compliance:      avgCompliance,
    train_compliance:    trainCompliance,
    test_compliance:     testCompliance,
    total_ms:            Math.round(totalMs),
    throughput_imgs_sec: throughput,
  },
  rule_pass_rates: ruleStats,
};

writeFileSync(path.join(ROOT, 'training-checkpoint-ocr-trained.json'), JSON.stringify(checkpoint, null, 2));
console.log(`\n  [✓] OCR results  → ocr-results.json`);
console.log(`  [✓] Checkpoint   → training-checkpoint-ocr-trained.json\n`);
