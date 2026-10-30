import React from 'react';
import { Bed as BedIcon, Check, Clock, User, Wrench, ShieldAlert, LogOut, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function BedGrid({
  beds = [],
  onSelectBed,
  onVacateBed,
  selectedBedId,
  currentStudentId,
  disabled = false
}) {
  if (!beds || beds.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
        No beds configured for this room yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {beds.map((bed) => {
        const isAvailable = bed.status === 'available';
        const isReserved = bed.status === 'reserved';
        const isBooked = bed.status === 'booked';
        const isMaintenance = bed.status === 'maintenance';

        const isMineHold = isReserved && bed.reserved_by_student_id === currentStudentId;
        const isMyAllocatedBed = isBooked && bed.reserved_by_student_id === currentStudentId;
        const isSelected = selectedBedId === bed.id;

        let borderClass = 'border-slate-200 bg-white';
        let statusBadge = (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            Available
          </span>
        );

        if (isReserved) {
          borderClass = isMineHold
            ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/50'
            : 'border-amber-200 bg-amber-50/30';
          statusBadge = (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {isMineHold ? 'Your 5-Min Hold' : 'Reserved'}
            </span>
          );
        } else if (isBooked) {
          borderClass = isMyAllocatedBed
            ? 'border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-400/40'
            : 'border-rose-200 bg-rose-50/30';
          statusBadge = (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              isMyAllocatedBed
                ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-extrabold'
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              <User className="w-3 h-3" /> {isMyAllocatedBed ? 'Your Allocated Bed' : 'Occupied'}
            </span>
          );
        } else if (isMaintenance) {
          borderClass = 'border-slate-300 bg-slate-100/60 opacity-80';
          statusBadge = (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Maintenance
            </span>
          );
        }

        const bedPhoto = bed.image_url || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80';

        return (
          <div
            key={bed.id}
            className={`relative rounded-xl border overflow-hidden shadow-xs transition-all flex flex-col justify-between ${borderClass} ${
              isAvailable && !disabled
                ? 'hover:border-indigo-400 hover:shadow-md cursor-pointer group'
                : ''
            }`}
            onClick={() => {
              if (isAvailable && !disabled && onSelectBed) {
                onSelectBed(bed);
              }
            }}
          >
            {/* Bed Picture Header */}
            <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
              <img
                src={bedPhoto}
                alt={`Photo of ${bed.bed_number}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

              {/* Status Badge overlay */}
              <div className="absolute top-2.5 right-2.5 backdrop-blur-xs">
                {statusBadge}
              </div>

              {/* Bed Label overlay */}
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-white">
                <div className="p-1 rounded bg-black/40 backdrop-blur-xs">
                  <BedIcon className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <span className="font-mono font-black text-sm tracking-wide drop-shadow-sm">
                  {bed.bed_number}
                </span>
              </div>
            </div>

            {/* Bed Details Body */}
            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Bed Photo & Amenities</span>
                  <span className="text-[10px] text-slate-400 uppercase">Single Bed Frame</span>
                </div>

                <div className="text-xs text-slate-500">
                  {isAvailable && (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> Available for immediate selection
                    </span>
                  )}
                  {isReserved && (
                    <span className="text-amber-800 font-medium">
                      {isMineHold ? 'Locked by you (5-min timer active)' : 'Held temporarily by another resident'}
                    </span>
                  )}
                  {isBooked && (
                    <span className="text-slate-600">
                      {isMyAllocatedBed
                        ? 'Currently occupied by you'
                        : bed.student_name ? `Resident: ${bed.student_name}` : 'Occupied by student resident'}
                    </span>
                  )}
                  {isMaintenance && (
                    <span className="text-slate-500">Temporarily out of service for repair</span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Book Bed or Vacate Bed */}
              <div className="pt-2 border-t border-slate-100">
                {isAvailable && !disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectBed) onSelectBed(bed);
                    }}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <BedIcon className="w-3.5 h-3.5" />
                    <span>Book & Lock This Bed</span>
                  </button>
                )}

                {/* If this is the student's own allocated bed, provide Vacate option directly */}
                {isMyAllocatedBed && onVacateBed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVacateBed(bed);
                    }}
                    className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Vacate My Bed</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
