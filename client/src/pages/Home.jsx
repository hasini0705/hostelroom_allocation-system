import React, { useState, useEffect } from 'react';
import { Building2, Shield, Users, Bed, CheckCircle2, Clock, Sparkles, ArrowRight, Lock, KeyRound, Cpu, Layers } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Home({ setCurrentView }) {
  const { user, isStudent, isWarden } = useAuth();
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getBlocks();
        if (res.success) setBlocks(res.blocks);
      } catch (e) {}
    }
    load();
  }, []);

  return (
    <div className="space-y-16 py-10">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-8 sm:p-14 overflow-hidden shadow-2xl border border-indigo-900/50">
          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>B.Tech CSE Mini Project &bull; Academic Year 2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Hostel Room <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">
                Allocation System
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              A comprehensive, full-stack campus accommodation portal with 5-minute atomic bed reservation locking, backend mathematical CAPTCHA, email OTP verification, and role-based Warden administrative controls.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isStudent ? (
                <button
                  onClick={() => setCurrentView('student-dashboard')}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  Go to Student Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              ) : isWarden ? (
                <button
                  onClick={() => setCurrentView('warden-dashboard')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
                >
                  Go to Warden Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setCurrentView('student-login')}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" /> Student Portal
                  </button>
                  <button
                    onClick={() => setCurrentView('warden-login')}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" /> Warden Portal
                  </button>
                  <button
                    onClick={() => setCurrentView('browse-rooms')}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all"
                  >
                    Browse Rooms
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12 pointer-events-none">
            <Building2 className="w-96 h-96" />
          </div>
        </div>
      </div>

      {/* Demo Credentials Quick-Reference Box */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50/70 border-2 border-amber-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                Evaluation & Demonstration Accounts
              </h2>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Zero Setup SQLite
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Warden Credential */}
            <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-600" /> Default Warden Account
                </span>
                <button
                  onClick={() => setCurrentView('warden-login')}
                  className="text-amber-800 font-bold hover:underline"
                >
                  Login as Warden &rarr;
                </button>
              </div>
              <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200 space-y-1 text-slate-800">
                <div>Email: <strong>warden@hostel.edu</strong></div>
                <div>Password: <strong>Warden@123</strong></div>
              </div>
              <p className="text-[11px] text-slate-500">
                Has full administrative privileges over blocks, rooms, beds, students, and vacancy reports.
              </p>
            </div>

            {/* Student Credential */}
            <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Sample Student Account (Allocated)
                </span>
                <button
                  onClick={() => setCurrentView('student-login')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Login as Student &rarr;
                </button>
              </div>
              <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200 space-y-1 text-slate-800">
                <div>Roll / Identifier: <strong>CS2024001</strong> (or student@hostel.edu)</div>
                <div>Password: <strong>Student@123</strong></div>
              </div>
              <p className="text-[11px] text-slate-500">
                Pre-allocated Bed A-101-B1. Demonstrates allocated view and vacating workflow.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Key Architectural Highlights
          </h2>
          <p className="text-xs text-slate-500">
            Engineered to fulfill all technical specification requirements for an exemplary academic project.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">5-Minute Bed Reservation Lock</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When a student selects a bed, an atomic database transaction locks it for 5 minutes. Other students see "Temporarily Reserved" in real time. Automatic background workers release expired reservations if unconfirmed.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Security CAPTCHA & OTP Email</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every registration and authentication attempt requires backend-generated arithmetic CAPTCHA challenges with single-use consumption. Student onboarding enforces 6-digit OTP verification with local demo mode support.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Zero-Config SQLite & Replit Ready</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Self-contained SQLite database with automated table migration and realistic initial seeding. Runs anywhere out-of-the-box in Replit or local workstations without installing MySQL or Oracle.
            </p>
          </div>
        </div>
      </div>

      {/* Available Residential Wings Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Residential Complexes
          </h2>
          <button
            onClick={() => setCurrentView('browse-rooms')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Browse All Rooms &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {blocks.map((b) => (
            <div
              key={b.id}
              onClick={() => setCurrentView('browse-rooms')}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {b.name}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {b.gender_type}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{b.description}</p>
              <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
                <span>{b.total_rooms} Rooms</span>
                <span className="font-bold text-emerald-700">{b.available_beds} Beds Free</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
