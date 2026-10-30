import React, { useState, useEffect } from 'react';
import { Shield, Users, Building2, Home, Bed, CheckCircle2, Clock, Wrench, AlertCircle, Calendar, ArrowRight, BarChart3, Layers, UserCheck, Bell, LogOut, X } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function WardenDashboard({ setCurrentView }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, notifRes] = await Promise.all([
        api.getWardenDashboard(),
        api.getWardenNotifications()
      ]);
      if (dashRes.success) {
        setData(dashRes);
      }
      if (notifRes.success) {
        setNotifications(notifRes.notifications || []);
      }
    } catch (err) {
      showToast('Failed to load warden dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading warden analytics...</p>
        </div>
      </div>
    );
  }

  const { stats, blockBreakdown, recentBookings } = data || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Hostel Administration
            </span>
            <span className="text-xs text-amber-200">
              Session: <strong>{user?.fullName || 'Warden'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Administrative Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Live overview of campus residential blocks, room capacity, bed locks, and active student allocations.
          </p>
        </div>

        {/* Quick Submodule Links */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentView('warden-vacancies')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            Vacancy Monitor
          </button>
          <button
            onClick={() => setCurrentView('warden-bookings')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors"
          >
            Bookings Ledger
          </button>
        </div>

        <div className="absolute right-0 top-0 opacity-5 translate-x-8 -translate-y-6 pointer-events-none">
          <Shield className="w-64 h-64" />
        </div>
      </div>

      {/* 8 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Students */}
        <div 
          onClick={() => setCurrentView('warden-students')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats?.total_students || 0}</div>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">Registered Residents &rarr;</span>
        </div>

        {/* Hostel Blocks */}
        <div 
          onClick={() => setCurrentView('warden-blocks')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hostel Blocks</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats?.total_blocks || 0}</div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Manage Blocks &rarr;</span>
        </div>

        {/* Total Rooms */}
        <div 
          onClick={() => setCurrentView('warden-rooms')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Rooms</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats?.total_rooms || 0}</div>
          <span className="text-[11px] text-cyan-600 font-semibold mt-1 block">Manage Rooms &rarr;</span>
        </div>

        {/* Total Beds */}
        <div 
          onClick={() => setCurrentView('warden-beds')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Beds</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats?.total_beds || 0}</div>
          <span className="text-[11px] text-purple-600 font-semibold mt-1 block">Inspect Beds &rarr;</span>
        </div>

        {/* Available Beds */}
        <div 
          onClick={() => setCurrentView('warden-vacancies')}
          className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Available Beds</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">{stats?.available_beds || 0}</div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Ready for Allocation &rarr;</span>
        </div>

        {/* Occupied Beds */}
        <div 
          onClick={() => setCurrentView('warden-bookings')}
          className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Occupied Beds</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-2">{stats?.occupied_beds || 0}</div>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">Permanent Residents &rarr;</span>
        </div>

        {/* Temporarily Reserved Beds */}
        <div 
          onClick={() => setCurrentView('warden-beds')}
          className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">5-Min Reserved</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{stats?.reserved_beds || 0}</div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">Active Temporary Holds &rarr;</span>
        </div>

        {/* Under Maintenance Beds */}
        <div 
          onClick={() => setCurrentView('warden-beds')}
          className="bg-slate-100/60 p-5 rounded-2xl border border-slate-300/80 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Maintenance</span>
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats?.maintenance_beds || 0}</div>
          <span className="text-[11px] text-slate-600 font-semibold mt-1 block">Service Required &rarr;</span>
        </div>
      </div>

      {/* Middle Section: Block Occupancy Progress & Management Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Block Occupancy Analysis */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" /> Block Occupancy & Capacity Statistics
            </h3>
            <button
              onClick={() => setCurrentView('warden-vacancies')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Detailed Report &rarr;
            </button>
          </div>

          <div className="space-y-5">
            {blockBreakdown?.map((b) => {
              const total = b.bed_count || 1;
              const occPercent = Math.round(((b.occupied_beds || 0) / total) * 100);
              const availPercent = Math.round(((b.available_beds || 0) / total) * 100);

              return (
                <div key={b.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                      <p className="text-xs text-slate-500">
                        {b.gender_type} Complex &bull; {b.room_count} Rooms &bull; {b.bed_count} Total Beds
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-800">{occPercent}% Occupied</span>
                      <span className="text-xs text-emerald-600 font-bold block">
                        {b.available_beds} beds free
                      </span>
                    </div>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      title={`Occupied: ${b.occupied_beds}`}
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${(b.occupied_beds / total) * 100}%` }}
                    />
                    <div
                      title={`Reserved: ${b.reserved_beds}`}
                      className="bg-amber-400 h-full transition-all"
                      style={{ width: `${(b.reserved_beds / total) * 100}%` }}
                    />
                    <div
                      title={`Maintenance: ${b.maintenance_beds}`}
                      className="bg-slate-400 h-full transition-all"
                      style={{ width: `${(b.maintenance_beds / total) * 100}%` }}
                    />
                    <div
                      title={`Available: ${b.available_beds}`}
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${(b.available_beds / total) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free: {b.available_beds}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Occupied: {b.occupied_beds}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Reserved: {b.reserved_beds}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Administration Navigation Hub */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Administrative Modules
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setCurrentView('warden-blocks')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">Hostel Blocks</span>
                  <span className="text-[11px] text-slate-400">Add, edit, or configure wings</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
            </button>

            <button
              onClick={() => setCurrentView('warden-rooms')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">Floors & Rooms</span>
                  <span className="text-[11px] text-slate-400">Configure capacities & facilities</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
            </button>

            <button
              onClick={() => setCurrentView('warden-beds')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Bed className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">Bed Management</span>
                  <span className="text-[11px] text-slate-400">Maintenance & reservation locks</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
            </button>

            <button
              onClick={() => setCurrentView('warden-students')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">Student Directory</span>
                  <span className="text-[11px] text-slate-400">Search, history, status controls</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
            </button>

            <button
              onClick={() => setCurrentView('warden-bookings')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">Booking Management</span>
                  <span className="text-[11px] text-slate-400">Revocation & status filter</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
            </button>

            <button
              onClick={() => setCurrentView('warden-vacancies')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">Live Vacancy Report</span>
                  <span className="text-[11px] text-slate-400">Full block & floor hierarchy</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Allocations Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" /> Recent Booking & Allocation Activity
          </h3>
          <button
            onClick={() => setCurrentView('warden-bookings')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            View Complete Ledger &rarr;
          </button>
        </div>

        {recentBookings && recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Allocated Bed & Room</th>
                  <th className="py-2.5 px-3">Block</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{b.student_name}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">{b.student_id_code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      Room {b.room_number} &bull; {b.bed_number}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{b.block_name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(b.booked_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">No recent allocations.</p>
        )}
      </div>

      {/* Live Notifications Feed */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Warden Alert Feed</h3>
              <p className="text-xs text-slate-500">Real-time incoming notifications from student reservation and vacate actions.</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
            {notifications.length} Total Alerts
          </span>
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No incoming alerts yet.</p>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {notifications.slice(0, 10).map((n) => {
              let badgeColor = 'bg-slate-100 text-slate-700';
              let Icon = Bell;

              if (n.type === 'booking_confirmed') {
                badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                Icon = CheckCircle2;
              } else if (n.type === 'bed_reserved') {
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                Icon = Clock;
              } else if (n.type === 'room_vacated') {
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                Icon = LogOut;
              } else if (n.type === 'reservation_cancelled') {
                badgeColor = 'bg-purple-100 text-purple-800 border-purple-300';
                Icon = X;
              }

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                    n.is_read ? 'bg-slate-50/60 border-slate-200' : 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-300/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 border ${badgeColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{n.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
