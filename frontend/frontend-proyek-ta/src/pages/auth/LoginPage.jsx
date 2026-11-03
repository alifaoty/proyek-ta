import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const ROLE_HOME = { admin: '/pos', owner: '/dashboard' };

export default function LoginPage() {
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  if (!authLoading && isAuthenticated) {
    return <Navigate to={ROLE_HOME[user.role] || '/pos'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 401 || status === 400
          ? 'Email atau kata sandi salah. Silakan coba lagi.'
          : 'Koneksi terputus. Pastikan internet aktif dan coba beberapa saat lagi.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans flex flex-col justify-center items-center p-4">
      {/* Card Utama */}
      <div className="w-full max-w-[400px] bg-white border border-slate-200/80 rounded-xl shadow-sm p-7 sm:p-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Toko Ban &amp; Velg
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem Manajemen Persediaan &amp; Point of Sale
          </p>
        </div>

        {/* Alert Error Box */}
        {error && (
          <div
            className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium text-left">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Email */}
          <div className="text-left">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Email <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                ref={emailRef}
                type="email"
                required
                disabled={submitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@tokobanvelg.com"
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="text-left">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Kata Sandi <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full h-10 pl-9 pr-10 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Tombol Submit Utama */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk ke Akun</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}