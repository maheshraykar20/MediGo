import React from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Menu, 
  Smartphone, 
  CheckCircle2, 
  User, 
  Store,
  UserCheck,
  Receipt,
  LogOut,
  Palette
} from 'lucide-react';
import { 
  isNotificationSupported, 
  requestNotificationPermission, 
  sendMedicineExpiryNotification 
} from '../utils/browserNotification';
import { playSuccessSound } from '../utils/notificationSound';

export default function Header({ 
  onOpenAddModal, 
  onOpenExcelModal, 
  onOpenVoucherModal,
  onToggleSidebar, 
  onOpenNotifications,
  onOpenProfileModal,
  onOpenLoginModal,
  onLogout,
  currentUser,
  storeProfile,
  searchQuery, 
  setSearchQuery,
  audioEnabled,
  setAudioEnabled,
  urgentCount,
  tomorrowMedicines,
  activeView,
  lang,
  setLang
}) {
  const isMr = lang === 'mr';
  const [notifPermission, setNotifPermission] = React.useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [showNotifToast, setShowNotifToast] = React.useState(false);

  const handleEnableNotifications = async () => {
    if (!isNotificationSupported()) {
      alert(isMr ? 'तुमचा ब्राऊझर नोटिफिकेशन्स सपोर्ट करत नाही.' : 'Notifications not supported in this browser.');
      return;
    }

    const permission = await requestNotificationPermission();
    setNotifPermission(permission);

    if (permission === 'granted') {
      if (audioEnabled) playSuccessSound();
      setShowNotifToast(true);
      setTimeout(() => setShowNotifToast(false), 4500);

      // Trigger test alert if there's any medicine expiring tomorrow
      if (tomorrowMedicines && tomorrowMedicines.length > 0) {
        sendMedicineExpiryNotification(tomorrowMedicines[0], 'tomorrow', lang);
      } else {
        new Notification(
          isMr ? '✅ MedVault अलर्ट सक्रिय झाले!' : '✅ MedVault Alerts Activated!',
          {
            body: isMr 
              ? 'औषध उद्या expire होणार असल्यास तुम्हाला असाच मोबाईलसारखा अलर्ट मिळेल.'
              : 'You will receive instant alerts when medicines are expiring tomorrow or have expired.',
            icon: 'https://cdn-icons-png.flaticon.com/512/883/883360.png'
          }
        );
      }
    }
  };

  const displayName = storeProfile?.storeName || (isMr ? 'माझे मेडिकल स्टोअर' : 'My Medical Store');

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left Desktop: View Title & Breadcrumb (No duplicated store logo) */}
        <div className="hidden md:flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-heading font-black text-slate-900 leading-tight tracking-tight">
                {activeView === 'dashboard' ? (isMr ? 'डॅशबोर्ड सारांश' : 'Dashboard Overview') :
                 activeView === 'medicines' ? (isMr ? 'सर्व औषधे (इन्व्हेंटरी)' : 'Medicine Stock') :
                 activeView === 'expiry' ? (isMr ? 'Expiry वॉच रडार' : 'Expiry Watch Radar') :
                 activeView === 'vouchers' ? (isMr ? 'व्हाउचर नोंदवही' : 'Voucher Register') :
                 activeView === 'excel' ? (isMr ? 'एक्सेल शीट अपलोड' : 'Excel Import') :
                 activeView === 'analytics' ? (isMr ? 'नुकसान व नफा विश्लेषण' : 'Analytics & Profit') :
                 (isMr ? 'डॅशबोर्ड' : 'Dashboard')}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {isMr ? 'क्लाऊड साठा' : 'Cloud Storage'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {isMr ? 'स्मार्ट मेडिकल इन्व्हेंटरी आणि बिलिंग' : 'Smart Medical Inventory & Billing'}
            </p>
          </div>
        </div>

        {/* Left Mobile: Mobile Menu Toggle & Store Brand */}
        <div className="md:hidden flex items-center gap-1.5 min-w-0">
          <button 
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={onOpenProfileModal} 
            className="flex items-center gap-1.5 cursor-pointer min-w-0"
          >
            {storeProfile?.logoUrl ? (
              <img 
                src={storeProfile.logoUrl} 
                alt="Store Logo" 
                className="w-7 h-7 rounded-xl object-cover border border-teal-500/30 shrink-0" 
              />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <span className="font-serif">Rx</span>
              </div>
            )}
            <h2 className="text-xs font-bold text-slate-900 truncate max-w-[110px] xs:max-w-[140px]">
              {displayName}
            </h2>
          </div>
        </div>

        {/* Center: Global Search (Desktop & Tablet) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isMr ? 'औषधाचे नाव, बॅच, रॅक किंवा घटक शोधा...' : 'Search medicine, batch, salt, rack...'}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions (Clean, Responsive, Mobile Optimized) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Color Theme & Profile Quick Button */}
          <button
            onClick={onOpenProfileModal}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
            title={isMr ? 'कलर थीम व प्रोफाईल सेटिंग्ज' : 'Color Theme & Store Profile'}
          >
            <Palette className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">
              {isMr ? 'थीम' : 'Theme'}
            </span>
          </button>

          {/* Sound Alert Toggle (Hidden on mobile to save space) */}
          <button
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playSuccessSound();
            }}
            className={`hidden sm:flex p-2 rounded-xl border transition ${
              audioEnabled 
                ? 'bg-slate-50 border-slate-200 text-teal-700 hover:bg-teal-50' 
                : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
            title={audioEnabled ? (isMr ? 'आवाज चालू' : 'Audio On') : (isMr ? 'आवाज मूक' : 'Audio Muted')}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Notification Bell with Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 sm:p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            title={isMr ? 'सूचना केंद्र' : 'Notifications'}
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {urgentCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm animate-pulse">
                {urgentCount}
              </span>
            )}
          </button>

          {/* Language Toggle (Default English, Option Marathi) */}
          <button
            onClick={() => setLang(isMr ? 'en' : 'mr')}
            className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-black rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-teal-700 transition"
            title={isMr ? 'Switch to English' : 'मराठीत बदला'}
          >
            <span className="sm:hidden">{isMr ? 'EN' : 'MR'}</span>
            <span className="hidden sm:inline">{isMr ? 'English' : 'मराठी'}</span>
          </button>

          {/* Add Medicine Button (Hidden on mobile because bottom floating button exists) */}
          <button
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-teal-600/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isMr ? 'औषध जोडा' : 'Add Item'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition"
            title={isMr ? 'लॉगआउट करा' : 'Sign Out / Logout'}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden lg:inline">{isMr ? 'लॉगआउट' : 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* Success Banner when notification permission is enabled */}
      {showNotifToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {isMr 
                ? 'अभिनंदन! मोबाईल व ब्राऊझर नोटिफिकेशन्स सक्रिय झाली आहेत. औषध उद्या expire होणार असल्यास लगेच अलर्ट येईल!' 
                : 'Success! Notifications enabled. You will receive immediate alerts for medicines expiring tomorrow!'}
            </span>
          </div>
          <button onClick={() => setShowNotifToast(false)} className="text-white hover:text-emerald-200 font-bold ml-2">×</button>
        </div>
      )}
    </header>
  );
}
