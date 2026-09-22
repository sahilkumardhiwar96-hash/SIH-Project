import type { Product, ComplianceRule, Inspection, InspectionResult, Violation, EvidenceArtifact, AuditLogEntry } from '@/types';

export type Profile = {
  id: string;
  full_name: string;
  role: 'inspector' | 'admin';
  created_at: string;
};

export const INITIAL_RULES: ComplianceRule[] = [
  // PRESENCE RULES
  { id: 'rule-pr-001', rule_code: 'PR-001', title: 'Product Name Present', description: 'The label must clearly display the common or generic name of the product.', category: 'presence', severity: 'critical', regulation_reference: 'FSSR 2011 Reg 2.4.4', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-002', rule_code: 'PR-002', title: 'Net Quantity Declaration', description: 'The label must declare the net quantity of contents in metric units.', category: 'presence', severity: 'critical', regulation_reference: 'FSSR 2011 Reg 2.4.6', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-003', rule_code: 'PR-003', title: 'MRP Declaration', description: 'The Maximum Retail Price must be printed on the label.', category: 'presence', severity: 'critical', regulation_reference: 'FSSR 2011 Reg 2.4.10', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-004', rule_code: 'PR-004', title: 'Manufacturer Details', description: 'The name and complete address of the manufacturer/packer must be present.', category: 'presence', severity: 'critical', regulation_reference: 'FSSR 2011 Reg 2.4.5', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-005', rule_code: 'PR-005', title: 'FSSAI License Number', description: 'The 14-digit FSSAI license number must be displayed.', category: 'presence', severity: 'critical', regulation_reference: 'FSSR 2011 Reg 2.4.11', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-006', rule_code: 'PR-006', title: 'Ingredient List', description: 'A complete list of ingredients in descending order of weight must be present.', category: 'presence', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.7', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-007', rule_code: 'PR-007', title: 'Veg/Non-Veg Indicator', description: 'A vegetarian or non-vegetarian symbol must be displayed.', category: 'presence', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.8', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-008', rule_code: 'PR-008', title: 'Nutritional Information', description: 'Nutritional information per 100g/100ml must be declared.', category: 'presence', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.9', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-009', rule_code: 'PR-009', title: 'Batch Number', description: 'A batch or lot number for traceability must be present.', category: 'presence', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.12', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-010', rule_code: 'PR-010', title: 'Date of Packaging', description: 'The date of packaging must be clearly marked.', category: 'presence', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.13', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pr-011', rule_code: 'PR-011', title: 'Consumer Care Details', description: 'The label must display a consumer/customer care name, address, telephone number, or email for complaints and queries.', category: 'presence', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.5', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },

  // FORMAT RULES
  { id: 'rule-fr-001', rule_code: 'FR-001', title: 'Date Format Standard', description: 'Dates must follow the DD/MM/YYYY or MMM YYYY format.', category: 'format', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.13', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-fr-002', rule_code: 'FR-002', title: 'Quantity Unit Format', description: 'Net quantity must use standard metric units (g, kg, ml, l).', category: 'format', severity: 'major', regulation_reference: 'LMRA 2009 Sec 12', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-fr-003', rule_code: 'FR-003', title: 'MRP Format Standard', description: 'MRP must be prefixed with "MRP" or "Maximum Retail Price" followed by the amount.', category: 'format', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.10', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-fr-004', rule_code: 'FR-004', title: 'FSSAI Format', description: 'FSSAI number must be 14 digits in the format XXXX XX XX XXXX.', category: 'format', severity: 'critical', regulation_reference: 'FSSR 2011 Reg 2.4.11', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-fr-005', rule_code: 'FR-005', title: 'Ingredient Declaration Format', description: 'Ingredients must be listed in descending order of weight percentage.', category: 'format', severity: 'minor', regulation_reference: 'FSSR 2011 Reg 2.4.7', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },

  // QUANTITY RULES
  { id: 'rule-qr-001', rule_code: 'QR-001', title: 'Minimum Quantity Text Size', description: 'Net quantity text must be at least 1.6mm height for packages under 50g.', category: 'quantity', severity: 'minor', regulation_reference: 'LMRA 2009 Sec 13', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-qr-002', rule_code: 'QR-002', title: 'Quantity Prominence', description: 'Net quantity declaration must be prominently displayed on the principal display panel.', category: 'quantity', severity: 'major', regulation_reference: 'LMRA 2009 Sec 13', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-qr-003', rule_code: 'QR-003', title: 'No Dual Quantity Units', description: 'Quantity must not be declared in both metric and non-metric units.', category: 'quantity', severity: 'minor', regulation_reference: 'LMRA 2009 Sec 12', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },

  // MRP RULES
  { id: 'rule-mr-001', rule_code: 'MR-001', title: 'MRP Not Overstamped', description: 'MRP must not be overwritten or altered with additional stickers.', category: 'mrp', severity: 'critical', regulation_reference: 'FSSR 2011 Reg 2.4.10', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-mr-002', rule_code: 'MR-002', title: 'MRP Inclusive of Tax', description: 'MRP must be declared as inclusive of all taxes.', category: 'mrp', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.10', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-mr-003', rule_code: 'MR-003', title: 'MRP Font Size', description: 'MRP text must be at least 2mm in height.', category: 'mrp', severity: 'minor', regulation_reference: 'FSSR 2011 Reg 2.4.10', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },

  // FONT RULES
  { id: 'rule-ft-001', rule_code: 'FT-001', title: 'Minimum Font Size', description: 'All mandatory text must be at least 1.6mm in height.', category: 'font', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.14', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ft-002', rule_code: 'FT-002', title: 'Font Contrast', description: 'Text must have sufficient contrast against the background for readability.', category: 'font', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.14', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ft-003', rule_code: 'FT-003', title: 'Font Legibility', description: 'Text must use legible fonts without excessive decorative styling.', category: 'font', severity: 'minor', regulation_reference: 'FSSR 2011 Reg 2.4.14', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },

  // PLACEMENT RULES
  { id: 'rule-pl-001', rule_code: 'PL-001', title: 'Principal Display Panel', description: 'Mandatory information must appear on the principal display panel.', category: 'placement', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.3', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pl-002', rule_code: 'PL-002', title: 'Label Not Obscured', description: 'Mandatory text must not be obscured by graphics or other elements.', category: 'placement', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.3', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-pl-003', rule_code: 'PL-003', title: 'Veg/Non-Veg Placement', description: 'The veg/non-veg symbol must be placed on the principal display panel near the product name.', category: 'placement', severity: 'major', regulation_reference: 'FSSR 2011 Reg 2.4.8', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },

  // E-COMMERCE STATUTORY RULES (Rule 6(10) & Rule 6(11) of LMPCR 2011)
  { id: 'rule-ec-001', rule_code: 'EC-001', title: 'Country of Origin on Digital Listing', description: 'Every marketplace or e-commerce entity shall ensure the country of origin or manufacture is prominently declared on the digital product display page (PDP).', category: 'ecommerce', severity: 'critical', regulation_reference: 'LMPCR 2011 Rule 6(10)(a)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ec-002', rule_code: 'EC-002', title: 'Unit Sale Price (USP) Display', description: 'The unit sale price (e.g. ₹/g, ₹/ml, ₹/piece) must be clearly displayed alongside the Maximum Retail Price on the product listing.', category: 'ecommerce', severity: 'critical', regulation_reference: 'LMPCR 2011 Rule 6(11)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ec-003', rule_code: 'EC-003', title: 'Manufacturer / Packer / Importer Identity', description: 'The full legal name and complete physical address of manufacturer, packer or importer must be displayed on the digital listing specifications.', category: 'ecommerce', severity: 'critical', regulation_reference: 'LMPCR 2011 Rule 6(10)(b)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ec-004', rule_code: 'EC-004', title: 'Digital Net Quantity in Metric Units', description: 'Net quantity must be declared in standard metric units (g, kg, ml, l, or N) on the digital listing.', category: 'ecommerce', severity: 'major', regulation_reference: 'LMPCR 2011 Rule 6(10)(c)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ec-005', rule_code: 'EC-005', title: 'MRP Inclusive of All Taxes on Listing', description: 'The total price displayed on the e-commerce listing must explicitly denote that it is inclusive of all taxes.', category: 'ecommerce', severity: 'major', regulation_reference: 'LMPCR 2011 Rule 6(10)(d)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ec-006', rule_code: 'EC-006', title: 'Best Before / Expiry Date on Listing', description: 'For commodities with limited shelf life or food items, the expiry date or best before period must be displayed prior to consumer purchase.', category: 'ecommerce', severity: 'major', regulation_reference: 'LMPCR 2011 Rule 6(10)(e)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ec-007', rule_code: 'EC-007', title: 'Consumer Grievance / Customer Care Information', description: 'Customer care contact number, email address, or dedicated grievance channel must be accessible on the digital product page.', category: 'ecommerce', severity: 'major', regulation_reference: 'LMPCR 2011 Rule 6(10)(f)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'rule-ec-008', rule_code: 'EC-008', title: 'Product Image vs Listing Text Consistency', description: 'Product declarations visible on packaging photos in the e-commerce gallery must not contradict the digital specifications.', category: 'ecommerce', severity: 'major', regulation_reference: 'LMPCR 2011 Rule 6(10)', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_INSPECTIONS: Inspection[] = [];
export const INITIAL_RESULTS: InspectionResult[] = [];
export const INITIAL_VIOLATIONS: Violation[] = [];
export const INITIAL_EVIDENCE: EvidenceArtifact[] = [];
export const INITIAL_AUDIT_LOG: AuditLogEntry[] = [];

export const DEFAULT_USER_PROFILE: Profile = {
  id: 'usr-demo-001',
  full_name: 'Inspector R. Sharma',
  role: 'inspector',
  created_at: '2026-01-01T00:00:00.000Z',
};
