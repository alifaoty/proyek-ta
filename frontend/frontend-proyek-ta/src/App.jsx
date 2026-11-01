import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import UnauthorizedPage from './pages/errors/UnauthorizedPage';

// Placeholder sementara hingga modul terkait diimplementasikan
function Placeholder({ title }) {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>{title}</h1>
      <p>Halo, {user?.name} ({user?.role})</p>
      <button type="button" onClick={logout}>Logout</button>
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

          {/* 2. Rute Admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/pos" element={<Placeholder title="Kasir POS" />} />
          </Route>

          {/* 3. Rute Owner */}
          <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
            <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
            <Route path="/expenses" element={<Placeholder title="Biaya Operasional" />} />
            <Route path="/reports/financial" element={<Placeholder title="Laporan Keuangan" />} />
          </Route>

          {/* 4. Rute Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
