import { useState } from 'react';
import { FileText, Layers, Database, Shield, Server, Cpu, Cloud, Lock, ScanLine, Workflow, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

type Section = 'overview' | 'architecture' | 'database' | 'ai-engine' | 'security' | 'deployment';

export default function Docs() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections: { key: Section; label: string; icon: typeof FileText }[] = [
    { key: 'overview', label: 'Overview', icon: FileText },
    { key: 'architecture', label: 'System Architecture', icon: Layers },
    { key: 'database', label: 'Database Schema', icon: Database },
    { key: 'ai-engine', label: 'OCR & Analysis Engine', icon: Cpu },
    { key: 'security', label: 'Security & Access Control', icon: Shield },
    { key: 'deployment', label: 'Deployment Framework', icon: Cloud },
  ];

  const architectureLayers = [
    { num: 1, name: 'Presentation Layer', desc: 'Web Portal, Mobile/PWA, Inspector Dashboard', color: 'primary' },
    { num: 2, name: 'Application Layer', desc: 'Product, Inspection, User, Report, Search modules', color: 'accent' },
    { num: 3, name: 'OCR & Rule Matching', desc: 'PaddleOCR PP-OCRv4, Regex/Keyword Detection, Font-Height Measurement, Contrast Sampling', color: 'secondary' },
    { num: 4, name: 'Declaration Layer', desc: 'Extraction, Normalization, Classification', color: 'success' },
    { num: 5, name: 'Legal Rule Engine', desc: 'Presence, Format, Quantity, MRP, Font, Placement', color: 'warning' },
    { num: 6, name: 'Decision & Evidence', desc: 'Compliance, Violations, Confidence, Audit, Evidence', color: 'error' },
    { num: 7, name: 'Data Layer', desc: 'PostgreSQL, Object Storage, Redis, Search', color: 'primary' },
    { num: 8, name: 'Infrastructure & Security', desc: 'API Gateway, Queue, IAM, Monitoring, Kubernetes', color: 'accent' },
  ];

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-500', accent: 'bg-accent-500', secondary: 'bg-secondary-500',
    success: 'bg-success-500', warning: 'bg-warning-500', error: 'bg-error-500',
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink-900">Technical Documentation</h2>
        <p className="text-sm text-ink-500 mt-1">Software architecture and deployment framework for LabelGuard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-3 sticky top-0">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                    activeSection === s.key
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-ink-600 hover:bg-ink-50'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card p-6 lg:p-8">
            {activeSection === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-ink-900 mb-3">Platform Overview</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    LabelGuard is a compliance inspection platform designed to detect, extract, and validate mandatory declarations on packaged commodity labels against the Legal Metrology (Packaged Commodities) Rules, 2011. The system uses PaddleOCR (PP-OCRv4 Deep Learning Engine) to extract text from label images, applies regex and keyword-based pattern matching to detect mandatory declarations, measures font height from OCR bounding boxes (px→mm at an assumed 300 DPI), and generates compliance reports with violation summaries and evidence. Checks that cannot be automated (graphical symbols, placement, contrast analysis, decorative font detection) are explicitly flagged for manual review.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-ink-900 mb-3">Key Capabilities</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: ScanLine, label: 'PaddleOCR PP-OCRv4 deep-learning text extraction' },
                      { icon: FileText, label: 'Regex/keyword declaration detection (~15 of 26 rules)' },
                      { icon: Type, label: 'Font-height measurement (px→mm, assumed 300 DPI)' },
                      { icon: Cpu, label: 'Luminance-based text contrast heuristic (FT-002)' },
                      { icon: Shield, label: 'Rule-based compliance checking' },
                      { icon: Workflow, label: 'Explicit manual-review flagging for uncovered rules' },
                      { icon: Database, label: 'Product repository & inspection history' },
                      { icon: FileText, label: 'PDF & editable DOCX report export' },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-ink-50">
                          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="text-sm text-ink-700">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-ink-900 mb-3">Regulatory Compliance</h4>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    The platform enforces compliance with the Legal Metrology Act, 2009 and the Legal Metrology
                    (Packaged Commodities) Rules, 2011, checking for mandatory declarations including manufacturer
                    name and address, net quantity, MRP, date of manufacture/packing, consumer care details,
                    and other prescribed declarations in their specified formats.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-ink-900 mb-3">Technology Stack</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['React 18', 'TypeScript', 'Tailwind CSS', 'Vite', 'Supabase', 'PostgreSQL', 'Row Level Security', 'Lucide Icons'].map((tech) => (
                      <div key={tech} className="px-3 py-2 rounded-lg bg-ink-50 border border-ink-200 text-sm text-ink-700 text-center font-medium">
                        {tech}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'architecture' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-ink-900 mb-3">System Architecture</h3>
                  <p className="text-sm text-ink-600 leading-relaxed mb-4">
                    LabelGuard follows an 8-layer architecture, from the presentation layer down to infrastructure
                    and security. Each layer has a clear responsibility and communicates only with adjacent layers.
                  </p>
                </div>

                <div className="space-y-2">
                  {architectureLayers.map((layer) => (
                    <div key={layer.num} className="flex items-stretch gap-3">
                      <div className={cn('w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0', colorMap[layer.color])}>
                        {layer.num}
                      </div>
                      <div className="flex-1 p-4 rounded-lg border border-ink-200 bg-white">
                        <p className="font-semibold text-ink-900 text-sm">{layer.name}</p>
                        <p className="text-xs text-ink-500 mt-0.5">{layer.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-lg bg-primary-50 border border-primary-200">
                  <h4 className="font-semibold text-primary-900 mb-2 text-sm">Data Flow</h4>
                  <p className="text-sm text-primary-800 leading-relaxed">
                    Label image flows through: Upload (Layer 1) → Application routing (Layer 2) → OCR text extraction & pattern matching (Layer 3) → Declaration identification (Layer 4) → Rule evaluation including font-height and contrast checks (Layer 5) → Compliance decision & evidence capture (Layer 6) → Persistence (Layer 7) → Secured by infrastructure (Layer 8).
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'database' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-ink-900 mb-3">Database Schema</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    The platform uses PostgreSQL (via Supabase) with 8 tables and Row Level Security policies
                    on every table. All data is scoped to authenticated users.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'products', desc: 'Product catalog with name, brand, category, barcode, SKU', cols: 'id, name, brand, category, barcode, sku, description, image_url' },
                    { name: 'compliance_rules', desc: '25 regulatory rules across 6 categories', cols: 'id, rule_code, title, description, category, severity, regulation_reference, is_active' },
                    { name: 'inspections', desc: 'Individual inspection sessions with status and scores', cols: 'id, product_id, status, image_url, overall_confidence, total_checks, passed/failed_checks' },
                    { name: 'inspection_results', desc: 'Per-rule check results within an inspection', cols: 'id, inspection_id, rule_id, status, confidence, detected_value, expected_value, message' },
                    { name: 'violations', desc: 'Confirmed violations with evidence and recommendations', cols: 'id, inspection_id, rule_id, severity, description, evidence_data, recommendation, is_resolved' },
                    { name: 'evidence_artifacts', desc: 'OCR text, font analysis, bounding boxes', cols: 'id, inspection_id, artifact_type, label, content (jsonb), confidence' },
                    { name: 'audit_log', desc: 'Complete audit trail of all actions', cols: 'id, inspection_id, action, actor, details (jsonb), created_at' },
                    { name: 'user_profiles', desc: 'User roles (inspector/admin) linked to auth.users', cols: 'id, full_name, role, created_at' },
                  ].map((t) => (
                    <div key={t.name} className="p-4 rounded-lg border border-ink-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-primary-600" />
                        <code className="text-sm font-mono font-semibold text-ink-900">{t.name}</code>
                      </div>
                      <p className="text-sm text-ink-600 mb-2">{t.desc}</p>
                      <p className="text-xs text-ink-400 font-mono">{t.cols}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-success-50 border border-success-200">
                  <h4 className="font-semibold text-success-900 mb-2 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Row Level Security
                  </h4>
                  <p className="text-sm text-success-800">
                    All tables have RLS enabled. Policies are scoped to <code className="font-mono">authenticated</code> users.
                    All inspectors share compliance data (shared-data model for enforcement agencies).
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'ai-engine' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-ink-900 mb-3">OCR & Analysis Engine</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    The analysis engine processes label images through a pipeline of: PaddleOCR PP-OCRv4 deep-learning text detection and recognition, regex/keyword-based pattern matching for declaration detection, font-height measurement from OCR bounding boxes, and luminance-based contrast sampling.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'OCR Text Extraction (PaddleOCR PP-OCRv4)', desc: 'Runs PaddleOCR with DBNet and SVTR deep learning models to extract all text from the label image with precise per-word bounding boxes and confidence ratings.', icon: ScanLine },
                    { title: 'Regex/Keyword Declaration Detection', desc: 'Approximately 15 of 26 compliance rules are checked by running regex and keyword patterns against the extracted OCR text (e.g. MRP format, FSSAI number, net quantity pattern, manufacturer mention, date format, batch number). Rules that match populate detected values; unmatched rules are flagged as failures.', icon: FileText },
                    { title: 'Font-Height Measurement', desc: 'Each OCR word\'s bounding-box height (in pixels) is converted to millimetres assuming 300 DPI scan resolution. The minimum detected font height is compared against regulatory minimums (1.6mm for most packages, 2.0mm for MRP). This is an estimate, not a calibrated measurement — the DPI assumption is disclosed in evidence.', icon: Type },
                    { title: 'Contrast Ratio Sampling (Heuristic)', desc: 'For FT-002 (font contrast), pixel luminance is sampled inside vs. immediately outside each OCR word bounding box on an offscreen canvas. The WCAG relative-luminance formula gives an approximate contrast ratio. This is a heuristic — it cannot detect contrast issues in areas OCR missed, nor account for translucent overlays or gradients.', icon: Cpu },
                    { title: 'Manual-Review Flagging', desc: 'Rules that require capabilities beyond text extraction are explicitly flagged as "requires manual review" instead of being guessed. This includes: veg/non-veg symbol detection (PR-007), font legibility / decorative fonts (FT-003), label placement rules (PL-001/002/003), MRP overstamping (MR-001), and any graphical symbol verification. True coverage of these would need a trained vision model or LLM vision API.', icon: Shield },
                    { title: 'Rule Engine Evaluation', desc: 'All detection results are evaluated against the 26 compliance rules and each rule receives a pass, fail, or skipped (manual review) status with a confidence score and evidence trail.', icon: Workflow },
                  ].map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary-600" />
                          </div>
                          {i < 5 && <div className="w-0.5 flex-1 bg-ink-200 mt-2" />}
                        </div>
                        <div className="pb-4">
                          <h4 className="font-semibold text-ink-900 text-sm">{step.title}</h4>
                          <p className="text-sm text-ink-600 mt-1">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-lg bg-accent-50 border border-accent-200">
                  <h4 className="font-semibold text-accent-900 mb-2 text-sm">Evidence Collection</h4>
                  <p className="text-sm text-accent-800">
                    Each inspection captures evidence artifacts: full OCR text, font size measurements, bounding box
                    coordinates, and detected element positions. These are stored as JSONB in the database and
                    included in compliance reports.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-warning-50 border border-warning-200">
                  <h4 className="font-semibold text-warning-900 mb-2 text-sm">Manual Review Required</h4>
                  <p className="text-sm text-warning-800">
                    The following checks cannot be automated with client-side heuristics and require visual inspector review:
                    veg/non-veg symbol presence (PR-007), font legibility / decorative font detection (FT-003),
                    principal display panel placement (PL-001/002/003), and MRP overstamping verification (MR-001).
                    True coverage would require a trained image classifier or an LLM vision API, which is out of scope
                    for this client-side tool.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-ink-900 mb-3">Security & Access Control</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    The platform implements multi-layer security with authentication, role-based access control,
                    and database-level row level security.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Authentication', desc: 'Email/password authentication via Supabase Auth. Sessions are persisted with automatic token refresh. Email confirmation is disabled for rapid deployment.', icon: Lock },
                    { title: 'Role-Based Access Control', desc: 'Two roles: Inspector (default) can perform inspections, view reports, and manage products. Admin role has elevated privileges for rule management.', icon: Shield },
                    { title: 'Row Level Security', desc: 'Every database table has RLS enabled. Policies enforce that only authenticated users can read and write data. Unauthenticated requests return no rows.', icon: Database },
                    { title: 'Audit Trail', desc: 'All inspection actions (creation, analysis, status changes) are logged in the audit_log table with actor, timestamp, and details for accountability.', icon: FileText },
                    { title: 'Session Management', desc: 'JWT-based sessions with automatic refresh. Sign-out clears all client-side session state.', icon: Cpu },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-ink-200">
                        <div className="w-9 h-9 rounded-lg bg-error-50 flex items-center justify-center shrink-0">
                          <Icon className="w-4.5 h-4.5 text-error-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-ink-900 text-sm">{item.title}</h4>
                          <p className="text-sm text-ink-600 mt-1">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'deployment' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl font-bold text-ink-900 mb-3">Deployment Framework</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    LabelGuard is designed for cloud-native deployment with a React frontend and Supabase backend.
                    The architecture supports horizontal scaling and can be deployed to any static hosting provider
                    with the managed Supabase backend.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Frontend Deployment', desc: 'React + Vite SPA deployed to static hosting (Vercel, Netlify, or any CDN). Build output is a static bundle served over HTTPS.', icon: Cloud },
                    { title: 'Backend (Supabase)', desc: 'Managed PostgreSQL database, authentication, and edge functions via Supabase. No server maintenance required. Auto-scaling and backups included.', icon: Server },
                    { title: 'Image Storage', desc: 'Product label images stored as URLs. Can integrate with Supabase Storage buckets for secure object storage with signed URLs.', icon: Database },
                    { title: 'Environment Configuration', desc: 'Supabase URL, anon key, and service role key are configured via environment variables. No secrets are exposed in client-side code.', icon: Lock },
                    { title: 'CI/CD Pipeline', desc: 'Build with npm run build. Deploy the dist/ folder. Type checking (npm run typecheck) ensures code safety before deployment.', icon: Workflow },
                    { title: 'Scalability', desc: 'Stateless frontend can be served from multiple CDN edges. Supabase handles database scaling. Edge functions for any server-side processing needs.', icon: Cpu },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-ink-200">
                        <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                          <Icon className="w-4.5 h-4.5 text-accent-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-ink-900 text-sm">{item.title}</h4>
                          <p className="text-sm text-ink-600 mt-1">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-lg bg-ink-900 text-white">
                  <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary-400" /> Build & Deploy Commands
                  </h4>
                  <div className="space-y-2 font-mono text-xs">
                    <p className="text-ink-300"># Install dependencies</p>
                    <p className="text-primary-300">npm install</p>
                    <p className="text-ink-300 mt-2"># Type check</p>
                    <p className="text-primary-300">npm run typecheck</p>
                    <p className="text-ink-300 mt-2"># Production build</p>
                    <p className="text-primary-300">npm run build</p>
                    <p className="text-ink-300 mt-2"># Preview production build</p>
                    <p className="text-primary-300">npm run preview</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
