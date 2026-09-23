export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  barcode: string | null;
  sku: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceRule = {
  id: string;
  rule_code: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'major' | 'minor';
  regulation_reference: string | null;
  is_active: boolean;
  created_at: string;
};

export type InspectionStatus = 'pending' | 'analyzing' | 'compliant' | 'non_compliant' | 'review';

export type Inspection = {
  id: string;
  product_id: string;
  status: InspectionStatus;
  image_url: string | null;
  overall_confidence: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  inspector_name: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  product?: Product;
};

export type ResultStatus = 'pass' | 'fail' | 'warning' | 'skipped' | 'pending';

export type InspectionResult = {
  id: string;
  inspection_id: string;
  rule_id: string;
  status: ResultStatus;
  confidence: number;
  detected_value: string | null;
  expected_value: string | null;
  message: string | null;
  created_at: string;
  rule?: ComplianceRule;
};

export type Violation = {
  id: string;
  inspection_id: string;
  rule_id: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  evidence_data: Record<string, unknown>;
  recommendation: string | null;
  is_resolved: boolean;
  created_at: string;
  rule?: ComplianceRule;
};

export type EvidenceArtifact = {
  id: string;
  inspection_id: string;
  artifact_type: 'ocr_text' | 'bounding_box' | 'font_analysis' | 'image_region' | 'color_analysis' | 'user_photo';
  label: string | null;
  content: Record<string, unknown>;
  confidence: number;
  created_at: string;
};

export type AuditLogEntry = {
  id: string;
  inspection_id: string | null;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type Page = 'dashboard' | 'products' | 'new-inspection' | 'ecommerce-audit' | 'inspections' | 'inspection-detail' | 'rules' | 'reports' | 'audit' | 'docs';
