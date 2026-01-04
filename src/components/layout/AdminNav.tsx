'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/arenas', label: 'Arenas' },
    { href: '/agents', label: 'Agents' },
  ];

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-primary-500">
              Cucumber Admin
            </Link>
            <div className="flex gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition',
                    pathname === link.href
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Admin Panel - Port 3002
          </div>
        </div>
      </div>
    </nav>
  );
}
