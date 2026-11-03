import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const ROLE_HOME = { admin: '/pos', owner: '/dashboard' };

export default function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();
  const home = isAuthenticated ? ROLE_HOME[user.role] || '/login' : '/login';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-xl shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <span className="inline-block font-mono text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 mb-2">
          HTTP 403 • Forbidden
        </span>
        <h1 className="text-xl font-bold text-slate-900">Akses Ditolak</h1>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Maaf, peran akun Anda tidak memiliki wewenang untuk mengakses modul atau halaman ini.
        </p>
        <Link
          to={home}
          className="mt-6 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Utama</span>
        </Link>
      </div>
    </div>
  );
}