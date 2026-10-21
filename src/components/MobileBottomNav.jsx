import React from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  AlertTriangle, 
  Receipt, 
  Plus,
  ScanLine
} from 'lucide-react';

export default function MobileBottomNav({ 
  activeView, 
  setActiveView, 
  onOpenAddModal, 
  onOpenScannerModal,
  tomorrowCount, 
  expiredCount, 
  lang 
}) {
  const isMr = lang === 'mr';
  const urgentCount = tomorrowCount + expiredCount;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl px-2 py-1.5 safe-area-bottom">
      <div className="flex items-center justify-around">
        {/* Dashboard */}
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeView === 'dashboard' ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">
            {isMr ? 'डॅशबोर्ड' : 'Dashboard'}
          </span>
        </button>

        {/* Medicines Stock */}
        <button
          onClick={() => setActiveView('medicines')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeView === 'medicines' ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">
            {isMr ? 'औषध साठा' : 'Stock'}
          </span>
        </button>

        {/* Center Floating Actions: Scan & Add */}
        <div className="-mt-5 flex items-center gap-1.5">
          {onOpenScannerModal && (
            <button
              onClick={onOpenScannerModal}
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 hover:scale-105 active:scale-95 transition cursor-pointer"
              aria-label={isMr ? 'औषध बारकोड स्कॅन करा' : 'Scan medicine barcode'}
              title={isMr ? 'बारकोड / QR स्कॅनर' : 'Barcode / QR Scanner'}
            >
              <ScanLine className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/40 hover:scale-105 active:scale-95 transition cursor-pointer"
            aria-label={isMr ? 'नवीन औषध जोडा' : 'Add custom medicine'}
            title={isMr ? 'नवीन औषध जोडा' : 'Add custom medicine'}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Vouchers Register */}
        <button
          onClick={() => setActiveView('vouchers')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeView === 'vouchers' ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">
            {isMr ? 'व्हाउचर' : 'Vouchers'}
          </span>
        </button>

        {/* Expiry Watch Radar */}
        <button
          onClick={() => setActiveView('expiry')}
          className={`relative flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeView === 'expiry' ? 'text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          {urgentCount > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {urgentCount}
            </span>
          )}
          <span className="text-[10px] mt-0.5">
            {isMr ? 'Expiry रडार' : 'Radar'}
          </span>
        </button>
      </div>
    </div>
  );
}
