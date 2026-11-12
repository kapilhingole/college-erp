import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Info,
  HelpCircle,
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [warnBeforeLogin, setWarnBeforeLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address, PRN, or User ID is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (res.data.success) {
        const { token, refreshToken, user, profile } = res.data.data;
        login(token, refreshToken, user, profile);
        navigate('/profile');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? `Cannot connect to ERP server at ${API_BASE_URL}. Ensure backend is running.`
          : 'Authentication failed. Please check your credentials.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FD] flex flex-col justify-between font-sans text-slate-800">
      {/* 1. Official ZES Cerulean & Deep Navy Dual Accent Bar */}
      <div className="h-2.5 bg-gradient-to-r from-zes-800 via-zes-500 to-zes-300 w-full shadow-xs" />

      {/* 2. Institutional Header with Official ZES Logo */}
      <header className="bg-white border-b border-zes-100 py-3.5 px-6 md:px-12 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/zes-logo.png"
              alt="Zeal Education Society Crest"
              className="w-13 h-13 object-contain drop-shadow-md rounded-full bg-white p-0.5 border border-zes-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-xl font-black tracking-tight text-zes-800 uppercase">
                  Zeal Education Society, Pune
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold text-zes-600 bg-zes-50 border border-zes-200 px-2 py-0.5 rounded-full">
                  ESTD - 1996
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold tracking-wide">
                Zeal College of Engineering &amp; Research (ZCOER) • Central Authentication Service
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 md:text-right hidden sm:block">
            <span className="inline-flex items-center gap-1.5 bg-zes-50 text-zes-800 border border-zes-200 px-3 py-1.5 rounded-xl font-bold">
              <ShieldCheck className="w-4 h-4 text-zes-600" />
              Secure ZES SSO Gateway
            </span>
          </div>
        </div>
      </header>

      {/* 3. Main CAS Body Container */}
      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* LEFT: CAS Login Form Card */}
          <div className="md:col-span-7 bg-white rounded-3xl border border-zes-200/80 shadow-xl shadow-zes-900/5 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-zes-100/60 rounded-full blur-2xl pointer-events-none" />

            <div className="border-b border-slate-100 pb-4 mb-6 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-zes-500" />
                <h2 className="text-xl font-extrabold text-zes-800">
                  Institutional Login
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Enter your institutional email, student PRN, or faculty employee ID issued by the management team.
              </p>
            </div>

            {error && (
              <div className="mb-5 bg-rose-50 border-l-4 border-rose-600 p-3.5 rounded-xl text-sm text-rose-800 flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold text-xs sm:text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zes-800 mb-1.5">
                  Email, PRN, or Employee ID <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zes-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@zeal.edu.in or 1032230001"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zes-500/20 focus:border-zes-600 bg-slate-50/60 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zes-800 mb-1.5">
                  Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zes-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter management-issued password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zes-500/20 focus:border-zes-600 bg-slate-50/60 focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-zes-700 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  id="warnCheck"
                  checked={warnBeforeLogin}
                  onChange={(e) => setWarnBeforeLogin(e.target.checked)}
                  className="rounded border-slate-300 text-zes-600 focus:ring-zes-500"
                />
                <label htmlFor="warnCheck" className="cursor-pointer select-none font-medium">
                  Warn me before logging me into other campus services
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-zes-800 via-zes-700 to-zes-800 hover:from-zes-900 hover:to-zes-900 text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition shadow-md shadow-zes-900/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-zes-300" />
                  <span>{loading ? 'Authenticating with ZES CAS...' : 'Log In to ZES Portal'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: Security Guidelines & ZES Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-zes-200/80 shadow-md p-6">
              <h3 className="text-sm font-extrabold text-zes-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3">
                <Info className="w-4 h-4 text-zes-600" />
                Security Guidelines
              </h3>
              <ul className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-zes-600 font-bold mt-0.5">•</span>
                  <span>
                    <strong>Session Security:</strong> For security reasons, please <strong>Log Out</strong> and close your browser window after completing your session.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zes-600 font-bold mt-0.5">•</span>
                  <span>
                    <strong>No Public Registration:</strong> Accounts and roles are provisioned directly by the Zeal Education Society Management team.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zes-600 font-bold mt-0.5">•</span>
                  <span>
                    <strong>Multi-Identifier Support:</strong> Students may log in using their 10-digit PRN or institutional email. Faculty may use employee ID or email.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-zes-50 to-white rounded-3xl border border-zes-200 p-5 text-xs text-zes-900 space-y-1.5 shadow-xs">
              <div className="font-bold flex items-center gap-2 text-zes-800">
                <HelpCircle className="w-4 h-4 text-zes-600" />
                ZES Central IT Support
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                If your account is disabled or you need credentials reissued, contact the Zeal Campus IT Helpdesk at{' '}
                <span className="font-bold text-zes-800 underline">helpdesk@zeal.edu.in</span> or call ext. <strong>6000</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-zes-100 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-600">
            © {new Date().getFullYear()} Zeal Education Society, Pune (ESTD - 1996). All Rights Reserved.
          </p>
          <p className="text-zes-600 font-semibold">
            Central Authentication Service • Zeal College ERP v2.4
          </p>
        </div>
      </footer>
    </div>
  );
};
