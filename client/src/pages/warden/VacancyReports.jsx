import React, { useState, useEffect } from 'react';
import { ClipboardList, ArrowLeft, Building2, Layers, Home, Bed as BedIcon, CheckCircle2, Clock, User, Wrench, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';

export default function VacancyReports({ setCurrentView }) {
  const { showToast } = useToast();
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async () => {
    try {
      setRefreshing(true);
      const res = await api.getVacancyReport();
      if (res.success) {
        setReport(res.report);
      }
    } catch (err) {
      showToast('Failed to load vacancy report.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setCurrentView('warden-dashboard')}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-600" /> Real-Time Hostel Vacancy Report
          </h1>
          <p className="text-xs text-slate-500">
            Hierarchical floor and room vacancy audit across all campus residential blocks.
          </p>
        </div>

        <button
          onClick={fetchReport}
          disabled={refreshing}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
          <span>Refresh Real-Time Status</span>
        </button>
      </div>

      {/* Legend Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-6 text-xs font-medium">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">Bed Status Indicators:</span>
        <span className="flex items-center gap-1.5 text-emerald-800">
          <span className="w-3 h-3 rounded-md bg-emerald-500" />
          <strong>Available</strong> (Ready for allocation)
        </span>
        <span className="flex items-center gap-1.5 text-rose-800">
          <span className="w-3 h-3 rounded-md bg-rose-500" />
          <strong>Occupied</strong> (Confirmed resident)
        </span>
        <span className="flex items-center gap-1.5 text-amber-800">
          <span className="w-3 h-3 rounded-md bg-amber-400" />
          <strong>5-Min Hold</strong> (Temporarily reserved)
        </span>
        <span className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded-md bg-slate-400" />
          <strong>Maintenance</strong> (Out of service)
        </span>
      </div>

      {/* Hierarchical Report Tree */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500">Generating real-time vacancy hierarchy...</div>
      ) : report.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500">No vacancy data available.</div>
      ) : (
        <div className="space-y-8">
          {report.map((block) => {
            // Aggregate totals for block
            let bTotal = 0;
            let bAvail = 0;
            let bOcc = 0;
            let bRes = 0;
            let bMaint = 0;

            block.floors.forEach(f => {
              f.rooms.forEach(r => {
                bTotal += r.total_beds;
                bAvail += (r.available_beds || 0);
                bOcc += (r.occupied_beds || 0);
                bRes += (r.reserved_beds || 0);
                bMaint += (r.maintenance_beds || 0);
              });
            });

            return (
              <div key={block.blockId} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Block Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black">{block.blockName}</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-widest text-amber-200">
                          {block.genderType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">Code: {block.blockCode}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                      {bAvail} Free Beds
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                      {bOcc} Occupied
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 text-xs font-bold">
                      {bTotal} Total Beds
                    </span>
                  </div>
                </div>

                {/* Floors inside block */}
                <div className="p-6 space-y-6">
                  {block.floors.map((floor) => (
                    <div key={floor.floorId} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600" /> {floor.floorName} (Level {floor.floorNumber})
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {floor.rooms.length} Rooms
                        </span>
                      </div>

                      {/* Rooms in this floor */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {floor.rooms.map((rm) => (
                          <div
                            key={rm.id}
                            className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-slate-900">
                                Room {rm.room_number}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                {rm.available_beds} Free
                              </span>
                            </div>

                            {/* Bed chips */}
                            <div className="grid grid-cols-3 gap-1.5">
                              {rm.beds.map((b) => {
                                let chipColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                                if (b.status === 'booked') {
                                  chipColor = 'bg-rose-50 text-rose-800 border-rose-300';
                                } else if (b.status === 'reserved') {
                                  chipColor = 'bg-amber-50 text-amber-800 border-amber-300';
                                } else if (b.status === 'maintenance') {
                                  chipColor = 'bg-slate-100 text-slate-700 border-slate-300';
                                }

                                return (
                                  <div
                                    key={b.id}
                                    className={`p-1.5 rounded-lg border text-center text-[10px] font-bold truncate transition-all ${chipColor}`}
                                    title={b.student_name ? `Assigned: ${b.student_name} (${b.student_id_code})` : b.status}
                                  >
                                    <div className="font-mono text-[9px] truncate">{b.bed_number.split('-').pop()}</div>
                                    <div className="text-[8px] uppercase tracking-wider opacity-80">{b.status}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
