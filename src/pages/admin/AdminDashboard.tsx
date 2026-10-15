import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Stethoscope,
  HeartPulse,
  Calendar,
  Clock,
  BarChart3,
  ShieldCheck,
  Download,
  Search,
  Plus,
  Trash2,
  Filter,
  CheckCircle,
  AlertCircle,
  FileText,
  Activity,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { PatientCardModal } from '../../components/patient/PatientCardModal.tsx';

type TabType = 'analytics' | 'patients' | 'staff' | 'shifts' | 'audit' | 'export';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [patientSearch, setPatientSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');

  // Register Patient Modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('1994-06-20');
  const [regAddress, setRegAddress] = useState('Metro Tower, Mumbai');
  const [regBloodGroup, setRegBloodGroup] = useState('B+');
  const [regAllergies, setRegAllergies] = useState('');
  const [regEmergencyContact, setRegEmergencyContact] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [newlyRegisteredPatient, setNewlyRegisteredPatient] = useState<any | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // Add Shift Modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftStaffId, setShiftStaffId] = useState('');
  const [shiftRole, setShiftRole] = useState<'doctor' | 'nurse'>('doctor');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftLoading, setShiftLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, patientsRes, staffRes, shiftsRes, auditRes, deptsRes] = await Promise.all([
        api.get('/reports/analytics'),
        api.get('/patients'),
        api.get('/users/staff'),
        api.get('/shifts'),
        api.get('/audit-logs'),
        api.get('/users/departments'),
      ]);

      setAnalytics(analyticsRes.data);
      setPatients(patientsRes.data.patients || []);
      setStaff(staffRes.data || []);
      setShifts(shiftsRes.data || []);
      setAuditLogs(auditRes.data || []);
      setDepartments(deptsRes.data || []);
      if (staffRes.data.length > 0) setShiftStaffId(staffRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    try {
      const res = await api.post('/patients', {
        fullName: regFullName,
        email: regEmail,
        phone: regPhone,
        dob: regDob,
        address: regAddress,
        bloodGroup: regBloodGroup,
        allergies: regAllergies || 'None reported',
        emergencyContact: regEmergencyContact,
        emergencyPhone: regEmergencyPhone,
      });

      setNewlyRegisteredPatient(res.data.patient);
      setShowRegModal(false);
      setShowCardModal(true);

      // Refresh list
      const patientsRes = await api.get('/patients');
      setPatients(patientsRes.data.patients || []);

      setRegFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegAllergies('');
      setRegEmergencyContact('');
      setRegEmergencyPhone('');
    } catch (err: any) {
      setRegError(err.response?.data?.error || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setShiftLoading(true);
    try {
      await api.post('/shifts', {
        userId: shiftStaffId,
        role: shiftRole,
        shiftDate,
        startTime: shiftStart,
        endTime: shiftEnd,
        notes: shiftNotes,
      });
      setShowShiftModal(false);
      setShiftNotes('');
      const shiftsRes = await api.get('/shifts');
      setShifts(shiftsRes.data || []);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to schedule shift');
    } finally {
      setShiftLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm('Delete this scheduled shift?')) return;
    try {
      await api.delete(`/shifts/${shiftId}`);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete shift');
    }
  };

  const handleExportCSV = (type: 'patients' | 'appointments' | 'visits') => {
    window.open(`/api/reports/export-csv?type=${type}`, '_blank');
  };

  // Filtered lists
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.patientId.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  const filteredStaff = staff.filter(
    (s) =>
      s.fullName.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.role.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(
    (log) => !auditFilterAction || log.action.toLowerCase().includes(auditFilterAction.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Admin Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
            Hospital Administration &amp; Governance
          </h1>
          <p className="text-xs text-slate-500">
            VitalLink Multi-Speciality • Administrator: {user?.fullName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRegModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
          <button
            onClick={() => setShowShiftModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Schedule Shift</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit text-xs font-semibold">
        {[
          { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
          { id: 'patients', label: `Patients (${patients.length})`, icon: Users },
          { id: 'staff', label: `Doctors & Nurses (${staff.length})`, icon: Stethoscope },
          { id: 'shifts', label: `Staff Shifts (${shifts.length})`, icon: Clock },
          { id: 'audit', label: `Audit Trails (${auditLogs.length})`, icon: ShieldCheck },
          { id: 'export', label: 'Export Reports', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Analytics Dashboard */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Patients', value: analytics?.summary?.totalPatients || 0, color: 'text-teal-600' },
              { label: 'Licensed Doctors', value: analytics?.summary?.totalDoctors || 0, color: 'text-sky-600' },
              { label: 'Clinical Nurses', value: analytics?.summary?.totalNurses || 0, color: 'text-emerald-600' },
              { label: 'Appointments', value: analytics?.summary?.totalAppointments || 0, color: 'text-amber-600' },
              { label: 'Completed Visits', value: analytics?.summary?.totalVisits || 0, color: 'text-indigo-600' },
              { label: 'Prescriptions Issued', value: analytics?.summary?.totalPrescriptions || 0, color: 'text-purple-600' },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-2xl font-black ${kpi.color} mt-1`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patients Registered Per Day */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Patients Registered Per Day (7-Day Trend)
              </h3>

              <div className="space-y-3 pt-2">
                {analytics?.patientsPerDay?.map((day: any) => {
                  const max = Math.max(...(analytics.patientsPerDay.map((d: any) => d.count) || [1]), 1);
                  const pct = Math.max(10, (day.count / max) * 100);

                  return (
                    <div key={day.date} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">{day.date}</span>
                        <span className="text-teal-600 font-bold">{day.count} patient{day.count === 1 ? '' : 's'}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Appointments by Department */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                Appointments by Department
              </h3>

              <div className="space-y-3 pt-2">
                {analytics?.appointmentsByDept?.map((dept: any) => {
                  const max = Math.max(...(analytics.appointmentsByDept.map((d: any) => d.count) || [1]), 1);
                  const pct = Math.max(10, (dept.count / max) * 100);

                  return (
                    <div key={dept.department} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-700 dark:text-slate-200">{dept.department}</span>
                        <span className="text-sky-600 font-bold">{dept.count} booked</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Doctor Workload Distribution */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Doctor Clinical Workload &amp; Consultations
              </h3>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4">Doctor</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4 text-center">Total Appointments</th>
                      <th className="py-2.5 px-4 text-center">Completed Visits</th>
                      <th className="py-2.5 px-4 text-center">Active Queue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analytics?.doctorWorkload?.map((doc: any) => (
                      <tr key={doc.doctorId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {doc.doctorName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {doc.department}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {doc.totalAppointments}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {doc.completedVisits}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          {doc.activeAppointments}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Patient Registry */}
      {activeTab === 'patients' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Patient Registry &amp; Medical Profiles
            </h3>
            <div className="relative w-full sm:w-72 text-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient ID, name, email..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Known Allergies</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                  <th className="py-3 px-4 text-center">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
                      {p.patientId}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {p.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>{p.phone || 'N/A'}</div>
                      <div className="text-[11px] text-slate-400">{p.email}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-600">
                      {p.bloodGroup || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {p.allergies && p.allergies !== 'None reported' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                          <AlertCircle className="w-3 h-3" />
                          {p.allergies}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                      {p.emergencyContact} {p.emergencyPhone && `(${p.emergencyPhone})`}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                      {p.visitCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Staff Directory */}
      {activeTab === 'staff' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Medical Staff Directory (Doctors &amp; Nurses)
            </h3>
            <div className="relative w-full sm:w-72 text-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff name, role, dept..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredStaff.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={s.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.fullName)}`}
                    alt={s.fullName}
                    className="w-10 h-10 rounded-xl object-cover border border-teal-500/30"
                  />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{s.fullName}</p>
                    <Badge variant={s.role === 'doctor' ? 'primary' : 'info'} size="sm">
                      {s.role.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-slate-600 dark:text-slate-300">
                  <p><strong>Department:</strong> {s.department}</p>
                  <p><strong>Email:</strong> {s.email}</p>
                  <p><strong>Phone:</strong> {s.phone || 'N/A'}</p>
                  {s.details && (
                    <div className="pt-1 text-[11px] text-teal-700 dark:text-teal-400">
                      {s.details.specialization && <div>Spec: {s.details.specialization}</div>}
                      {s.details.licenseNo && <div>Reg: {s.details.licenseNo}</div>}
                      {s.details.ward && <div>Ward: {s.details.ward}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Shift Scheduling */}
      {activeTab === 'shifts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Scheduled Hospital Shifts
            </h3>
            <button
              onClick={() => setShowShiftModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Shift
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Shift Hours</th>
                  <th className="py-2.5 px-4">Notes</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-teal-700 dark:text-teal-400">
                      {s.shift_date}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {s.staffName}
                    </td>
                    <td className="py-2.5 px-4 capitalize">{s.role}</td>
                    <td className="py-2.5 px-4">{s.departmentName}</td>
                    <td className="py-2.5 px-4 font-mono font-medium">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{s.notes || '-'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteShift(s.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        aria-label="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Immutable Healthcare Audit Logs (DPDP &amp; HIPAA)
              </h3>
              <p className="text-xs text-slate-400">Trace who viewed or edited patient medical records</p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                placeholder="Filter by action (e.g. VIEW_PATIENT)"
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 font-sans">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Entity Type</th>
                  <th className="py-2.5 px-4">Entity ID</th>
                  <th className="py-2.5 px-4">Audit Details</th>
                  <th className="py-2.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-teal-700 dark:text-teal-400 font-sans">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-200 font-sans">
                      {log.userName} ({log.userRole})
                    </td>
                    <td className="py-2.5 px-4 uppercase text-slate-500 font-sans">
                      {log.entity_type}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {log.entity_id}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-sans">
                      {log.details}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Export Reports */}
      {activeTab === 'export' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-600" />
            Export Official Compliance Reports
          </h3>
          <p className="text-xs text-slate-500">
            Generate and download standard CSV reports for accreditation, hospital audit, and medical records review.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Patients Master Register</h4>
              <p className="text-xs text-slate-500">
                Complete list of registered patients, demographics, blood groups, and recorded allergies.
              </p>
              <button
                onClick={() => handleExportCSV('patients')}
                className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Patients CSV
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Appointments Roster</h4>
              <p className="text-xs text-slate-500">
                All scheduled, checked-in, and completed appointments with assigned physicians and departments.
              </p>
              <button
                onClick={() => handleExportCSV('appointments')}
                className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Appointments CSV
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Clinical Visits &amp; Vitals</h4>
              <p className="text-xs text-slate-500">
                Clinical consultation history, diagnoses, recorded vitals, and physician notes.
              </p>
              <button
                onClick={() => handleExportCSV('visits')}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Visits CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Patient Modal */}
      <Modal isOpen={showRegModal} onClose={() => setShowRegModal(false)} title="Register Patient &amp; Issue Health ID">
        <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
          {regError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
              {regError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="Patient Full Name"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 ..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={regDob}
                onChange={(e) => setRegDob(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <select
                value={regBloodGroup}
                onChange={(e) => setRegBloodGroup(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Known Drug Allergies
              </label>
              <input
                type="text"
                value={regAllergies}
                onChange={(e) => setRegAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                required
                value={regEmergencyContact}
                onChange={(e) => setRegEmergencyContact(e.target.value)}
                placeholder="Relative / Guardian"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Phone Number
              </label>
              <input
                type="tel"
                required
                value={regEmergencyPhone}
                onChange={(e) => setRegEmergencyPhone(e.target.value)}
                placeholder="+91 ..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowRegModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regLoading}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {regLoading ? 'Registering...' : 'Register & Generate Slip'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Shift Modal */}
      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title="Schedule Medical Staff Shift">
        <form onSubmit={handleCreateShift} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Staff Member
            </label>
            <select
              value={shiftStaffId}
              onChange={(e) => {
                setShiftStaffId(e.target.value);
                const s = staff.find((m) => m.id === e.target.value);
                if (s) setShiftRole(s.role);
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {staff.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.role.toUpperCase()} - {m.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Shift Date
              </label>
              <input
                type="date"
                required
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Duty Notes &amp; Ward Instructions
            </label>
            <input
              type="text"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="e.g. Lead OPD clinical triage; Emergency trauma coverage..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowShiftModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={shiftLoading}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {shiftLoading ? 'Scheduling...' : 'Save Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Patient Card Modal for newly registered patient */}
      <PatientCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        patient={newlyRegisteredPatient}
      />
    </div>
  );
};
