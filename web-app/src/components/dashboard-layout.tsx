'use client';

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layout, Database, Settings } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <nav className="p-5 space-y-2">
          <Link href="/" className={`flex items-center space-x-2 p-2 rounded-lg ${pathname === '/' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
            <Layout className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/databases" className={`flex items-center space-x-2 p-2 rounded-lg ${pathname === '/databases' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
            <Database className="w-5 h-5" />
            <span>Databases</span>
          </Link>
          <Link href="/settings" className={`flex items-center space-x-2 p-2 rounded-lg ${pathname === '/settings' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        
        {children}
      </main>
    </div>
  )
}