import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import type { Inspection, Product, InspectionResult, Violation, EvidenceArtifact } from '@/types';

/**
 * Produces a genuinely editable Word document (.docx) for the compliance
 * report with embedded photographic evidence and structured statutory tables.
 */
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function headerCell(text: string) {
  return new TableCell({
    borders,
    shading: { fill: 'F1F5F9' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: '475569' })] })],
  });
}

function cell(text: string) {
  return new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: text || '--', size: 18 })] })] });
}

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  if (!url) return null;
  try {
    let arrayBuffer: ArrayBuffer;
    let width = 360;
    let height = 300;

    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const base64Data = parts[1];
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        u8[i] = binaryStr.charCodeAt(i);
      }
      arrayBuffer = u8.buffer;
    } else {
      const res = await fetch(url);
      if (!res.ok) return null;
      arrayBuffer = await res.arrayBuffer();
    }

    if (typeof window !== 'undefined') {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          width = img.naturalWidth || 360;
          height = img.naturalHeight || 300;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    }

    return { bytes: new Uint8Array(arrayBuffer), width, height };
  } catch {
    return null;
  }
}

export async function exportComplianceReportDocx(
  inspection: Inspection & { product?: Product },
  results: (InspectionResult & { rule?: { rule_code: string; title: string; category: string; severity: string } })[],
  violations: (Violation & { rule?: { rule_code: string; title: string } })[],
  evidence: EvidenceArtifact[]
): Promise<void> {
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
  const statusLabel = inspection.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const productTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ['Product Name', inspection.product?.name ?? 'Unknown'],
      ['Brand', inspection.product?.brand ?? '--'],
      ['Category', inspection.product?.category ?? '--'],
      ['Barcode', inspection.product?.barcode ?? '--'],
      ['SKU', inspection.product?.sku ?? '--'],
      ['Inspector', inspection.inspector_name ?? '--'],
      ['Inspection Date', new Date(inspection.created_at).toLocaleString()],
      ['Compliance Score', `${passRate}%`],
    ].map(([label, value]) => new TableRow({ children: [headerCell(label), cell(value)] })),
  });

  // Fetch packaging photo for embedding in report
  const photoUrl = inspection.image_url || inspection.product?.image_url;
  const imageBytes = photoUrl ? await fetchImageBytes(photoUrl) : null;

  const photoParagraphs = imageBytes
    ? [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
          children: [new TextRun('Photographic Evidence (Packaging Artwork)')],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: imageBytes.bytes,
              transformation: {
                width: 320,
                height: Math.min(320, Math.round(320 * (imageBytes.height / imageBytes.width))),
              },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: 'Figure 1: Official physical packaging photo attached to statutory inspection dossier.',
              italics: true,
              size: 16,
              color: '64748B',
            }),
          ],
        }),
      ]
    : [];

  const resultsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('Rule'), headerCell('Title'), headerCell('Status'), headerCell('Detected'), headerCell('Confidence')] }),
      ...results.map(
        (r) =>
          new TableRow({
            children: [
              cell(r.rule?.rule_code ?? '--'),
              cell(r.rule?.title ?? '--'),
              cell(r.status.toUpperCase()),
              cell(r.detected_value ?? '--'),
              cell(`${r.confidence.toFixed(1)}%`),
            ],
          })
      ),
    ],
  });

  const violationsTable =
    violations.length > 0
      ? new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                headerCell('Rule'),
                headerCell('Title'),
                headerCell('Severity'),
                headerCell('Description'),
                headerCell('Recommendation'),
              ],
            }),
            ...violations.map(
              (v) =>
                new TableRow({
                  children: [
                    cell(v.rule?.rule_code ?? '--'),
                    cell(v.rule?.title ?? '--'),
                    cell(v.severity.toUpperCase()),
                    cell(v.description),
                    cell(v.recommendation ?? '--'),
                  ],
                })
            ),
          ],
        })
      : null;

  const evidenceParagraphs = evidence.flatMap((e) => {
    const typeLabel = e.artifact_type.replace(/_/g, ' ').toUpperCase();
    const label = e.label ?? typeLabel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = e.content as any;

    if (e.artifact_type === 'ocr_text') {
      return [
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${label} `, bold: true }),
            new TextRun({ text: `(${e.confidence.toFixed(1)}% detection confidence)`, color: '64748B', size: 18 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: 'Extracted Statutory Declarations:\n', bold: true, size: 16 }),
            new TextRun({ text: String(content?.text ?? '').replace(/\n+/g, '  |  '), italics: true, size: 18 }),
          ],
        }),
      ];
    }

    if (e.artifact_type === 'font_analysis') {
      return [
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${label} `, bold: true }),
            new TextRun({ text: `(Rule 13 Statutory Height Verification - ${e.confidence.toFixed(1)}% confidence)`, color: '64748B', size: 18 }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                headerCell('Measurement Parameter'),
                headerCell('Observed Metric'),
                headerCell('Statutory Standard'),
                headerCell('Compliance Status'),
              ],
            }),
            new TableRow({
              children: [
                cell('Minimum Font Height'),
                cell(`${content?.min_height_mm ?? '--'} mm`),
                cell('1.60 mm (Rule 13 LMPCR)'),
                cell((content?.min_height_mm ?? 0) >= 1.6 ? 'COMPLIANT (PASS)' : 'ADVISORY (OFFICER REVIEW)'),
              ],
            }),
            new TableRow({
              children: [
                cell('Average Font Height'),
                cell(`${content?.avg_height_mm ?? '--'} mm`),
                cell('--'),
                cell('OPTIMAL'),
              ],
            }),
            new TableRow({
              children: [
                cell('Assumed Resolution Baseline'),
                cell(`${content?.assumed_dpi ?? 300} DPI`),
                cell('Standard Camera Capture'),
                cell('VALIDATED'),
              ],
            }),
          ],
        }),
      ];
    }

    if (e.artifact_type === 'bounding_box') {
      const topWords = (content?.words ?? []).slice(0, 10);
      return [
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${label} `, bold: true }),
            new TextRun({ text: `(${e.confidence.toFixed(1)}% confidence - Spatial Verification)`, color: '64748B', size: 18 }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                headerCell('Detected Statutory Token'),
                headerCell('Confidence'),
                headerCell('Spatial Coordinates [x0, y0, x1, y1]'),
              ],
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...topWords.map(
              (w: any) =>
                new TableRow({
                  children: [
                    cell(w.text ?? '--'),
                    cell(`${w.confidence ?? '--'}%`),
                    cell(w.bbox ? `[${w.bbox.x0}, ${w.bbox.y0}, ${w.bbox.x1}, ${w.bbox.y1}]` : '--'),
                  ],
                })
            ),
          ],
        }),
      ];
    }

    return [
      new Paragraph({
        spacing: { before: 160 },
        children: [
          new TextRun({ text: `${label} `, bold: true }),
          new TextRun({ text: `(${typeLabel}, ${e.confidence.toFixed(1)}% confidence)`, color: '64748B', size: 18 }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: typeof content === 'object' && content ? Object.entries(content).map(([k, v]) => `${k}: ${v}`).join(' | ') : String(content),
            size: 18,
          }),
        ],
      }),
    ];
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'LabelGuard - Compliance Inspection Report' })] }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `Report ID: ${inspection.id.slice(0, 8).toUpperCase()}  |  Generated: ${new Date().toLocaleDateString()}`, color: '64748B', size: 18 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Legal Metrology (Packaged Commodities) Rules, 2011', italics: true, color: '64748B', size: 18 })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Status: ${statusLabel}`,
                bold: true,
                color: inspection.status === 'compliant' ? '15803D' : inspection.status === 'non_compliant' ? 'B91C1C' : 'B45309',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `${passed} passed - ${failed} failed - ${results.length} total checks - ${Number(inspection.overall_confidence).toFixed(1)}% avg confidence`,
              }),
            ],
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun('Product Information')] }),
          productTable,
          ...photoParagraphs,
          ...(violationsTable
            ? [
                new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [new TextRun(`Violations (${violations.length})`)] }),
                violationsTable,
              ]
            : []),
          new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [new TextRun(`All Compliance Checks (${results.length})`)] }),
          resultsTable,
          ...(evidence.length > 0
            ? [new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [new TextRun(`Evidence Artifacts (${evidence.length})`)] }), ...evidenceParagraphs]
            : []),
          new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'LEGAL NOTICE: This is an AI-assisted compliance inspection document generated under the Legal Metrology (Packaged Commodities) Rules, 2011. Findings represent automated evidentiary detection and require formal verification and endorsement by an authorized Inspector / Reviewing Officer before statutory enforcement action.',
                italics: true,
                color: '64748B',
                size: 16,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `compliance-report-${(inspection.product?.name ?? 'product').replace(/\s+/g, '-').toLowerCase()}-${inspection.id.slice(0, 8)}.docx`;
  saveAs(blob, filename);
}
