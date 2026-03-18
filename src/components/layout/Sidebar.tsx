'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Megaphone, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'תפריט', icon: LayoutDashboard },
  { href: '/kampanim', label: 'קמפיינים', icon: Megaphone },
  { href: '/anshei-kesher', label: 'אנשי קשר', icon: Users },
  { href: '/hagdarot', label: 'הגדרות', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-card border-s border-border py-6 px-3 shrink-0">
      {/* App title */}
      <div className="px-3 mb-8">
        <h1 className="text-xl font-bold text-foreground">מיכל CRM</h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// Mobile sidebar content (used inside Sheet)
export function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col py-6 px-3">
      <div className="px-3 mb-8">
        <h1 className="text-xl font-bold text-foreground">מיכל CRM</h1>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
