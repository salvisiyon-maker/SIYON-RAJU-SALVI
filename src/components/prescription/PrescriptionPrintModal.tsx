import React from 'react';
import { Modal } from '../common/Modal.tsx';
import { Printer, Pill, Download, Calendar, User, Stethoscope, AlertTriangle } from 'lucide-react';

interface PrescriptionItem {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  doctor_notes?: string;
}

interface PrescriptionDetails {
  id: string;
  issued_at: string;
  notes?: string;
  diagnosis?: string;
  symptoms?: string;
  vitals?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    weight?: number;
    spo2?: number;
  };
  patient?: {
    patientCode?: string;
    fullName?: string;
    dob?: string;
    bloodGroup?: string;
    allergies?: string;
    phone?: string;
    address?: string;
  };
  doctor?: {
    fullName?: string;
    specialization?: string;
    licenseNo?: string;
    departmentName?: string;
  };
  items: PrescriptionItem[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prescription: PrescriptionDetails | null;
}

export const PrescriptionPrintModal: React.FC<Props> = ({ isOpen, onClose, prescription }) => {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Medical Prescription (Rx)" maxWidth="2xl">
      <div className="space-y-6">
        {/* Printable Prescription Layout */}
        <div id="printable-prescription" className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-white text-slate-900 shadow-sm print:shadow-none print:border-none print:p-0">
          {/* Hospital Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-teal-600 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xs">
                +
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-teal-900">
                  VitalLink Healthcare Multi-Speciality
                </h2>
                <p className="text-xs text-slate-600">
                  Accredited Hospital &amp; Research Institute • Tel: +91 (022) 2490-8800
                </p>
                <p className="text-[11px] text-slate-500">
                  Metro Health Tower, Worli Seaface, Mumbai 400018
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-teal-50 text-teal-800 rounded-md border border-teal-200">
                Rx #{prescription.id.slice(-6).toUpperCase()}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Date: {new Date(prescription.issued_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Doctor Info */}
          <div className="flex justify-between items-start bg-slate-50 rounded-xl p-3 mb-4 text-xs">
            <div>
              <p className="font-bold text-sm text-slate-900">
                {prescription.doctor?.fullName || 'Attending Physician'}
              </p>
              <p className="text-teal-700 font-medium">
                {prescription.doctor?.specialization || 'Medical Specialist'} ({prescription.doctor?.departmentName || 'General'})
              </p>
              <p className="text-slate-500">Medical Council Reg: {prescription.doctor?.licenseNo || 'MCI-APPROVED'}</p>
            </div>
            <div className="text-right text-slate-600">
              <p className="font-semibold">Consultation Record</p>
              <p>Time: {new Date(prescription.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* Patient Details & Vitals Strip */}
          <div className="border border-slate-200 rounded-xl p-3 mb-4 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Patient Name</span>
              <span className="font-bold text-slate-900">{prescription.patient?.fullName || 'Patient'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Patient ID</span>
              <span className="font-mono font-bold text-teal-700">{prescription.patient?.patientCode || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Blood Group</span>
              <span className="font-bold text-rose-600">{prescription.patient?.bloodGroup || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Known Allergies</span>
              <span className="font-semibold text-amber-700">{prescription.patient?.allergies || 'None'}</span>
            </div>

            {prescription.vitals && (
              <div className="col-span-full pt-2 mt-1 border-t border-slate-100 flex flex-wrap gap-4 text-slate-600">
                {prescription.vitals.bp && <span><strong>BP:</strong> {prescription.vitals.bp}</span>}
                {prescription.vitals.pulse && <span><strong>Pulse:</strong> {prescription.vitals.pulse} bpm</span>}
                {prescription.vitals.temp && <span><strong>Temp:</strong> {prescription.vitals.temp}°F</span>}
                {prescription.vitals.spo2 && <span><strong>SpO2:</strong> {prescription.vitals.spo2}%</span>}
                {prescription.vitals.weight && <span><strong>Weight:</strong> {prescription.vitals.weight} kg</span>}
              </div>
            )}
          </div>

          {/* Clinical Diagnosis */}
          {prescription.diagnosis && (
            <div className="mb-4 text-xs bg-teal-50/60 p-2.5 rounded-lg border border-teal-100">
              <span className="font-bold text-teal-900">Diagnosis: </span>
              <span className="text-slate-800">{prescription.diagnosis}</span>
              {prescription.symptoms && (
                <p className="text-slate-600 text-[11px] mt-0.5">
                  <strong>Presenting Symptoms:</strong> {prescription.symptoms}
                </p>
              )}
            </div>
          )}

          {/* Rx Prescribed Medicines Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-teal-700 font-extrabold text-lg mb-3">
              <span className="italic font-serif text-2xl">℞</span>
              <span className="text-sm uppercase tracking-wider font-semibold text-slate-800">Prescribed Medications</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Medicine &amp; Dosage</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Instructions &amp; Advice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescription.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-400">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{item.medicine_name}</span>
                        <span className="text-slate-500 text-[11px]">{item.dosage}</span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{item.frequency}</td>
                      <td className="py-2.5 px-3 text-slate-700">{item.duration}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200">
                          {item.instructions || 'After food'}
                        </span>
                        {item.doctor_notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.doctor_notes}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Doctor's Advice / General Notes */}
          {prescription.notes && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 mb-6">
              <span className="font-bold block text-slate-900 mb-0.5">Physician's Advice &amp; Lifestyle Guidance:</span>
              <p>{prescription.notes}</p>
            </div>
          )}

          {/* Signature and Verification Footer */}
          <div className="flex items-end justify-between pt-6 border-t border-slate-200 text-xs">
            <div className="text-[10px] text-slate-400 max-w-xs space-y-0.5">
              <p>• Digitally generated &amp; authenticated via VitalLink Healthcare Systems.</p>
              <p>• Valid for dispensing at licensed pharmacies.</p>
              <p>• Emergency Helpline: 1800-VITAL-CARE</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-slate-800 pb-1 mb-1 font-serif italic text-teal-800 text-sm">
                {prescription.doctor?.fullName || 'Physician Signature'}
              </div>
              <p className="text-[11px] font-bold text-slate-800">{prescription.doctor?.fullName}</p>
              <p className="text-[10px] text-slate-500">{prescription.doctor?.specialization}</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Download / Print PDF
          </button>
        </div>
      </div>
    </Modal>
  );
};
