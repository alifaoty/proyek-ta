import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

const ROLE_HOME = { admin: "/pos", owner: "/dashboard" };

export default function LoginPage() {
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  if (!authLoading && isAuthenticated) {
    return <Navigate to={ROLE_HOME[user.role] || "/pos"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 401 || status === 400
          ? "Email atau kata sandi tidak valid"
          : "Gagal terhubung ke server. Silakan coba lagi.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F0F4F8] flex flex-col justify-center items-center p-4">
      {/* Kartu Utama */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_10px_35px_rgba(15,23,42,0.06)] border border-slate-100 p-8 sm:p-10 transition-all">

        {/* Judul & Subjudul */}
        <div className="text-center mb-7">
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Toko Ban &amp; Velg
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manajemen Persediaan &amp; Point of Sale
          </p>
        </div>

        {/* Alert Error Box */}
        {error && (
          <div
            className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2.5 animate-in fade-in duration-200"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-left text-xs font-semibold text-slate-800 mb-1.5"
            >
              Email <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4 stroke-[1.8]" />
              </span>
              <input
                id="email"
                ref={emailRef}
                type="email"
                required
                disabled={submitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner.mandiri@tokobanmandiri.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>
          </div>

          {/* Input Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-800"
              >
                Kata Sandi <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 stroke-[1.8]" />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 stroke-[1.8]" />
                ) : (
                  <Eye className="w-4 h-4 stroke-[1.8]" />
                )}
              </button>
            </div>
          </div>

          {/* Tombol Submit Utama */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-3 h-11 bg-[#1A42BF] hover:bg-[#16379E] active:bg-[#122E85] disabled:opacity-70 text-white font-semibold rounded-lg text-xs shadow-md shadow-blue-900/10 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
