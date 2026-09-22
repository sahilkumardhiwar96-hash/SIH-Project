/*
# Product Label Compliance Inspection Platform - Schema

## Overview
This migration creates the complete database schema for a product label compliance
inspection platform. It supports tracking products, running label inspections against
legal compliance rules, recording violations with evidence, and generating compliance reports.

## New Tables

1. **products** - Catalog of products being inspected
   - id, name, brand, category, barcode, sku, description, image_url, created_at, updated_at

2. **compliance_rules** - Legal/regulatory rules that labels must satisfy
   - id, rule_code, title, description, category, severity, regulation_reference, is_active, created_at

3. **inspections** - Individual inspection sessions for a product's label
   - id, product_id, status (pending/analyzing/compliant/non_compliant/review), 
   - image_url, overall_confidence, total_checks, passed_checks, failed_checks, 
   - inspector_name, notes, created_at, completed_at

4. **inspection_results** - Individual rule check results within an inspection
   - id, inspection_id, rule_id, status (pass/fail/warning/skipped), 
   - confidence, detected_value, expected_value, message, created_at

5. **violations** - Confirmed violations from inspections
   - id, inspection_id, rule_id, severity (critical/major/minor), 
   - description, evidence_data (jsonb), recommendation, is_resolved, created_at

6. **evidence_artifacts** - Evidence captured during inspection (bounding boxes, OCR text, etc.)
   - id, inspection_id, artifact_type (ocr_text/bounding_box/font_analysis/image_region),
   - label, content (jsonb), confidence, created_at

7. **audit_log** - Audit trail for all compliance decisions
   - id, inspection_id, action, actor, details (jsonb), created_at

## Security
- RLS enabled on all tables
- Single-tenant app (no auth) - policies allow anon + authenticated CRUD
- All data is intentionally shared within the organization
*/

-- ============ PRODUCTS TABLE ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  barcode text,
  sku text,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- ============ COMPLIANCE RULES TABLE ============
CREATE TABLE IF NOT EXISTS compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  severity text NOT NULL DEFAULT 'major' CHECK (severity IN ('critical', 'major', 'minor')),
  regulation_reference text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rules" ON compliance_rules;
CREATE POLICY "anon_select_rules" ON compliance_rules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rules" ON compliance_rules;
CREATE POLICY "anon_insert_rules" ON compliance_rules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rules" ON compliance_rules;
CREATE POLICY "anon_update_rules" ON compliance_rules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rules" ON compliance_rules;
CREATE POLICY "anon_delete_rules" ON compliance_rules FOR DELETE
  TO anon, authenticated USING (true);

-- ============ INSPECTIONS TABLE ============
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'compliant', 'non_compliant', 'review')),
  image_url text,
  overall_confidence numeric DEFAULT 0,
  total_checks integer DEFAULT 0,
  passed_checks integer DEFAULT 0,
  failed_checks integer DEFAULT 0,
  inspector_name text DEFAULT 'AI Inspector',
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inspections" ON inspections;
CREATE POLICY "anon_select_inspections" ON inspections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inspections" ON inspections;
CREATE POLICY "anon_insert_inspections" ON inspections FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inspections" ON inspections;
CREATE POLICY "anon_update_inspections" ON inspections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inspections" ON inspections;
CREATE POLICY "anon_delete_inspections" ON inspections FOR DELETE
  TO anon, authenticated USING (true);

-- ============ INSPECTION RESULTS TABLE ============
CREATE TABLE IF NOT EXISTS inspection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pass', 'fail', 'warning', 'skipped', 'pending')),
  confidence numeric DEFAULT 0,
  detected_value text,
  expected_value text,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_results" ON inspection_results;
CREATE POLICY "anon_select_results" ON inspection_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_results" ON inspection_results;
CREATE POLICY "anon_insert_results" ON inspection_results FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_results" ON inspection_results;
CREATE POLICY "anon_update_results" ON inspection_results FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_results" ON inspection_results;
CREATE POLICY "anon_delete_results" ON inspection_results FOR DELETE
  TO anon, authenticated USING (true);

-- ============ VIOLATIONS TABLE ============
CREATE TABLE IF NOT EXISTS violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'major' CHECK (severity IN ('critical', 'major', 'minor')),
  description text NOT NULL,
  evidence_data jsonb DEFAULT '{}',
  recommendation text,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_violations" ON violations;
CREATE POLICY "anon_select_violations" ON violations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_violations" ON violations;
CREATE POLICY "anon_insert_violations" ON violations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_violations" ON violations;
CREATE POLICY "anon_update_violations" ON violations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_violations" ON violations;
CREATE POLICY "anon_delete_violations" ON violations FOR DELETE
  TO anon, authenticated USING (true);

-- ============ EVIDENCE ARTIFACTS TABLE ============
CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  artifact_type text NOT NULL CHECK (artifact_type IN ('ocr_text', 'bounding_box', 'font_analysis', 'image_region', 'color_analysis')),
  label text,
  content jsonb DEFAULT '{}',
  confidence numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE evidence_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_evidence" ON evidence_artifacts;
CREATE POLICY "anon_select_evidence" ON evidence_artifacts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_evidence" ON evidence_artifacts;
CREATE POLICY "anon_insert_evidence" ON evidence_artifacts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_evidence" ON evidence_artifacts;
CREATE POLICY "anon_update_evidence" ON evidence_artifacts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_evidence" ON evidence_artifacts;
CREATE POLICY "anon_delete_evidence" ON evidence_artifacts FOR DELETE
  TO anon, authenticated USING (true);

-- ============ AUDIT LOG TABLE ============
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES inspections(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text NOT NULL DEFAULT 'system',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit" ON audit_log;
CREATE POLICY "anon_select_audit" ON audit_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit" ON audit_log;
CREATE POLICY "anon_insert_audit" ON audit_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_inspections_product ON inspections(product_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created ON inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_inspection ON inspection_results(inspection_id);
CREATE INDEX IF NOT EXISTS idx_violations_inspection ON violations(inspection_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_evidence_inspection ON evidence_artifacts(inspection_id);
CREATE INDEX IF NOT EXISTS idx_audit_inspection ON audit_log(inspection_id);
CREATE INDEX IF NOT EXISTS idx_rules_category ON compliance_rules(category);
CREATE INDEX IF NOT EXISTS idx_rules_active ON compliance_rules(is_active);

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
