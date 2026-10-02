'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { Skeleton, SkeletonRow, ErrorAlert } from '@/components/UIState';

interface Msg { id: string; message: string; isInternal: boolean; createdAt: string; sender: { name: string; role: string }; }
interface Act { id: string; action: string; oldValue: string | null; newValue: string | null; createdAt: string; user: { name: string }; }
interface Agent { id: string; name: string; }
interface Ticket {
  id: string; ticketNumber: string; title: string; description: string;
  status: string; priority: string; createdAt: string; updatedAt: string;
  resolvedAt: string | null; closedAt: string | null;
  assignedAgentId: string | null;
  category: { name: string };
  customer: { name: string; email: string; id: string };
  assignedAgent: Agent | null;
  messages: Msg[]; activities: Act[];
}

const STATUSES   = ['OPEN','ASSIGNED','IN_PROGRESS','WAITING_FOR_CUSTOMER','RESOLVED','CLOSED','REOPENED'];
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'];
const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket,   setTicket]   = useState<Ticket | null>(null);
  const [agents,   setAgents]   = useState<Agent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [userName, setUserName] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/admin/tickets/${id}`);
      if (res.status === 404) { setError('Ticket not found.'); return; }
      if (!res.ok) throw new Error('Failed to load ticket');
      setTicket((await res.json()).ticket);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.user?.name) setUserName(d.user.name); }).catch(() => {});
    fetch('/api/admin/users?role=AGENT').then(r => r.json()).then(d => { if (d?.users) setAgents(d.users); }).catch(() => {});
  }, [id]);

  const patch = async (path: string, body: any) => {
    const res = await fetch(`/api/admin/tickets/${id}/${path}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    await load();
  };

  const handleAssign = (agentId: string) => patch('assign', { agentId: agentId || null });

  if (loading) return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminSidebar active="tickets" userName={userName || 'Admin'} />
      <main className="flex-1 p-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
              <Skeleton className="h-6 w-32 mb-6" />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-6 w-32 mb-6" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  if (error || !ticket) return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminSidebar active="tickets" userName={userName || 'Admin'} />
      <main className="flex-1 p-8 max-w-2xl">
        <ErrorAlert title="Failed to load ticket" message={error || 'Ticket not found'} />
        <Link href="/admin/tickets" className="text-purple-600 hover:underline text-sm font-medium">← Back to tickets</Link>
      </main>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminSidebar active="tickets" userName={userName || 'Admin'} />
      <main className="flex-1 p-8 overflow-auto">

        <Link href="/admin/tickets" className="text-sm text-gray-500 hover:text-purple-600 mb-4 inline-block">← All Tickets</Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-sm text-gray-400">{ticket.ticketNumber}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Description + Messages */}
          <div className="xl:col-span-2 space-y-6">

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <h2 className="font-semibold text-gray-900">Original Request</h2>
                <span className="text-xs text-gray-400">{fmt(ticket.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.messages.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5">Conversation</h2>
                <div className="flex flex-col gap-5">
                  {ticket.messages.map(m => (
                    <div key={m.id} className={`max-w-[90%] ${m.sender.role === 'CUSTOMER' ? 'self-start' : 'self-end items-end'} flex flex-col`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{m.sender.name}</span>
                        <span className="text-xs text-gray-400 uppercase">{m.sender.role}</span>
                        {m.isInternal && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded font-bold uppercase">Internal Note</span>}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl text-sm ${
                        m.isInternal ? 'bg-yellow-50 border border-yellow-200 text-gray-800 self-start rounded-bl-sm' :
                        m.sender.role === 'CUSTOMER' ? 'bg-blue-50 border border-blue-100 text-gray-800 self-start rounded-bl-sm' :
                        'bg-purple-600 text-white self-end rounded-br-sm'
                      }`}>{m.message}</div>
                      <span className="text-xs text-gray-400 mt-1">{fmt(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-t-4 border-t-purple-600">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Admin Controls</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Assigned Agent</label>
                  <select value={ticket.assignedAgentId ?? ''} onChange={e => handleAssign(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-purple-500">
                    <option value="">— Unassign —</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={ticket.status} onChange={e => patch('status', { status: e.target.value })}
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-purple-500">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select value={ticket.priority} onChange={e => patch('priority', { priority: e.target.value })}
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-purple-500">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Customer</h2>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{ticket.customer.name}</div>
                <div className="text-gray-500 mt-1">{ticket.customer.email}</div>
                <div className="text-xs text-gray-400 mt-2 font-mono">ID: {ticket.customer.id}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Activity History</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ticket.activities.map(a => (
                  <div key={a.id} className="text-xs">
                    <div className="font-medium text-gray-800">{a.action.replace(/_/g,' ')}</div>
                    {(a.oldValue || a.newValue) && (
                      <div className="text-gray-500 mt-0.5">
                        {a.oldValue && <span className="line-through mr-1">{a.oldValue}</span>}
                        {a.newValue && <span className="text-purple-600">→ {a.newValue}</span>}
                      </div>
                    )}
                    <div className="text-gray-400 mt-0.5">By {a.user.name} · {fmt(a.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
