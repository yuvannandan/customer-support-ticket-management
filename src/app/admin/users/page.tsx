'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Skeleton, SkeletonRow, EmptyState, ErrorAlert } from '@/components/UIState';

interface User { id: string; name: string; email: string; role: string; createdAt: string; }

const ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'];

function RolePill({ role }: { role: string }) {
  const cls =
    role === 'ADMIN'  ? 'bg-purple-100 text-purple-800' :
    role === 'AGENT'  ? 'bg-green-100 text-green-800'   :
                        'bg-gray-100 text-gray-700';
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${cls}`}>{role}</span>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [me,  setMe]  = useState<User | null>(null);

  // Modal
  const [mode,   setMode]   = useState<'create' | 'edit' | null>(null);
  const [target, setTarget] = useState<User | null>(null);
  const [fName,  setFName]  = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fRole,  setFRole]  = useState('CUSTOMER');
  const [fPass,  setFPass]  = useState('');
  const [fErr,   setFErr]   = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    const p = new URLSearchParams();
    if (search)     p.set('search', search);
    if (roleFilter) p.set('role', roleFilter);
    try {
      const res = await fetch(`/api/admin/users?${p}`);
      if (!res.ok) throw new Error('Failed to load users');
      setUsers((await res.json()).users);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.user) setMe(d.user); }).catch(() => {});
  }, []);

  const openCreate = () => {
    setMode('create'); setTarget(null);
    setFName(''); setFEmail(''); setFRole('CUSTOMER'); setFPass(''); setFErr('');
  };
  const openEdit = (u: User) => {
    setMode('edit'); setTarget(u);
    setFName(u.name); setFEmail(u.email); setFRole(u.role); setFPass(''); setFErr('');
  };
  const closeModal = () => { setMode(null); setTarget(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFErr('');
    try {
      if (mode === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fName, email: fEmail, password: fPass, role: fRole }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
      } else if (mode === 'edit' && target) {
        const payload: any = { name: fName, email: fEmail, role: fRole };
        if (fPass) payload.password = fPass;
        const res = await fetch(`/api/admin/users/${target.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
      }
      closeModal(); await fetchUsers();
    } catch (e: any) { setFErr(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    await fetchUsers();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminSidebar active="users" userName={me?.name || 'Admin'} />
      <main className="flex-1 p-8 overflow-auto">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage platform users</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 shadow-sm">
            + Create User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text" placeholder="Search name or email…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {(search || roleFilter) && (
            <button onClick={() => { setSearch(''); setRoleFilter(''); }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Clear
            </button>
          )}
        </div>

        {/* Table */}
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
              <ErrorAlert title="Failed to load users" message={error} />
              <button onClick={fetchUsers} className="text-sm text-purple-600 hover:underline">Retry</button>
            </div>
          ) : users.length === 0 ? (
            <EmptyState 
              icon="👥" 
              title="No users found" 
              description="Try adjusting your filters or create a new user." 
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {u.name} {me?.id === u.id && <span className="text-xs text-purple-500">(You)</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3"><RolePill role={u.role} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 flex gap-4 text-xs font-medium">
                      <button onClick={() => openEdit(u)} className="text-purple-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(u)} className="text-red-500 hover:underline">Delete</button>
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
                <h3 className="text-lg font-bold text-gray-900">{mode === 'create' ? 'Create New User' : 'Edit User'}</h3>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {fErr && <ErrorAlert message={fErr} />}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input required type="text" value={fName} onChange={e => setFName(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input required type="email" value={fEmail} onChange={e => setFEmail(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select value={fRole} onChange={e => setFRole(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password {mode === 'edit' && <span className="font-normal text-gray-400">(leave blank to keep current)</span>}
                  </label>
                  <input type="password" required={mode === 'create'} value={fPass} onChange={e => setFPass(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500" />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save User'}
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
