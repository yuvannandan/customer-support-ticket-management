import Link from 'next/link';
import LogoutButton from './LogoutButton';

interface CustomerSidebarProps {
  active?: 'dashboard' | 'tickets' | 'new-ticket';
  userName: string;
}

const navItems = [
  { href: '/customer/dashboard', label: 'Dashboard', key: 'dashboard', icon: '🏠' },
  { href: '/customer/tickets', label: 'My Tickets', key: 'tickets', icon: '🎫' },
  { href: '/customer/tickets/new', label: 'Create Ticket', key: 'new-ticket', icon: '✏️' },
];

export default function CustomerSidebar({ active, userName }: CustomerSidebarProps) {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b border-gray-700">
        <div className="text-lg font-bold text-white">Support Portal</div>
        <div className="text-sm text-gray-400 mt-1 truncate">{userName}</div>
        <span className="mt-2 inline-block text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
          Customer
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <LogoutButton />
      </div>
    </aside>
  );
}
