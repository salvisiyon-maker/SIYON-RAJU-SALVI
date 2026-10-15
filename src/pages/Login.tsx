import React, { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Shield,
  Stethoscope,
  HeartPulse,
  UserCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Compass,
  UserPlus,
  LogIn,
  Heart,
  Briefcase,
  Copy,
  Check,
} from 'lucide-react';
import { Modal } from '../components/common/Modal.tsx';
import { PatientCardModal } from '../components/patient/PatientCardModal.tsx';

export const Login: React.FC = () => {
  const { login, register, guestLogin } = useAuth();
  const { t } = useLanguage();

  // Mode: 'signin' | 'register'
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Sign in state
  const [role, setRole] = useState<UserRole>('patient');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Register form state
  const [regRole, setRegRole] = useState<UserRole>('patient');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('1996-04-12');
  const [regAddress, setRegAddress] = useState('Mumbai, Maharashtra');
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regAllergies, setRegAllergies] = useState('');
  const [regEmergencyContact, setRegEmergencyContact] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('General Medicine');
  const [regLicenseNo, setRegLicenseNo] = useState('');
  const [regWard, setRegWard] = useState('General Ward');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [registeredPatientData, setRegisteredPatientData] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Preset demo accounts
  const demoAccounts = [
    {
      role: 'patient' as UserRole,
      label: 'Demo Patient (Ananya)',
      id: 'VL-2026-004812',
      pass: 'Patient@123',
    },
    {
      role: 'doctor' as UserRole,
      label: 'Demo Doctor (Dr. Priya)',
      id: 'dr.priya@vitallink.com',
      pass: 'Doctor@123',
    },
    {
      role: 'nurse' as UserRole,
      label: 'Demo Nurse (Sunita)',
      id: 'nurse.sunita@vitallink.com',
      pass: 'Nurse@123',
    },
    {
      role: 'admin' as UserRole,
      label: 'Demo Admin',
      id: 'admin@vitallink.com',
      pass: 'Admin@123',
    },
  ];

  const handleSelectDemo = (acc: typeof demoAccounts[0]) => {
    setAuthMode('signin');
    setRole(acc.role);
    setIdentifier(acc.id);
    setPassword(acc.pass);
    setError('');
    setSuccessNotice(`Loaded ${acc.label} credentials. Click 'Sign In' to enter.`);
  };

  const handleClearCredentials = () => {
    setIdentifier('');
    setPassword('');
    setError('');
    setSuccessNotice('');
  };

  const handleGuestExplore = async (targetRole: UserRole) => {
    setLoading(true);
    setError('');
    try {
      await guestLogin(targetRole);
      const routeMap: Record<UserRole, string> = {
        admin: '/admin',
        doctor: '/doctor',
        nurse: '/nurse',
        patient: '/patient',
      };
      window.location.href = routeMap[targetRole];
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start guest exploration');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setError('');
    // Notice: Do NOT overwrite what the user has typed!
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    if (!identifier.trim()) {
      setError(role === 'patient' ? 'Please enter your Patient ID or Email' : 'Please enter your Email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const loginResult = await login(identifier.trim(), password, role, rememberMe);
      const targetRole = loginResult.user?.role || role;
      const routeMap: Record<UserRole, string> = {
        admin: '/admin',
        doctor: '/doctor',
        nurse: '/nurse',
        patient: '/patient',
      };
      window.location.href = routeMap[targetRole] || `/${targetRole}`;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your credentials or create an account.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }

    setRegLoading(true);
    try {
      const newUser = await register({
        fullName: regFullName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        phone: regPhone,
        dob: regDob,
        address: regAddress,
        bloodGroup: regBloodGroup,
        allergies: regAllergies,
        emergencyContact: regEmergencyContact,
        emergencyPhone: regEmergencyPhone,
        specialization: regSpecialization,
        licenseNo: regLicenseNo,
        ward: regWard,
      });

      // Pre-fill state with new credentials for seamless access
      const createdIdentifier = newUser.patientCode || regEmail;
      setIdentifier(createdIdentifier);
      setPassword(regPassword);
      setRole(regRole);
      setSuccessNotice(`Account created successfully! Your credentials have been saved.`);

      if (regRole === 'patient') {
        setRegisteredPatientData({
          patientId: newUser.patientCode || 'VL-2026-NEW',
          fullName: newUser.fullName,
          email: newUser.email,
          password: regPassword,
          phone: regPhone,
          bloodGroup: regBloodGroup,
          allergies: regAllergies,
          emergencyContact: regEmergencyContact,
          emergencyPhone: regEmergencyPhone,
        });
      } else {
        const routeMap: Record<UserRole, string> = {
          admin: '/admin',
          doctor: '/doctor',
          nurse: '/nurse',
          patient: '/patient',
        };
        window.location.href = routeMap[regRole];
      }
    } catch (err: any) {
      setRegError(err.response?.data?.error || 'Registration failed. Please check your inputs.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-8 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/25 mb-3">
          <span className="font-black text-3xl leading-none">+</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Vital<span className="text-teal-600 dark:text-teal-400">Link</span> Healthcare
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Open Healthcare Appointment, Consultation &amp; Staff Coordination Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Open Guest Exploration Banner */}
        <div className="mb-4 bg-gradient-to-r from-teal-50 via-sky-50 to-teal-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 p-4 rounded-2xl border border-teal-200/80 dark:border-teal-900/50 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-teal-600" />
              Just Browsing? Instant 1-Click Exploration:
            </span>
            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-teal-200 dark:border-slate-700">
              No typing needed
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleGuestExplore('patient')}
              className="py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 rounded-xl border border-teal-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              Patient View
            </button>
            <button
              type="button"
              onClick={() => handleGuestExplore('doctor')}
              className="py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 rounded-xl border border-teal-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Doctor View
            </button>
            <button
              type="button"
              onClick={() => handleGuestExplore('nurse')}
              className="py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 rounded-xl border border-teal-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <HeartPulse className="w-3.5 h-3.5" />
              Nurse View
            </button>
            <button
              type="button"
              onClick={() => handleGuestExplore('admin')}
              className="py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 rounded-xl border border-teal-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin View
            </button>
          </div>
        </div>

        {/* Primary Auth Container */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Main Auth Tabs: Sign In vs Create Account */}
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className={`py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In (Any Account)
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Create New Account (Open)
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* MODE 1: SIGN IN */}
            {authMode === 'signin' && (
              <div className="space-y-5">
                {/* 1-Click Demo Fill Presets */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Sample Demo Logins (Click to autofill):
                    </span>
                    {(identifier || password) && (
                      <button
                        type="button"
                        onClick={handleClearCredentials}
                        className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                      >
                        Clear Form (Use Custom Account)
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {demoAccounts.map((acc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectDemo(acc)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-all cursor-pointer ${
                          identifier === acc.id
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Success Notice Banner */}
                {successNotice && (
                  <div className="flex items-center justify-between p-3 text-xs text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{successNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSuccessNotice('')}
                      className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Role Selector Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Role Filter / Portal
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Auto-detects registered accounts
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['patient', 'doctor', 'nurse', 'admin'] as UserRole[]).map((r) => {
                      const isSelected = role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRoleChange(r)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {r === 'admin' ? (
                            <Shield className="w-4 h-4 mb-1" />
                          ) : r === 'doctor' ? (
                            <Stethoscope className="w-4 h-4 mb-1" />
                          ) : r === 'nurse' ? (
                            <HeartPulse className="w-4 h-4 mb-1" />
                          ) : (
                            <User className="w-4 h-4 mb-1" />
                          )}
                          <span>{r}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {role === 'patient'
                        ? 'Patient ID (VL-2026-XXXXXX) or Registered Email'
                        : 'Staff Email Address'}
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        {role === 'patient' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      </div>
                      <input
                        type={role === 'patient' ? 'text' : 'email'}
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={role === 'patient' ? 'e.g. VL-2026-004812 or email@example.com' : 'name@vitallink.com'}
                        className="block w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>Remember this browser</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-md shadow-teal-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    {loading ? (
                      <span>Signing in...</span>
                    ) : (
                      <>
                        <span>Sign In as {role.toUpperCase()}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* MODE 2: OPEN REGISTRATION (MAKE YOUR OWN ACCOUNT) */}
            {authMode === 'register' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Create Your Account
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registration is completely open. Register as a patient or hospital staff member.
                  </p>
                </div>

                {/* Role Selector for Registration */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    I am registering as:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['patient', 'doctor', 'nurse', 'admin'] as UserRole[]).map((r) => {
                      const isSelected = regRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRegRole(r)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                            isSelected
                              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {r === 'admin' ? (
                            <Shield className="w-4 h-4 mb-1" />
                          ) : r === 'doctor' ? (
                            <Stethoscope className="w-4 h-4 mb-1" />
                          ) : r === 'nurse' ? (
                            <HeartPulse className="w-4 h-4 mb-1" />
                          ) : (
                            <User className="w-4 h-4 mb-1" />
                          )}
                          <span>{r}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Registration Error */}
                {regError && (
                  <div className="flex items-start gap-2.5 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
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
                        placeholder="John Doe"
                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
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
                        placeholder="john.doe@example.com"
                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* Patient Specific Fields */}
                  {regRole === 'patient' && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
                        <Heart className="w-3.5 h-3.5" />
                        Patient Clinical Information (Auto-Generates Patient ID)
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Blood Group
                          </label>
                          <select
                            value={regBloodGroup}
                            onChange={(e) => setRegBloodGroup(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
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
                            Known Drug / Food Allergies
                          </label>
                          <input
                            type="text"
                            value={regAllergies}
                            onChange={(e) => setRegAllergies(e.target.value)}
                            placeholder="e.g. Penicillin, Sulfa, Peanuts or None"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Emergency Contact Name
                          </label>
                          <input
                            type="text"
                            value={regEmergencyContact}
                            onChange={(e) => setRegEmergencyContact(e.target.value)}
                            placeholder="Spouse / Parent / Guardian"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Emergency Phone
                          </label>
                          <input
                            type="tel"
                            value={regEmergencyPhone}
                            onChange={(e) => setRegEmergencyPhone(e.target.value)}
                            placeholder="+91 ..."
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctor Specific Fields */}
                  {regRole === 'doctor' && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
                        <Stethoscope className="w-3.5 h-3.5" />
                        Doctor Practice Credentials
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Specialization
                          </label>
                          <input
                            type="text"
                            value={regSpecialization}
                            onChange={(e) => setRegSpecialization(e.target.value)}
                            placeholder="e.g. Cardiology, Neurology"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Medical License / Registration No.
                          </label>
                          <input
                            type="text"
                            value={regLicenseNo}
                            onChange={(e) => setRegLicenseNo(e.target.value)}
                            placeholder="e.g. MCI-2026-8910"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nurse Specific Fields */}
                  {regRole === 'nurse' && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
                        <HeartPulse className="w-3.5 h-3.5" />
                        Nursing Unit &amp; Ward
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Ward Assignment
                        </label>
                        <input
                          type="text"
                          value={regWard}
                          onChange={(e) => setRegWard(e.target.value)}
                          placeholder="e.g. ICU Ward 3B or General Outpatient"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    {regLoading ? (
                      <span>Creating Your Account...</span>
                    ) : (
                      <>
                        <span>Complete Registration &amp; Open Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-[10px] text-slate-400 text-center">
          <p>
            🔒 Protected under India DPDP Act and HIPAA healthcare data safety regulations.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} title="Forgot Password Recovery">
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <p>
            For patient accounts, your password was set during registration or provided on your clinic registration slip. If you forgot your password:
          </p>
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono">
            <p><strong>Demo Test Passwords:</strong></p>
            <p>• Admin: <code>Admin@123</code></p>
            <p>• Doctors: <code>Doctor@123</code></p>
            <p>• Nurses: <code>Nurse@123</code></p>
            <p>• Patients: <code>Patient@123</code> (or <code>Temp@123</code>)</p>
          </div>
          <p>
            You can also create a new personal account anytime using the <strong>"Create New Account"</strong> tab!
          </p>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowForgotModal(false)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Registration Success Modal for Patients (shows newly generated Patient ID) */}
      {registeredPatientData && (
        <Modal
          isOpen={!!registeredPatientData}
          onClose={() => {
            window.location.href = '/patient';
          }}
          title="Account Created! Your Official Patient Health ID"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                Your Unique Patient ID
              </span>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-mono font-black text-teal-700 dark:text-teal-400">
                  {registeredPatientData.patientId}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registeredPatientData.patientId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2500);
                  }}
                  className="p-1.5 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors cursor-pointer"
                  title="Copy Patient ID"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                {copiedId ? '✓ Copied to clipboard!' : 'Use this ID or your email address to log in anytime.'}
              </p>
            </div>

            <p>
              Welcome to VitalLink Healthcare! Your account has been registered and initialized with your blood group ({registeredPatientData.bloodGroup}) and medical profile.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Your Login Credentials:</p>
              <p>• <strong>Patient ID:</strong> <code className="text-teal-600 dark:text-teal-400 font-bold">{registeredPatientData.patientId}</code></p>
              <p>• <strong>Email:</strong> {registeredPatientData.email}</p>
              <p className="text-[10px] text-slate-500">Your password was securely saved during sign-up.</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIdentifier(registeredPatientData.patientId);
                  setPassword(registeredPatientData.password || '');
                  setRole('patient');
                  setAuthMode('signin');
                  setSuccessNotice(`Welcome ${registeredPatientData.fullName}! Your new Patient ID is filled in below.`);
                  setRegisteredPatientData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer text-center"
              >
                Sign In with New Credentials
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/patient';
                }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer text-center"
              >
                Go to Patient Dashboard →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
