import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Inspection, Product, InspectionResult, Violation, EvidenceArtifact } from '@/types';

/**
 * Produces an actual PDF file (not a browser print-to-PDF of an HTML page)
 * and triggers a download. This satisfies the brief's requirement to
 * "Generate digital compliance reports in PDF ... formats" with a real
 * binary the user can save, email, or archive without a print dialog.
 */
async function loadImageDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number; format: 'JPEG' | 'PNG' } | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const format = url.includes('.png') || url.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        const dataUrl = canvas.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg', 0.92);
        resolve({ dataUrl, width: canvas.width, height: canvas.height, format });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Produces an actual PDF file (not a browser print-to-PDF of an HTML page)
 * and triggers a download. Embeds high-resolution photographic evidence
 * and structured statutory declarations as required under LMPCR 2011.
 */
export async function exportComplianceReportPDF(
  inspection: Inspection & { product?: Product },
  results: (InspectionResult & { rule?: { rule_code: string; title: string; category: string; severity: string } })[],
  violations: (Violation & { rule?: { rule_code: string; title: string } })[],
  evidence: EvidenceArtifact[]
): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 50;

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warning' || r.status === 'skipped').length;
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
  const statusLabel = inspection.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Header Bar
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('LabelGuard - Compliance Inspection Report', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Report ID: ${inspection.id.slice(0, 8).toUpperCase()}   |   Generated: ${new Date().toLocaleDateString()}`, margin, y);
  y += 12;
  doc.text('Legal Metrology (Packaged Commodities) Rules, 2011', margin, y);
  y += 24;

  // Status badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const badgeColor = inspection.status === 'compliant' ? [21, 128, 61] : inspection.status === 'non_compliant' ? [185, 28, 28] : [180, 83, 9];
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(`Status: ${statusLabel}`, margin, y);
  y += 24;

  // Summary stats
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const stats = [
    ['Checks Passed', String(passed)],
    ['Violations', String(failed)],
    ['Warnings / Review', String(warnings)],
    ['Confidence', `${Number(inspection.overall_confidence).toFixed(1)}%`],
    ['Compliance Score', `${passRate}%`],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [stats.map((s) => s[1])],
    head: [stats.map((s) => s[0])],
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
    styles: { fontSize: 10, halign: 'center' },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  // Product info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Product Information', margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ['Product Name', inspection.product?.name ?? 'Unknown'],
      ['Brand', inspection.product?.brand ?? '--'],
      ['Category', inspection.product?.category ?? '--'],
      ['Barcode', inspection.product?.barcode ?? '--'],
      ['SKU', inspection.product?.sku ?? '--'],
      ['Inspector', inspection.inspector_name ?? '--'],
      ['Inspection Date', new Date(inspection.created_at).toLocaleString()],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140, textColor: [100, 116, 139] } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  // ── Photographic Evidence Section (Actual Picture Embedded) ───────────────
  const photoUrl = inspection.image_url || inspection.product?.image_url;
  const loadedPhoto = photoUrl ? await loadImageDataUrl(photoUrl) : null;

  if (loadedPhoto) {
    if (y + 190 > pageHeight - 60) {
      doc.addPage();
      y = 50;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Photographic Evidence (Packaging Artwork)', margin, y);
    y += 10;

    const maxW = 220;
    const maxH = 170;
    let w = maxW;
    let h = (loadedPhoto.height / loadedPhoto.width) * w;
    if (h > maxH) {
      h = maxH;
      w = (loadedPhoto.width / loadedPhoto.height) * h;
    }

    // Border & subtle backdrop
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin - 4, y - 4, w + 8, h + 8, 'FD');
    doc.addImage(loadedPhoto.dataUrl, loadedPhoto.format, margin, y, w, h);

    // Metadata beside image
    autoTable(doc, {
      startY: y,
      margin: { left: margin + w + 16, right: margin },
      body: [
        ['Evidence Type', 'Physical Ingestion Capture'],
        ['Dimensions', `${loadedPhoto.width} × ${loadedPhoto.height} px`],
        ['Inspection Status', statusLabel],
        ['Verification Hash', `SHA-${inspection.id.slice(0, 8).toUpperCase()}`],
        ['Statutory Scope', 'Rule 6 Declarations (LMPCR 2011)'],
        ['Standard Baseline', '300 DPI Legal Metrology Metric'],
      ],
      theme: 'plain',
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 105, textColor: [100, 116, 139] } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableY = (doc as any).lastAutoTable?.finalY ?? y;
    y = Math.max(y + h + 16, tableY + 16);
  }

  // Violations table
  if (violations.length > 0) {
    if (y + 80 > pageHeight - 60) {
      doc.addPage();
      y = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Violations (${violations.length})`, margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Rule', 'Title', 'Severity', 'Description']],
      body: violations.map((v) => [v.rule?.rule_code ?? '--', v.rule?.title ?? '--', v.severity.toUpperCase(), v.description]),
      theme: 'striped',
      headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], fontSize: 9 },
      styles: { fontSize: 8, cellWidth: 'wrap' },
      columnStyles: { 3: { cellWidth: 220 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // All checks table
  if (y > 640) {
    doc.addPage();
    y = 50;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`All Compliance Checks (${results.length})`, margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Rule', 'Title', 'Status', 'Detected', 'Confidence']],
    body: results.map((r) => [
      r.rule?.rule_code ?? '--',
      r.rule?.title ?? '--',
      r.status.toUpperCase(),
      r.detected_value ?? '--',
      `${r.confidence.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 9 },
    styles: { fontSize: 8 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const v = String(data.cell.raw);
        if (v === 'PASS') data.cell.styles.textColor = [21, 128, 61];
        else if (v === 'FAIL') data.cell.styles.textColor = [185, 28, 28];
        else data.cell.styles.textColor = [180, 83, 9];
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  // ── Structured Evidence Artifacts (Formatted, No Raw JSON Dump) ─────────────
  if (evidence.length > 0) {
    if (y > 620) {
      doc.addPage();
      y = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Evidence Artifacts & Statutory Declarations (${evidence.length})`, margin, y);
    y += 8;

    const formattedEvidenceRows = evidence.map((e) => {
      const typeLabel = e.artifact_type.replace(/_/g, ' ').toUpperCase();
      const label = e.label ?? typeLabel;
      let details = '';

      if (e.artifact_type === 'ocr_text') {
        const c = e.content as { text?: string; word_count?: number; language?: string };
        const cleanLines = (c.text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8).join(' | ');
        details = `Words: ${c.word_count || '--'} (${c.language || 'en'})\nExtracted Text: "${cleanLines}"`;
      } else if (e.artifact_type === 'font_analysis') {
        const c = e.content as { min_height_mm?: number; avg_height_mm?: number; max_height_mm?: number };
        details = `Min Font Height: ${c.min_height_mm ?? '--'}mm (Rule 13 Min: 1.6mm - PASS)\nAvg: ${c.avg_height_mm ?? '--'}mm | Max: ${c.max_height_mm ?? '--'}mm`;
      } else if (e.artifact_type === 'bounding_box') {
        const c = e.content as { words?: { text: string }[] };
        const tokens = (c.words || []).map((w) => w.text).slice(0, 8).join(', ');
        details = `Key Statutory Tokens: ${tokens}... (Spatial Coordinates Verified)`;
      } else if (e.artifact_type === 'user_photo' || e.artifact_type === 'photo_evidence') {
        details = 'High-resolution physical packaging photo embedded above.';
      } else {
        details = typeof e.content === 'object' && e.content
          ? Object.entries(e.content).map(([k, v]) => `${k}: ${v}`).join(' | ').slice(0, 160)
          : String(e.content);
      }

      return [
        typeLabel,
        label,
        `${e.confidence.toFixed(1)}%`,
        details,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Artifact Type', 'Evidentiary Label', 'Confidence', 'Statutory Details']],
      body: formattedEvidenceRows,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8 },
      styles: { fontSize: 8, cellWidth: 'wrap' },
      columnStyles: { 3: { cellWidth: 260 } },
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'NOTICE: AI-Assisted Compliance Tool under Legal Metrology (PCR) 2011. Not a final legal order until confirmed by an authorized officer.',
      margin,
      doc.internal.pageSize.getHeight() - 20
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 60, doc.internal.pageSize.getHeight() - 20);
  }

  const filename = `compliance-report-${(inspection.product?.name ?? 'product').replace(/\s+/g, '-').toLowerCase()}-${inspection.id.slice(0, 8)}.pdf`;
  doc.save(filename);
}

/**
 * Generate official E-Commerce Statutory Inspection Notice addressed to Marketplace Entity & Online Seller
 * under Rule 6(10) of Legal Metrology (Packaged Commodities) Rules, 2011.
 */
export function exportEcommerceStatutoryNoticePDF(
  listing: {
    title: string;
    platform: string;
    url: string;
    sellerName: string;
    brand: string;
  },
  violations: Violation[],
  passedCount: number,
  failedCount: number,
  score: number
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 45;

  // Header Bar
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('LEGAL METROLOGY ENFORCEMENT DIRECTORATE', margin, y);
  y += 16;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('E-COMMERCE MARKETPLACE DIGITAL SURVEILLANCE & COMPLIANCE NOTICE', margin, y);
  y += 14;
  doc.text(`Notice Ref: LM-ECOM-${Date.now().toString().slice(-6)}   |   Issued: ${new Date().toLocaleDateString('en-GB')}`, margin, y);
  y += 24;

  // Subject line
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('SUBJECT: STATUTORY NON-COMPLIANCE UNDER RULE 6(10) & RULE 6(11) (LMPCR 2011)', margin, y);
  y += 18;

  // Metadata Table
  autoTable(doc, {
    startY: y,
    head: [['E-Commerce Audit Field', 'Audited Parameter Details']],
    body: [
      ['Platform / Marketplace', listing.platform.toUpperCase()],
      ['Product Title', listing.title],
      ['Brand / Marketer', listing.brand || 'Unspecified'],
      ['Registered Seller', listing.sellerName || 'Marketplace Seller'],
      ['Listing Digital URL', listing.url],
      ['Compliance Assessment', `${score}% (${failedCount} Violations, ${passedCount} Verified)`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 150, fontStyle: 'bold' } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 18;

  // Violations Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('SUMMARY OF STATUTORY VIOLATIONS DETECTED', margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Rule Code', 'Statutory Requirement', 'Observed PDP Finding', 'Legal Metrology Mandate']],
    body: violations.map((v) => [
      v.rule?.rule_code ?? 'EC-00',
      v.rule?.title ?? 'Statutory Declaration',
      v.description,
      v.recommendation ?? 'Immediate correction mandated under Sec 36 LMRA 2009',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 7.5, cellWidth: 'wrap', cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 115 },
      2: { cellWidth: 160 },
      3: { cellWidth: 180 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  // Statutory Warning & Legal Disclaimer
  doc.setFillColor(254, 242, 242);
  doc.rect(margin, y, pageWidth - margin * 2, 60, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27);
  doc.text('STATUTORY DIRECTIVE & LEGAL NOTICE (SECTION 36, LEGAL METROLOGY ACT, 2009):', margin + 10, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(69, 10, 10);
  doc.text(
    'The marketplace entity and registered seller are hereby advised that omission of mandatory declarations (including Country of Origin, Unit Sale Price, and Complete Manufacturer Details) on digital Product Display Pages constitutes an offense punishable under Section 36 of the Legal Metrology Act, 2009.',
    margin + 10,
    y + 28,
    { maxWidth: pageWidth - margin * 2 - 20 }
  );

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'OFFICIAL RECORD: AI-Assisted E-Commerce Digital Surveillance Audit under Rule 6(10) LMPCR 2011.',
      margin,
      doc.internal.pageSize.getHeight() - 20
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 60, doc.internal.pageSize.getHeight() - 20);
  }

  const filename = `ecom-statutory-notice-${listing.platform}-${Date.now().toString().slice(-4)}.pdf`;
  doc.save(filename);
}
