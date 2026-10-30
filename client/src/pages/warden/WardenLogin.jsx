import React, { useState } from 'react';
import { Shield, KeyRound, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import CaptchaInput from '../../components/CaptchaInput';

export default function WardenLogin({ setCurrentView }) {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaAnswer) {
      setError('Please solve the administrative CAPTCHA.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.loginWarden({
        email: email.trim(),
        password,
        captchaId,
        captchaAnswer
      });

      if (res.success) {
        showToast(`Authorized: Welcome ${res.user.fullName}`, 'success');
        login(res.user, res.token);
        setCurrentView('warden-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Warden authentication failed.');
      showToast(err.message || 'Authentication failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('warden@hostel.edu');
    setPassword('Warden@123');
    showToast('Default warden demo credentials loaded! Now solve the CAPTCHA.', 'info');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 bg-gradient-to-br from-amber-700 via-amber-800 to-slate-900 text-white relative">
          <div className="relative z-10">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1 w-max">
              <Shield className="w-3.5 h-3.5" /> Administrative Control
            </span>
            <h2 className="text-2xl font-black mt-3 tracking-tight">Warden Sign In</h2>
            <p className="text-xs text-amber-200 mt-1">
              Authorized hostel administration, block operations, and student allocation management.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <Shield className="w-36 h-36" />
          </div>
        </div>

        {/* Quick Demo Fill Bar */}
        <div className="p-3 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-amber-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Default Demo Account:
          </span>
          <button
            type="button"
            onClick={handleQuickFill}
            className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 font-bold rounded border border-amber-300 transition-colors shadow-2xs"
          >
            Auto-Fill Warden Credentials
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Warden Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="warden@hostel.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* CAPTCHA */}
          <div className="pt-2">
            <CaptchaInput
              captchaId={captchaId}
              setCaptchaId={setCaptchaId}
              captchaAnswer={captchaAnswer}
              setCaptchaAnswer={setCaptchaAnswer}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-700/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Verifying Authorization...' : 'Authenticate as Warden'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-4 text-center border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Are you a student resident?{' '}
              <button
                type="button"
                onClick={() => setCurrentView('student-login')}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Go to Student Portal
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
