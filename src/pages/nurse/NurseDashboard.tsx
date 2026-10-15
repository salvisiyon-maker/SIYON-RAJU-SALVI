import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import {
  HeartPulse,
  Activity,
  CheckCircle,
  Clock,
  UserPlus,
  Calendar,
  CheckSquare,
  AlertCircle,
  User,
  Phone,
  Heart,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { PatientCardModal } from '../../components/patient/PatientCardModal.tsx';

export const NurseDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Vitals recording modal state
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [vitalsBp, setVitalsBp] = useState('120/80');
  const [vitalsPulse, setVitalsPulse] = useState(74);
  const [vitalsTemp, setVitalsTemp] = useState(98.6);
  const [vitalsWeight, setVitalsWeight] = useState(65);
  const [vitalsSpo2, setVitalsSpo2] = useState(99);
  const [vitalsNotes, setVitalsNotes] = useState('');
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState('');

  // Register Patient Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('1995-05-15');
  const [regAddress, setRegAddress] = useState('Mumbai, Maharashtra');
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regAllergies, setRegAllergies] = useState('');
  const [regEmergencyContact, setRegEmergencyContact] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Newly registered patient card state
  const [newlyRegisteredPatient, setNewlyRegisteredPatient] = useState<any | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    fetchNurseData();
  }, [user]);

  const fetchNurseData = async () => {
    try {
      setLoading(true);
      const [aptRes, taskRes, shiftRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/tasks'),
        api.get('/shifts'),
      ]);
      setAppointments(aptRes.data);
      setTasks(taskRes.data);
      setShifts(shiftRes.data.filter((s: any) => s.user_id === user?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (aptId: string) => {
    try {
      await api.patch(`/appointments/${aptId}/status`, { status: 'checked_in' });
      fetchNurseData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update check-in');
    }
  };

  const handleOpenVitalsModal = (apt: any) => {
    setSelectedAppointment(apt);
    setVitalsBp('120/80');
    setVitalsPulse(74);
    setVitalsTemp(98.6);
    setVitalsWeight(65);
    setVitalsSpo2(99);
    setVitalsNotes('');
    setVitalsSuccess('');
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setVitalsLoading(true);
    try {
      // Find or create visit draft with recorded vitals
      await api.post('/visits', {
        appointmentId: selectedAppointment.id,
        patientId: selectedAppointment.patient_id,
        symptoms: selectedAppointment.reason || 'Nurse Intake Vitals Triage',
        diagnosis: 'Intake Vitals Recorded - Pending Physician Examination',
        vitalsBp,
        vitalsPulse: Number(vitalsPulse),
        vitalsTemp: Number(vitalsTemp),
        vitalsWeight: Number(vitalsWeight),
        vitalsSpo2: Number(vitalsSpo2),
        notes: vitalsNotes,
      });

      // Update appointment to checked_in or in_consultation
      await api.patch(`/appointments/${selectedAppointment.id}/status`, {
        status: 'checked_in',
      });

      setVitalsSuccess('Vitals successfully recorded and linked to patient file!');
      fetchNurseData();
      setTimeout(() => {
        setSelectedAppointment(null);
        setVitalsSuccess('');
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record vitals');
    } finally {
      setVitalsLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchNurseData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update task status');
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
      setShowRegisterModal(false);
      setShowCardModal(true);

      // Reset form
      setRegFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegAllergies('');
      setRegEmergencyContact('');
      setRegEmergencyPhone('');
    } catch (err: any) {
      setRegError(err.response?.data?.error || 'Failed to register patient');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-teal-600" />
            Nurse Triage &amp; Coordination Station
          </h1>
          <p className="text-xs text-slate-500">
            {user?.fullName} • Patient Intake, Vitals Recording &amp; Clinical Tasks
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Walk-in Patient</span>
        </button>
      </div>

      {/* Main Grid: Triage on Left, Tasks on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Patient Intake & Vitals Station */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                Intake &amp; Check-In Queue
              </h3>
              <span className="text-xs text-slate-400">Record Vitals &amp; Assist Check-In</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs">Loading queue...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No patients awaiting intake
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => {
                  const statusColors: Record<string, any> = {
                    scheduled: 'primary',
                    checked_in: 'info',
                    in_consultation: 'warning',
                    completed: 'success',
                    cancelled: 'danger',
                  };

                  return (
                    <div
                      key={apt.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-teal-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {apt.patientName}
                          </span>
                          <span className="font-mono text-xs text-teal-700 dark:text-teal-400 font-bold px-2 py-0.5 bg-teal-50 dark:bg-teal-950/60 rounded-md">
                            {apt.patientCode}
                          </span>
                          <Badge variant={statusColors[apt.status] || 'neutral'} size="sm">
                            {apt.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {apt.date} • {apt.start_time}
                          </span>
                          <span>Doctor: {apt.doctorName}</span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Chief Complaint:</strong> {apt.reason}
                        </p>

                        {apt.patientAllergies && apt.patientAllergies !== 'None reported' && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                            <AlertCircle className="w-3 h-3" />
                            Allergies: {apt.patientAllergies}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                        {apt.status === 'scheduled' && (
                          <button
                            onClick={() => handleCheckIn(apt.id)}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Mark Checked-In
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenVitalsModal(apt)}
                          className="flex items-center gap-1 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          Record Vitals
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Tasks Board & Shift */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-teal-600" />
              Assigned Clinical Tasks
            </h3>

            <div className="space-y-2.5 text-xs">
              {tasks.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No tasks assigned</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border ${
                      task.status === 'completed'
                        ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                        : task.priority === 'urgent'
                        ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                    } space-y-2`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold text-slate-900 dark:text-white ${task.status === 'completed' ? 'line-through opacity-75' : ''}`}>
                        {task.title}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                        task.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                      }`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <span className="text-slate-400">From: {task.assignedByName}</span>
                      <div className="flex items-center gap-1.5">
                        {task.status !== 'completed' ? (
                          <>
                            {task.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-sm font-semibold hover:bg-amber-200"
                              >
                                Start
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded-sm font-semibold hover:bg-emerald-700"
                            >
                              Done
                            </button>
                          </>
                        ) : (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Record Vitals Modal */}
      {selectedAppointment && (
        <Modal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          title={`Record Vitals - ${selectedAppointment.patientName} (${selectedAppointment.patientCode})`}
        >
          <form onSubmit={handleSaveVitals} className="space-y-4 text-xs">
            {vitalsSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 rounded-lg border border-emerald-200">
                {vitalsSuccess}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Blood Pressure (mmHg)
                </label>
                <input
                  type="text"
                  required
                  value={vitalsBp}
                  onChange={(e) => setVitalsBp(e.target.value)}
                  placeholder="120/80"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pulse Rate (bpm)
                </label>
                <input
                  type="number"
                  required
                  value={vitalsPulse}
                  onChange={(e) => setVitalsPulse(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Temperature (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vitalsTemp}
                  onChange={(e) => setVitalsTemp(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={vitalsWeight}
                  onChange={(e) => setVitalsWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Oxygen Saturation (SpO2 %)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  required
                  value={vitalsSpo2}
                  onChange={(e) => setVitalsSpo2(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nurse Clinical Observations / Pre-Consultation Remarks
              </label>
              <textarea
                rows={2}
                value={vitalsNotes}
                onChange={(e) => setVitalsNotes(e.target.value)}
                placeholder="Patient reports mild dizziness on standing; regular pulse..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={vitalsLoading}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs transition-colors"
              >
                {vitalsLoading ? 'Saving...' : 'Save Vitals to Chart'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Register New Patient Modal */}
      <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)} title="Register Walk-in Patient">
        <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
          {regError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
              {regError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="First Last"
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
                Known Drug/Food Allergies
              </label>
              <input
                type="text"
                value={regAllergies}
                onChange={(e) => setRegAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa, Peanuts"
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
              onClick={() => setShowRegisterModal(false)}
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

      {/* Printable ID Card Slip Modal for newly registered patient */}
      <PatientCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        patient={newlyRegisteredPatient}
      />
    </div>
  );
};
