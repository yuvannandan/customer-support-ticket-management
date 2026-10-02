import { requireCustomer } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';

export default async function CustomerDashboard() {
  const user = await requireCustomer();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
          <LogoutButton />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8">
          <p className="text-lg text-blue-900">Welcome, <strong>{user.name}</strong></p>
          <p className="text-sm text-blue-700 mt-1">Role: {user.role}</p>
        </div>

        <div>
          <Link href="/customer/tickets" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            View My Tickets
          </Link>
        </div>
      </div>
    </div>
  );
}
