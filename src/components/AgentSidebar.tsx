'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

interface AgentSidebarProps {
  active?: 'dashboard' | 'tickets';
  userName: string;
}

const navItems = [
  { href: '/agent/dashboard', label: 'Dashboard', key: 'dashboard', icon: '📊' },
  { href: '/agent/tickets', label: 'All Tickets', key: 'tickets', icon: '📋' },
];

export default function AgentSidebar({ active, userName }: AgentSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Header & Hamburger */}
      <div className="md:hidden flex items-center justify-between bg-gray-900 text-white p-4 w-full">
        <div className="font-bold">Support Portal</div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          className="p-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50
        w-64 min-h-screen bg-gray-900 text-white flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="p-6 border-b border-gray-700">
          <div className="text-lg font-bold text-white hidden md:block">Support Portal</div>
          <div className="text-sm text-gray-400 mt-1 md:mt-2 truncate">{userName}</div>
          <span className="mt-2 inline-block text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
            Support Agent
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
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset`}
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
    </>
  );
}
