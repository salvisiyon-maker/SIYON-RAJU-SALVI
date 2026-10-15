import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { PasswordChangeModal } from './components/common/PasswordChangeModal.tsx';

import { Login } from './pages/Login.tsx';
import { Profile } from './pages/Profile.tsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard.tsx';
import { NurseDashboard } from './pages/nurse/NurseDashboard.tsx';
import { PatientDashboard } from './pages/patient/PatientDashboard.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { Unauthorized } from './pages/Unauthorized.tsx';

// Protected Route Component
const ProtectedRoute: React.FC<{
  allowedRoles?: Array<'admin' | 'doctor' | 'nurse' | 'patient'>;
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Unauthorized />;
  }

  return <>{children}</>;
};

// Main Layout Wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If on login page, render without navbar/sidebar
  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

      <div className="flex-1 flex overflow-hidden">
        {user && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            currentPath={location.pathname}
          />
        )}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Forced Password Change for first login */}
      <PasswordChangeModal
        isOpen={!!user?.mustChangePassword}
        onSuccess={() => refreshUser()}
      />
    </div>
  );
};

// Root Redirect based on user role
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleRoutes: Record<string, string> = {
    admin: '/admin',
    doctor: '/doctor',
    nurse: '/nurse',
    patient: '/patient',
  };

  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                {/* Public & Root */}
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RootRedirect />} />

                {/* Common Profile */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor Routes */}
                <Route
                  path="/doctor/*"
                  element={
                    <ProtectedRoute allowedRoles={['doctor']}>
                      <DoctorDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Nurse Routes */}
                <Route
                  path="/nurse/*"
                  element={
                    <ProtectedRoute allowedRoles={['nurse']}>
                      <NurseDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Patient Routes */}
                <Route
                  path="/patient/*"
                  element={
                    <ProtectedRoute allowedRoles={['patient']}>
                      <PatientDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Catch All */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
