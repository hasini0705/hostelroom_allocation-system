import React, { useState, useEffect } from 'react';
import { Users, Search, UserCheck, UserX, ArrowLeft, Calendar, ShieldCheck, Mail, Phone, Bed } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';

export default function ManageStudents({ setCurrentView }) {
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Student Detail Modal state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.getWardenStudents(search);
      if (res.success) {
        setStudents(res.students);
      }
    } catch (err) {
      showToast('Failed to load students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const handleToggleStatus = async (student) => {
    const newStatus = !student.is_active;
    try {
      const res = await api.updateStudentStatus(student.id, newStatus);
      showToast(res.message, 'success');
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Status update failed.', 'error');
    }
  };

  const handleOpenDetail = async (studentId) => {
    try {
      setDetailLoading(true);
      const res = await api.getStudentDetails(studentId);
      if (res.success) {
        setSelectedStudent(res);
      }
    } catch (e) {
      showToast('Failed to load student dossier.', 'error');
    } finally {
      setDetailLoading(false);
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
            <Users className="w-6 h-6 text-amber-600" /> Student Resident Directory
          </h1>
          <p className="text-xs text-slate-500">
            Search registered residents, verify room occupancy, inspect stay histories, and manage active privileges.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll, email..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Resident Full Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Current Allocation</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.student_id_code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {s.full_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{s.email}</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.phone || '—'}</td>
                    <td className="py-3.5 px-4">
                      {s.bed_number ? (
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {s.room_number} &bull; {s.bed_number} ({s.block_name})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unallocated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        s.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {s.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetail(s.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          Dossier & History
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            s.is_active
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={s.is_active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {s.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details & History Modal */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={`Student Dossier: ${selectedStudent?.student?.full_name}`}
        maxWidth="max-w-2xl"
      >
        {selectedStudent && (
          <div className="space-y-5">
            {/* Profile summary */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Roll Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedStudent.student.student_id_code}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Email Address</span>
                <span className="text-slate-800 font-semibold">{selectedStudent.student.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Phone</span>
                <span className="text-slate-800 font-semibold">{selectedStudent.student.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Account Status</span>
                <span className={`font-bold ${selectedStudent.student.is_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedStudent.student.is_active ? 'Active Resident' : 'Suspended / Deactivated'}
                </span>
              </div>
            </div>

            {/* Current Allocation */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <span className="text-xs font-bold uppercase text-indigo-900 block mb-1">
                Current Room Allocation
              </span>
              {selectedStudent.currentBooking ? (
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold text-sm">
                    Room {selectedStudent.currentBooking.room_number} &bull; Bed {selectedStudent.currentBooking.bed_number}
                  </p>
                  <p className="text-indigo-700">
                    Hostel: {selectedStudent.currentBooking.block_name}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Allocated on: {new Date(selectedStudent.currentBooking.booked_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No currently active room allocation.</p>
              )}
            </div>

            {/* Historical Log */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Historical Allocation Records</h4>
              {selectedStudent.history && selectedStudent.history.length > 0 ? (
                <div className="border rounded-xl overflow-hidden divide-y text-xs">
                  {selectedStudent.history.map((h) => (
                    <div key={h.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">
                          Room {h.room_number} &bull; {h.bed_number} ({h.block_name})
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          From: {new Date(h.booked_at).toLocaleDateString()} &bull; Vacated: {h.vacated_at ? new Date(h.vacated_at).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        h.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No historical records available.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
