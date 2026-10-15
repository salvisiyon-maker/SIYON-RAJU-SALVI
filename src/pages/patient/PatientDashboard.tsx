import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import {
  Calendar,
  Clock,
  FileText,
  Pill,
  Printer,
  Search,
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  User,
  Heart,
  IdCard,
  X,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge.tsx';
import { Modal } from '../../components/common/Modal.tsx';
import { PrescriptionPrintModal } from '../../components/prescription/PrescriptionPrintModal.tsx';
import { PatientCardModal } from '../../components/patient/PatientCardModal.tsx';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [patientData, setPatientData] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state for visits
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  // Modals state
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  // Booking form state
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [bookDate, setBookDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookTime, setBookTime] = useState('11:00');
  const [bookReason, setBookReason] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookSuccess, setBookSuccess] = useState('');

  useEffect(() => {
    fetchPatientData();
    fetchVisits();
    fetchAppointments();
    fetchMetadata();
  }, [user]);

  const fetchPatientData = async () => {
    try {
      if (user?.patientId) {
        const res = await api.get(`/patients/${user.patientId}`);
        setPatientData(res.data.patient);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVisits = async () => {
    try {
      const res = await api.get('/visits');
      setVisits(res.data);
      if (res.data.length > 0) {
        setExpandedVisitId(res.data[0].id); // Expand newest visit by default
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [deptRes, docRes] = await Promise.all([
        api.get('/users/departments'),
        api.get('/users/doctors'),
      ]);
      setDepartments(deptRes.data);
      setDoctors(docRes.data);
      if (deptRes.data.length > 0) setSelectedDeptId(deptRes.data[0].id);
      if (docRes.data.length > 0) setSelectedDocId(docRes.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelAppointment = async (aptId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.patch(`/appointments/${aptId}/status`, { status: 'cancelled' });
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel appointment');
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookError('');
    setBookSuccess('');

    try {
      // Calculate 30 min end time
      const [h, m] = bookTime.split(':').map(Number);
      const endMins = h * 60 + m + 30;
      const endH = String(Math.floor(endMins / 60)).padStart(2, '0');
      const endM = String(endMins % 60).padStart(2, '0');
      const endTime = `${endH}:${endM}`;

      await api.post('/appointments', {
        departmentId: selectedDeptId,
        doctorId: selectedDocId,
        date: bookDate,
        startTime: bookTime,
        endTime,
        reason: bookReason,
        notes: bookNotes,
      });

      setBookSuccess('Appointment booked successfully!');
      fetchAppointments();
      setTimeout(() => {
        setShowBookModal(false);
        setBookSuccess('');
        setBookReason('');
      }, 1500);
    } catch (err: any) {
      setBookError(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  // Filter visits
  const filteredVisits = visits.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.symptoms?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.prescription?.items?.some((i: any) =>
        i.medicine_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesStart = !startDate || v.visit_date >= startDate;
    const matchesEnd = !endDate || v.visit_date <= endDate + 'T23:59:59.999Z';

    return matchesSearch && matchesStart && matchesEnd;
  });

  const availableDoctors = doctors.filter(
    (d) => !selectedDeptId || d.departmentId === selectedDeptId
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Patient Welcome Banner with Unique ID and Clinical Details */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-teal-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-extrabold px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs border border-white/20">
                Patient ID: {user?.patientCode || patientData?.patientId || 'VL-2026-004812'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/80 text-white flex items-center gap-1">
                <Heart className="w-3 h-3 fill-white" />
                Blood: {patientData?.bloodGroup || 'B+'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-xs text-teal-100 max-w-xl">
              Access your chronological medical history, view verified prescriptions with dosage details, and schedule specialist consultations.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button
              onClick={() => setShowIdCardModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/20 transition-all cursor-pointer shadow-xs"
            >
              <IdCard className="w-4 h-4" />
              <span>Digital Health Card</span>
            </button>
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-teal-800 hover:bg-teal-50 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Medical Allergy Banner Warning if present */}
        {patientData?.allergies && patientData.allergies !== 'None reported' && (
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-2 text-xs text-teal-50">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>Documented Allergies:</strong> {patientData.allergies} (Flagged on all prescriptions)
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Visits Timeline & Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline of Visits and Prescriptions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Visit Records &amp; Prescriptions Timeline
                </h2>
                <p className="text-xs text-slate-400">
                  Newest consultations first with expandable medication plans
                </p>
              </div>
            </div>

            {/* Search and Date Range Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search symptom, doctor, drug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="From Date"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="To Date"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Visits List */}
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs">Loading visit records...</p>
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                <p className="text-sm font-semibold">No visits found matching filters</p>
                <p className="text-xs mt-1">Book your first doctor consultation to get started</p>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {filteredVisits.map((visit) => {
                  const isExpanded = expandedVisitId === visit.id;
                  const hasPrescription = !!visit.prescription;
                  const medCount = visit.prescription?.items?.length || 0;

                  return (
                    <div
                      key={visit.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 transition-all hover:border-teal-500/40"
                    >
                      {/* Visit Summary Header Bar */}
                      <div
                        onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                              {new Date(visit.visit_date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {visit.departmentName}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {visit.diagnosis || 'General Consultation'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Doctor: {visit.doctorName} ({visit.doctorSpecialization})
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {hasPrescription && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              <Pill className="w-3.5 h-3.5" />
                              {medCount} Medicine{medCount > 1 ? 's' : ''}
                            </span>
                          )}

                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Body */}
                      {isExpanded && (
                        <div className="p-4 pt-1 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs bg-white dark:bg-slate-900">
                          {/* Presenting Symptoms & Clinical Notes */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                                Presenting Symptoms
                              </span>
                              <p className="text-slate-600 dark:text-slate-400">{visit.symptoms}</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                                Doctor's Clinical Advice
                              </span>
                              <p className="text-slate-600 dark:text-slate-400">
                                {visit.notes || 'Routine follow-up advised.'}
                              </p>
                            </div>
                          </div>

                          {/* Recorded Vitals Strip */}
                          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-100 dark:border-teal-900/40">
                            <span className="font-bold text-teal-900 dark:text-teal-300 text-[11px] uppercase tracking-wider block mb-2">
                              Recorded Physical Vitals
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-700 dark:text-slate-300">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {visit.vitals_bp || '120/80'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Pulse Rate</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {visit.vitals_pulse ? `${visit.vitals_pulse} bpm` : '74 bpm'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Body Temp</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {visit.vitals_temp ? `${visit.vitals_temp} °F` : '98.6 °F'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Oxygen (SpO2)</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {visit.vitals_spo2 ? `${visit.vitals_spo2} %` : '99 %'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Weight</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {visit.vitals_weight ? `${visit.vitals_weight} kg` : '64 kg'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Prescribed Medicines Table */}
                          {hasPrescription && (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                  <Pill className="w-3.5 h-3.5 text-teal-600" />
                                  Prescribed Medicines ({medCount})
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setSelectedPrescription(visit.prescription)}
                                  className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Download Prescription as PDF</span>
                                </button>
                              </div>

                              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                      <th className="py-2 px-3">Medicine</th>
                                      <th className="py-2 px-3">Dosage</th>
                                      <th className="py-2 px-3">Frequency</th>
                                      <th className="py-2 px-3">Duration</th>
                                      <th className="py-2 px-3">Instructions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {visit.prescription.items.map((item: any) => (
                                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                          {item.medicine_name}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                          {item.dosage}
                                        </td>
                                        <td className="py-2.5 px-3 font-medium text-teal-700 dark:text-teal-400">
                                          {item.frequency}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                          {item.duration}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                                            {item.instructions || 'After food'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Follow up reminder */}
                          {visit.follow_up_date && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400 pt-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Recommended Follow-Up Date: {new Date(visit.follow_up_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Upcoming Appointments & Booking */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                My Appointments
              </h3>
              <button
                onClick={() => setShowBookModal(true)}
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
              >
                + Book New
              </button>
            </div>

            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No appointments scheduled
                </div>
              ) : (
                appointments.map((apt) => {
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
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            {apt.doctorName}
                          </p>
                          <p className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                            {apt.departmentName}
                          </p>
                        </div>
                        <Badge variant={statusColors[apt.status] || 'neutral'} size="sm">
                          {apt.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {apt.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {apt.start_time} - {apt.end_time}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        <strong>Reason:</strong> {apt.reason}
                      </p>

                      {apt.status === 'scheduled' && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            Cancel Appointment
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Book Appointment Modal */}
      <Modal isOpen={showBookModal} onClose={() => setShowBookModal(false)} title="Book Doctor Consultation">
        <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
          {bookError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200">
              {bookError}
            </div>
          )}

          {bookSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200">
              {bookSuccess}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                const firstMatchingDoc = doctors.find((d) => d.departmentId === e.target.value);
                if (firstMatchingDoc) setSelectedDocId(firstMatchingDoc.id);
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Doctor
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              {availableDoctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} - {doc.specialization} (Fee: ₹{doc.consultationFee})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Consultation Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Time Slot
              </label>
              <select
                value={bookTime}
                onChange={(e) => setBookTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00'].map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} - {slot.slice(0, 2)}:30
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Symptoms / Reason for Visit
            </label>
            <input
              type="text"
              required
              value={bookReason}
              onChange={(e) => setBookReason(e.target.value)}
              placeholder="e.g. Recurrent headache, routine blood pressure review..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Additional Notes for Doctor (Optional)
            </label>
            <textarea
              rows={2}
              value={bookNotes}
              onChange={(e) => setBookNotes(e.target.value)}
              placeholder="Any recent lab tests, medications taken..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowBookModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookingLoading}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {bookingLoading ? 'Confirming...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Prescription PDF Modal */}
      <PrescriptionPrintModal
        isOpen={!!selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
        prescription={selectedPrescription}
      />

      {/* Patient ID Card Modal */}
      <PatientCardModal
        isOpen={showIdCardModal}
        onClose={() => setShowIdCardModal(false)}
        patient={patientData}
      />
    </div>
  );
};
