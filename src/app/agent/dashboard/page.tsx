import { requireAgent } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';

export default async function AgentDashboard() {
  const user = await requireAgent();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
          <LogoutButton />
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-8">
          <p className="text-lg text-green-900">Welcome, <strong>{user.name}</strong></p>
          <p className="text-sm text-green-700 mt-1">Role: {user.role}</p>
        </div>

        <div>
          <Link href="/agent/tickets" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            View Assigned Tickets
          </Link>
        </div>
      </div>
    </div>
  );
}
