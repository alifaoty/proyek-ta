import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
    <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a' }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
      <p style={{ color: '#64748b' }}>Halaman ini akan diimplementasikan pada sprint berikutnya.</p>
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
              <Route path="/pos" element={<Placeholder title="Kasir POS" />} />
              <Route path="/inventory/inbound" element={<InboundPage />} />
              <Route path="/inventory/outbound" element={<OutboundPage />} />
              <Route path="/inventory/stock-opname" element={<Placeholder title="Stock Opname" />} />

              {/* Eksklusif Owner */}
              <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
                <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
                <Route path="/approval-opname" element={<Placeholder title="Approval Opname" />} />
                <Route path="/expenses" element={<Placeholder title="Biaya Operasional" />} />
                <Route path="/reports/financial" element={<Placeholder title="Laporan Finansial" />} />
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
