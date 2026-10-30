import React, { useState, useEffect } from 'react';
import { Home, Plus, Edit2, Trash2, ArrowLeft, Layers, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';

export default function ManageRooms({ setCurrentView }) {
  const { showToast } = useToast();

  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Room Modal State
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomBlockId, setRoomBlockId] = useState('');
  const [roomFloorId, setRoomFloorId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [totalBeds, setTotalBeds] = useState('3');
  const [description, setDescription] = useState('');
  const [facilities, setFacilities] = useState('High-Speed Wi-Fi, Study Table & Chair, Ceiling Fan, Personal Wardrobe, Attached Bathroom');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80');
  const [modalLoading, setModalLoading] = useState(false);

  // Add Floor Modal State
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [floorBlockId, setFloorBlockId] = useState('');
  const [floorNumber, setFloorNumber] = useState('3');
  const [floorName, setFloorName] = useState('Floor 3');

  // Load blocks
  useEffect(() => {
    async function loadBlocks() {
      try {
        const res = await api.getBlocks();
        if (res.success && res.blocks.length > 0) {
          setBlocks(res.blocks);
          setSelectedBlockId(res.blocks[0].id.toString());
          setRoomBlockId(res.blocks[0].id.toString());
          setFloorBlockId(res.blocks[0].id.toString());
        }
      } catch (err) {
        showToast('Failed to load blocks.', 'error');
      }
    }
    loadBlocks();
  }, []);

  // Load floors when block changes
  useEffect(() => {
    if (!selectedBlockId) return;
    async function loadFloors() {
      try {
        const res = await api.getFloors(selectedBlockId);
        if (res.success) {
          setFloors(res.floors);
          if (res.floors.length > 0) {
            setRoomFloorId(res.floors[0].id.toString());
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadFloors();
  }, [selectedBlockId]);

  // Load rooms
  const fetchRooms = async () => {
    if (!selectedBlockId) return;
    try {
      setLoading(true);
      const res = await api.getWardenRooms(selectedBlockId, selectedFloorId, search);
      if (res.success) {
        setRooms(res.rooms);
      }
    } catch (err) {
      showToast('Failed to load rooms.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedBlockId, selectedFloorId, search]);

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setTotalBeds('3');
    setDescription('');
    setShowAddRoomModal(true);
  };

  const openEditRoom = (r) => {
    setEditingRoom(r);
    setRoomNumber(r.room_number);
    setDescription(r.description || '');
    setFacilities(r.facilities || '');
    setImageUrl(r.image_url || '');
    setShowAddRoomModal(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      if (editingRoom) {
        const res = await api.updateRoom(editingRoom.id, {
          roomNumber,
          description,
          facilities,
          imageUrl
        });
        showToast(res.message, 'success');
      } else {
        const res = await api.createRoom({
          blockId: roomBlockId || selectedBlockId,
          floorId: roomFloorId,
          roomNumber,
          totalBeds,
          description,
          facilities,
          imageUrl
        });
        showToast(res.message, 'success');
      }
      setShowAddRoomModal(false);
      fetchRooms();
    } catch (err) {
      showToast(err.message || 'Room operation failed.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveFloor = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      const res = await api.createFloor({
        blockId: floorBlockId || selectedBlockId,
        floorNumber: parseInt(floorNumber, 10),
        name: floorName
      });
      showToast(res.message, 'success');
      setShowAddFloorModal(false);
      // Reload floors
      const fRes = await api.getFloors(selectedBlockId);
      if (fRes.success) setFloors(fRes.floors);
    } catch (err) {
      showToast(err.message || 'Failed to add floor.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    try {
      const res = await api.deleteRoom(id);
      showToast(res.message, 'success');
      fetchRooms();
    } catch (err) {
      showToast(err.message || 'Cannot delete room.', 'error');
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
            <Home className="w-6 h-6 text-amber-600" /> Manage Floors & Hostel Rooms
          </h1>
          <p className="text-xs text-slate-500">
            Add new residential floors, define room numbers, configure total beds, and manage facilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddFloorModal(true)}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Layers className="w-4 h-4 text-slate-600" /> Add Floor
          </button>
          <button
            onClick={openAddRoom}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
      </div>

      {/* Block & Floor Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hostel Block</label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.gender_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Floor</label>
            <select
              value={selectedFloorId}
              onChange={(e) => setSelectedFloorId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="">All Floors</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Search Room</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Room number or facility..."
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-64"
          />
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No rooms found for this selection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Room Number</th>
                  <th className="py-3 px-4">Block & Floor</th>
                  <th className="py-3 px-4">Total Beds</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Occupied</th>
                  <th className="py-3 px-4">Facilities</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono text-sm">
                      Room {r.room_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.block_name} &bull; {r.floor_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{r.total_beds} Beds</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {r.available_beds || 0} Free
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        {r.occupied_beds || 0} Booked
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {r.facilities}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditRoom(r)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Room"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Room"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        title={editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Hostel Room'}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {!editingRoom && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Block *</label>
                <select
                  value={roomBlockId}
                  onChange={(e) => setRoomBlockId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Floor *</label>
                <select
                  value={roomFloorId}
                  onChange={(e) => setRoomFloorId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Room Number *</label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. A-301"
                className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm font-mono"
              />
            </div>
            {!editingRoom && (
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Total Beds *</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  required
                  value={totalBeds}
                  onChange={(e) => setTotalBeds(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm font-bold"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Facilities (Comma Separated)</label>
            <input
              type="text"
              value={facilities}
              onChange={(e) => setFacilities(e.target.value)}
              placeholder="Wi-Fi, Study Table, AC, Attached Bath"
              className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase block mb-1">
              Room Picture (Upload from PC or Paste URL)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Choose Room Picture File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setImageUrl(event.target.result);
                          showToast('Room picture loaded from file!', 'success');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <span className="text-xs text-slate-400">or enter image URL below</span>
              </div>

              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... or data:image/..."
                className="w-full px-3.5 py-2 border rounded-lg text-xs"
              />

              {imageUrl && (
                <div className="relative aspect-video max-h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={imageUrl} alt="Room Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-2 text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-xs">
                    Live Photo Preview
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Room description and ventilation details"
              className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowAddRoomModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
            >
              {modalLoading ? 'Saving...' : editingRoom ? 'Save Changes' : 'Create Room & Generate Beds'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Floor Modal */}
      <Modal
        isOpen={showAddFloorModal}
        onClose={() => setShowAddFloorModal(false)}
        title="Add Floor to Hostel Block"
      >
        <form onSubmit={handleSaveFloor} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Select Block *</label>
            <select
              value={floorBlockId}
              onChange={(e) => setFloorBlockId(e.target.value)}
              className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm bg-white"
            >
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Floor Number *</label>
              <input
                type="number"
                min="0"
                required
                value={floorNumber}
                onChange={(e) => {
                  setFloorNumber(e.target.value);
                  setFloorName(`Floor ${e.target.value}`);
                }}
                className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Display Name *</label>
              <input
                type="text"
                required
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                placeholder="e.g. Floor 3"
                className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowAddFloorModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
            >
              {modalLoading ? 'Adding...' : 'Add Floor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
