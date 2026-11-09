import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  Award,
  BookOpen,
  LogOut,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Clock,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

export const Profile: React.FC = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  // Provisioning form state (Management only)
  const [provRole, setProvRole] = useState<'Student' | 'Faculty' | 'Management'>('Student');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provFirstName, setProvFirstName] = useState('');
  const [provLastName, setProvLastName] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provDeptCode, setProvDeptCode] = useState('COMP');
  const [provDesignation, setProvDesignation] = useState('Assistant Professor');
  const [provOffice, setProvOffice] = useState('Central Administration');
  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState<string | null>(null);
  const [provError, setProvError] = useState<string | null>(null);

  // Normalize user role
  const roleUpper = (user?.role || '').toUpperCase();
  const isManagement = roleUpper === 'MANAGEMENT' || roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';
  const isFaculty = roleUpper === 'FACULTY';
  const isStudent = roleUpper === 'STUDENT';

  // Extract role profile
  const profile =
    user?.profile ||
    (isStudent ? user?.studentProfile : isFaculty ? user?.facultyProfile : user?.managementProfile) ||
    {};

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvSuccess(null);
    setProvError(null);
    setProvLoading(true);

    try {
      const res = await apiClient.post('/auth/provision', {
        email: provEmail.trim(),
        password: provPassword,
        role: provRole,
        profile: {
          firstName: provFirstName.trim(),
          lastName: provLastName.trim(),
          phone: provPhone.trim() || undefined,
          departmentCode: provDeptCode,
          designation: provRole === 'Faculty' ? provDesignation : provRole === 'Management' ? provDesignation : undefined,
          office: provRole === 'Management' ? provOffice : undefined,
        },
      });

      if (res.data.success) {
        setProvSuccess(
          `Success: ${provRole} account for "${res.data.data.user.email}" provisioned successfully with tied profile. Password encrypted via bcrypt.`
        );
        // Clear fields
        setProvEmail('');
        setProvPassword('');
        setProvFirstName('');
        setProvLastName('');
        setProvPhone('');
      }
    } catch (err: any) {
      setProvError(err.response?.data?.message || 'Failed to provision account.');
    } finally {
      setProvLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-between font-sans text-slate-800">
      {/* 1. Official ZES Dual Accent Top Bar */}
      <div className="h-2 bg-gradient-to-r from-zes-900 via-zes-600 to-zes-400 w-full" />

      {/* 2. Institutional Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 md:px-12 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/zes-logo.png"
              alt="Zeal Education Society"
              className="w-12 h-12 rounded-lg bg-white p-0.5 object-contain border border-zes-300 shadow-sm"
            />
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight text-zes-800 uppercase">
                Zeal College of Engineering and Research, Pune
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Central Authentication Service (CAS) • Authenticated User Session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800">{user?.email}</p>
              <span className="inline-block text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-zes-50 text-zes-800 border border-zes-200">
                Role: {roleUpper}
              </span>
            </div>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zes-800 hover:bg-zes-900 text-white rounded text-xs font-semibold tracking-wide uppercase transition shadow-sm"
              title="Terminate CAS session"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Profile View */}
      <main className="flex-1 py-8 px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* CAS Identity Banner */}
          <div className="bg-white rounded-md border border-slate-300 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zes-800 to-zes-600 text-white flex items-center justify-center text-xl font-bold tracking-wider shadow-inner">
                  {(profile.firstName?.[0] || 'U') + (profile.lastName?.[0] || '')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {profile.firstName || 'Institutional'} {profile.lastName || 'User'}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zes-100 text-zes-800 border border-zes-300 uppercase">
                      {isStudent ? '🧑‍🎓 Student Role' : isFaculty ? '👨‍🏫 Faculty Role' : '🏛️ Management Role'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Active • Provisioned
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation to Full ERP Dashboard */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (isStudent) navigate('/dashboard/student');
                    else if (isFaculty) navigate('/dashboard/faculty');
                    else navigate('/dashboard/admin');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  View Full ERP Workspace
                </button>
              </div>
            </div>

            {/* Profile Data Details (Strictly Role-Scoped) */}
            <div className="pt-6">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
                {isStudent
                  ? 'Student Academic & Enrollment Details'
                  : isFaculty
                  ? 'Faculty Academic & Departmental Profile'
                  : 'Management Administration & Governance Profile'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {isStudent && (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">PRN / Enrollment Number</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.enrollmentNumber || '1032230001'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Class Roll Number</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.rollNumber || 'ZCOER-CSE-001'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Academic Department</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.department?.name || 'Computer Engineering'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Degree Program</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        {profile.program?.name || 'Bachelor of Engineering (B.E.)'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Current Semester</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        Semester {profile.currentSemester || 3} (SPPU Pattern)
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Contact Telephone</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        {profile.phone || '+91 98220 12345'}
                      </span>
                    </div>
                  </>
                )}

                {isFaculty && (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Faculty Employee ID</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.employeeId || 'FAC-ZCOER-100'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Academic Designation</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.designation || 'Associate Professor'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Department</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.department?.name || 'Computer Engineering'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Highest Qualification</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        {profile.qualification || 'Ph.D in Computer Science'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Weekly Teaching Load</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        {profile.maxWeeklyHours || 18} Hours/Week Max
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Official Phone</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        {profile.phone || '+91 20 6720 6000'}
                      </span>
                    </div>
                  </>
                )}

                {isManagement && (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Management Employee ID</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.employeeId || 'MGMT-ZCOER-001'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Executive Designation</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.designation || 'Executive Director & Management Head'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Administrative Directorate</span>
                      <span className="text-sm font-bold text-slate-800 mt-1 block">
                        {profile.office || 'Central Administration, ZES Campus'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Official Phone</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        {profile.phone || '+91 20 6720 6000'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Administrative Scope</span>
                      <span className="text-sm font-semibold text-emerald-700 mt-1 block">
                        Institution-Wide Governance & Provisioning
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 block text-[11px] uppercase font-semibold">Security Level</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">
                        Tier-1 RBAC Authority
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 4. MANAGEMENT-ONLY PROVISIONING CONSOLE (REQUIREMENT 1, 3, & 4) */}
          {isManagement && (
            <div className="bg-white rounded-md border border-slate-300 shadow-sm p-6">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <div className="flex items-center gap-2 text-zes-800">
                  <UserPlus className="w-5 h-5 text-zes-700" />
                  <h3 className="text-base font-bold uppercase tracking-wide">
                    Management Account & Profile Provisioning Console
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Issue login credentials and generate tied profiles for new <strong>Faculty</strong>, <strong>Management</strong>, or <strong>Student</strong> users. Passwords are encrypted with bcrypt (never plaintext).
                </p>
              </div>

              {provSuccess && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 p-3 rounded text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{provSuccess}</span>
                </div>
              )}

              {provError && (
                <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{provError}</span>
                </div>
              )}

              <form onSubmit={handleProvision} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                      Assigned Role <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={provRole}
                      onChange={(e) => setProvRole(e.target.value as any)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:ring-1 focus:ring-zes-600 focus:border-zes-600"
                    >
                      <option value="Student">🧑‍🎓 Student</option>
                      <option value="Faculty">👨‍🏫 Faculty</option>
                      <option value="Management">🏛️ Management</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                      Institutional Email <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={provEmail}
                      onChange={(e) => setProvEmail(e.target.value)}
                      placeholder="e.g. newuser@zeal.edu.in"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 focus:ring-1 focus:ring-zes-600 focus:border-zes-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                      Initial Password <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={provPassword}
                      onChange={(e) => setProvPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 focus:ring-1 focus:ring-zes-600 focus:border-zes-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                      First Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={provFirstName}
                      onChange={(e) => setProvFirstName(e.target.value)}
                      placeholder="First Name"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 focus:ring-1 focus:ring-zes-600 focus:border-zes-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                      Last Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={provLastName}
                      onChange={(e) => setProvLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 focus:ring-1 focus:ring-zes-600 focus:border-zes-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={provPhone}
                      onChange={(e) => setProvPhone(e.target.value)}
                      placeholder="+91 98220 00000"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 focus:ring-1 focus:ring-zes-600 focus:border-zes-600"
                    />
                  </div>
                </div>

                {/* Role specific input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {provRole !== 'Management' ? (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                        Academic Department
                      </label>
                      <select
                        value={provDeptCode}
                        onChange={(e) => setProvDeptCode(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
                      >
                        <option value="AIDS">Artificial Intelligence and Data Science (AIDS)</option>
                        <option value="COMP">Computer Engineering (COMP)</option>
                        <option value="ENTC">Electronic and Telecommunication (ENTC)</option>
                        <option value="ECE">Electronic and Computer Engineering (ECE)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                        Administrative Office
                      </label>
                      <input
                        type="text"
                        value={provOffice}
                        onChange={(e) => setProvOffice(e.target.value)}
                        placeholder="e.g. Central Administration"
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2"
                      />
                    </div>
                  )}

                  {provRole === 'Faculty' ? (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                        Academic Designation
                      </label>
                      <input
                        type="text"
                        value={provDesignation}
                        onChange={(e) => setProvDesignation(e.target.value)}
                        placeholder="e.g. Assistant Professor"
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2"
                      />
                    </div>
                  ) : provRole === 'Management' ? (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                        Executive Title
                      </label>
                      <input
                        type="text"
                        value={provDesignation}
                        onChange={(e) => setProvDesignation(e.target.value)}
                        placeholder="e.g. Dean of Academics"
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={provLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-zes-800 hover:bg-zes-900 text-white rounded text-xs font-semibold uppercase tracking-wider transition shadow-sm disabled:opacity-60"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {provLoading ? 'Provisioning Account...' : `Provision ${provRole} Account & Profile`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* 5. Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Zeal College of Engineering and Research, Pune. All Rights Reserved.</p>
          <p className="text-slate-400">CAS Identity Session Verified • ERP Platform v2.0</p>
        </div>
      </footer>
    </div>
  );
};

