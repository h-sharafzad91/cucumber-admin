import type { Metadata } from 'next';
import './globals.css';
import { AdminNav } from '@/components/layout/AdminNav';

export const metadata: Metadata = {
  title: 'Cucumber Trade - Admin Panel',
  description: 'Admin dashboard for Cucumber Trade Arena',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 text-white">
        <AdminNav />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
