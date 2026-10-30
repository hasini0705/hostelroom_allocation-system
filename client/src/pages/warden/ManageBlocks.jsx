import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';

export default function ManageBlocks({ setCurrentView }) {
  const { showToast } = useToast();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [genderType, setGenderType] = useState('Co-ed');
  const [modalLoading, setModalLoading] = useState(false);

  // Delete confirm state
  const [deletingBlockId, setDeletingBlockId] = useState(null);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const res = await api.getWardenBlocks();
      if (res.success) {
        setBlocks(res.blocks);
      }
    } catch (err) {
      showToast('Failed to load blocks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const openAddModal = () => {
    setEditingBlock(null);
    setName('');
    setCode('');
    setDescription('');
    setGenderType('Co-ed');
    setShowAddModal(true);
  };

  const openEditModal = (b) => {
    setEditingBlock(b);
    setName(b.name);
    setCode(b.code);
    setDescription(b.description || '');
    setGenderType(b.gender_type || 'Co-ed');
    setShowAddModal(true);
  };

  const handleSaveBlock = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      if (editingBlock) {
        const res = await api.updateBlock(editingBlock.id, { name, description, genderType });
        showToast(res.message, 'success');
      } else {
        const res = await api.createBlock({ name, code, description, genderType });
        showToast(res.message, 'success');
      }
      setShowAddModal(false);
      fetchBlocks();
    } catch (err) {
      showToast(err.message || 'Operation failed.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteBlock = async (id) => {
    try {
      const res = await api.deleteBlock(id);
      showToast(res.message, 'success');
      setDeletingBlockId(null);
      fetchBlocks();
    } catch (err) {
      showToast(err.message || 'Failed to delete block.', 'error');
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
            <Building2 className="w-6 h-6 text-amber-600" /> Manage Hostel Blocks
          </h1>
          <p className="text-xs text-slate-500">
            Create, configure residential wings, and inspect floor/room capacity.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Hostel Block
        </button>
      </div>

      {/* Blocks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading hostel blocks...</div>
        ) : blocks.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No blocks found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Block Name & Code</th>
                  <th className="py-3 px-4">Gender Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Floors</th>
                  <th className="py-3 px-4">Rooms</th>
                  <th className="py-3 px-4">Total Beds</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blocks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{b.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {b.code}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                        {b.gender_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {b.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{b.total_floors || 0}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{b.total_rooms || 0}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{b.total_beds || 0}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {b.available_beds || 0} Free
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Block"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(b.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Block"
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

      {/* Add / Edit Block Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingBlock ? `Edit ${editingBlock.name}` : 'Add New Hostel Block'}
      >
        <form onSubmit={handleSaveBlock} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Block Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Block D - Kalam Hall"
              className="w-full mt-1 px-3.5 py-2.5 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Unique Block Code *</label>
            <input
              type="text"
              required
              disabled={!!editingBlock}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. BLK-D"
              className="w-full mt-1 px-3.5 py-2.5 border rounded-lg text-sm uppercase font-mono disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Resident Category</label>
            <select
              value={genderType}
              onChange={(e) => setGenderType(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 border rounded-lg text-sm bg-white"
            >
              <option value="Boys">Boys Only</option>
              <option value="Girls">Girls Only</option>
              <option value="Co-ed">Co-ed / Postgraduate</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Modern air-conditioned wing for senior scholars."
              className="w-full mt-1 px-3.5 py-2 border rounded-lg text-sm"
            />
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
              {modalLoading ? 'Saving...' : editingBlock ? 'Save Changes' : 'Create Block'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
