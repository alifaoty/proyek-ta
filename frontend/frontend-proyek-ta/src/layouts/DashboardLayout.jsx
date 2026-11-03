import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState({ pathname, open: false });
  const open = drawer.pathname === pathname && drawer.open;
  const setOpen = (nextOpen) => setDrawer({ pathname, open: nextOpen });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:pl-64">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Topbar Mobile */}
      <header className="sticky top-0 z-10 flex items-center gap-3 h-13 px-4 bg-slate-900 text-white border-b border-slate-800 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="p-1.5 -ml-1 rounded-lg text-slate-200 hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <b className="text-sm font-bold tracking-tight">Toko Ban &amp; Velg</b>
      </header>

      <main className="flex-1 w-full min-w-0">
        <Outlet />
      </main>
    </div>
  );
}