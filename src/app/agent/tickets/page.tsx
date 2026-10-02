'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AgentSidebar from '@/components/AgentSidebar';
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
  customer: { name: string; email: string };
  assignedAgent: { name: string } | null;
}

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AgentTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('');
  
  const [userName, setUserName] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (assignmentFilter) params.set('assignment', assignmentFilter);

    try {
      const res = await fetch(`/api/agent/tickets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, assignmentFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d?.user?.name) setUserName(d.user.name);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AgentSidebar active="tickets" userName={userName || 'Agent'} />

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and resolve customer requests</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search ticket #, subject, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[250px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Any Assignment</option>
            <option value="mine">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Any Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Any Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || statusFilter || priorityFilter || assignmentFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setAssignmentFilter(''); }}
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
              <button onClick={fetchTickets} className="text-sm text-green-600 hover:underline">Retry</button>
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
                  <tr>
                    {['Ticket ID', 'Customer', 'Subject', 'Category', 'Priority', 'Status', 'Agent', 'Updated', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{ticket.ticketNumber}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">{ticket.customer.name}</div>
                        <div className="text-xs text-gray-500">{ticket.customer.email}</div>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900 max-w-xs truncate" title={ticket.title}>{ticket.title}</td>
                      <td className="px-5 py-4 text-gray-600">{ticket.category.name}</td>
                      <td className="px-5 py-4"><PriorityBadge priority={ticket.priority} /></td>
                      <td className="px-5 py-4"><StatusBadge status={ticket.status} /></td>
                      <td className="px-5 py-4 text-gray-600 text-xs">
                        {ticket.assignedAgent ? (
                          <span className="font-medium text-gray-900">{ticket.assignedAgent.name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">{formatDate(ticket.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/agent/tickets/${ticket.id}`}
                          className="text-green-600 hover:text-green-800 font-medium text-xs hover:underline"
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
