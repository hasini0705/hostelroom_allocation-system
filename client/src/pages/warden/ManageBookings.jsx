import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Ban, ArrowLeft, Building2, User, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';

export default function ManageBookings({ setCurrentView }) {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Cancel booking modal
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Administrative revocation by Warden');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadBlocks() {
      try {
        const res = await api.getBlocks();
        if (res.success) setBlocks(res.blocks);
      } catch (e) {}
    }
    loadBlocks();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.getWardenBookings({
        blockId: selectedBlockId,
        status: statusFilter,
        search
      });
      if (res.success) {
        setBookings(res.bookings);
      }
    } catch (err) {
      showToast('Failed to load bookings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedBlockId, statusFilter, search]);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingBooking) return;

    try {
      setActionLoading(true);
      const res = await api.cancelBooking(cancellingBooking.id, cancelReason);
      showToast(res.message, 'success');
      setCancellingBooking(null);
      fetchBookings();
    } catch (err) {
      showToast(err.message || 'Failed to cancel booking.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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
            <Calendar className="w-6 h-6 text-amber-600" /> Allocation & Booking Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Audit confirmed bed assignments, track vacated residents, and enforce policy revocations.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Block</label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="">All Blocks</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed / Active</option>
              <option value="vacated">Vacated</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Search Resident</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Roll number, student name..."
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-64"
          />
        </div>
      </div>

      {/* Booking Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading booking records...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No booking records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Resident</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Bed & Room</th>
                  <th className="py-3 px-4">Hostel Complex</th>
                  <th className="py-3 px-4">Allocated Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ledger Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => {
                  let badge = (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      Confirmed
                    </span>
                  );
                  if (b.status === 'vacated') {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                        Vacated
                      </span>
                    );
                  } else if (b.status === 'cancelled') {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                        Revoked
                      </span>
                    );
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{b.student_name}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{b.student_id_code}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        Room {b.room_number} &bull; {b.bed_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {b.block_name} ({b.floor_name})
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(b.booked_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">{badge}</td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{b.notes || '—'}</td>
                      <td className="py-3.5 px-4 text-right">
                        {b.status === 'confirmed' ? (
                          <button
                            onClick={() => {
                              setCancellingBooking(b);
                              setCancelReason('Administrative revocation by Warden');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                          >
                            Revoke / Cancel
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={!!cancellingBooking}
        onClose={() => setCancellingBooking(null)}
        title="Revoke Student Room Allocation"
      >
        {cancellingBooking && (
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
              <strong>Warning:</strong> You are about to revoke the allocation for{' '}
              <strong>{cancellingBooking.student_name} ({cancellingBooking.student_id_code})</strong> in{' '}
              <strong>Room {cancellingBooking.room_number}, Bed {cancellingBooking.bed_number}</strong>. This bed will be marked Available immediately.
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Reason for Revocation *</label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Disciplinary breach, semester deferral, fee non-payment..."
                className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
