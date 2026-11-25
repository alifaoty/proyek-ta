import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import UnauthorizedPage from './pages/errors/UnauthorizedPage';
import ProductPage from './pages/master/ProductPage';
import InboundPage from './pages/inventory/InboundPage';
import OutboundPage from './pages/inventory/OutboundPage';
import StockOpnamePage from './pages/inventory/StockOpnamePage';
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage';
import StockApprovalPage from './pages/owner/StockApprovalPage';
import ExpensesPage from './pages/owner/ExpensesPage';
import ReportsPage from './pages/owner/ReportsPage';
import POSPage from './pages/pos/POSPage';

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
              <Route path="/pos" element={<POSPage />} />
              <Route path="/inventory/inbound" element={<InboundPage />} />
              <Route path="/inventory/outbound" element={<OutboundPage />} />
              <Route path="/inventory/stock-opname" element={<StockOpnamePage />} />

              {/* Eksklusif Owner */}
              <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
                <Route path="/dashboard" element={<OwnerDashboardPage />} />
                <Route path="/owner/stock-approvals" element={<StockApprovalPage />} />
                <Route path="/approval-opname" element={<Navigate to="/owner/stock-approvals" replace />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/owner/expenses" element={<ExpensesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/financial" element={<ReportsPage />} />
                <Route path="/reports/audit-trail" element={<ReportsPage />} />
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
