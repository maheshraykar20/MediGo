import React from 'react';
import { LogOut, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function LogoutConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  currentUser,
  lang = 'mr' 
}) {
  if (!isOpen) return null;
  const isMr = lang === 'mr';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 z-10 overflow-hidden my-auto p-6 sm:p-7 text-center space-y-5">
        {/* Close button top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Alert Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border-2 border-rose-200/80 text-rose-600 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/10">
          <LogOut className="w-8 h-8 stroke-[2.2] translate-x-0.5" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-heading font-black text-slate-900 tracking-tight">
            {isMr ? 'लॉगआउट करायचे आहे का?' : 'Confirm Logout?'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            {isMr 
              ? 'तुम्हाला खरोखर तुमच्या मेडिकल स्टोअर खात्यातून बाहेर पडायचे आहे का? तुमचा सर्व औषध साठा व डेटा सुरक्षित आहे.'
              : 'Are you sure you want to sign out of your medical store? All your medicines, stock, and vouchers remain completely safe.'}
          </p>
        </div>

        {/* Safety Note Badge */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-center gap-2 text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isMr 
              ? 'तुमचा डेटा क्लाऊडमध्ये सुरक्षित राहील. तुम्ही पुन्हा याच नंबरने लॉगिन करू शकता.' 
              : 'Your data is auto-saved. You can log back in anytime using your mobile number.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition"
          >
            {isMr ? 'रद्द करा (Cancel)' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-2xl shadow-md shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{isMr ? 'होय, बाहेर पडा' : 'Yes, Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
