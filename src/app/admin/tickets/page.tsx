'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { Skeleton, SkeletonRow, EmptyState, ErrorAlert } from '@/components/UIState';

interface Ticket {
  id: string; ticketNumber: string; title: string; status: string; priority: string;
  updatedAt: string;
  category: { name: string };
  customer: { name: string; email: string };
  assignedAgent: { name: string } | null;
}

const STATUSES   = ['OPEN','ASSIGNED','IN_PROGRESS','WAITING_FOR_CUSTOMER','RESOLVED','CLOSED','REOPENED'];
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'];

export default function AdminTicketsPage() {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [priority, setPriority] = useState('');
  const [assign,   setAssign]   = useState('');
  const [userName, setUserName] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true); setError('');
    const p = new URLSearchParams();
    if (search)   p.set('search',   search);
    if (status)   p.set('status',   status);
    if (priority) p.set('priority', priority);
    if (assign)   p.set('assignedAgentId', assign);
    try {
      const res = await fetch(`/api/admin/tickets?${p}`);
      if (!res.ok) throw new Error('Failed to load tickets');
      setTickets((await res.json()).tickets);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, status, priority, assign]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.user?.name) setUserName(d.user.name); }).catch(() => {});
  }, []);

  const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminSidebar active="tickets" userName={userName || 'Admin'} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Global Ticket Management</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all tickets across the platform</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <input type="text" placeholder="Search ticket #, subject, customer…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <select value={assign} onChange={e => setAssign(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Any Assignment</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Any Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Any Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || status || priority || assign) && (
            <button onClick={() => { setSearch(''); setStatus(''); setPriority(''); setAssign(''); }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
          )}
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
              <ErrorAlert title="Failed to load tickets" message={error} />
              <button onClick={fetchTickets} className="text-sm text-purple-600 hover:underline">Retry</button>
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState 
              icon="🎫" 
              title="No tickets found" 
              description="Try adjusting your filters or search query." 
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Ticket #','Customer','Subject','Category','Priority','Status','Agent','Updated',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.ticketNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.customer.name}</div>
                        <div className="text-xs text-gray-400">{t.customer.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={t.title}>{t.title}</td>
                      <td className="px-4 py-3 text-gray-600">{t.category.name}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-xs">
                        {t.assignedAgent ? <span className="font-medium text-gray-900">{t.assignedAgent.name}</span>
                                         : <span className="text-gray-400 italic">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(t.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/tickets/${t.id}`}
                          className="text-purple-600 hover:underline text-xs font-medium">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
