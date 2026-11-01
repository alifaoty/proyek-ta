import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const ROLE_HOME = { admin: '/pos', owner: '/dashboard' };

export default function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();
  const home = isAuthenticated ? ROLE_HOME[user.role] || '/login' : '/login';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F9FAFB', fontFamily: 'Inter, system-ui, sans-serif', color: '#1F2937', textAlign: 'center', padding: 24 }}>
      <ShieldAlert size={64} color="#DC2626" />
      <h1 style={{ margin: 0, fontSize: 48 }}>403</h1>
      <h2 style={{ margin: 0 }}>Akses Ditolak</h2>
      <p style={{ color: '#6B7280', maxWidth: 360 }}>
        Maaf, peran Anda tidak memiliki wewenang untuk membuka halaman ini.
      </p>
      <Link to={home} style={{ marginTop: 8, padding: '10px 20px', background: '#2563EB', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
        Kembali
      </Link>
    </div>
  );
}

