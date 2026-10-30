import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function CountdownTimer({
  initialSeconds = 300,
  onExpire,
  onConfirm,
  onCancel,
  confirming = false,
  cancelling = false,
  bedDetails
}) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = Math.max(0, Math.min(100, (remaining / 300) * 100));

  const isUrgent = remaining < 60;

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-amber-50/80 border-amber-200'
    }`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Timer info */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg flex items-center justify-center ${
            isUrgent ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-amber-100 text-amber-700'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Temporary Reservation Hold</span>
              {isUrgent && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">EXPIRING SOON</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono tracking-tight ${
                isUrgent ? 'text-rose-600' : 'text-amber-800'
              }`}>
                {formattedTime}
              </span>
              <span className="text-xs text-slate-500">
                {bedDetails ? `Locked Bed: ${bedDetails.bed_number} (Room ${bedDetails.room_number})` : 'Confirm within 5 minutes'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling || confirming || remaining <= 0}
              className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-rose-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {cancelling ? 'Releasing...' : 'Cancel Hold'}
            </button>
          )}

          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming || cancelling || remaining <= 0}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-sm shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {confirming ? 'Allocating...' : 'Confirm Allocation'}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-rose-500' : 'bg-amber-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
