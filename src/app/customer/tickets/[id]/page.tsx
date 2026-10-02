'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import CustomerSidebar from '@/components/CustomerSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { Skeleton, SkeletonRow, ErrorAlert } from '@/components/UIState';
import Link from 'next/link';

interface Message {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
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
  assignedAgent: { id: string; name: string } | null;
  messages: Message[];
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getRoleLabel(role: string) {
  if (role === 'AGENT') return 'Support Agent';
  if (role === 'ADMIN') return 'Admin';
  return 'Customer';
}

function getRoleBubbleStyle(role: string, isCurrentUser: boolean) {
  if (isCurrentUser) return 'bg-blue-600 text-white self-end rounded-br-sm';
  if (role === 'AGENT' || role === 'ADMIN') return 'bg-green-50 border border-green-200 text-gray-900 self-start rounded-bl-sm';
  return 'bg-gray-100 text-gray-900 self-start rounded-bl-sm';
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [closing, setClosing] = useState(false);
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
      const res = await fetch(`/api/tickets/${id}`);
      if (res.status === 403) { setError('You do not have permission to view this ticket.'); return; }
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

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) { setReplyError('Reply cannot be empty'); return; }
    setReplyError('');
    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');
      setReply('');
      await fetchTicket(); // Refresh to show new message
    } catch (e: any) {
      setReplyError(e.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/tickets/${id}/close`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close ticket');
      await fetchTicket();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        <CustomerSidebar active="tickets" userName={userName || 'Customer'} />
        <main className="flex-1 p-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
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
        <CustomerSidebar active="tickets" userName={userName || 'Customer'} />
        <main className="flex-1 p-8 max-w-2xl">
          <ErrorAlert title="Failed to load ticket" message={error || 'Ticket not found'} />
          <Link href="/customer/tickets" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to My Tickets
          </Link>
        </main>
      </div>
    );
  }

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <CustomerSidebar active="tickets" userName={userName || 'Customer'} />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Link href="/customer/tickets" className="text-sm text-gray-500 hover:text-blue-600 mb-2 inline-block">
              ← My Tickets
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-sm text-gray-400">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>

          {!isClosed && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {closing ? 'Closing...' : '🔒 Close Ticket'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Conversation */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Original description */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Original Request</h2>
              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              <p className="text-xs text-gray-400 mt-3">{formatDateTime(ticket.createdAt)}</p>
            </div>

            {/* Messages */}
            {ticket.messages.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Conversation</h2>
                <div className="flex flex-col gap-4">
                  {ticket.messages.map((msg) => {
                    const isOwn = msg.sender.id === currentUserId;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[85%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-600">{msg.sender.name}</span>
                          <span className="text-xs text-gray-400">{getRoleLabel(msg.sender.role)}</span>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${getRoleBubbleStyle(msg.sender.role, isOwn)}`}>
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

            {/* Reply box */}
            {!isClosed ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reply</h2>
                <form onSubmit={handleReply}>
                  <textarea
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write your reply..."
                    className={`w-full px-4 py-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${replyError ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {replyError && <p className="mt-1 text-xs text-red-600">{replyError}</p>}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {sendingReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center text-sm text-gray-500">
                🔒 This ticket is closed. No further replies can be sent.
              </div>
            )}
          </div>

          {/* Right: Ticket info */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Ticket Details</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-400 uppercase">Category</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">{ticket.category.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase">Priority</dt>
                  <dd className="mt-0.5"><PriorityBadge priority={ticket.priority} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase">Status</dt>
                  <dd className="mt-0.5"><StatusBadge status={ticket.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase">Assigned Agent</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {ticket.assignedAgent?.name ?? <span className="text-gray-400 italic">Unassigned</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase">Created</dt>
                  <dd className="text-sm text-gray-700 mt-0.5">{formatDateTime(ticket.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase">Last Updated</dt>
                  <dd className="text-sm text-gray-700 mt-0.5">{formatDateTime(ticket.updatedAt)}</dd>
                </div>
                {ticket.resolvedAt && (
                  <div>
                    <dt className="text-xs text-gray-400 uppercase">Resolved</dt>
                    <dd className="text-sm text-gray-700 mt-0.5">{formatDateTime(ticket.resolvedAt)}</dd>
                  </div>
                )}
                {ticket.closedAt && (
                  <div>
                    <dt className="text-xs text-gray-400 uppercase">Closed</dt>
                    <dd className="text-sm text-gray-700 mt-0.5">{formatDateTime(ticket.closedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
