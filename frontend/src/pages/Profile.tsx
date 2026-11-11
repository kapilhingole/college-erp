import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, UserPlus, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const roleUpper = (user?.role || '').toUpperCase();
  const isManagement = roleUpper === 'MANAGEMENT' || roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';
  const isFaculty = roleUpper === 'FACULTY';
  const isStudent = roleUpper === 'STUDENT';

  const profile = user?.profile || (isStudent ? user?.studentProfile : isFaculty ? user?.facultyProfile : user?.managementProfile) || {};

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvSuccess(null); setProvError(null); setProvLoading(true);
    try {
      const res = await apiClient.post('/auth/provision', {
        email: provEmail.trim(), password: provPassword, role: provRole,
        profile: { firstName: provFirstName.trim(), lastName: provLastName.trim(), phone: provPhone.trim() || undefined, departmentCode: provDeptCode, designation: provRole !== 'Student' ? provDesignation : undefined, office: provRole === 'Management' ? provOffice : undefined },
      });
      if (res.data.success) {
        setProvSuccess(`Account for "${res.data.data.user.email}" provisioned successfully.`);
        setProvEmail(''); setProvPassword(''); setProvFirstName(''); setProvLastName(''); setProvPhone('');
      }
    } catch (err: any) { setProvError(err.response?.data?.message || 'Failed to provision account.'); }
    finally { setProvLoading(false); }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-300';

  const profileFields = isStudent ? [
    { label: 'PRN / Enrollment', value: profile.enrollmentNumber || '—' },
    { label: 'Roll Number', value: profile.rollNumber || '—' },
    { label: 'Department', value: profile.department?.name || '—' },
    { label: 'Program', value: profile.program?.name || '—' },
    { label: 'Semester', value: profile.currentSemester ? `Semester ${profile.currentSemester}` : '—' },
    { label: 'Phone', value: profile.phone || '—' },
  ] : isFaculty ? [
    { label: 'Employee ID', value: profile.employeeId || '—' },
    { label: 'Designation', value: profile.designation || '—' },
    { label: 'Department', value: profile.department?.name || '—' },
    { label: 'Qualification', value: profile.qualification || '—' },
    { label: 'Weekly Hours', value: profile.maxWeeklyHours ? `${profile.maxWeeklyHours} hrs/week` : '—' },
    { label: 'Phone', value: profile.phone || '—' },
  ] : [
    { label: 'Employee ID', value: profile.employeeId || '—' },
    { label: 'Designation', value: profile.designation || '—' },
    { label: 'Office', value: profile.office || '—' },
    { label: 'Phone', value: profile.phone || '—' },
    { label: 'Scope', value: 'Institution-Wide Governance' },
    { label: 'Security Level', value: 'Tier-1 RBAC' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top accent */}
      <div className="h-1 bg-slate-900 w-full" />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/zes-logo.png" alt="ZCOER" className="w-9 h-9 rounded object-contain border border-slate-200" />
            <div>
              <h1 className="text-sm font-bold text-slate-800">Zeal College of Engineering and Research</h1>
              <p className="text-[11px] text-slate-500">Central Authentication Service</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-700">{user?.email}</p>
              <span className="text-[10px] font-bold uppercase text-slate-500">{roleUpper}</span>
            </div>
            <button onClick={() => logout()} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition">
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Identity card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                  {(profile.firstName?.[0] || 'U') + (profile.lastName?.[0] || '')}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{profile.firstName || 'User'} {profile.lastName || ''}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5" />{user?.email}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[11px] font-bold uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                      {isStudent ? 'Student' : isFaculty ? 'Faculty' : 'Management'}
                    </span>
                    <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">Active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { if (isStudent) navigate('/dashboard/student'); else if (isFaculty) navigate('/dashboard/faculty'); else navigate('/dashboard/admin'); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition self-start sm:self-auto"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Go to Dashboard
              </button>
            </div>

            <div className="pt-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Profile Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {profileFields.map((f) => (
                  <div key={f.label} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Provisioning console (management only) */}
          {isManagement && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                <UserPlus className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">Account Provisioning</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Issue login credentials and create profiles for Faculty, Management, or Student users. Passwords are encrypted with bcrypt.</p>

              {provSuccess && (
                <div className="mb-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />{provSuccess}
                </div>
              )}
              {provError && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />{provError}
                </div>
              )}

              <form onSubmit={handleProvision} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select className={inputCls} value={provRole} onChange={(e) => setProvRole(e.target.value as any)}>
                      <option value="Student">Student</option><option value="Faculty">Faculty</option><option value="Management">Management</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" required className={inputCls} value={provEmail} onChange={(e) => setProvEmail(e.target.value)} placeholder="user@zeal.edu.in" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                    <input type="password" required minLength={8} className={inputCls} value={provPassword} onChange={(e) => setProvPassword(e.target.value)} placeholder="Min 8 characters" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input required className={inputCls} value={provFirstName} onChange={(e) => setProvFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input required className={inputCls} value={provLastName} onChange={(e) => setProvLastName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                    <input className={inputCls} value={provPhone} onChange={(e) => setProvPhone(e.target.value)} placeholder="+91 98220 00000" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Dept. Code</label>
                    <input className={inputCls} value={provDeptCode} onChange={(e) => setProvDeptCode(e.target.value.toUpperCase())} placeholder="COMP" />
                  </div>
                  {provRole !== 'Student' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                      <input className={inputCls} value={provDesignation} onChange={(e) => setProvDesignation(e.target.value)} />
                    </div>
                  )}
                  {provRole === 'Management' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Office</label>
                      <input className={inputCls} value={provOffice} onChange={(e) => setProvOffice(e.target.value)} />
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={provLoading} className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-60">
                    <UserPlus className="w-3.5 h-3.5" />{provLoading ? 'Provisioning...' : 'Provision Account'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Zeal Education Society, Pune. All Rights Reserved.
      </footer>
    </div>
  );
};
