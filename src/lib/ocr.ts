export type OcrWord = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  heightPx: number;
};

export type OcrResult = {
  fullText: string;
  words: OcrWord[];
  avgConfidence: number;
  imageWidth: number;
  imageHeight: number;
  engine?: string;
};

/**
 * Runs OCR text extraction exclusively using the PaddleOCR (PP-OCRv4) deep learning engine.
 */
export async function runOcr(
  imageUrl: string,
  onProgress?: (status: string, progress: number) => void
): Promise<OcrResult> {
  return runSmartOcr(imageUrl, onProgress);
}

/**
 * Checks if the local deep-learning PaddleOCR (PP-OCRv4) microservice is running.
 */
export async function checkPaddleOcrAvailability(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('http://127.0.0.1:8000/health', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ready === true;
  } catch {
    return false;
  }
}

/**
 * Executes high-precision deep learning OCR via the local PaddleOCR (PP-OCRv4) microservice.
 */
export async function recognizeWithPaddleOcr(imageUrl: string): Promise<OcrResult> {
  const res = await fetch('http://127.0.0.1:8000/api/ocr/base64', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageUrl }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PaddleOCR service error: ${errText}`);
  }

  const data = await res.json();
  const words: OcrWord[] = (data.words || []).map((w: any) => ({
    text: w.text,
    confidence: w.confidence,
    bbox: w.bbox,
    heightPx: Math.max(1, (w.bbox?.y1 ?? 0) - (w.bbox?.y0 ?? 0)),
  }));

  let imageWidth = 0;
  let imageHeight = 0;
  for (const w of words) {
    if (w.bbox) {
      imageWidth = Math.max(imageWidth, w.bbox.x1);
      imageHeight = Math.max(imageHeight, w.bbox.y1);
    }
  }

  return {
    fullText: data.text || '',
    words,
    avgConfidence: data.confidence || 95,
    imageWidth: imageWidth || 1600,
    imageHeight: imageHeight || 1200,
    engine: data.engine || 'PaddleOCR PP-OCRv4 (Deep Learning)',
  };
}

/**
 * Executes OCR exclusively via PaddleOCR (PP-OCRv4 Deep Learning Engine).
 */
export async function runSmartOcr(
  imageUrl: string,
  onProgress?: (status: string, progress: number) => void
): Promise<OcrResult> {
  const isPaddleOnline = await checkPaddleOcrAvailability();
  if (!isPaddleOnline) {
    throw new Error(
      'PaddleOCR Engine is offline. Please ensure the backend microservice is running at http://127.0.0.1:8000.'
    );
  }

  if (onProgress) {
    onProgress('Running PaddleOCR (PP-OCRv4 Deep Learning Engine)...', 0.5);
  }

  const result = await recognizeWithPaddleOcr(imageUrl);
  if (onProgress) {
    onProgress('Completed Deep Learning OCR (PaddleOCR PP-OCRv4)', 1.0);
  }
  return result;
}

/**
 * Merges multiple OcrResult objects (from different label panels of the same product)
 * into a single unified OcrResult for compliance evaluation.
 *
 * - fullText: concatenated from all panels (with panel headers for traceability)
 * - words: deduplicated by position+text across panels; higher-confidence word wins
 * - avgConfidence: length-weighted average across all merged words
 * - imageWidth / imageHeight: max across all panels (largest canvas reference)
 * - engine: from the first result (all panels use same engine)
 */
export function mergeOcrResults(results: OcrResult[], panelLabels?: string[]): OcrResult {
  if (results.length === 0) {
    return {
      fullText: '',
      words: [],
      avgConfidence: 0,
      imageWidth: 0,
      imageHeight: 0,
      engine: 'none',
    };
  }

  if (results.length === 1) return results[0];

  // Merge full text with panel headers so compliance engine sees all declarations
  const combinedText = results
    .map((r, i) => {
      const label = panelLabels?.[i] ?? `Panel ${i + 1}`;
      return `--- ${label} ---\n${r.fullText ?? ''}`;
    })
    .join('\n\n');

  // Deduplicate words: key = rounded-position + lowercased text.
  // Each panel uses its own coordinate space, so we offset x by panel index * 2000
  // to avoid false-positive spatial duplicates across different panels.
  const wordMap = new Map<string, OcrWord>();
  results.forEach((result, panelIdx) => {
    const xOffset = panelIdx * 2000;
    for (const w of result.words) {
      const key = `${Math.round((w.bbox.x0 + xOffset) / 10)}_${Math.round(w.bbox.y0 / 10)}_${w.text.toLowerCase()}`;
      const existing = wordMap.get(key);
      if (!existing || w.confidence > existing.confidence) {
        wordMap.set(key, {
          ...w,
          bbox: {
            x0: w.bbox.x0 + xOffset,
            y0: w.bbox.y0,
            x1: w.bbox.x1 + xOffset,
            y1: w.bbox.y1,
          },
        });
      }
    }
  });

  const mergedWords: OcrWord[] = Array.from(wordMap.values());

  // Length-weighted confidence average
  let totalWeight = 0;
  let weightedConfSum = 0;
  for (const w of mergedWords) {
    const weight = Math.min(8, Math.max(1, w.text.length));
    weightedConfSum += w.confidence * weight;
    totalWeight += weight;
  }
  const avgConfidence = totalWeight > 0 ? weightedConfSum / totalWeight : 0;

  const imageWidth = Math.max(...results.map((r) => r.imageWidth ?? 0));
  const imageHeight = Math.max(...results.map((r) => r.imageHeight ?? 0));

  return {
    fullText: combinedText,
    words: mergedWords,
    avgConfidence,
    imageWidth,
    imageHeight,
    engine: results[0].engine,
  };
}
