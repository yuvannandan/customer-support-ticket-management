'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Skeleton, SkeletonRow, EmptyState, ErrorAlert } from '@/components/UIState';

interface Category { id: string; name: string; description: string | null; _count: { tickets: number }; updatedAt: string; }

export default function AdminCategoriesPage() {
  const [cats,    setCats]    = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [userName, setUserName] = useState('');

  // Modal
  const [mode,   setMode]   = useState<'create' | 'edit' | null>(null);
  const [target, setTarget] = useState<Category | null>(null);
  const [fName,  setFName]  = useState('');
  const [fDesc,  setFDesc]  = useState('');
  const [fErr,   setFErr]   = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      setCats((await res.json()).categories);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.user?.name) setUserName(d.user.name); }).catch(() => {});
  }, []);

  const openCreate = () => { setMode('create'); setTarget(null); setFName(''); setFDesc(''); setFErr(''); };
  const openEdit   = (c: Category) => { setMode('edit'); setTarget(c); setFName(c.name); setFDesc(c.description || ''); setFErr(''); };
  const closeModal = () => { setMode(null); setTarget(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFErr('');
    try {
      if (mode === 'create') {
        const res = await fetch('/api/admin/categories', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fName, description: fDesc }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
      } else if (mode === 'edit' && target) {
        const res = await fetch(`/api/admin/categories/${target.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fName, description: fDesc }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
      }
      closeModal(); await load();
    } catch (e: any) { setFErr(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: Category) => {
    if (c._count.tickets > 0) {
      alert(`Cannot delete "${c.name}" — it has ${c._count.tickets} ticket(s).`);
      return;
    }
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    await load();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminSidebar active="categories" userName={userName || 'Admin'} />
      <main className="flex-1 p-8 overflow-auto">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage support ticket categories</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 shadow-sm">
            + Add Category
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6">
              <Skeleton className="h-10 w-full mb-4" />
              <div className="divide-y divide-gray-50">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorAlert title="Failed to load categories" message={error} />
              <button onClick={load} className="text-sm text-purple-600 hover:underline">Retry</button>
            </div>
          ) : cats.length === 0 ? (
            <EmptyState 
              icon="🏷️" 
              title="No categories" 
              description="Create a category to help organize tickets." 
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Description', 'Tickets', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cats.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{c.description || <span className="italic text-gray-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c._count.tickets > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c._count.tickets} tickets
                      </span>
                    </td>
                    <td className="px-5 py-3 flex gap-4 text-xs font-medium">
                      <button onClick={() => openEdit(c)} className="text-purple-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(c)}
                        className={`${c._count.tickets > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:underline'}`}
                        disabled={c._count.tickets > 0}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        {mode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">{mode === 'create' ? 'Add Category' : 'Edit Category'}</h3>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {fErr && <ErrorAlert message={fErr} />}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category Name</label>
                  <input required type="text" value={fName} onChange={e => setFName(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea rows={3} value={fDesc} onChange={e => setFDesc(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 resize-none" />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
