import { NavLink } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardCheck, ClipboardList, LayoutDashboard,
  LogOut, Receipt, ShoppingCart, Wallet,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import './Sidebar.css';

const OPERASIONAL = [
  { to: '/master-products', label: 'Master Produk', icon: Boxes },
  { to: '/pos', label: 'Transaksi Penjualan', icon: ShoppingCart },
  { to: '/inventory/inbound', label: 'Penerimaan Barang', icon: ArrowDownToLine },
  { to: '/inventory/outbound', label: 'Mutasi Persediaan', icon: ArrowUpFromLine },
  { to: '/inventory/stock-opname', label: 'Stok Opname', icon: ClipboardList },
];

const OWNER_ONLY = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/approval-opname', label: 'Persetujuan Stok Opname', icon: ClipboardCheck },
  { to: '/expenses', label: 'Biaya Operasional', icon: Wallet },
  { to: '/reports/financial', label: 'Laporan Keuangan', icon: Receipt },
];

function NavItem({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}>
      <Icon size={17} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`sb ${open ? 'open' : ''}`}>
      <div className="sb-brand">
        <b>Toko Ban &amp; Velg</b>
        <span>Sistem Manajemen Persediaan &amp; Point of Sale</span>
      </div>

      <nav className="sb-nav">
        <div className="sb-group">Operasional</div>
        {OPERASIONAL.map((item) => <NavItem key={item.to} {...item} onNavigate={onClose} />)}

        {user?.role === 'owner' && (
          <>
            <div className="sb-group">Khusus Owner</div>
            {OWNER_ONLY.map((item) => <NavItem key={item.to} {...item} onNavigate={onClose} />)}
          </>
        )}
      </nav>

      <div className="sb-user" aria-label="Sesi aktif">
        <div className="sb-avatar" aria-hidden="true">{(user?.name || '?').trim().charAt(0).toUpperCase()}</div>
        <div className="sb-user-meta">
          <div className="sb-user-name" title={user?.name}>{user?.name}</div>
          <span className="sb-role">{user?.role}</span>
        </div>
        <button type="button" className="sb-logout" onClick={logout} title="Keluar dari Sistem" aria-label="Keluar dari Sistem">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

