import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AgentSidebar from '@/components/AgentSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { EmptyState } from '@/components/UIState';
import Link from 'next/link';

export const metadata = {
  title: 'Agent Dashboard — Support Portal',
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AgentDashboard() {
  const user = await requireRole(['AGENT', 'ADMIN']);

  const [totalAssigned, open, inProgress, waiting, resolved, urgent, recent] = await Promise.all([
    prisma.ticket.count({ where: { assignedAgentId: user.id } }),
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { status: 'WAITING_FOR_CUSTOMER' } }),
    prisma.ticket.count({ where: { status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { priority: 'URGENT' } }),
    prisma.ticket.findMany({
      where: {
        OR: [
          { assignedAgentId: user.id },
          { status: 'OPEN' }
        ]
      },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
  ]);

  const stats = [
    { label: 'My Assigned', value: totalAssigned, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    { label: 'Total Open', value: open, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { label: 'In Progress', value: inProgress, color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
    { label: 'Waiting on Customer', value: waiting, color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
    { label: 'Resolved', value: resolved, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-700' },
    { label: 'Urgent', value: urgent, color: 'bg-red-50 border-red-200', textColor: 'text-red-700' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AgentSidebar active="dashboard" userName={user.name} />

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Agent Dashboard 👋
          </h1>
          <p className="text-gray-500 mt-1">Here is the current status of the support queue.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-5 ${stat.color}`}>
              <div className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Tickets (Yours & Open)</h2>
            <Link href="/agent/tickets" className="text-sm text-green-600 hover:underline">
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                icon="🎫" 
                title="No tickets" 
                description="There are currently no tickets in your queue." 
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/agent/tickets/${ticket.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-xs font-mono text-gray-400 mr-2">{ticket.ticketNumber}</span>
                    <span className="font-medium text-gray-900 text-sm">{ticket.title}</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {ticket.category.name} · Updated {formatDate(ticket.updatedAt)}
                      {ticket.assignedAgentId === user.id && <span className="ml-2 text-green-600 font-medium">(Assigned to you)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
