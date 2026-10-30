import React from 'react';
import { Building2, User, LogOut, Shield, Bed, Compass, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, logout, isStudent, isWarden } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => setCurrentView('home')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                HostelSync
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                B.Tech CSE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Room Allocation System</p>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setCurrentView('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentView === 'home'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Home
          </button>

          {isStudent && (
            <>
              <button
                onClick={() => setCurrentView('student-dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  currentView === 'student-dashboard'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Dashboard
              </button>
              <button
                onClick={() => setCurrentView('browse-rooms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  currentView === 'browse-rooms'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5" /> Browse Rooms
              </button>
            </>
          )}

          {isWarden && (
            <>
              <button
                onClick={() => setCurrentView('warden-dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  currentView === 'warden-dashboard'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> Administration
              </button>
              <button
                onClick={() => setCurrentView('warden-vacancies')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  currentView === 'warden-vacancies'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" /> Vacancy Monitor
              </button>
            </>
          )}
        </nav>

        {/* Right: Auth Profile / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {isWarden && <NotificationBell />}

              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-xs font-bold text-slate-800">{user.fullName || user.email}</span>
                  <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                    isWarden
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {user.role}
                  </span>
                </div>
                {user.studentCode && (
                  <p className="text-[11px] font-mono text-slate-500">Roll: {user.studentCode}</p>
                )}
              </div>

              <button
                onClick={() => {
                  logout();
                  setCurrentView('home');
                }}
                title="Logout"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('student-login')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Student Login
              </button>
              <button
                onClick={() => setCurrentView('student-register')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
              >
                Register
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setCurrentView('warden-login')}
                className="px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" /> Warden
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
