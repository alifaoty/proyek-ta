import { NavLink } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardCheck, ClipboardList, LayoutDashboard,
  LogOut, Receipt, ShoppingCart, Wallet, X,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const OPERASIONAL = [
  { to: '/master-products', label: 'Master Produk', icon: Boxes },
  { to: '/pos', label: 'Penjualan (POS)', icon: ShoppingCart },
  { to: '/inventory/inbound', label: 'Penerimaan Barang', icon: ArrowDownToLine },
  { to: '/inventory/outbound', label: 'Mutasi Persediaan', icon: ArrowUpFromLine },
  { to: '/inventory/stock-opname', label: 'Stok Opname', icon: ClipboardList },
];

const OWNER_ONLY = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/stock-approvals', label: 'Persetujuan Stok Opname', icon: ClipboardCheck },
  { to: '/expenses', label: 'Biaya Operasional', icon: Wallet },
  { to: '/reports/financial', label: 'Laporan Keuangan', icon: Receipt },
];

function NavItem({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          isActive
            ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-950/40'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col font-sans transition-transform duration-200 ease-out md:translate-x-0 ${
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Header Branding */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0 text-left">
          <div className="min-w-0">
            <b className="block text-sm font-bold text-white tracking-tight truncate">
              Toko Ban &amp; Velg
            </b>
            <span className="block text-[11px] text-slate-400 truncate">
              Inventori &amp; Point of Sale
            </span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Daftar Navigasi */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-left">
            Operasional
          </div>
          <div className="space-y-1">
            {OPERASIONAL.map((item) => (
              <NavItem key={item.to} {...item} onNavigate={onClose} />
            ))}
          </div>
        </div>

        {user?.role === 'owner' && (
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-left">
              Khusus Owner
            </div>
            <div className="space-y-1">
              {OWNER_ONLY.map((item) => (
                <NavItem key={item.to} {...item} onNavigate={onClose} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Indikator Sesi Aktif */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-t border-slate-800 bg-slate-950/40"
        aria-label="Sesi aktif"
      >
        <div
          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold shrink-0"
          aria-hidden="true"
        >
          {(user?.name || '?').trim().charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-semibold text-white truncate" title={user?.name}>
            {user?.name}
          </div>
          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-blue-400 border border-slate-700">
            {user?.role}
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          title="Keluar dari Sistem"
          aria-label="Keluar dari Sistem"
          className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}