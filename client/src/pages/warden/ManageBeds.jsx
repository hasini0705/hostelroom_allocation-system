import React, { useState, useEffect } from 'react';
import { Bed as BedIcon, Plus, Wrench, CheckCircle, Trash2, ArrowLeft, RefreshCw, AlertCircle, Clock, User, Image as ImageIcon, Edit2 } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';

export default function ManageBeds({ setCurrentView }) {
  const { showToast } = useToast();
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Add bed modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [bedImageUrl, setBedImageUrl] = useState('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80');
  const [modalLoading, setModalLoading] = useState(false);

  // Edit bed modal state
  const [editingBed, setEditingBed] = useState(null);
  const [editBedNumber, setEditBedNumber] = useState('');
  const [editBedImageUrl, setEditBedImageUrl] = useState('');
  const [editStatus, setEditStatus] = useState('available');

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const res = await api.getWardenBeds('', statusFilter);
      if (res.success) {
        setBeds(res.beds);
      }
    } catch (err) {
      showToast('Failed to load beds.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [statusFilter]);

  const loadRoomsForAdd = async () => {
    try {
      const res = await api.getWardenRooms();
      if (res.success && res.rooms.length > 0) {
        setRooms(res.rooms);
        setSelectedRoomId(res.rooms[0].id.toString());
        setBedNumber(`${res.rooms[0].room_number}-B4`);
        setBedImageUrl('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80');
      }
      setShowAddModal(true);
    } catch (e) {
      showToast('Failed to load rooms.', 'error');
    }
  };

  const openEditBedModal = (bed) => {
    setEditingBed(bed);
    setEditBedNumber(bed.bed_number);
    setEditBedImageUrl(bed.image_url || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80');
    setEditStatus(bed.status);
  };

  const handleToggleMaintenance = async (bed) => {
    const newStatus = bed.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      const res = await api.updateBedStatus(bed.id, newStatus);
      showToast(res.message, 'success');
      fetchBeds();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status.', 'error');
    }
  };

  const handleReleaseReservation = async (bedId) => {
    try {
      const res = await api.releaseBedReservation(bedId);
      showToast(res.message, 'success');
      fetchBeds();
    } catch (err) {
      showToast(err.message || 'Failed to release reservation.', 'error');
    }
  };

  const handleDeleteBed = async (bedId) => {
    try {
      const res = await api.deleteBed(bedId);
      showToast(res.message, 'success');
      fetchBeds();
    } catch (err) {
      showToast(err.message || 'Failed to delete bed.', 'error');
    }
  };

  const handleAddBedSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      const res = await api.createBed({
        roomId: selectedRoomId,
        bedNumber,
        imageUrl: bedImageUrl
      });
      showToast(res.message, 'success');
      setShowAddModal(false);
      fetchBeds();
    } catch (err) {
      showToast(err.message || 'Failed to add bed.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditBedSubmit = async (e) => {
    e.preventDefault();
    if (!editingBed) return;
    try {
      setModalLoading(true);
      const res = await api.updateBed(editingBed.id, {
        bedNumber: editBedNumber,
        imageUrl: editBedImageUrl,
        status: editStatus
      });
      showToast(res.message, 'success');
      setEditingBed(null);
      fetchBeds();
    } catch (err) {
      showToast(err.message || 'Failed to update bed.', 'error');
    } finally {
      setModalLoading(false);
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
            <BedIcon className="w-6 h-6 text-amber-600" /> Bed Picture & Allocation Management
          </h1>
          <p className="text-xs text-slate-500">
            Upload individual bed photos, manage bed availability, and inspect assigned resident details.
          </p>
        </div>

        <button
          onClick={loadRoomsForAdd}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Bed with Photo
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            statusFilter === '' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'
          }`}
        >
          All Beds
        </button>
        <button
          onClick={() => setStatusFilter('available')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            statusFilter === 'available' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border'
          }`}
        >
          Available
        </button>
        <button
          onClick={() => setStatusFilter('booked')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            statusFilter === 'booked' ? 'bg-rose-600 text-white' : 'bg-white text-rose-700 border'
          }`}
        >
          Occupied
        </button>
        <button
          onClick={() => setStatusFilter('reserved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            statusFilter === 'reserved' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border'
          }`}
        >
          5-Min Reserved
        </button>
        <button
          onClick={() => setStatusFilter('maintenance')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            statusFilter === 'maintenance' ? 'bg-slate-600 text-white' : 'bg-white text-slate-700 border'
          }`}
        >
          Maintenance
        </button>
      </div>

      {/* Bed Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading beds...</div>
        ) : beds.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No beds found matching filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Bed Photo</th>
                  <th className="py-3 px-4">Bed Number</th>
                  <th className="py-3 px-4">Room & Block</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Resident</th>
                  <th className="py-3 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beds.map((b) => {
                  let badge = (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      Available
                    </span>
                  );
                  if (b.status === 'booked') {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-max">
                        <User className="w-3 h-3" /> Booked
                      </span>
                    );
                  } else if (b.status === 'reserved') {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                        <Clock className="w-3 h-3" /> 5-Min Hold
                      </span>
                    );
                  } else if (b.status === 'maintenance') {
                    badge = (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700 flex items-center gap-1 w-max">
                        <Wrench className="w-3 h-3" /> Maintenance
                      </span>
                    );
                  }

                  const bedPhoto = b.image_url || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                          <img src={bedPhoto} alt={b.bed_number} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-sm">
                        {b.bed_number}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        Room {b.room_number} &bull; {b.block_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{b.floor_name}</td>
                      <td className="py-3.5 px-4">{badge}</td>
                      <td className="py-3.5 px-4">
                        {b.student_name ? (
                          <div>
                            <span className="font-bold text-slate-900 block">{b.student_name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Roll: {b.student_id_code} {b.student_phone ? `(${b.student_phone})` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit Bed Button (Upload Bed Photo) */}
                          <button
                            onClick={() => openEditBedModal(b)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Bed / Change Bed Picture"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {b.status === 'reserved' && (
                            <button
                              onClick={() => handleReleaseReservation(b.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                              title="Force Release Temporary Hold"
                            >
                              Release Hold
                            </button>
                          )}

                          {b.status !== 'booked' && (
                            <button
                              onClick={() => handleToggleMaintenance(b)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                b.status === 'maintenance'
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              title={b.status === 'maintenance' ? 'Mark Available' : 'Mark Maintenance'}
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          )}

                          {b.status !== 'booked' && (
                            <button
                              onClick={() => handleDeleteBed(b.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Bed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Bed Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Bed to Room (with Bed Picture)"
      >
        <form onSubmit={handleAddBedSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Select Target Room *</label>
            <select
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                const rm = rooms.find(r => r.id.toString() === e.target.value);
                if (rm) setBedNumber(`${rm.room_number}-B${(rm.current_beds_count || 3) + 1}`);
              }}
              className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm bg-white"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} ({r.block_name} - {r.floor_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Bed Designation Code *</label>
            <input
              type="text"
              required
              value={bedNumber}
              onChange={(e) => setBedNumber(e.target.value)}
              placeholder="e.g. A-101-B4"
              className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm font-mono font-bold"
            />
          </div>

          {/* Bed Picture Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase block mb-1">
              Bed Picture (Upload from PC or Paste URL)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Choose Bed Picture File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setBedImageUrl(event.target.result);
                          showToast('Bed photo loaded from file!', 'success');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <span className="text-xs text-slate-400">or paste URL below</span>
              </div>

              <input
                type="text"
                value={bedImageUrl}
                onChange={(e) => setBedImageUrl(e.target.value)}
                placeholder="https://... or data:image/..."
                className="w-full px-3.5 py-2 border rounded-lg text-xs"
              />

              {bedImageUrl && (
                <div className="relative aspect-video max-h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={bedImageUrl} alt="Bed Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-2 text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-xs">
                    Live Bed Preview
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
            >
              {modalLoading ? 'Adding...' : 'Add Bed with Photo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Bed Modal */}
      <Modal
        isOpen={!!editingBed}
        onClose={() => setEditingBed(null)}
        title={`Edit Bed ${editingBed?.bed_number} Picture & Status`}
      >
        <form onSubmit={handleEditBedSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Bed Designation Code *</label>
            <input
              type="text"
              required
              value={editBedNumber}
              onChange={(e) => setEditBedNumber(e.target.value)}
              className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm font-mono font-bold"
            />
          </div>

          {/* Bed Picture Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase block mb-1">
              Bed Picture (Upload from PC or Paste URL)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Upload New Bed Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditBedImageUrl(event.target.result);
                          showToast('Bed photo updated from file!', 'success');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <span className="text-xs text-slate-400">or paste URL below</span>
              </div>

              <input
                type="text"
                value={editBedImageUrl}
                onChange={(e) => setEditBedImageUrl(e.target.value)}
                placeholder="https://... or data:image/..."
                className="w-full px-3.5 py-2 border rounded-lg text-xs"
              />

              {editBedImageUrl && (
                <div className="relative aspect-video max-h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={editBedImageUrl} alt="Bed Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-2 text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-xs">
                    Current Bed Picture Preview
                  </span>
                </div>
              )}
            </div>
          </div>

          {editingBed?.status !== 'booked' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Availability Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="available">Available</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditingBed(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
            >
              {modalLoading ? 'Saving...' : 'Save Bed Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
