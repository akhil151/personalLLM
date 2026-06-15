'use client';

import { NavLink } from '@/components/ui/NavLink';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

const navItems = [
  { href: '/dashboard', label: 'Executive Dashboard', icon: '📊' },
  { href: '/goals', label: 'Goals', icon: '🎯' },
  { href: '/projects', label: 'Projects', icon: '📋' },
  { href: '/tasks', label: 'Tasks', icon: '✅' },
  { href: '/recommendations', label: 'Recommendations', icon: '💡' },
  { href: '/brief', label: 'Executive Brief', icon: '📰' },
  { href: '/jarvis', label: 'Jarvis Chat', icon: '🤖' },
  { href: '/admin/observability', label: 'Observability', icon: '📈' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          JARVIS
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Executive Intelligence</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <LogoutButton />
      </div>
    </aside>
  );
}
