import React, { useState, useEffect } from 'react';
import { Building2, Layers, Search, Bed as BedIcon, CheckCircle2, Clock, Wrench, User, ChevronRight, Sparkles, Filter, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import BedGrid from '../../components/BedGrid';
import CountdownTimer from '../../components/CountdownTimer';
import Modal from '../../components/Modal';

export default function BrowseRooms({ setCurrentView }) {
  const { user, isStudent } = useAuth();
  const { showToast } = useToast();

  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Room Bed Modal state
  const [activeRoomModal, setActiveRoomModal] = useState(null);
  const [modalBeds, setModalBeds] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Active temporary hold state
  const [activeHold, setActiveHold] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Vacate confirmation state
  const [showVacateConfirm, setShowVacateConfirm] = useState(false);
  const [vacatingBed, setVacatingBed] = useState(null);
  const [vacatingLoading, setVacatingLoading] = useState(false);

  // Load Blocks on boot
  useEffect(() => {
    async function loadBlocks() {
      try {
        setLoading(true);
        const res = await api.getBlocks();
        if (res.success && res.blocks.length > 0) {
          setBlocks(res.blocks);
          setSelectedBlockId(res.blocks[0].id.toString());
        }
      } catch (err) {
        showToast('Failed to load hostel blocks.', 'error');
      } finally {
        setLoading(false);
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
          setSelectedFloorId(''); // reset floor filter to "All Floors"
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadFloors();
  }, [selectedBlockId]);

  // Load rooms when block or floor or search changes
  const fetchRooms = async () => {
    if (!selectedBlockId) return;
    try {
      setLoading(true);
      const res = await api.getRooms(selectedBlockId, selectedFloorId, search);
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

  // Check if student already holds a temporary lock
  const checkCurrentHold = async () => {
    if (!isStudent) return;
    try {
      const res = await api.getCurrentHold();
      if (res.success && res.hold) {
        setActiveHold({ ...res.hold, remainingSeconds: res.remainingSeconds });
      } else {
        setActiveHold(null);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    checkCurrentHold();
    const interval = setInterval(checkCurrentHold, 10000);
    return () => clearInterval(interval);
  }, [isStudent]);

  // Open Room Details Modal to view beds
  const handleOpenRoom = async (room) => {
    try {
      setModalLoading(true);
      setActiveRoomModal(room);
      const res = await api.getRoomDetails(room.id);
      if (res.success) {
        setModalBeds(res.beds);
      }
    } catch (err) {
      showToast('Failed to load room beds.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Student selects and temporarily locks an available bed
  const handleSelectBed = async (bed) => {
    if (!isStudent) {
      showToast('Please log in with a student account to book a bed.', 'error');
      setCurrentView('student-login');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.reserveBed(bed.id);
      showToast(res.message, 'success');
      setActiveHold({ ...res.bed, remainingSeconds: res.remainingSeconds });
      // Refresh beds inside modal
      if (activeRoomModal) {
        const updated = await api.getRoomDetails(activeRoomModal.id);
        if (updated.success) setModalBeds(updated.beds);
      }
      fetchRooms();
    } catch (err) {
      showToast(err.message || 'Failed to lock bed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Student confirms the booking
  const handleConfirmHold = async (bedId) => {
    try {
      setActionLoading(true);
      const res = await api.confirmBooking(bedId);
      showToast(res.message, 'success');
      setActiveHold(null);
      setActiveRoomModal(null);
      fetchRooms();
      setCurrentView('student-dashboard');
    } catch (err) {
      showToast(err.message || 'Confirmation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Student cancels temporary hold
  const handleCancelHold = async (bedId) => {
    try {
      setActionLoading(true);
      const res = await api.cancelReservation(bedId);
      showToast(res.message, 'info');
      setActiveHold(null);
      if (activeRoomModal) {
        const updated = await api.getRoomDetails(activeRoomModal.id);
        if (updated.success) setModalBeds(updated.beds);
      }
      fetchRooms();
    } catch (err) {
      showToast(err.message || 'Cancellation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Student initiates vacating allocated bed
  const handleInitiateVacate = (bed) => {
    setVacatingBed(bed);
    setShowVacateConfirm(true);
  };

  const handleConfirmVacate = async () => {
    try {
      setVacatingLoading(true);
      const res = await api.vacateRoom();
      showToast(res.message, 'success');
      setShowVacateConfirm(false);
      setVacatingBed(null);
      if (activeRoomModal) {
        const updated = await api.getRoomDetails(activeRoomModal.id);
        if (updated.success) setModalBeds(updated.beds);
      }
      fetchRooms();
    } catch (err) {
      showToast(err.message || 'Failed to vacate room.', 'error');
    } finally {
      setVacatingLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" /> Browse Hostel Accommodations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a block, filter by floor, inspect room facilities, and reserve an available bed.
          </p>
        </div>
      </div>

      {/* Active 5-Minute Hold Notification Banner */}
      {activeHold && (
        <CountdownTimer
          initialSeconds={activeHold.remainingSeconds}
          bedDetails={activeHold}
          confirming={actionLoading}
          cancelling={actionLoading}
          onExpire={() => {
            showToast('5-minute reservation hold expired. Bed released.', 'error');
            setActiveHold(null);
            fetchRooms();
          }}
          onConfirm={() => handleConfirmHold(activeHold.id || activeHold.bed_id)}
          onCancel={() => handleCancelHold(activeHold.id || activeHold.bed_id)}
        />
      )}

      {/* Block Selector Tabs */}
      <div className="flex flex-wrap gap-2.5 pb-2 border-b border-slate-200">
        {blocks.map((b) => {
          const isSelected = selectedBlockId === b.id.toString();
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBlockId(b.id.toString())}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{b.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {b.gender_type}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Floor Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedFloorId('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              selectedFloorId === ''
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Floors
          </button>
          {floors.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFloorId(f.id.toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                selectedFloorId === f.id.toString()
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room no or facility..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading rooms and bed availability...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No rooms found</h3>
          <p className="text-xs text-slate-400 mt-1">Try switching blocks or adjusting your search filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const hasAvailable = room.available_beds > 0;

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col"
              >
                {/* Room Photo */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={room.image_url}
                    alt={`Room ${room.room_number}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-xs font-mono font-bold backdrop-blur-xs flex items-center gap-1.5">
                    <span>Room {room.room_number}</span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs ${
                      hasAvailable
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {hasAvailable ? `${room.available_beds} Available` : 'Fully Booked'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{room.block_name}</span>
                      <span>{room.floor_name}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Room {room.room_number}
                    </h3>

                    {/* Facility Tags */}
                    <div className="flex flex-wrap gap-1">
                      {room.facilities?.split(',').slice(0, 3).map((f, i) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {f.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bed Status Breakdown */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] mb-3">
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <span className="font-bold text-slate-700 block">{room.total_beds}</span>
                        <span className="text-[10px] text-slate-400">Total</span>
                      </div>
                      <div className="p-1.5 bg-emerald-50 rounded-lg">
                        <span className="font-bold text-emerald-700 block">{room.available_beds || 0}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">Free</span>
                      </div>
                      <div className="p-1.5 bg-rose-50 rounded-lg">
                        <span className="font-bold text-rose-700 block">{room.occupied_beds || 0}</span>
                        <span className="text-[10px] text-rose-600 font-semibold">Booked</span>
                      </div>
                      <div className="p-1.5 bg-amber-50 rounded-lg">
                        <span className="font-bold text-amber-700 block">{room.reserved_beds || 0}</span>
                        <span className="text-[10px] text-amber-600 font-semibold">Locked</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRoom(room)}
                      className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 group-hover:bg-indigo-600 group-hover:text-white"
                    >
                      <BedIcon className="w-4 h-4" />
                      <span>Inspect Beds & Allocate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Bed Allocation Modal */}
      <Modal
        isOpen={!!activeRoomModal}
        onClose={() => setActiveRoomModal(null)}
        title={`Room ${activeRoomModal?.room_number} & Beds Overview`}
        maxWidth="max-w-4xl"
      >
        {activeRoomModal && (
          <div className="space-y-6">
            {/* Room Picture & Summary Header */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 text-white relative">
              <div className="relative aspect-21/9 sm:aspect-16/6 w-full overflow-hidden bg-slate-950">
                <img
                  src={activeRoomModal.image_url}
                  alt={`Room ${activeRoomModal.room_number}`}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/80 text-white uppercase tracking-wider backdrop-blur-xs">
                      {activeRoomModal.block_name} &bull; {activeRoomModal.floor_name}
                    </span>
                    <h3 className="text-2xl font-black mt-1 drop-shadow-md">
                      Room {activeRoomModal.room_number}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                      {activeRoomModal.facilities}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 text-white shadow-sm">
                      {modalBeds.filter(b => b.status === 'available').length} of {activeRoomModal.total_beds} Beds Available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction Callout */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Live Bed Allocation:</strong> Review each bed's photo and details below. Click <strong>"Book & Lock This Bed"</strong> to initiate a 5-minute exclusive hold. If you already reside in this room, you can click <strong>"Vacate My Bed"</strong>.
              </span>
            </div>

            {/* Individual Beds Grid with Bed Photos */}
            {modalLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading beds and pictures...</div>
            ) : (
              <BedGrid
                beds={modalBeds}
                currentStudentId={user?.studentId}
                selectedBedId={activeHold?.id || activeHold?.bed_id}
                onSelectBed={handleSelectBed}
                onVacateBed={handleInitiateVacate}
                disabled={actionLoading}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Vacate Room Confirmation Modal */}
      <Modal
        isOpen={showVacateConfirm}
        onClose={() => setShowVacateConfirm(false)}
        title="Confirm Vacating Allocated Bed"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to surrender your bed allocation ({vacatingBed?.bed_number}). This bed will immediately become Available for other students, and your resident record will be marked as vacated.
          </div>

          <p className="text-xs text-slate-600">
            Are you sure you want to proceed and vacate this bed?
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowVacateConfirm(false)}
              disabled={vacatingLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Keep My Bed
            </button>
            <button
              type="button"
              onClick={handleConfirmVacate}
              disabled={vacatingLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              {vacatingLoading ? 'Vacating...' : 'Confirm & Vacate Bed'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
