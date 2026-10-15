import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Activity,
  CheckSquare,
  Clock,
  BarChart3,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Stethoscope,
  HeartPulse,
  IdCard,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentPath }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  // Build role-specific menu items
  const getNavItems = () => {
    switch (user.role) {
      case 'admin':
        return [
          { label: t('dashboard'), path: '/admin', icon: LayoutDashboard },
          { label: t('patients'), path: '/admin/patients', icon: Users },
          { label: t('staff'), path: '/admin/staff', icon: UserCheck },
          { label: t('shifts'), path: '/admin/shifts', icon: Clock },
          { label: t('reports'), path: '/admin/reports', icon: BarChart3 },
          { label: t('auditLogs'), path: '/admin/audit', icon: ShieldCheck },
        ];
      case 'doctor':
        return [
          { label: t('dashboard'), path: '/doctor', icon: LayoutDashboard },
          { label: t('appointments'), path: '/doctor/appointments', icon: Calendar },
          { label: t('visits'), path: '/doctor/visits', icon: FileText },
          { label: t('tasks'), path: '/doctor/tasks', icon: CheckSquare },
          { label: t('shifts'), path: '/doctor/shifts', icon: Clock },
        ];
      case 'nurse':
        return [
          { label: t('dashboard'), path: '/nurse', icon: LayoutDashboard },
          { label: 'Intake & Vitals', path: '/nurse/vitals', icon: HeartPulse },
          { label: t('tasks'), path: '/nurse/tasks', icon: CheckSquare },
          { label: t('registerPatient'), path: '/nurse/register', icon: UserPlus },
          { label: t('shifts'), path: '/nurse/shifts', icon: Clock },
        ];
      case 'patient':
        return [
          { label: t('dashboard'), path: '/patient', icon: LayoutDashboard },
          { label: t('prescriptions'), path: '/patient/prescriptions', icon: FileText },
          { label: t('appointments'), path: '/patient/appointments', icon: Calendar },
          { label: 'Patient ID Card', path: '/patient/card', icon: IdCard },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed lg:static top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out shrink-0 flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* User Badge Banner */}
          <div className="bg-gradient-to-r from-teal-50 to-sky-50 dark:from-slate-800 dark:to-slate-800/60 p-3.5 rounded-xl border border-teal-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                {user.role === 'doctor' ? (
                  <Stethoscope className="w-5 h-5" />
                ) : user.role === 'nurse' ? (
                  <HeartPulse className="w-5 h-5" />
                ) : user.role === 'admin' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {user.fullName}
                </p>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold uppercase">
                  {user.role} {user.patientCode ? `• ${user.patientCode}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Menu Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));

              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={() => onClose()}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs shadow-teal-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Footer info: Compliance & Version */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            VitalLink Healthcare v2.6
          </p>
          <p>HIPAA &amp; India DPDP Compliant</p>
        </div>
      </aside>
    </>
  );
};
