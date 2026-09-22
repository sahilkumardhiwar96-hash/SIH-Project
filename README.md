# LabelGuard: AI-Powered Legal Metrology Packaged Commodity Compliance Platform

An enterprise-grade, AI-assisted compliance inspection system for enforcement officials under the **Legal Metrology Act, 2009**, the **Legal Metrology (Packaged Commodities) Rules, 2011**, and **FSSAI Labelling Regulations, 2020**.

---

## ⚖️ Legal Safety & Ethical AI Architecture

> **IMPORTANT STATUTORY NOTICE**:
> LabelGuard is designed strictly as an **AI-assisted evidentiary tool**. It does **NOT** blindly declare legal guilt or make unreviewable statutory determinations. Every automated detection provides:
> 1. Exact textual and bounding-box evidence.
> 2. Statistical confidence rating.
> 3. Specific regulatory reference (e.g. *LMPCR 2011 Rule 6(1)*, *FSSR 2011 Reg 2.4*).
> 4. Human officer review interface allowing authorized officials to confirm, modify, or dismiss findings before issuing notices.

---

## 🏛️ System Architecture

```
INPUT
  │  (Product image / Package photos / E-commerce screenshots)
  ▼
IMAGE QUALITY VERIFICATION
  │  (Resolution, Blur detection, Contrast ratio assessment)
  ▼
COMPUTER VISION & OCR PIPELINE
  │  (Canvas preprocessing, text detection, bounding box extraction)
  ▼
NLP / STATUTORY ENTITY EXTRACTION
  │  (Product Name, MRP, Net Qty, Dates, FSSAI/Mfg Lic, Consumer Care, Packer/Mfg details)
  ▼
LEGAL METROLOGY RULES ENGINE
  │  (Presence, Format, Metric standard, Font height in mm, Visual contrast, Exemption profiles)
  ▼
OFFICER VERIFICATION & AUDIT TRAIL
  │  (Human review workspace, override controls, dispute resolution, photo evidence attachment)
  ▼
STATUTORY DOSSIER & REPORTS
     (Official PDF Certificate, Editable .docx Notice with digital verification metadata)
```

---

## 🔍 Core Capabilities & Modules

1. **Computer Vision & OCR Engine (`src/lib/ocr.ts` & `src/lib/compliance-engine.ts`)**:
   - Automated text and bounding-box extraction with word-level spatial bounding coordinates.
   - Physical font height estimation in millimeters (tested against 1.6mm statutory baseline under Rule 13).
   - Off-screen luminance sampling for WCAG text-to-background contrast ratio calculation.

2. **28 Statutory Compliance Rules (`src/lib/mock-data.ts`)**:
   - Covers mandatory declarations: Product Name, Net Quantity in standard metric units, MRP (inclusive of taxes), Manufacturer & Packer Name/Address, Customer Care contact (phone & email), Date of Packaging, Batch/Lot Number.
   - Category-specific exemptions: Automatic handling of Medical Devices / Pharmaceuticals (Rule 26 small packaging exemption and D&C Act manufacturing license in lieu of FSSAI).

3. **Officer Review & Determination Workspace (`src/pages/InspectionDetail.tsx`)**:
   - Officer Determination card to confirm `COMPLIANT`, `NON-COMPLIANT`, or flag for `UNDER REVIEW`.
   - Finding-level override: Officer can override any individual rule check to `PASS`, `FAIL`, `WARNING`, or `NOT APPLICABLE`.
   - Violation management: Mark notices as resolved or close inspection dossiers.
   - Attach close-up supporting photographs directly to the evidence locker.

4. **E-Commerce Digital Surveillance Module (Rule 6(10) & 6(11) LMPCR) (`src/pages/EcommerceAudit.tsx` & `src/lib/ecommerce-engine.ts`)**:
   - Digital Product Display Page (PDP) auditing across major marketplaces (Amazon India, Flipkart, Blinkit, Zepto, JioMart, BigBasket).
   - Automated evaluation of Rule 6(10) mandatory declarations: Country of Origin, Unit Sale Price (USP e.g. ₹/g, ₹/ml), complete manufacturer/packer street address, and taxes inclusive pricing.
   - Cross-checks digital specifications against packaging gallery images using real OCR.
   - Generates official Marketplace Statutory Non-Compliance Notices (PDF) under Section 36 of the Legal Metrology Act, 2009.

5. **Multi-Format Statutory Report Generation (`src/lib/pdf-export.ts` & `src/lib/docx-export.ts`)**:
   - **Official Government-Style PDF**: Clean tabular layout, compliance score, violation table, and digital metadata.
   - **Editable Word Notice (`.docx`)**: Generated via `docx` library for drafting formal statutory notices.
   - Both formats carry official statutory disclaimers stating that findings represent automated evidentiary aids requiring officer endorsement.

6. **Searchable Case Repository & Live Analytics (`src/pages/Inspections.tsx` & `src/pages/Dashboard.tsx`)**:
   - Full search by product, brand, inspector, or case run ID.
   - Real-time compliance gauges, pass rate charts, and severity breakdown.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation & Run
```bash
# Install dependencies
npm install

# Run typecheck
npm run typecheck

# Build production bundle
npm run build

# Start local server
npm run dev
```

Visit `http://localhost:5173/` in your browser.
