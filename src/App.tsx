import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, LayoutDashboard, Package, ScanLine, ClipboardList, BookOpen, BarChart3, FileClock, Menu, X, FileText, LogOut, ChevronDown, User as UserIcon, ShoppingBag } from 'lucide-react';
import type { Page } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import NewInspection from '@/pages/NewInspection';
import EcommerceAudit from '@/pages/EcommerceAudit';
import Inspections from '@/pages/Inspections';
import InspectionDetail from '@/pages/InspectionDetail';
import Rules from '@/pages/Rules';
import Reports from '@/pages/Reports';
import AuditLog from '@/pages/AuditLog';
import Docs from '@/pages/Docs';

const navSections: {
  heading: string;
  items: { page: Page; label: string; icon: typeof LayoutDashboard; badge?: string }[];
}[] = [
  {
    heading: 'Surveillance & Operations',
    items: [
      { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { page: 'new-inspection', label: 'New Inspection', icon: ScanLine },
      { page: 'ecommerce-audit', label: 'E-Commerce Surveillance', icon: ShoppingBag, badge: 'Rule 6(10)' },
      { page: 'inspections', label: 'Inspections', icon: ClipboardList },
    ],
  },
  {
    heading: 'Commodities & Standards',
    items: [
      { page: 'products', label: 'Product Catalog', icon: Package },
      { page: 'rules', label: 'Compliance Rules', icon: BookOpen },
    ],
  },
  {
    heading: 'Enforcement & Records',
    items: [
      { page: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      { page: 'audit', label: 'System Audit Log', icon: FileClock },
      { page: 'docs', label: 'Documentation', icon: FileText },
    ],
  },
];

export default function App() {
  const { session, profile, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigate = useCallback((page: Page, inspectionId?: string) => {
    setCurrentPage(page);
    if (inspectionId) setSelectedInspectionId(inspectionId);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSidebarOpen(false); setUserMenuOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/20 animate-pulse">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-ink-900">Legal Metrology Compliance Engine</p>
            <p className="text-xs text-ink-500 mt-0.5">Initializing statutory ruleset & OCR models...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard navigate={navigate} />;
      case 'products':
        return <Products navigate={navigate} />;
      case 'new-inspection':
        return <NewInspection navigate={navigate} />;
      case 'ecommerce-audit':
        return <EcommerceAudit navigate={navigate} />;
      case 'inspections':
        return <Inspections navigate={navigate} />;
      case 'inspection-detail':
        return selectedInspectionId ? <InspectionDetail inspectionId={selectedInspectionId} navigate={navigate} /> : <Inspections navigate={navigate} />;
      case 'rules':
        return <Rules />;
      case 'reports':
        return <Reports />;
      case 'audit':
        return <AuditLog />;
      case 'docs':
        return <Docs />;
      default:
        return <Dashboard navigate={navigate} />;
    }
  }

  const allNavItems = navSections.flatMap((s) => s.items);
  const currentItem = allNavItems.find((n) => n.page === currentPage);
  const pageTitle = currentItem?.label ?? (currentPage === 'inspection-detail' ? 'Inspection Record' : 'Dashboard');
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50 selection:bg-primary-100 selection:text-primary-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-72 bg-ink-900 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-ink-800/80 shadow-2xl lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-18 flex items-center justify-between px-6 border-b border-ink-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-white font-extrabold text-base tracking-tight">LabelGuard</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">PRO</span>
              </div>
              <p className="text-ink-400 text-xs font-medium">LM (PCR) 2011 & FSSAI</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Status Banner */}
        <div className="px-4 py-2.5 mx-3 mt-3 rounded-lg bg-ink-800/60 border border-ink-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-ink-300">Surveillance Engine</span>
          </div>
          <span className="text-[10px] font-mono text-primary-400 bg-primary-950/60 px-1.5 py-0.5 rounded border border-primary-800/60">v2.4 Active</span>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin space-y-6" aria-label="Main Navigation">
          {navSections.map((section) => (
            <div key={section.heading}>
              <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                {section.heading}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    currentPage === item.page ||
                    (item.page === 'inspections' && currentPage === 'inspection-detail');
                  return (
                    <button
                      key={item.page}
                      onClick={() => navigate(item.page)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group text-left',
                        active
                          ? 'bg-primary-600 text-white shadow-sm font-semibold'
                          : 'text-ink-300 hover:bg-ink-800/80 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'w-[18px] h-[18px] transition-colors',
                            active ? 'text-white' : 'text-ink-400 group-hover:text-white'
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-ink-800 text-ink-400 group-hover:text-ink-200'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-ink-800/80 relative shrink-0">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-ink-800/80 transition-colors text-left"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              {(profile?.full_name ?? 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">{profile?.full_name || 'Enforcement Officer'}</p>
              <p className="text-ink-400 text-xs capitalize mt-0.5">{profile?.role ?? 'inspector'} Access</p>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-ink-400 transition-transform duration-200', userMenuOpen && 'rotate-180')} />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-elevated border border-ink-200/90 p-1.5 animate-slide-up z-50">
              <div className="px-3 py-2.5 border-b border-ink-100">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Signed in as</p>
                <p className="text-sm font-bold text-ink-900 truncate mt-0.5">{session.user.email}</p>
                <span className="inline-flex mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                  {isAdmin ? 'Administrator Privileges' : 'Field Inspector'}
                </span>
              </div>
              <button
                onClick={() => { signOut(); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-sm text-error-600 hover:bg-error-50 font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        {/* Top Header */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-ink-200/80 flex items-center justify-between px-4 lg:px-8 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-ink-100 text-ink-600 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-ink-500 font-medium">
                <button
                  onClick={() => navigate('dashboard')}
                  className="hover:text-primary-600 transition-colors"
                >
                  Home
                </button>
                {currentPage !== 'dashboard' && (
                  <>
                    <span>/</span>
                    {currentPage === 'inspection-detail' ? (
                      <>
                        <button
                          onClick={() => navigate('inspections')}
                          className="hover:text-primary-600 transition-colors"
                        >
                          Inspections
                        </button>
                        <span>/</span>
                        <span className="text-ink-800 font-semibold truncate max-w-[140px] sm:max-w-xs">
                          {selectedInspectionId}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-800 font-semibold">{pageTitle}</span>
                    )}
                  </>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-ink-900 tracking-tight leading-tight">
                {pageTitle}
              </h2>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('new-inspection')}
              className="btn-primary text-xs sm:text-sm py-2 px-3.5 shadow-sm"
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden sm:inline">New Inspection</span>
              <span className="sm:hidden">Scan</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              LMPCR 2011 Ready
            </div>

            <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-ink-200">
              <div className="w-8 h-8 rounded-lg bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
                {(profile?.full_name ?? 'U')[0].toUpperCase()}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-ink-900 leading-tight">{profile?.full_name || 'Enforcement Officer'}</p>
                <p className="text-[11px] text-ink-500 capitalize">{profile?.role ?? 'inspector'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Canvas */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-ink-50/70">
          <div key={currentPage} className="animate-fade-in">
            {renderPage()}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (Thumb-friendly 1-hand navigation) */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-ink-200/90 z-30 px-2 py-1 flex items-center justify-around shadow-lg">
          {[
            { page: 'dashboard' as Page, label: 'Home', icon: LayoutDashboard },
            { page: 'new-inspection' as Page, label: 'Scan', icon: ScanLine },
            { page: 'inspections' as Page, label: 'Audits', icon: ClipboardList },
            { page: 'products' as Page, label: 'Products', icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = currentPage === tab.page || (tab.page === 'inspections' && currentPage === 'inspection-detail');
            return (
              <button
                key={tab.page}
                onClick={() => navigate(tab.page)}
                className={cn(
                  'flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[11px] font-medium transition-colors',
                  active ? 'text-primary-600 font-bold' : 'text-ink-400 hover:text-ink-700'
                )}
              >
                <Icon className={cn('w-5 h-5 mb-0.5', active ? 'text-primary-600' : 'text-ink-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
