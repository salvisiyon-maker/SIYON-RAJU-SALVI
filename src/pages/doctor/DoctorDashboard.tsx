import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import {
  Calendar,
  Clock,
  User,
  Activity,
  Pill,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
  CheckSquare,
  Search,
  Stethoscope,
  Send,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { checkMedicineAllergy } from '../../utils/pure_logic.ts';

interface PrescriptionItemInput {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  doctorNotes: string;
}

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active consultation state
  const [activeAppointment, setActiveAppointment] = useState<any | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [vitalsBp, setVitalsBp] = useState('120/80');
  const [vitalsPulse, setVitalsPulse] = useState(72);
  const [vitalsTemp, setVitalsTemp] = useState(98.6);
  const [vitalsWeight, setVitalsWeight] = useState(65);
  const [vitalsSpo2, setVitalsSpo2] = useState(99);
  const [consultNotes, setConsultNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionItemInput[]>([]);
  const [consultSaving, setConsultSaving] = useState(false);
  const [consultSuccess, setConsultSuccess] = useState('');
  const [consultError, setConsultError] = useState('');

  // Task assignment modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [taskPatientId, setTaskPatientId] = useState<string | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);

  useEffect(() => {
    fetchDoctorData();
  }, [user]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [aptRes, taskRes, nurseRes, shiftRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/tasks'),
        api.get('/users/nurses'),
        api.get('/shifts'),
      ]);
      setAppointments(aptRes.data);
      setTasks(taskRes.data);
      setNurses(nurseRes.data);
      if (nurseRes.data.length > 0) setTaskAssignee(nurseRes.data[0].userId);
      setShifts(shiftRes.data.filter((s: any) => s.user_id === user?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConsultation = (apt: any) => {
    setActiveAppointment(apt);
    setSymptoms(apt.reason || '');
    setDiagnosis('');
    setConsultNotes(apt.notes || '');
    setFollowUpDate(new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10));
    setMedicines([
      {
        medicineName: '',
        dosage: '500 mg',
        frequency: 'Once daily (1-0-0)',
        duration: '5 days',
        instructions: 'After breakfast',
        doctorNotes: '',
      },
    ]);
    setConsultError('');
    setConsultSuccess('');
  };

  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        medicineName: '',
        dosage: '1 tablet',
        frequency: 'Twice daily (1-0-1)',
        duration: '7 days',
        instructions: 'After meals',
        doctorNotes: '',
      },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof PrescriptionItemInput, val: string) => {
    setMedicines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Check medicine allergy against active patient's allergies
  const getAllergyAlerts = () => {
    if (!activeAppointment?.patientAllergies) return [];
    const alerts: string[] = [];

    medicines.forEach((med) => {
      if (!med.medicineName.trim()) return;
      const check = checkMedicineAllergy(activeAppointment.patientAllergies, med.medicineName);
      if (check.isAllergic) {
        alerts.push(
          `ALLERGY WARNING: Patient is documented allergic to ${check.matchedAllergy}. Prescribed item: "${med.medicineName}"`
        );
      }
    });

    return alerts;
  };

  const allergyAlerts = getAllergyAlerts();

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setConsultError('Clinical diagnosis is required');
      return;
    }

    setConsultSaving(true);
    setConsultError('');

    try {
      const validMedicines = medicines.filter((m) => m.medicineName.trim());

      await api.post('/visits', {
        appointmentId: activeAppointment.id,
        patientId: activeAppointment.patient_id,
        symptoms,
        diagnosis,
        vitalsBp,
        vitalsPulse: Number(vitalsPulse),
        vitalsTemp: Number(vitalsTemp),
        vitalsWeight: Number(vitalsWeight),
        vitalsSpo2: Number(vitalsSpo2),
        notes: consultNotes,
        followUpDate: followUpDate || null,
        medicines: validMedicines,
      });

      setConsultSuccess('Consultation & Prescriptions recorded successfully!');
      fetchDoctorData();
      setTimeout(() => {
        setActiveAppointment(null);
        setConsultSuccess('');
      }, 1500);
    } catch (err: any) {
      setConsultError(err.response?.data?.error || 'Failed to save consultation');
    } finally {
      setConsultSaving(false);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskAssignee) return;

    setTaskSaving(true);
    try {
      await api.post('/tasks', {
        assignedToUserId: taskAssignee,
        patientId: taskPatientId,
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
      });
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      fetchDoctorData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign task');
    } finally {
      setTaskSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" />
            Doctor Clinical Portal
          </h1>
          <p className="text-xs text-slate-500">
            {user?.fullName} • Active Queue &amp; Patient Records
          </p>
        </div>

        <button
          onClick={() => {
            setTaskPatientId(null);
            setShowTaskModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <CheckSquare className="w-4 h-4" />
          <span>Assign Nursing Task</span>
        </button>
      </div>

      {/* Main Grid: Queue on Left, Staff Coordination / Shifts on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Consultation Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                Scheduled Consultations ({appointments.length})
              </h3>
              <span className="text-xs text-slate-400">Status Flow: Scheduled → Checked-In → In Consultation → Completed</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs">Loading doctor schedule...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No appointments in queue for today
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
                      <div className="space-y-1.5 flex-1">
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

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {apt.date} • {apt.start_time} - {apt.end_time}
                          </span>
                          <span>Dept: {apt.departmentName}</span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <strong>Reason:</strong> {apt.reason}
                        </p>

                        {apt.patientAllergies && apt.patientAllergies !== 'None reported' && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" />
                            Allergies: {apt.patientAllergies}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {apt.status !== 'completed' && apt.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleOpenConsultation(apt)}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            {apt.status === 'in_consultation' ? 'Resume Consultation' : 'Start Consultation'}
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Consultation Complete
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Staff Tasks & Scheduled Shifts */}
        <div className="space-y-4">
          {/* Clinical Tasks */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-teal-600" />
                Assigned Tasks
              </h3>
              <button
                onClick={() => {
                  setTaskPatientId(null);
                  setShowTaskModal(true);
                }}
                className="text-xs text-teal-600 font-bold hover:underline"
              >
                + New
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {tasks.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No active tasks</p>
              ) : (
                tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {t.title}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${
                        t.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Assigned to: {t.assignedToName} • Status: <strong className="uppercase">{t.status}</strong>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shifts */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              My Roster Shifts
            </h3>
            <div className="space-y-2 text-xs">
              {shifts.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No shifts assigned</p>
              ) : (
                shifts.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl border border-teal-100 dark:border-slate-800 bg-teal-50/30 dark:bg-slate-800/40"
                  >
                    <p className="font-bold text-teal-900 dark:text-teal-300">
                      {s.shift_date} ({s.start_time} - {s.end_time})
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.notes || 'Routine Clinic & Rounds'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consultation Modal (Clinical Notes & Prescription Builder with Real-Time Allergy Warning) */}
      {activeAppointment && (
        <Modal
          isOpen={!!activeAppointment}
          onClose={() => setActiveAppointment(null)}
          title={`Clinical Consultation - ${activeAppointment.patientName} (${activeAppointment.patientCode})`}
          maxWidth="4xl"
        >
          <form onSubmit={handleSaveConsultation} className="space-y-5 text-xs">
            {/* Live Allergy Warning Alert Banner */}
            {allergyAlerts.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-900 dark:text-rose-200 space-y-1 animate-pulse">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  CRITICAL CLINICAL ALLERGY ALERT!
                </div>
                {allergyAlerts.map((warning, i) => (
                  <p key={i} className="font-semibold text-xs pl-7">
                    • {warning}
                  </p>
                ))}
              </div>
            )}

            {consultError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 border border-rose-200">
                {consultError}
              </div>
            )}

            {consultSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 border border-emerald-200">
                {consultSuccess}
              </div>
            )}

            {/* Vitals Recording Section */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
                Recorded Patient Vitals
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">BP (mmHg)</label>
                  <input
                    type="text"
                    value={vitalsBp}
                    onChange={(e) => setVitalsBp(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={vitalsPulse}
                    onChange={(e) => setVitalsPulse(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsTemp}
                    onChange={(e) => setVitalsTemp(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={vitalsWeight}
                    onChange={(e) => setVitalsWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitalsSpo2}
                    onChange={(e) => setVitalsSpo2(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Clinical Symptoms & Diagnosis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Presenting Symptoms
                </label>
                <textarea
                  rows={2}
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Diagnosis
                </label>
                <textarea
                  rows={2}
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Essential Hypertension, Bronchitis..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            {/* Prescription Builder */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-teal-600" />
                  Prescribe Medications (Rx)
                </span>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="flex items-center gap-1 px-3 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg font-bold text-xs hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Medicine
                </button>
              </div>

              <div className="space-y-3">
                {medicines.map((med, index) => {
                  const check = checkMedicineAllergy(activeAppointment.patientAllergies, med.medicineName);

                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl border ${
                        check.isAllergic
                          ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40'
                      } space-y-2`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Medicine Name
                          </label>
                          <input
                            type="text"
                            value={med.medicineName}
                            onChange={(e) => handleMedicineChange(index, 'medicineName', e.target.value)}
                            placeholder="e.g. Telmisartan 40mg or Amoxicillin..."
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                            placeholder="e.g. 500 mg"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Frequency
                          </label>
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                            placeholder="1-0-1"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={med.duration}
                            onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                            placeholder="7 days"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(index)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                          placeholder="Instructions: After breakfast / Before sleep / With warm water..."
                          className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          value={med.doctorNotes}
                          onChange={(e) => handleMedicineChange(index, 'doctorNotes', e.target.value)}
                          placeholder="Physician notes: e.g. Monitor blood pressure daily..."
                          className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                        />
                      </div>

                      {check.isAllergic && (
                        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Matches patient allergy: {check.matchedAllergy}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Advice & Follow-Up Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Physician Advice &amp; Lifestyle Recommendations
                </label>
                <input
                  type="text"
                  value={consultNotes}
                  onChange={(e) => setConsultNotes(e.target.value)}
                  placeholder="e.g. Low sodium diet, 30 min daily walking, avoid cold beverages..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Follow-Up Review Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Submit & Close Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveAppointment(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={consultSaving}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition-colors cursor-pointer"
              >
                {consultSaving ? 'Saving Visit Record...' : 'Complete Visit & Issue Prescription'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Nursing Task Modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Assign Clinical Task to Nursing Staff">
        <form onSubmit={handleAssignTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assign to Nurse
            </label>
            <select
              required
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {nurses.map((n) => (
                <option key={n.id} value={n.userId}>
                  {n.name} ({n.ward})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Priority Level
            </label>
            <select
              value={taskPriority}
              onChange={(e: any) => setTaskPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="urgent">Urgent (Immediate attention)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Check 2-Hour Post-Medication Blood Pressure & SpO2"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical Instructions
            </label>
            <textarea
              rows={3}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Provide exact protocol details, drug dosages or measurement intervals..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowTaskModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={taskSaving}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {taskSaving ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
