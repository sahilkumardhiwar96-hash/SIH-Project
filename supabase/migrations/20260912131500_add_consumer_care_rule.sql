/*
# Consumer Care Declaration Rule

## Overview
The problem statement explicitly lists "consumer care details" as one of the
mandatory declarations Legal Metrology (Packaged Commodities) Rules, 2011
requires on a label, alongside manufacturer info, net quantity, MRP, and date
of packing. The seeded rule set only covered the other declarations — this
adds the missing one so the compliance engine can actually check for it.
*/

INSERT INTO compliance_rules (rule_code, title, description, category, severity, regulation_reference, is_active) VALUES
('PR-011', 'Consumer Care Details', 'The label must display a consumer/customer care name, address, telephone number, or email for complaints and queries.', 'presence', 'major', 'FSSR 2011 Reg 2.4.5', true)
ON CONFLICT (rule_code) DO NOTHING;
