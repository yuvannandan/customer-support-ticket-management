import { requireCustomer } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CustomerSidebar from '@/components/CustomerSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { EmptyState } from '@/components/UIState';
import Link from 'next/link';

export const metadata = {
  title: 'Customer Dashboard — Support Portal',
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function CustomerDashboard() {
  const user = await requireCustomer();

  const [total, open, inProgress, resolved, recent] = await Promise.all([
    prisma.ticket.count({ where: { customerId: user.id } }),
    prisma.ticket.count({ where: { customerId: user.id, status: 'OPEN' } }),
    prisma.ticket.count({ where: { customerId: user.id, status: { in: ['IN_PROGRESS', 'ASSIGNED', 'WAITING_FOR_CUSTOMER'] } } }),
    prisma.ticket.count({ where: { customerId: user.id, status: { in: ['RESOLVED', 'CLOSED'] } } }),
    prisma.ticket.findMany({
      where: { customerId: user.id },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const stats = [
    { label: 'Total Tickets', value: total, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-900' },
    { label: 'Open', value: open, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { label: 'In Progress', value: inProgress, color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
    { label: 'Resolved / Closed', value: resolved, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <CustomerSidebar active="dashboard" userName={user.name} />

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's an overview of your support tickets.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-5 ${stat.color}`}>
              <div className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Action */}
        <div className="mb-8">
          <Link
            href="/customer/tickets/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ✏️ Create New Ticket
          </Link>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Tickets</h2>
            <Link href="/customer/tickets" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                icon="🎫" 
                title="No tickets yet" 
                description="Create your first support ticket to get started." 
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/customer/tickets/${ticket.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-xs font-mono text-gray-400 mr-2">{ticket.ticketNumber}</span>
                    <span className="font-medium text-gray-900 text-sm">{ticket.title}</span>
                    <div className="text-xs text-gray-400 mt-0.5">{ticket.category.name} · {formatDate(ticket.createdAt)}</div>
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
