import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 dark:text-white">403 - Access Forbidden</h1>
      <p className="text-xs text-slate-500 max-w-sm">
        You do not have the required role privileges to access this healthcare system endpoint. All unauthorized access attempts are logged for compliance.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
      >
        <Home className="w-4 h-4" />
        Return to My Dashboard
      </a>
    </div>
  );
};
