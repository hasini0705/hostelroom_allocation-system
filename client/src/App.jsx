import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';

// Student Pages
import StudentLogin from './pages/student/StudentLogin';
import StudentRegister from './pages/student/StudentRegister';
import StudentDashboard from './pages/student/StudentDashboard';
import BrowseRooms from './pages/student/BrowseRooms';

// Warden Pages
import WardenLogin from './pages/warden/WardenLogin';
import WardenDashboard from './pages/warden/WardenDashboard';
import ManageBlocks from './pages/warden/ManageBlocks';
import ManageRooms from './pages/warden/ManageRooms';
import ManageBeds from './pages/warden/ManageBeds';
import ManageStudents from './pages/warden/ManageStudents';
import ManageBookings from './pages/warden/ManageBookings';
import VacancyReports from './pages/warden/VacancyReports';

function AppContent() {
  const { user, isStudent, isWarden, loading } = useAuth();
  const { showToast } = useToast();
  const [currentView, setCurrentView] = useState('home');

  // Enforce role-based access control
  useEffect(() => {
    if (loading) return;

    if (currentView.startsWith('warden-') && currentView !== 'warden-login') {
      if (!isWarden) {
        showToast('Access restricted: Warden administrative privileges required.', 'error');
        setCurrentView('warden-login');
      }
    }

    if (currentView === 'student-dashboard') {
      if (!isStudent) {
        showToast('Please sign in with your student resident credentials.', 'info');
        setCurrentView('student-login');
      }
    }
  }, [currentView, isStudent, isWarden, loading]);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home setCurrentView={setCurrentView} />;
      
      // Student Views
      case 'student-login':
        return <StudentLogin setCurrentView={setCurrentView} />;
      case 'student-register':
        return <StudentRegister setCurrentView={setCurrentView} />;
      case 'student-dashboard':
        return <StudentDashboard setCurrentView={setCurrentView} />;
      case 'browse-rooms':
        return <BrowseRooms setCurrentView={setCurrentView} />;

      // Warden Views
      case 'warden-login':
        return <WardenLogin setCurrentView={setCurrentView} />;
      case 'warden-dashboard':
        return <WardenDashboard setCurrentView={setCurrentView} />;
      case 'warden-blocks':
        return <ManageBlocks setCurrentView={setCurrentView} />;
      case 'warden-rooms':
        return <ManageRooms setCurrentView={setCurrentView} />;
      case 'warden-beds':
        return <ManageBeds setCurrentView={setCurrentView} />;
      case 'warden-students':
        return <ManageStudents setCurrentView={setCurrentView} />;
      case 'warden-bookings':
        return <ManageBookings setCurrentView={setCurrentView} />;
      case 'warden-vacancies':
        return <VacancyReports setCurrentView={setCurrentView} />;

      default:
        return <Home setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="flex-1">
        {renderView()}
      </main>

      {/* Academic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-700">Hostel Room Allocation System</p>
            <p>B.Tech CSE Mini Project &bull; Department of Computer Science & Engineering</p>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>React.js</span>
            <span>&bull;</span>
            <span>Node.js Express</span>
            <span>&bull;</span>
            <span>SQLite Database</span>
            <span>&bull;</span>
            <span>Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
