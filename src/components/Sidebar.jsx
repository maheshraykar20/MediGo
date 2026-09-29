import React from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  AlertOctagon, 
  FileSpreadsheet, 
  Receipt,
  BarChart3, 
  Store, 
  X,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Settings,
  LogOut,
  UserCheck,
  Sparkles,
  Database
} from 'lucide-react';

export default function Sidebar({ 
  activeView, 
  setActiveView, 
  isOpen, 
  onClose,
  onOpenProfileModal,
  onOpenLoginModal,
  onOpenAdminPortal,
  onLogout,
  currentUser,
  storeProfile,
  totalMedicines,
  tomorrowCount,
  expiredCount,
  critical7Count,
  vouchersCount = 0,
  onResetData,
  lang = 'mr' 
}) {
  const isMr = lang === 'mr';

  const navItems = [
    {
      id: 'dashboard',
      label: isMr ? 'डॅशबोर्ड सारांश' : 'Dashboard Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'medicines',
      label: isMr ? 'सर्व औषधे (इन्व्हेंटरी)' : 'All Medicines Stock',
      icon: Pill,
      badge: totalMedicines,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'expiry',
      label: isMr ? 'Expiry वॉच रडार' : 'Expiry Watch Radar',
      icon: AlertOctagon,
      badge: tomorrowCount + expiredCount > 0 ? `${tomorrowCount + expiredCount}` : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      isHot: true,
    },
    {
      id: 'vouchers',
      label: isMr ? 'व्हाउचर नोंदवही (Vouchers)' : 'Voucher Register (Bills)',
      icon: Receipt,
      badge: vouchersCount > 0 ? `${vouchersCount}` : (isMr ? 'नवीन' : 'New'),
      badgeColor: 'bg-teal-100 text-teal-800 font-bold',
    },
    {
      id: 'excel',
      label: isMr ? 'एक्सेल शीट अपलोड' : 'Excel Sheet Upload',
      icon: FileSpreadsheet,
      badge: isMr ? 'जलद' : 'Quick',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'analytics',
      label: isMr ? 'नुकसान व नफा विश्लेषण' : 'Loss & Risk Analytics',
      icon: BarChart3,
      badge: null,
    },
  ];

  const displayName = storeProfile?.storeName || (isMr ? 'माझे मेडिकल स्टोअर' : 'My Medical Store');
  const licenseText = storeProfile?.drugLicense20B 
    ? `DL: ${storeProfile.drugLicense20B}` 
    : (isMr ? 'ड्रग्ज लायसन्स नोंदवा' : 'Add Drug License');

  const content = (
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-slate-200/90 shadow-sm">
      {/* Sidebar Header with Profile trigger */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div 
          onClick={onOpenProfileModal}
          className="flex items-center gap-3 cursor-pointer group flex-1 mr-2"
          title={isMr ? 'स्टोअर प्रोफाईल बदला' : 'Edit Store Profile'}
        >
          {storeProfile?.logoUrl ? (
            <img 
              src={storeProfile.logoUrl} 
              alt="Logo" 
              className="w-10 h-10 rounded-2xl object-cover border border-teal-500/40 shrink-0 group-hover:scale-105 transition shadow-xs" 
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition shadow-md shadow-teal-500/20">
              <span className="font-serif">Rx</span>
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate group-hover:text-teal-700 transition">
              {displayName}
            </h2>
            <p className="text-[11px] text-teal-700 font-mono truncate font-medium">
              {licenseText}
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Current Active User Multi-Tenant Badge */}
      <div className="px-3 pt-3">
        <div className="p-2.5 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
              {storeProfile?.ownerName ? storeProfile.ownerName.charAt(0).toUpperCase() : (currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U')}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-teal-950 truncate text-[11px]">
                {storeProfile?.ownerName || currentUser?.name || (isMr ? 'स्टोअर मालक' : 'Store Owner')}
              </div>
              <div className="text-[10px] text-teal-700 font-medium">
                {isMr ? 'सक्रिय सुरक्षित खाते' : 'Secure Active Account'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenLoginModal}
              className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-100 hover:text-teal-900 transition"
              title={isMr ? 'युजर बदला (Switch User)' : 'Switch User'}
            >
              <UserCheck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
              title={isMr ? 'लॉगआउट करा' : 'Sign Out / Logout'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expiry Quick Status Widget */}
      <div className="p-3 mx-3 my-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs">
        <div className="flex items-center justify-between font-bold text-slate-700 mb-2">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            {isMr ? 'मुदत स्थिती रडार' : 'Expiry Radar Live'}
          </span>
          <span className="text-[10px] text-teal-600 font-mono font-bold">ACTIVE</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="p-1.5 rounded-xl bg-rose-50 border border-rose-200">
            <div className="text-xs font-black text-rose-700">{expiredCount}</div>
            <div className="text-[9px] text-rose-600 font-medium">{isMr ? 'कालबाह्य' : 'Expired'}</div>
          </div>
          <div className="p-1.5 rounded-xl bg-orange-50 border border-orange-200">
            <div className="text-xs font-black text-orange-700">{tomorrowCount}</div>
            <div className="text-[9px] text-orange-600 font-medium">{isMr ? 'उद्या' : 'Tomorrow'}</div>
          </div>
          <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-200">
            <div className="text-xs font-black text-amber-700">{critical7Count}</div>
            <div className="text-[9px] text-amber-600 font-medium">{isMr ? '७ दिवस' : '7 Days'}</div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.isHot ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Profile Nav item */}
        <button
          onClick={() => {
            onOpenProfileModal();
            if (onClose) onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>{isMr ? 'स्टोअर प्रोफाईल व लोगो' : 'Store Profile & Logo'}</span>
          </div>
        </button>
      </nav>

      {/* Footer Info & Multi-User Switch */}
      <div className="p-4 border-t border-slate-100 space-y-2.5 bg-slate-50/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isMr ? 'बदला' : 'Switch'}</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 font-bold text-rose-600 hover:text-rose-800 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isMr ? 'लॉगआउट' : 'Logout'}</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (window.confirm(isMr ? 'सर्व औषधे व व्हाउचर डेटा पूर्णपणे रीसेट (रिकामे) करायचा आहे का?' : 'Clear and reset all inventory & voucher data to blank?')) {
                onResetData();
              }
            }}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 transition"
            title={isMr ? 'सर्व डेटा रीसेट करा' : 'Clear all data to blank'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isMr ? 'रीसेट' : 'Reset'}</span>
          </button>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-500">
          <span className="text-slate-800 font-bold">{isMr ? 'सुरक्षा:' : 'Privacy:'}</span>{' '}
          {isMr ? 'हा डेटा फक्त तुमच्या खात्यासाठी सुरक्षित आहे.' : 'Data is strictly isolated to your private store account.'}
        </div>

        {/* Discreet Super Admin Key (For owner / developer only) */}
        <div className="pt-0.5 flex items-center justify-between text-[10px] text-slate-400">
          <span>MedVault Enterprise</span>
          <button
            onClick={() => {
              if (onOpenAdminPortal) onOpenAdminPortal();
              else window.open('/admin.html', '_blank');
            }}
            className="text-slate-400 hover:text-slate-700 font-mono text-[10px] flex items-center gap-1 transition"
            title="Super Admin DB Portal"
          >
            <ShieldCheck className="w-3 h-3 text-slate-400" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col fixed inset-y-0 left-0 z-40">
        {content}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
