import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Plus, Search, Grid, List, Barcode, X, Pencil, Trash2, Sparkles, ArrowRight, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Page } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { useToast } from '@/lib/toast';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';

type NavigateFn = (page: Page, inspectionId?: string) => void;

export default function Products({ navigate }: { navigate: NavigateFn }) {
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', brand: '', category: '', barcode: '', sku: '', description: '', image_url: '' });
  const [saving, setSaving] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) setProducts(data as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, search, selectedCategory]);

  async function handleSave() {
    if (!form.name.trim()) {
      toastError('Please provide at least a Product Name.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || 'General / Unspecified',
      category: form.category.trim() || 'General Merchandise',
      barcode: form.barcode.trim() || null,
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
    };
    try {
      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
        success('Product information updated successfully.');
      } else {
        await supabase.from('products').insert(payload);
        success('New packaged commodity registered to catalog.');
      }
      setShowModal(false);
      setEditingProduct(null);
      setForm({ name: '', brand: '', category: '', barcode: '', sku: '', description: '', image_url: '' });
      fetchProducts();
    } catch {
      toastError('Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm({ name: p.name, brand: p.brand, category: p.category, barcode: p.barcode ?? '', sku: p.sku ?? '', description: p.description ?? '', image_url: p.image_url ?? '' });
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product from catalog? All associated inspection records will also be removed.')) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
      success('Product removed from catalog.');
    } catch {
      toastError('Failed to delete product.');
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink-900">Product Catalog</h2>
          <p className="text-sm text-ink-500 mt-1">{products.length} products registered for compliance inspection</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setForm({ name: '', brand: '', category: '', barcode: '', sku: '', description: '', image_url: '' }); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search by name, brand, barcode, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-ink-200 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-ink-400 hover:bg-ink-50')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2.5 transition-colors', viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-ink-400 hover:bg-ink-50')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
              selectedCategory === cat
                ? 'bg-ink-900 text-white shadow-xs'
                : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-64 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-ink-300 mx-auto mb-4" />
          <p className="text-ink-500 font-medium">No products found</p>
          <p className="text-sm text-ink-400 mt-1">{search ? 'Try a different search term' : 'Add your first product to get started'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden group hover:shadow-soft transition-all duration-200">
              <div className="aspect-[4/3] bg-ink-100 overflow-hidden relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-ink-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="badge bg-white/90 backdrop-blur text-ink-700 text-xs">{p.category}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-ink-900 text-sm mb-1 truncate">{p.name}</h3>
                <p className="text-xs text-ink-500 mb-3">{p.brand}</p>
                <div className="flex items-center gap-2 text-xs text-ink-400 mb-3">
                  {p.barcode && (
                    <span className="flex items-center gap-1">
                      <Barcode className="w-3 h-3" /> {p.barcode}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate('new-inspection')} className="btn-secondary flex-1 text-xs py-2">
                    Inspect
                  </button>
                  <button onClick={() => openEdit(p)} className="btn-ghost p-2">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn-ghost p-2 hover:text-error-600 hover:bg-error-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Barcode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden xl:table-cell">Added</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-ink-100 overflow-hidden shrink-0">
                        {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-ink-400" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-ink-500 md:hidden">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-700 hidden md:table-cell">{p.brand}</td>
                  <td className="px-4 py-3 hidden lg:table-cell"><span className="badge bg-ink-100 text-ink-600 text-xs">{p.category}</span></td>
                  <td className="px-4 py-3 text-sm text-ink-500 hidden lg:table-cell font-mono">{p.barcode ?? '--'}</td>
                  <td className="px-4 py-3 text-sm text-ink-500 hidden xl:table-cell">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate('new-inspection')} className="btn-ghost p-2 text-xs">Inspect</button>
                      <button onClick={() => openEdit(p)} className="btn-ghost p-2"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="btn-ghost p-2 hover:text-error-600 hover:bg-error-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-ink-100 text-ink-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1.5 block">Product Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Organic Honey 500g" />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1.5 block">Brand <span className="text-xs font-normal text-ink-400">(Optional)</span></label>
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" placeholder="e.g. NaturePure (Optional)" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1.5 block">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="e.g. Food & Beverage" list="cat-list" />
                  <datalist id="cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700 mb-1.5 block">
                    SKU <span className="text-xs font-normal text-ink-400">(Optional)</span>
                  </label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" placeholder="Leave blank if not assigned" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-700 mb-1.5 block">
                  Barcode / GTIN <span className="text-xs font-normal text-ink-400">(Optional)</span>
                </label>
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="input font-mono" placeholder="Leave blank if not assigned" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-ink-700 block">
                    Product Packaging Photo <span className="text-xs font-normal text-ink-400">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Take Photo with Camera
                  </button>
                </div>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" placeholder="https://... or photo from camera" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink-700 mb-1.5 block">Description <span className="text-xs font-normal text-ink-400">(Optional)</span></label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} placeholder="Product description (Optional)..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => {
          setForm((prev) => ({ ...prev, image_url: dataUrl }));
        }}
        title="Capture Product Catalog Photo"
      />
    </div>
  );
}
