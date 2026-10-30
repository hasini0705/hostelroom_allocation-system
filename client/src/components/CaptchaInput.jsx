import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../api';

export default function CaptchaInput({ captchaId, setCaptchaId, captchaAnswer, setCaptchaAnswer, error }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCaptcha = async () => {
    try {
      setLoading(true);
      const res = await api.getCaptcha();
      if (res.success) {
        setCaptchaId(res.captchaId);
        setQuestion(res.question);
        setCaptchaAnswer('');
      }
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Security CAPTCHA
        </label>
        <span className="text-[11px] text-slate-400">Solve arithmetic puzzle</span>
      </div>

      <div className="flex items-center gap-2">
        {/* CAPTCHA badge */}
        <div className="relative flex items-center justify-center min-w-[130px] px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-lg select-none">
          <span className="font-mono font-bold text-slate-800 tracking-wider text-base drop-shadow-sm">
            {loading ? 'Generating...' : question || 'Loading...'}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={fetchCaptcha}
          disabled={loading}
          title="Generate a new puzzle"
          className="p-2.5 text-slate-600 hover:text-indigo-600 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* Answer input */}
        <div className="flex-1">
          <input
            type="text"
            required
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            placeholder="Enter answer"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-center font-semibold"
          />
        </div>
      </div>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
}
