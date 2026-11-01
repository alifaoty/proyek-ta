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
    <>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {open && <div className="dl-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="dl-main">
        <header className="dl-topbar">
          <button type="button" className="dl-burger" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu size={22} />
          </button>
          <b>Toko Ban &amp; Velg</b>
        </header>
        <main className="dl-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
