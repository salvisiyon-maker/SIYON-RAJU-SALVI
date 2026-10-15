import React from 'react';
import { AlertOctagon, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 dark:text-white">404 - Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm">
        The requested medical portal path does not exist or has been relocated.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
      >
        <Home className="w-4 h-4" />
        Return to Portal
      </a>
    </div>
  );
};
