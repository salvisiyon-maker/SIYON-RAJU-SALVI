import React from 'react';
import { Modal } from '../common/Modal.tsx';
import { Printer, Shield, Heart, AlertTriangle, Phone, Calendar } from 'lucide-react';

interface PatientCardData {
  patientId: string;
  fullName: string;
  email?: string;
  phone?: string;
  dob?: string;
  bloodGroup?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  temporaryPassword?: string;
  registeredAt?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientCardData | null;
}

export const PatientCardModal: React.FC<Props> = ({ isOpen, onClose, patient }) => {
  if (!patient) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Patient Identification Slip & Card" maxWidth="lg">
      <div className="space-y-6">
        {/* Printable Card Container */}
        <div id="printable-patient-card" className="border-2 border-teal-500/40 rounded-2xl p-6 bg-gradient-to-br from-teal-50/50 via-white to-sky-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30 text-slate-900 dark:text-white shadow-md relative overflow-hidden">
          {/* Hospital Header */}
          <div className="flex items-center justify-between border-b border-teal-200 dark:border-teal-800/60 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-xs">
                +
              </div>
              <div>
                <h4 className="font-bold text-base tracking-wide text-teal-900 dark:text-teal-200">
                  VitalLink Medical Centre
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Official Patient Identification Record
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Primary ID Banner */}
          <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between mb-4 shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Unique Patient ID</p>
              <p className="text-lg font-mono font-bold text-teal-700 dark:text-teal-300 tracking-wider">
                {patient.patientId}
              </p>
            </div>
            {patient.temporaryPassword && (
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                <p className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">
                  Temporary Password
                </p>
                <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                  {patient.temporaryPassword}
                </p>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div>
              <span className="text-slate-400 block text-[11px]">Full Name</span>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                {patient.fullName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Blood Group</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                {patient.bloodGroup || 'Not Specified'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Contact Phone</span>
              <span className="font-medium">{patient.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Registered Date</span>
              <span className="font-medium">
                {patient.registeredAt ? new Date(patient.registeredAt).toLocaleDateString() : 'Today'}
              </span>
            </div>
          </div>

          {/* Allergies & Emergency Alerts */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
            <div className="flex items-start gap-2 bg-rose-50/80 dark:bg-rose-950/30 p-2 rounded-lg text-rose-800 dark:text-rose-200 border border-rose-200/60 dark:border-rose-900/40">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold">Medical Allergies: </span>
                <span>{patient.allergies || 'None reported'}</span>
              </div>
            </div>

            {patient.emergencyContact && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>
                  Emergency Contact: <span className="font-medium">{patient.emergencyContact}</span>
                  {patient.emergencyPhone && ` (${patient.emergencyPhone})`}
                </span>
              </div>
            )}
          </div>

          {/* Barcode Mock */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center">
            <div className="h-8 flex items-center gap-0.5 opacity-70">
              {Array.from({ length: 42 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full ${i % 3 === 0 ? 'w-1 bg-black dark:bg-white' : i % 2 === 0 ? 'w-0.5 bg-black dark:bg-white' : 'w-1.5 bg-black dark:bg-white'}`}
                />
              ))}
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-1">{patient.patientId}</p>
          </div>
        </div>

        {/* Action Buttons */}
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
            Print Patient Slip
          </button>
        </div>
      </div>
    </Modal>
  );
};
