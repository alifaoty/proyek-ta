import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import UnauthorizedPage from './pages/errors/UnauthorizedPage';
import ProductPage from './pages/master/ProductPage';
import InboundPage from './pages/inventory/InboundPage';
import OutboundPage from './pages/inventory/OutboundPage';

// Placeholder sementara hingga modul terkait diimplementasikan
function Placeholder({ title }) {
  return (
    <div className="p-6 font-sans">
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-8 max-w-xl">
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mb-3">
          <Construction className="w-5 h-5" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500 mt-1">
          Halaman ini akan diimplementasikan pada sprint berikutnya.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 1. Rute Publik */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* 2. Rute Privat: wajib login, dibungkus layout dengan Sidebar */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'owner']} />}>
            <Route element={<DashboardLayout />}>
              {/* Operasional (Admin & Owner) */}
              <Route path="/master-products" element={<ProductPage />} />
              <Route path="/pos" element={<Placeholder title="Transaksi Penjualan" />} />
              <Route path="/inventory/inbound" element={<InboundPage />} />
              <Route path="/inventory/outbound" element={<OutboundPage />} />
              <Route path="/inventory/stock-opname" element={<Placeholder title="Stok Opname" />} />

              {/* Eksklusif Owner */}
              <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
                <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
                <Route path="/approval-opname" element={<Placeholder title="Persetujuan Stok Opname" />} />
                <Route path="/expenses" element={<Placeholder title="Biaya Operasional" />} />
                <Route path="/reports/financial" element={<Placeholder title="Laporan Keuangan" />} />
              </Route>
            </Route>
          </Route>

          {/* 3. Rute Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;