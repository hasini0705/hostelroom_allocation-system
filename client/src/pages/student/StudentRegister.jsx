import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, KeyRound, Phone, UserCheck, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import CaptchaInput from '../../components/CaptchaInput';

export default function StudentRegister({ setCurrentView }) {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [studentIdCode, setStudentIdCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP Verification state
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  // CAPTCHA
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Cooldown Timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address first.', 'error');
      return;
    }

    try {
      setOtpLoading(true);
      setError('');
      const res = await api.sendOtp(email);
      if (res.success) {
        setOtpSent(true);
        setCooldown(res.cooldownSeconds || 60);
        if (res.isDemoMode && res.demoOtp) {
          setDemoOtp(res.demoOtp);
          setOtp(res.demoOtp); // Auto-fill demo OTP for convenience
        }
        showToast('6-digit OTP generated! Check demo mode alert.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to send OTP.', 'error');
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showToast('Please enter a 6-digit OTP code.', 'error');
      return;
    }

    try {
      setOtpLoading(true);
      setError('');
      const res = await api.verifyOtp(email, otp);
      if (res.valid) {
        setOtpVerified(true);
        showToast('Email address verified successfully!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'OTP verification failed.', 'error');
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpVerified) {
      setError('Please verify your email using the 6-digit OTP before registering.');
      showToast('Email OTP verification required.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!captchaAnswer) {
      setError('Please solve the security CAPTCHA.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerStudent({
        fullName,
        studentIdCode,
        email,
        phone,
        password,
        confirmPassword,
        otp,
        captchaId,
        captchaAnswer
      });

      if (res.success) {
        showToast('Registration successful! Welcome to HostelSync.', 'success');
        login(res.user, res.token);
        setCurrentView('browse-rooms');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white relative">
          <div className="relative z-10">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              New Resident Enrollment
            </span>
            <h2 className="text-2xl font-black mt-3 tracking-tight">Student Registration</h2>
            <p className="text-xs text-indigo-200 mt-1">
              Create your official resident account to browse and book hostel rooms.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <UserPlus className="w-36 h-36" />
          </div>
        </div>

        {/* Demo OTP Banner if present */}
        {demoOtp && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-800 text-[10px]">
                LOCAL DEMO OTP MODE
              </span>
              <span>
                Simulated email OTP: <strong className="font-mono text-sm tracking-widest text-amber-950">{demoOtp}</strong>
              </span>
            </div>
            <span className="text-[11px] text-amber-700 italic">Expires in 5 mins</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Student ID / Roll */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Roll Number / Student ID *
              </label>
              <input
                type="text"
                required
                value={studentIdCode}
                onChange={(e) => setStudentIdCode(e.target.value)}
                placeholder="e.g. CS2024099"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white uppercase transition-all"
              />
            </div>
          </div>

          {/* Email with OTP Verification Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" /> College Email Verification *
              </label>
              {otpVerified && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                disabled={otpVerified}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student.name@college.edu"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
              {!otpVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || cooldown > 0}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  {cooldown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Resend ({cooldown}s)
                    </>
                  ) : (
                    <span>{otpSent ? 'Resend OTP' : 'Send OTP'}</span>
                  )}
                </button>
              )}
            </div>

            {/* OTP Input Row */}
            {otpSent && !otpVerified && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200 animate-in fade-in">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tracking-widest text-center font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || !otp}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Code
                </button>
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* CAPTCHA Puzzle */}
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
            disabled={loading || !otpVerified}
            className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-4 text-center border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setCurrentView('student-login')}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
