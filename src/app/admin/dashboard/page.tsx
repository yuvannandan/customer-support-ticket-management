import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminSidebar from '@/components/AdminSidebar';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { EmptyState } from '@/components/UIState';
import Link from 'next/link';

export const metadata = { title: 'Admin Dashboard — Support Portal' };

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  const [
    totalUsers, totalCustomers, totalAgents, totalAdmins,
    totalTickets, openTickets, assignedTickets, inProgressTickets,
    waitingTickets, resolvedTickets, closedTickets, urgentTickets,
    recentTickets, recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'AGENT' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'ASSIGNED' } }),
    prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { status: 'WAITING_FOR_CUSTOMER' } }),
    prisma.ticket.count({ where: { status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { status: 'CLOSED' } }),
    prisma.ticket.count({ where: { priority: 'URGENT' } }),
    prisma.ticket.findMany({
      include: { customer: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const ticketStats = [
    { label: 'Total',    value: totalTickets,    color: 'bg-gray-50 border-gray-200 text-gray-800' },
    { label: 'Open',     value: openTickets,     color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { label: 'Assigned', value: assignedTickets, color: 'bg-purple-50 border-purple-200 text-purple-800' },
    { label: 'In Progress', value: inProgressTickets, color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    { label: 'Waiting',  value: waitingTickets,  color: 'bg-orange-50 border-orange-200 text-orange-800' },
    { label: 'Resolved', value: resolvedTickets, color: 'bg-green-50 border-green-200 text-green-800' },
    { label: 'Closed',   value: closedTickets,   color: 'bg-slate-50 border-slate-200 text-slate-700' },
    { label: 'Urgent',   value: urgentTickets,   color: 'bg-red-50 border-red-200 text-red-800' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminSidebar active="dashboard" userName={user.name} />

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard 👑</h1>
          <p className="text-gray-500 mt-1">Platform-wide overview and statistics.</p>
        </div>

        {/* User stats */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Total Users',  value: totalUsers,     color: 'text-gray-800' },
            { label: 'Customers',    value: totalCustomers, color: 'text-blue-700' },
            { label: 'Agents',       value: totalAgents,    color: 'text-green-700' },
            { label: 'Admins',       value: totalAdmins,    color: 'text-purple-700' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-4xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ticket stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          {ticketStats.map(s => (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-xs font-medium uppercase tracking-wide mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent tickets */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recently Created Tickets</h2>
              <Link href="/admin/tickets" className="text-sm text-purple-600 hover:underline">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentTickets.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon="🎫" title="No tickets" description="No tickets have been created yet." />
                </div>
              ) : recentTickets.map(t => (
                <div key={t.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <Link href={`/admin/tickets/${t.id}`} className="font-medium text-gray-900 text-sm hover:text-purple-600 hover:underline">
                      {t.title}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t.customer.name} · {fmt(t.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent users */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Newest Users</h2>
              <Link href="/admin/users" className="text-sm text-purple-600 hover:underline">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentUsers.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon="👥" title="No users" description="No users have registered yet." />
                </div>
              ) : recentUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{fmt(u.createdAt)}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      u.role === 'ADMIN'  ? 'bg-purple-100 text-purple-800' :
                      u.role === 'AGENT'  ? 'bg-green-100 text-green-800'   :
                                            'bg-gray-100 text-gray-700'
                    }`}>{u.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
