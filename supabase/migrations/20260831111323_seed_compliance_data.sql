/*
# Seed Compliance Rules and Sample Data

## Overview
Seeds the database with:
1. Standard compliance rules covering presence, format, quantity, MRP, font, and placement categories
2. Sample products for demonstration
3. A sample inspection with results, violations, and evidence

## Rules Added
- PRESENCE rules: mandatory label elements (product name, net quantity, MRP, manufacturer, FSSAI, ingredients, veg/non-veg mark)
- FORMAT rules: standardized formats for dates, quantities, addresses
- QUANTITY rules: net quantity declaration requirements
- MRP rules: maximum retail price display requirements
- FONT rules: minimum font size and visibility requirements
- PLACEMENT rules: label placement and visibility requirements
*/

-- ============ COMPLIANCE RULES ============
INSERT INTO compliance_rules (rule_code, title, description, category, severity, regulation_reference, is_active) VALUES
-- PRESENCE RULES
('PR-001', 'Product Name Present', 'The label must clearly display the common or generic name of the product.', 'presence', 'critical', 'FSSR 2011 Reg 2.4.4', true),
('PR-002', 'Net Quantity Declaration', 'The label must declare the net quantity of contents in metric units.', 'presence', 'critical', 'FSSR 2011 Reg 2.4.6', true),
('PR-003', 'MRP Declaration', 'The Maximum Retail Price must be printed on the label.', 'presence', 'critical', 'FSSR 2011 Reg 2.4.10', true),
('PR-004', 'Manufacturer Details', 'The name and complete address of the manufacturer/packer must be present.', 'presence', 'critical', 'FSSR 2011 Reg 2.4.5', true),
('PR-005', 'FSSAI License Number', 'The 14-digit FSSAI license number must be displayed.', 'presence', 'critical', 'FSSR 2011 Reg 2.4.11', true),
('PR-006', 'Ingredient List', 'A complete list of ingredients in descending order of weight must be present.', 'presence', 'major', 'FSSR 2011 Reg 2.4.7', true),
('PR-007', 'Veg/Non-Veg Indicator', 'A vegetarian or non-vegetarian symbol must be displayed.', 'presence', 'major', 'FSSR 2011 Reg 2.4.8', true),
('PR-008', 'Nutritional Information', 'Nutritional information per 100g/100ml must be declared.', 'presence', 'major', 'FSSR 2011 Reg 2.4.9', true),
('PR-009', 'Batch Number', 'A batch or lot number for traceability must be present.', 'presence', 'major', 'FSSR 2011 Reg 2.4.12', true),
('PR-010', 'Date of Packaging', 'The date of packaging must be clearly marked.', 'presence', 'major', 'FSSR 2011 Reg 2.4.13', true),

-- FORMAT RULES
('FR-001', 'Date Format Standard', 'Dates must follow the DD/MM/YYYY or MMM YYYY format.', 'format', 'major', 'FSSR 2011 Reg 2.4.13', true),
('FR-002', 'Quantity Unit Format', 'Net quantity must use standard metric units (g, kg, ml, l).', 'format', 'major', 'LMRA 2009 Sec 12', true),
('FR-003', 'MRP Format Standard', 'MRP must be prefixed with "MRP" or "Maximum Retail Price" followed by the amount.', 'format', 'major', 'FSSR 2011 Reg 2.4.10', true),
('FR-004', 'FSSAI Format', 'FSSAI number must be 14 digits in the format XXXX XX XX XXXX.', 'format', 'critical', 'FSSR 2011 Reg 2.4.11', true),
('FR-005', 'Ingredient Declaration Format', 'Ingredients must be listed in descending order of weight percentage.', 'format', 'minor', 'FSSR 2011 Reg 2.4.7', true),

-- QUANTITY RULES
('QR-001', 'Minimum Quantity Text Size', 'Net quantity text must be at least 1.6mm height for packages under 50g.', 'quantity', 'minor', 'LMRA 2009 Sec 13', true),
('QR-002', 'Quantity Prominence', 'Net quantity declaration must be prominently displayed on the principal display panel.', 'quantity', 'major', 'LMRA 2009 Sec 13', true),
('QR-003', 'No Dual Quantity Units', 'Quantity must not be declared in both metric and non-metric units.', 'quantity', 'minor', 'LMRA 2009 Sec 12', true),

-- MRP RULES
('MR-001', 'MRP Not Overstamped', 'MRP must not be overwritten or altered with additional stickers.', 'mrp', 'critical', 'FSSR 2011 Reg 2.4.10', true),
('MR-002', 'MRP Inclusive of Tax', 'MRP must be declared as inclusive of all taxes.', 'mrp', 'major', 'FSSR 2011 Reg 2.4.10', true),
('MR-003', 'MRP Font Size', 'MRP text must be at least 2mm in height.', 'mrp', 'minor', 'FSSR 2011 Reg 2.4.10', true),

-- FONT RULES
('FT-001', 'Minimum Font Size', 'All mandatory text must be at least 1.6mm in height.', 'font', 'major', 'FSSR 2011 Reg 2.4.14', true),
('FT-002', 'Font Contrast', 'Text must have sufficient contrast against the background for readability.', 'font', 'major', 'FSSR 2011 Reg 2.4.14', true),
('FT-003', 'Font Legibility', 'Text must use legible fonts without excessive decorative styling.', 'font', 'minor', 'FSSR 2011 Reg 2.4.14', true),

-- PLACEMENT RULES
('PL-001', 'Principal Display Panel', 'Mandatory information must appear on the principal display panel.', 'placement', 'major', 'FSSR 2011 Reg 2.4.3', true),
('PL-002', 'Label Not Obscured', 'Mandatory text must not be obscured by graphics or other elements.', 'placement', 'major', 'FSSR 2011 Reg 2.4.3', true),
('PL-003', 'Veg/Non-Veg Placement', 'The veg/non-veg symbol must be placed on the principal display panel near the product name.', 'placement', 'major', 'FSSR 2011 Reg 2.4.8', true)
ON CONFLICT (rule_code) DO NOTHING;

-- ============ SAMPLE PRODUCTS ============
INSERT INTO products (name, brand, category, barcode, sku, description, image_url) VALUES
('Organic Honey 500g', 'NaturePure', 'Food & Beverage', '8901234567890', 'NP-HNY-500', 'Pure organic honey sourced from Himalayan forests.', 'https://images.pexels.com/photos/33260/field-of-honey-organic-natural-33260.jpeg?auto=compress&cs=tinysrgb&w=600'),
('Premium Green Tea 250g', 'TeaLeaf', 'Food & Beverage', '8902345678901', 'TL-GT-250', 'Hand-picked organic green tea leaves from Darjeeling.', 'https://images.pexels.com/photos/230477/pexels-photo-230477.jpeg?auto=compress&cs=tinysrgb&w=600'),
('Spicy Chili Sauce 200ml', 'FlavorBomb', 'Condiments', '8903456789012', 'FB-CS-200', 'Fiery chili sauce made with authentic Indian spices.', 'https://images.pexels.com/photos/51955/food-photography-51955.jpeg?auto=compress&cs=tinysrgb&w=600'),
('Whole Wheat Flour 1kg', 'HealthyGrain', 'Food & Beverage', '8904567890123', 'HG-WF-1000', 'Stone-ground whole wheat flour with no additives.', 'https://images.pexels.com/photos/1346163/pexels-photo-1346163.jpeg?auto=compress&cs=tinysrgb&w=600'),
('Almond Butter 300g', 'NutriNuts', 'Food & Beverage', '8905678901234', 'NN-AB-300', 'Creamy almond butter made from roasted California almonds.', 'https://images.pexels.com/photos/129441/pexels-photo-129441.jpeg?auto=compress&cs=tinysrgb&w=600'),
('Cold Pressed Olive Oil 500ml', 'OliveGrove', 'Cooking Oil', '8906789012345', 'OG-OO-500', 'Extra virgin cold-pressed olive oil from Mediterranean groves.', 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=600'),
('Dark Chocolate 70% 100g', 'CocoaCraft', 'Confectionery', '8907890123456', 'CC-DC-100', 'Single-origin 70% dark chocolate with no added sugar.', 'https://images.pexels.com/photos/65882/chocolate-dark-coffee-confiserie-65882.jpeg?auto=compress&cs=tinysrgb&w=600'),
('Basmati Rice 5kg', 'RoyalGrain', 'Food & Beverage', '8908901234567', 'RG-BR-5000', 'Aged premium basmati rice from the foothills of the Himalayas.', 'https://images.pexels.com/photos/139347/pexels-photo-139347.jpeg?auto=compress&cs=tinysrgb&w=600')
ON CONFLICT DO NOTHING;

-- ============ SAMPLE INSPECTION ============
INSERT INTO inspections (product_id, status, image_url, overall_confidence, total_checks, passed_checks, failed_checks, inspector_name, notes, completed_at)
SELECT 
  p.id, 
  'non_compliant', 
  'https://images.pexels.com/photos/33260/field-of-honey-organic-natural-33260.jpeg?auto=compress&cs=tinysrgb&w=600',
  87.5,
  24,
  21,
  3,
  'AI Inspector v2.1',
  'Automated label analysis completed. 3 violations detected requiring review.',
  now() - interval '2 hours'
FROM products p WHERE p.sku = 'NP-HNY-500'
AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.product_id = p.id AND i.status = 'non_compliant');

-- Add inspection results for the sample inspection
INSERT INTO inspection_results (inspection_id, rule_id, status, confidence, detected_value, expected_value, message)
SELECT i.id, r.id, 
  CASE WHEN r.rule_code IN ('FR-004', 'FT-001', 'PL-003') THEN 'fail' ELSE 'pass' END,
  CASE WHEN r.rule_code IN ('FR-004', 'FT-001', 'PL-003') THEN 
    CASE r.rule_code WHEN 'FR-004' THEN 95.2 WHEN 'FT-001' THEN 88.7 WHEN 'PL-003' THEN 91.3 END
  ELSE 
    85.0 + (random() * 14)
  END,
  CASE r.rule_code 
    WHEN 'PR-001' THEN 'Organic Honey 500g'
    WHEN 'PR-002' THEN '500 g'
    WHEN 'PR-003' THEN 'MRP Rs. 250'
    WHEN 'PR-004' THEN 'NaturePure Foods Pvt Ltd, Mumbai'
    WHEN 'PR-005' THEN '10018022001234'
    WHEN 'PR-006' THEN 'Organic Honey'
    WHEN 'PR-007' THEN 'Vegetarian (Green)'
    WHEN 'FR-004' THEN '10018022001234 (13 digits)'
    WHEN 'FT-001' THEN '1.2mm'
    WHEN 'PL-003' THEN 'Bottom right corner'
    ELSE NULL
  END,
  CASE r.rule_code
    WHEN 'PR-001' THEN 'Product name'
    WHEN 'PR-002' THEN 'Net quantity in g/kg'
    WHEN 'PR-003' THEN 'MRP prefixed'
    WHEN 'PR-004' THEN 'Full manufacturer address'
    WHEN 'PR-005' THEN '14-digit FSSAI number'
    WHEN 'PR-006' THEN 'Ingredient list'
    WHEN 'PR-007' THEN 'Veg/Non-veg symbol'
    WHEN 'FR-004' THEN '14 digits (XXXX XX XX XXXX)'
    WHEN 'FT-001' THEN '>= 1.6mm'
    WHEN 'PL-003' THEN 'Near product name'
    ELSE NULL
  END,
  CASE r.rule_code
    WHEN 'FR-004' THEN 'FSSAI number detected as 13 digits instead of required 14 digits'
    WHEN 'FT-001' THEN 'Font height measured at 1.2mm, below minimum 1.6mm requirement'
    WHEN 'PL-003' THEN 'Veg symbol placed at bottom right, not near product name as required'
    ELSE 'Compliant'
  END
FROM inspections i
CROSS JOIN compliance_rules r
WHERE i.status = 'non_compliant'
AND NOT EXISTS (SELECT 1 FROM inspection_results ir WHERE ir.inspection_id = i.id)
AND r.rule_code IN ('PR-001','PR-002','PR-003','PR-004','PR-005','PR-006','PR-007','PR-008','PR-009','PR-010','FR-001','FR-002','FR-003','FR-004','FR-005','QR-001','QR-002','MR-001','MR-002','FT-001','FT-002','PL-001','PL-002','PL-003');

-- Add violations
INSERT INTO violations (inspection_id, rule_id, severity, description, evidence_data, recommendation, is_resolved)
SELECT i.id, r.id, r.severity,
  CASE r.rule_code
    WHEN 'FR-004' THEN 'FSSAI license number is 13 digits instead of the required 14-digit format. The number "10018022001234" is missing one digit.'
    WHEN 'FT-001' THEN 'Mandatory text elements measured at 1.2mm font height, which is below the legal minimum of 1.6mm for this package size.'
    WHEN 'PL-003' THEN 'Vegetarian symbol is placed at the bottom right corner of the label instead of on the principal display panel near the product name.'
  END,
  CASE r.rule_code
    WHEN 'FR-004' THEN jsonb_build_object('detected', '10018022001234', 'expected_length', 14, 'actual_length', 13, 'region', 'bottom-left')
    WHEN 'FT-001' THEN jsonb_build_object('measured_height_mm', 1.2, 'required_height_mm', 1.6, 'affected_text', 'Net Quantity, MRP', 'region', 'principal-panel')
    WHEN 'PL-003' THEN jsonb_build_object('detected_position', 'bottom-right', 'expected_position', 'near-product-name', 'region', 'bottom-right')
  END,
  CASE r.rule_code
    WHEN 'FR-004' THEN 'Update the FSSAI license number to the full 14-digit format as per FSSR 2011 Regulation 2.4.11.'
    WHEN 'FT-001' THEN 'Increase font size of all mandatory declarations to at least 1.6mm height to comply with FSSR 2011 Regulation 2.4.14.'
    WHEN 'PL-003' THEN 'Reposition the vegetarian/non-vegetarian symbol to the principal display panel, adjacent to the product name.'
  END,
  false
FROM inspections i
CROSS JOIN compliance_rules r
WHERE i.status = 'non_compliant'
AND r.rule_code IN ('FR-004', 'FT-001', 'PL-003')
AND NOT EXISTS (SELECT 1 FROM violations v WHERE v.inspection_id = i.id);

-- Add evidence artifacts
INSERT INTO evidence_artifacts (inspection_id, artifact_type, label, content, confidence)
SELECT i.id, 'ocr_text', 'Full Label OCR',
  jsonb_build_object(
    'text', 'Organic Honey 500g^NaturePure^MRP Rs. 250^Net Wt 500g^NaturePure Foods Pvt Ltd^Mumbai, Maharashtra^FSSAI: 10018022001234^Batch: NP2024A^Pack Date: 15/03/2024^Best Before 18 months^Ingredients: Organic Honey^Vegetarian',
    'language', 'en',
    'word_count', 35
  ),
  92.3
FROM inspections i WHERE i.status = 'non_compliant'
AND NOT EXISTS (SELECT 1 FROM evidence_artifacts ea WHERE ea.inspection_id = i.id AND ea.artifact_type = 'ocr_text');

INSERT INTO evidence_artifacts (inspection_id, artifact_type, label, content, confidence)
SELECT i.id, 'font_analysis', 'Font Size Analysis',
  jsonb_build_object(
    'min_height_mm', 1.2,
    'max_height_mm', 4.5,
    'avg_height_mm', 2.8,
    'elements_below_minimum', jsonb_build_array('Net Quantity', 'MRP'),
    'font_family', 'Sans-serif'
  ),
  88.7
FROM inspections i WHERE i.status = 'non_compliant'
AND NOT EXISTS (SELECT 1 FROM evidence_artifacts ea WHERE ea.inspection_id = i.id AND ea.artifact_type = 'font_analysis');

INSERT INTO evidence_artifacts (inspection_id, artifact_type, label, content, confidence)
SELECT i.id, 'bounding_box', 'Detected Elements',
  jsonb_build_object(
    'elements', jsonb_build_array(
      jsonb_build_object('label', 'Product Name', 'x', 120, 'y', 45, 'width', 280, 'height', 35, 'confidence', 96.8),
      jsonb_build_object('label', 'MRP', 'x', 85, 'y', 180, 'width', 120, 'height', 22, 'confidence', 94.2),
      jsonb_build_object('label', 'FSSAI Number', 'x', 45, 'y', 260, 'width', 200, 'height', 18, 'confidence', 95.2),
      jsonb_build_object('label', 'Veg Symbol', 'x', 340, 'y', 380, 'width', 30, 'height', 30, 'confidence', 91.3),
      jsonb_build_object('label', 'Net Quantity', 'x', 75, 'y', 90, 'width', 100, 'height', 18, 'confidence', 93.5)
    )
  ),
  94.2
FROM inspections i WHERE i.status = 'non_compliant'
AND NOT EXISTS (SELECT 1 FROM evidence_artifacts ea WHERE ea.inspection_id = i.id AND ea.artifact_type = 'bounding_box');

-- Add audit log entries
INSERT INTO audit_log (inspection_id, action, actor, details)
SELECT i.id, 'inspection_created', 'system', jsonb_build_object('product_id', i.product_id, 'image_url', i.image_url)
FROM inspections i WHERE i.status = 'non_compliant'
AND NOT EXISTS (SELECT 1 FROM audit_log a WHERE a.inspection_id = i.id);

INSERT INTO audit_log (inspection_id, action, actor, details)
SELECT i.id, 'analysis_completed', 'AI Inspector v2.1', 
  jsonb_build_object('overall_confidence', i.overall_confidence, 'violations_found', 3, 'checks_passed', i.passed_checks, 'checks_failed', i.failed_checks)
FROM inspections i WHERE i.status = 'non_compliant'
AND NOT EXISTS (SELECT 1 FROM audit_log a WHERE a.inspection_id = i.id AND a.action = 'analysis_completed');

-- Add a second compliant inspection
INSERT INTO inspections (product_id, status, image_url, overall_confidence, total_checks, passed_checks, failed_checks, inspector_name, notes, completed_at)
SELECT 
  p.id, 
  'compliant', 
  'https://images.pexels.com/photos/230477/pexels-photo-230477.jpeg?auto=compress&cs=tinysrgb&w=600',
  96.8,
  24,
  24,
  0,
  'AI Inspector v2.1',
  'All compliance checks passed. Label meets all regulatory requirements.',
  now() - interval '5 hours'
FROM products p WHERE p.sku = 'TL-GT-250'
AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.product_id = p.id AND i.status = 'compliant');

-- Add a third inspection in review
INSERT INTO inspections (product_id, status, image_url, overall_confidence, total_checks, passed_checks, failed_checks, inspector_name, notes, completed_at)
SELECT 
  p.id, 
  'review', 
  'https://images.pexels.com/photos/51955/food-photography-51955.jpeg?auto=compress&cs=tinysrgb&w=600',
  78.3,
  24,
  22,
  2,
  'AI Inspector v2.1',
  'Minor formatting issues detected. Requires manual review.',
  now() - interval '1 day'
FROM products p WHERE p.sku = 'FB-CS-200'
AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.product_id = p.id AND i.status = 'review');

-- Add a fourth pending inspection
INSERT INTO inspections (product_id, status, image_url, overall_confidence, total_checks, passed_checks, failed_checks, inspector_name, notes)
SELECT 
  p.id, 
  'pending', 
  'https://images.pexels.com/photos/1346163/pexels-photo-1346163.jpeg?auto=compress&cs=tinysrgb&w=600',
  0,
  0,
  0,
  0,
  'AI Inspector v2.1',
  'Inspection queued for processing.'
FROM products p WHERE p.sku = 'HG-WF-1000'
AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.product_id = p.id AND i.status = 'pending');
