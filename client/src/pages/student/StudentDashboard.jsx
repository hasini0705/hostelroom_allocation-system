import React, { useState, useEffect } from 'react';
import { User, Bed, Home, Calendar, Clock, LogOut, CheckCircle2, AlertCircle, Compass, ShieldCheck, Tag, Sparkles } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import CountdownTimer from '../../components/CountdownTimer';
import Modal from '../../components/Modal';

export default function StudentDashboard({ setCurrentView }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Vacate modal state
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [vacating, setVacating] = useState(false);

  // Booking confirm/cancel state
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.getStudentDashboard();
      if (res.success) {
        setDashboardData(res);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Refresh interval every 15s to keep bed timers and statuses synchronized
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleVacateRoom = async () => {
    try {
      setVacating(true);
      const res = await api.vacateRoom();
      showToast(res.message, 'success');
      setShowVacateModal(false);
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Vacate failed.', 'error');
    } finally {
      setVacating(false);
    }
  };

  const handleConfirmReservation = async (bedId) => {
    try {
      setActionLoading(true);
      const res = await api.confirmBooking(bedId);
      showToast(res.message, 'success');
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Failed to confirm booking.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelReservation = async (bedId) => {
    try {
      setActionLoading(true);
      const res = await api.cancelReservation(bedId);
      showToast(res.message, 'info');
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Failed to cancel hold.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading student portal details...</p>
        </div>
      </div>
    );
  }

  const { student, currentAllocation, activeHold, history, summary } = dashboardData || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/10">
              Student Resident Portal
            </span>
            <span className="text-xs text-indigo-300 font-mono">
              Roll No: <strong>{student?.student_id_code}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {student?.full_name}!
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
            Manage your accommodation, check real-time bed allocations, and monitor reservation status.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCurrentView('browse-rooms')}
            className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4" /> Browse Rooms
          </button>
        </div>

        <div className="absolute right-0 top-0 opacity-10 translate-x-10 -translate-y-6 pointer-events-none">
          <Home className="w-64 h-64" />
        </div>
      </div>

      {/* Active 5-Minute Hold Banner (if any) */}
      {activeHold && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <CountdownTimer
            initialSeconds={activeHold.remainingSeconds}
            bedDetails={activeHold}
            confirming={actionLoading}
            cancelling={actionLoading}
            onExpire={() => {
              showToast('5-minute reservation timer expired. Bed released.', 'error');
              fetchDashboard();
            }}
            onConfirm={() => handleConfirmReservation(activeHold.bed_id)}
            onCancel={() => handleCancelReservation(activeHold.bed_id)}
          />
        </div>
      )}

      {/* Main Grid: Current Allocation & Hostel Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Current Allocation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bed className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Current Room & Bed Allocation</h2>
              </div>
              {currentAllocation && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Allocated Resident
                </span>
              )}
            </div>

            {currentAllocation ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Room Photo */}
                  <div className="relative rounded-xl overflow-hidden aspect-video sm:aspect-square bg-slate-100 border border-slate-200">
                    <img
                      src={currentAllocation.image_url}
                      alt={`Room ${currentAllocation.room_number}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[11px] font-mono font-bold backdrop-blur-xs">
                      {currentAllocation.room_number}
                    </div>
                  </div>

                  {/* Room Details */}
                  <div className="sm:col-span-2 space-y-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                        {currentAllocation.block_name} ({currentAllocation.gender_type})
                      </span>
                      <h3 className="text-xl font-black text-slate-900">
                        Room {currentAllocation.room_number} &bull; Bed {currentAllocation.bed_number}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Floor: {currentAllocation.floor_name} (Floor #{currentAllocation.floor_number})
                      </p>
                    </div>

                    {/* Facilities */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Room Facilities
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentAllocation.facilities?.split(',').map((f, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                          >
                            {f.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Allocated on: {new Date(currentAllocation.booked_at).toLocaleDateString()}</span>
                    </div>

                    {/* Vacate Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowVacateModal(true)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Vacate Allocated Bed
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 px-4 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Bed className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="text-base font-bold text-slate-800">No Room Currently Allocated</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    You do not hold an active room allocation for this academic semester. Select an available room and bed to initiate your 5-minute allocation hold.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('browse-rooms')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all inline-flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" /> Browse Available Rooms
                </button>
              </div>
            )}
          </div>

          {/* Booking History Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" /> Allocation History Ledger
            </h3>

            {history && history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Room & Bed</th>
                      <th className="py-2.5 px-3">Hostel Block</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Allocated Date</th>
                      <th className="py-2.5 px-3">Vacated Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((h) => {
                      let badge = (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          Confirmed
                        </span>
                      );
                      if (h.status === 'vacated') {
                        badge = (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                            Vacated
                          </span>
                        );
                      } else if (h.status === 'cancelled') {
                        badge = (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                            Cancelled
                          </span>
                        );
                      }

                      return (
                        <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            Room {h.room_number} &bull; {h.bed_number}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{h.block_name}</td>
                          <td className="py-3 px-3">{badge}</td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(h.booked_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {h.vacated_at ? new Date(h.vacated_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No past allocation history records found.
              </p>
            )}
          </div>
        </div>

        {/* Right 1 Col: Summary & Resident Profile */}
        <div className="space-y-6">
          {/* Student Profile Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" /> Resident Profile
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Full Name</span>
                <span className="text-slate-900 font-bold text-sm">{student?.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Roll Number</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {student?.student_id_code}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Registered Email</span>
                <span className="text-slate-700 font-medium">{student?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Phone</span>
                <span className="text-slate-700 font-medium">{student?.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Quick Hostel Stats */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-indigo-600" /> Campus Hostel Status
            </h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <span className="text-2xl font-black text-indigo-700">{summary?.total_blocks || 3}</span>
                <span className="text-[11px] font-semibold text-indigo-900 block mt-0.5">Hostel Blocks</span>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-2xl font-black text-emerald-700">{summary?.available_beds || 0}</span>
                <span className="text-[11px] font-semibold text-emerald-900 block mt-0.5">Available Beds</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Allocations are strictly first-come, first-served. Beds are temporarily locked for 5 minutes during selection.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Vacating Room */}
      <Modal
        isOpen={showVacateModal}
        onClose={() => setShowVacateModal(false)}
        title="Confirm Vacating Room"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Notice:</strong> Vacating will immediately release Bed{' '}
              <strong>{currentAllocation?.bed_number}</strong> in Room{' '}
              <strong>{currentAllocation?.room_number}</strong> and make it available for other students to book. Your history record will be preserved.
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Are you sure you want to surrender your current bed allocation?
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowVacateModal(false)}
              disabled={vacating}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Keep My Room
            </button>
            <button
              type="button"
              onClick={handleVacateRoom}
              disabled={vacating}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm shadow-rose-600/30 transition-all"
            >
              {vacating ? 'Vacating...' : 'Confirm & Vacate Room'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
