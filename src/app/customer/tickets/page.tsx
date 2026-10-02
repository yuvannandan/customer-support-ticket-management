'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerSidebar from '@/components/CustomerSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { Skeleton, SkeletonRow, EmptyState, ErrorAlert } from '@/components/UIState';

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  category: { name: string };
}

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [userName, setUserName] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);

    try {
      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Get username for sidebar from tickets or a separate fetch is unnecessary
  // We'll pass a placeholder and fix via layout pattern if needed
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d?.user?.name) setUserName(d.user.name);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <CustomerSidebar active="tickets" userName={userName || 'Customer'} />

      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
            <p className="text-gray-500 text-sm mt-1">All your support requests</p>
          </div>
          <Link
            href="/customer/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            ✏️ New Ticket
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by ticket # or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-52 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || statusFilter || priorityFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
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
              <ErrorAlert title="Failed to load tickets" message={error} />
              <button onClick={fetchTickets} className="text-sm text-blue-600 hover:underline">Retry</button>
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState 
              icon="🎫" 
              title="No support tickets yet" 
              description="Create your first ticket to get help from our team."
              action={
                <Link
                  href="/customer/tickets/new"
                  className="mt-5 inline-block px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create Ticket
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Ticket ID', 'Subject', 'Category', 'Priority', 'Status', 'Created', 'Updated', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{ticket.ticketNumber}</td>
                      <td className="px-5 py-4 font-medium text-gray-900 max-w-xs truncate">{ticket.title}</td>
                      <td className="px-5 py-4 text-gray-600">{ticket.category.name}</td>
                      <td className="px-5 py-4"><PriorityBadge priority={ticket.priority} /></td>
                      <td className="px-5 py-4"><StatusBadge status={ticket.status} /></td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(ticket.createdAt)}</td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(ticket.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/customer/tickets/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs hover:underline"
                        >
                          View →
                        </Link>
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
