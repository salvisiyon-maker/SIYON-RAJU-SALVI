import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useLanguage, Language } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import {
  Sun,
  Moon,
  Globe,
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
  CheckCircle,
  Clock,
  Pill,
  Calendar,
  AlertCircle,
  X,
  Compass,
  Shield,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';
import { Badge } from '../common/Badge.tsx';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout, guestLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPortalMenu, setShowPortalMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (portalRef.current && !portalRef.current.contains(e.target as Node)) {
        setShowPortalMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const roleBadgeVariant: Record<string, any> = {
    admin: 'danger',
    doctor: 'primary',
    nurse: 'info',
    patient: 'success',
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-xl leading-none">+</span>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Vital<span className="text-teal-600 dark:text-teal-400">Link</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 -mt-1">
                Healthcare Coordination
              </span>
            </div>
          </a>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Portal Switcher (Open Website Exploration) */}
          <div className="relative" ref={portalRef}>
            <button
              onClick={() => setShowPortalMenu(!showPortalMenu)}
              aria-label="Switch Healthcare Portal"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-teal-200 dark:border-slate-700/60 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400 font-normal">Portal:</span>
              <span className="capitalize font-bold">{user?.role || 'Explore'}</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400">▼</span>
            </button>

            {showPortalMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Portal View
                </div>
                <button
                  onClick={async () => {
                    setShowPortalMenu(false);
                    await guestLogin('patient');
                    window.location.href = '/patient';
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer ${
                    user?.role === 'patient' ? 'font-bold text-teal-600 dark:text-teal-400 bg-teal-50/50' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-teal-600" />
                  <span>Patient Portal {user?.role === 'patient' && '✓'}</span>
                </button>
                <button
                  onClick={async () => {
                    setShowPortalMenu(false);
                    await guestLogin('doctor');
                    window.location.href = '/doctor';
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer ${
                    user?.role === 'doctor' ? 'font-bold text-teal-600 dark:text-teal-400 bg-teal-50/50' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>Doctor Station {user?.role === 'doctor' && '✓'}</span>
                </button>
                <button
                  onClick={async () => {
                    setShowPortalMenu(false);
                    await guestLogin('nurse');
                    window.location.href = '/nurse';
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer ${
                    user?.role === 'nurse' ? 'font-bold text-teal-600 dark:text-teal-400 bg-teal-50/50' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <HeartPulse className="w-4 h-4 text-teal-600" />
                  <span>Nurse Station {user?.role === 'nurse' && '✓'}</span>
                </button>
                <button
                  onClick={async () => {
                    setShowPortalMenu(false);
                    await guestLogin('admin');
                    window.location.href = '/admin';
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer ${
                    user?.role === 'admin' ? 'font-bold text-teal-600 dark:text-teal-400 bg-teal-50/50' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>Admin Operations {user?.role === 'admin' && '✓'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-label="Select Language"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/60"
            >
              <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="uppercase">{language}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setLanguage('en');
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center justify-between ${
                    language === 'en' ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  English {language === 'en' && '✓'}
                </button>
                <button
                  onClick={() => {
                    setLanguage('hi');
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center justify-between ${
                    language === 'hi' ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  हिन्दी (Hindi) {language === 'hi' && '✓'}
                </button>
                <button
                  onClick={() => {
                    setLanguage('mr');
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center justify-between ${
                    language === 'mr' ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  मराठी (Marathi) {language === 'mr' && '✓'}
                </button>
              </div>
            )}
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* In-app Notification Bell */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
                className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-3 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('notifications')}
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
                      >
                        {t('markAllRead')}
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        {t('noNotifications')}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${
                            !n.is_read ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 shrink-0 text-teal-600 dark:text-teal-400">
                              {n.type === 'prescription' ? (
                                <Pill className="w-4 h-4" />
                              ) : n.type === 'appointment' ? (
                                <Calendar className="w-4 h-4" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-slate-900 dark:text-white ${!n.is_read ? 'font-bold' : ''}`}>
                                {n.title}
                              </p>
                              <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!n.is_read && (
                              <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Menu */}
          {user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700/60"
              >
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {user.role} {user.patientCode ? `(${user.patientCode})` : ''}
                  </p>
                </div>
                <img
                  src={
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`
                  }
                  alt={user.fullName}
                  className="w-8 h-8 rounded-lg object-cover border border-teal-500/30"
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1">
                      <Badge variant={roleBadgeVariant[user.role] || 'neutral'} size="sm">
                        {t(user.role)}
                      </Badge>
                    </div>
                  </div>

                  <a
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    {t('profile')}
                  </a>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-medium text-left border-t border-slate-100 dark:border-slate-700/60 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/login"
              className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs transition-colors"
            >
              {t('login')}
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
