import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { StudentsPage } from './pages/StudentsPage';
import { FacultyPage } from './pages/FacultyPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { TimetablePage } from './pages/TimetablePage';
import { AttendancePage } from './pages/AttendancePage';
import { FeesPage } from './pages/FeesPage';
import { LibraryPage } from './pages/LibraryPage';
import { NoticesPage } from './pages/NoticesPage';
import { ReportsPage } from './pages/ReportsPage';
import { RolesResponsibilitiesPage } from './pages/RolesResponsibilitiesPage';
import { Leaderboard } from './pages/Leaderboard';
import { DataSyncPage } from './pages/DataSyncPage';
import { MarksPage } from './pages/MarksPage';
import { SuperAdminViewPage } from './pages/SuperAdminViewPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
        Initializing College ERP...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const DashboardRedirect: React.FC = () => {
  return <Navigate to="/profile" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardRedirect />} />
            <Route path="dashboard/admin" element={<AdminDashboard />} />
            <Route path="dashboard/faculty" element={<FacultyDashboard />} />
            <Route path="dashboard/student" element={<StudentDashboard />} />

            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="faculty" element={<FacultyPage />} />
            <Route path="academics" element={<AcademicsPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="notices" element={<NoticesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="roles-responsibilities" element={<RolesResponsibilitiesPage />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="data-sync" element={<DataSyncPage />} />
            <Route path="marks" element={<MarksPage />} />
            <Route path="superadmin" element={<SuperAdminViewPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

