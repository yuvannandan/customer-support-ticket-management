'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import AgentSidebar from '@/components/AgentSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { Skeleton, SkeletonRow, ErrorAlert } from '@/components/UIState';
import Link from 'next/link';

interface Message {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

interface Activity {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { name: string; role: string };
}

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  category: { name: string };
  customer: { id: string; name: string; email: string };
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string } | null;
  messages: Message[];
  activities: Activity[];
}

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AgentTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  
  const [currentUserId, setCurrentUserId] = useState('');
  const [userName, setUserName] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d?.user) { setCurrentUserId(d.user.id); setUserName(d.user.name); }
      })
      .catch(() => {});
  }, []);

  const fetchTicket = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/agent/tickets/${id}`);
      if (res.status === 403) { setError('Forbidden.'); return; }
      if (res.status === 404) { setError('Ticket not found.'); return; }
      if (!res.ok) throw new Error('Failed to fetch ticket');
      const data = await res.json();
      setTicket(data.ticket);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleClaim = async () => {
    try {
      const res = await fetch(`/api/agent/tickets/${id}/assign`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchTicket();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/agent/tickets/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchTicket();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const res = await fetch(`/api/agent/tickets/${id}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error('Failed to update priority');
      await fetchTicket();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) { setReplyError('Message cannot be empty'); return; }
    setReplyError('');
    setSendingReply(true);
    try {
      const url = isInternal ? `/api/agent/tickets/${id}/notes` : `/api/tickets/${id}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setReply('');
      await fetchTicket();
    } catch (e: any) {
      setReplyError(e.message);
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        <AgentSidebar active="tickets" userName={userName || 'Agent'} />
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
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        <AgentSidebar active="tickets" userName={userName || 'Agent'} />
        <main className="flex-1 p-8 max-w-2xl">
          <ErrorAlert title="Failed to load ticket" message={error || 'Ticket not found'} />
          <Link href="/agent/tickets" className="text-green-600 hover:underline text-sm font-medium">← Back to tickets</Link>
        </main>
      </div>
    );
  }

  const isAssignedToMe = ticket.assignedAgentId === currentUserId;
  const canReply = isAssignedToMe || ticket.status === 'CLOSED'; // (will be blocked if closed anyway, but let the form render or hide properly)

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AgentSidebar active="tickets" userName={userName || 'Agent'} />

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Link href="/agent/tickets" className="text-sm text-gray-500 hover:text-green-600 mb-2 inline-block">
              ← All Tickets
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-sm text-gray-400">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.assignedAgent ? (
                <span className="text-sm text-gray-600">Assigned to: <strong>{ticket.assignedAgent.name}</strong></span>
              ) : (
                <span className="text-sm text-orange-600 font-medium px-2 py-0.5 bg-orange-100 rounded-md">Unassigned</span>
              )}
            </div>
          </div>
          
          {!ticket.assignedAgentId && (
            <button
              onClick={handleClaim}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 shadow-sm"
            >
              🙋 Claim Ticket
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Original Request */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h2 className="font-semibold text-gray-900">Original Request</h2>
                <span className="text-xs text-gray-400">{formatDateTime(ticket.createdAt)}</span>
              </div>
              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {/* Conversation */}
            {ticket.messages.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-5 border-b border-gray-100 pb-3">Conversation Log</h2>
                <div className="flex flex-col gap-5">
                  {ticket.messages.map((msg) => {
                    const isSystemOrInternal = msg.isInternal;
                    const isCustomer = msg.sender.role === 'CUSTOMER';
                    const isOwn = msg.sender.id === currentUserId;
                    
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[90%] ${isOwn && !isSystemOrInternal ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">{msg.sender.name}</span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">{msg.sender.role}</span>
                          {isSystemOrInternal && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 rounded uppercase font-bold">Internal Note</span>}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isSystemOrInternal ? 'bg-yellow-50 border border-yellow-200 text-gray-800 self-start rounded-bl-sm' :
                          isOwn ? 'bg-green-600 text-white self-end rounded-br-sm' : 
                          isCustomer ? 'bg-blue-50 border border-blue-100 text-gray-800 self-start rounded-bl-sm' :
                          'bg-gray-100 text-gray-800 self-start rounded-bl-sm'
                        }`}>
                          {msg.message}
                        </div>
                        <span className="text-xs text-gray-400 mt-1">{formatDateTime(msg.createdAt)}</span>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}

            {/* Reply Box */}
            {ticket.status !== 'CLOSED' ? (
              isAssignedToMe ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                    <h2 className="font-semibold text-gray-900">Add a Response</h2>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 cursor-pointer flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded text-green-600 focus:ring-green-500"
                        />
                        Internal Note (Hidden from Customer)
                      </label>
                    </div>
                  </div>
                  
                  <form onSubmit={handleReply}>
                    <textarea
                      rows={4}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={isInternal ? "Write a private note for staff only..." : "Write a public reply to the customer..."}
                      className={`w-full px-4 py-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 ${isInternal ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'} ${replyError ? 'border-red-400' : ''}`}
                    />
                    {replyError && <p className="mt-1 text-xs text-red-600">{replyError}</p>}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className={`px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${isInternal ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {sendingReply ? 'Sending...' : (isInternal ? 'Add Internal Note' : 'Send Public Reply')}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-orange-50 rounded-xl border border-orange-200 p-6 text-center">
                  <p className="text-sm text-orange-800 mb-3">You must be assigned to this ticket to reply.</p>
                  {!ticket.assignedAgentId && (
                    <button onClick={handleClaim} className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700">
                      Claim Ticket to Reply
                    </button>
                  )}
                </div>
              )
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-500">
                🔒 This ticket is closed. No further replies can be sent.
              </div>
            )}
            
          </div>

          {/* Right Column: Controls & Metadata */}
          <div className="space-y-6">
            
            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Ticket Controls</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Customer Profile</h2>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{ticket.customer.name}</div>
                <div className="text-gray-500 mt-1">{ticket.customer.email}</div>
                <div className="text-xs text-gray-400 mt-2 font-mono">ID: {ticket.customer.id}</div>
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Activity History</h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {ticket.activities.map(act => (
                  <div key={act.id} className="text-xs">
                    <div className="font-medium text-gray-800">{act.action.replace(/_/g, ' ')}</div>
                    {(act.oldValue || act.newValue) && (
                      <div className="text-gray-500 mt-0.5">
                        {act.oldValue && <span className="line-through mr-1">{act.oldValue}</span>}
                        {act.newValue && <span className="text-green-600">→ {act.newValue}</span>}
                      </div>
                    )}
                    <div className="text-gray-400 mt-0.5">
                      By {act.user.name} on {formatDateTime(act.createdAt)}
                    </div>
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
