import React, { useState } from 'react';
import { LogIn, KeyRound, Mail, AlertCircle, ArrowRight, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import CaptchaInput from '../../components/CaptchaInput';
import Modal from '../../components/Modal';

export default function StudentLogin({ setCurrentView }) {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotDemoOtp, setForgotDemoOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: send otp, 2: verify & set pass
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaAnswer) {
      setError('Please solve the CAPTCHA puzzle.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.loginStudent({
        identifier: identifier.trim(),
        password,
        captchaId,
        captchaAnswer
      });

      if (res.success) {
        showToast(`Welcome back, ${res.user.fullName}!`, 'success');
        login(res.user, res.token);
        setCurrentView('student-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
      showToast(err.message || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email, pass) => {
    setIdentifier(email);
    setPassword(pass);
    showToast('Demo credentials filled! Now solve the CAPTCHA.', 'info');
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail) {
      showToast('Please enter your email.', 'error');
      return;
    }
    try {
      setForgotLoading(true);
      const res = await api.sendOtp(forgotEmail);
      if (res.isDemoMode && res.demoOtp) {
        setForgotDemoOtp(res.demoOtp);
        setForgotOtp(res.demoOtp);
      }
      setForgotStep(2);
      showToast('OTP sent to email (Demo OTP populated)', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (forgotNewPass !== forgotConfirmPass) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    try {
      setForgotLoading(true);
      const res = await api.forgotPassword({
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotNewPass,
        confirmPassword: forgotConfirmPass
      });
      showToast(res.message, 'success');
      setShowForgotModal(false);
      setPassword(forgotNewPass);
    } catch (err) {
      showToast(err.message || 'Password reset failed.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white relative">
          <div className="relative z-10">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              Student Portal
            </span>
            <h2 className="text-2xl font-black mt-3 tracking-tight">Resident Sign In</h2>
            <p className="text-xs text-indigo-200 mt-1">
              Enter your Roll Number or Email to access your room allocation.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <LogIn className="w-36 h-36" />
          </div>
        </div>

        {/* Demo Quick-Fill Bar */}
        <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-indigo-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Quick Demo Fill:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('student@hostel.edu', 'Student@123')}
              className="px-2 py-1 bg-white hover:bg-indigo-100 text-indigo-700 font-medium rounded border border-indigo-200 transition-colors shadow-2xs"
            >
              Aarav (Allocated)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('priya.sharma@hostel.edu', 'Student@123')}
              className="px-2 py-1 bg-white hover:bg-indigo-100 text-indigo-700 font-medium rounded border border-indigo-200 transition-colors shadow-2xs"
            >
              Priya (Unallocated)
            </button>
          </div>
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
              Roll Number or Email
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. CS2024001 or student@hostel.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
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
            className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-4 text-center border-t border-slate-100">
            <p className="text-xs text-slate-500">
              New student seeking accommodation?{' '}
              <button
                type="button"
                onClick={() => setCurrentView('student-register')}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Register Here
              </button>
            </p>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Student Password"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Verify your email via OTP to set a new password.
          </p>

          {forgotStep === 1 ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Registered Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="student@hostel.edu"
                  className="w-full mt-1 px-3.5 py-2.5 border rounded-lg text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleSendForgotOtp}
                disabled={forgotLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                {forgotLoading ? 'Sending...' : 'Send Verification OTP'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3">
              {forgotDemoOtp && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-mono">
                  [DEMO MODE] Verification OTP: <strong>{forgotDemoOtp}</strong>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">6-Digit OTP</label>
                <input
                  type="text"
                  required
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm font-mono text-center tracking-widest"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">New Password</label>
                <input
                  type="password"
                  required
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={forgotConfirmPass}
                  onChange={(e) => setForgotConfirmPass(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                {forgotLoading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
