import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  ShieldCheck, 
  Bell, 
  Search, 
  RefreshCw, 
  Download, 
  Edit3, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Save, 
  Lock, 
  Unlock, 
  ArrowLeft, 
  Store, 
  Phone, 
  Calendar, 
  FileText, 
  Pill, 
  Receipt, 
  Activity, 
  Volume2, 
  VolumeX,
  ExternalLink,
  Layers,
  Sparkles,
  Globe,
  Archive
} from 'lucide-react';
import { 
  apiAdminGetNotifications, 
  apiAdminMarkNotificationRead, 
  apiAdminClearNotifications, 
  apiAdminGetTenants, 
  apiAdminGetTenantData, 
  apiAdminSaveMedicine, 
  apiAdminDeleteMedicine, 
  apiAdminSaveVoucher, 
  apiAdminDeleteVoucher, 
  apiAdminSaveProfile, 
  apiAdminDeleteTenant,
  getAdminSqliteDownloadUrl
} from '../utils/apiService';
import { playSuccessSound, playUrgentAlertSound } from '../utils/notificationSound';

// Master Admin Security PIN (Default: 7777)
const ADMIN_MASTER_PIN = '7777';
const ADMIN_AUTH_KEY = 'medvault_admin_auth_token_v1';
const ADMIN_LANG_KEY = 'medvault_admin_lang_v1';

export default function AdminPortal({ onBackToDashboard }) {
  // Language State: 'mr' (मराठी) or 'en' (English)
  const [lang, setLang] = useState(() => {
    return localStorage.getItem(ADMIN_LANG_KEY) || 'en';
  });
  const isMr = lang === 'mr';

  const toggleLanguage = () => {
    const nextLang = lang === 'mr' ? 'en' : 'mr';
    setLang(nextLang);
    localStorage.setItem(ADMIN_LANG_KEY, nextLang);
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Main Admin Data States
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenantData, setTenantData] = useState(null);

  // Tabs: Separated into sidebar navigation and right detail pane tabs
  const [sidebarTab, setSidebarTab] = useState('tenants'); // 'tenants' | 'notifications'
  const [detailTab, setDetailTab] = useState('medicines'); // 'medicines' | 'vouchers' | 'profile' | 'audit'

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [latestToast, setLatestToast] = useState(null);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all', 'unread', 'medicines', 'vouchers'
  const prevCountRef = useRef(0);

  // Editing Modals State
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // 1. PIN Authentication Handler
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_MASTER_PIN) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setPinError('');
      playSuccessSound();
    } else {
      setPinError(isMr ? 'चुकीचा Master PIN! योग्य ॲडमिन पिन टाका (Default: 7777)' : 'Incorrect Master PIN! (Default: 7777)');
      playUrgentAlertSound();
    }
  };

  const handleLogoutAdmin = () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(false);
    setPinInput('');
  };

  // 2. Fetch Notifications Function
  const fetchNotifications = async () => {
    try {
      const data = await apiAdminGetNotifications(100);
      if (data && data.success) {
        setNotifications(data.notifications || []);
        const unread = data.unreadCount || 0;
        setUnreadCount(unread);

        // Play chime and show toast if new notification arrived
        if (data.notifications && data.notifications.length > prevCountRef.current && prevCountRef.current !== 0) {
          const newest = data.notifications[0];
          setLatestToast(newest);
          if (audioAlerts) playUrgentAlertSound();
          setTimeout(() => setLatestToast(null), 6000);
        }
        prevCountRef.current = data.notifications ? data.notifications.length : 0;
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications:', err);
    }
  };

  // 3. Fetch Tenants List
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await apiAdminGetTenants();
      if (data && data.success) {
        setTenants(data.databases || []);
        // Automatically select first tenant on desktop view if none selected
        if (!selectedTenantId && data.databases && data.databases.length > 0) {
          if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setSelectedTenantId(data.databases[0].userId);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch Selected Tenant Full Data (Medicines, Vouchers, Profile, Audit)
  const fetchTenantData = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await apiAdminGetTenantData(userId);
      if (data && data.success) {
        setTenantData(data);
      }
    } catch (err) {
      console.warn('Failed to fetch tenant data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load and Polling when Authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchTenants();
    fetchNotifications();

    // 2.5 second live polling for instant notifications AND stores
    const pollInterval = setInterval(() => {
      fetchNotifications();
      fetchTenants();
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [isAuthenticated]);

  // Load tenant data when selectedTenantId changes
  useEffect(() => {
    if (isAuthenticated && selectedTenantId) {
      fetchTenantData(selectedTenantId);
    }
  }, [selectedTenantId, isAuthenticated]);

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    try {
      await apiAdminMarkNotificationRead('all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: 1 })));
      setUnreadCount(0);
      playSuccessSound();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Clear Notifications
  const handleClearNotifications = async () => {
    const confirmMsg = isMr ? 'सर्व ॲडमिन सूचना हटवायच्या आहेत का?' : 'Clear all admin notifications?';
    if (!window.confirm(confirmMsg)) return;
    try {
      await apiAdminClearNotifications();
      setNotifications([]);
      setUnreadCount(0);
      playSuccessSound();
    } catch (err) {
      console.error(err);
    }
  };

  // Inspect Tenant from Notification Click (DYNAMIC & FAST)
  const handleInspectFromNotification = (notif) => {
    if (!notif) return;
    const targetUserId = notif.userId || notif.user_id || (notif.user_phone ? `usr_${notif.user_phone}` : null) || (notif.phone ? `usr_${notif.phone}` : null);
    if (targetUserId) {
      setSelectedTenantId(targetUserId);
      setSidebarTab('tenants');
      fetchTenantData(targetUserId);
      fetchTenants();
      
      const actionType = notif.actionType || notif.action_type || '';
      if (actionType.includes('VOUCHER')) {
        setDetailTab('vouchers');
      } else if (actionType.includes('PROFILE')) {
        setDetailTab('profile');
      } else {
        setDetailTab('medicines');
      }

      // Mark notification as read
      if (notif.id) {
        apiAdminMarkNotificationRead(notif.id).catch(() => {});
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  // Medicine Save / Edit
  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    if (!selectedTenantId || !editingMedicine) return;

    try {
      await apiAdminSaveMedicine(selectedTenantId, editingMedicine);
      setIsMedicineModalOpen(false);
      setEditingMedicine(null);
      setActionSuccessMsg(isMr ? 'औषध माहिती SQLite डेटाबेसमध्ये जतन झाली!' : 'Medicine saved into SQLite database!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      fetchTenantData(selectedTenantId);
      fetchTenants();
      playSuccessSound();
    } catch (err) {
      alert((isMr ? 'त्रुटी: ' : 'Error: ') + err.message);
    }
  };

  // Medicine Delete
  const handleDeleteMedicine = async (medId, medName) => {
    const confirmMsg = isMr 
      ? `खरोखर औषध "${medName}" या युजरच्या डेटाबेसमधून हटवायचे आहे का?` 
      : `Are you sure you want to delete "${medName}" from this tenant database?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await apiAdminDeleteMedicine(selectedTenantId, medId);
      setActionSuccessMsg(isMr ? `औषध "${medName}" हटवले गेले.` : `Medicine "${medName}" deleted.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      fetchTenantData(selectedTenantId);
      fetchTenants();
      playSuccessSound();
    } catch (err) {
      alert((isMr ? 'त्रुटी: ' : 'Error: ') + err.message);
    }
  };

  // Voucher Delete
  const handleDeleteVoucher = async (vchId, vchNo) => {
    const confirmMsg = isMr ? `खरोखर व्हाउचर "${vchNo}" हटवायचे आहे का?` : `Are you sure you want to delete voucher "${vchNo}"?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await apiAdminDeleteVoucher(selectedTenantId, vchId);
      setActionSuccessMsg(isMr ? `व्हाउचर "${vchNo}" हटवले गेले.` : `Voucher "${vchNo}" deleted.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      fetchTenantData(selectedTenantId);
      fetchTenants();
      playSuccessSound();
    } catch (err) {
      alert((isMr ? 'त्रुटी: ' : 'Error: ') + err.message);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedTenantId || !editingProfile) return;

    try {
      await apiAdminSaveProfile(selectedTenantId, editingProfile);
      setIsProfileModalOpen(false);
      setActionSuccessMsg(isMr ? 'स्टोअर प्रोफाईल अद्ययावत केले!' : 'Store profile updated successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      fetchTenantData(selectedTenantId);
      fetchTenants();
      playSuccessSound();
    } catch (err) {
      alert((isMr ? 'त्रुटी: ' : 'Error: ') + err.message);
    }
  };

  // Delete Tenant Store
  const handleDeleteTenant = async (tenant) => {
    const storeLabel = tenant.storeName ? `"${tenant.storeName}" (${tenant.phone})` : tenant.phone;
    const confirmMsg = isMr 
      ? `सावधान! हे स्टोअर ${storeLabel} आणि त्यांचा संपूर्ण डेटा कायमस्वरूपी नष्ट होईल. तुम्हाला हे स्टोअर नक्की डिलीट करायचे आहे का?` 
      : `CAUTION! Store ${storeLabel} and its entire database will be permanently deleted. Are you sure you want to delete this store?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await apiAdminDeleteTenant(tenant.userId);
      alert(isMr ? 'स्टोअर यशस्वीरित्या हटवले गेले.' : 'Store database permanently removed.');
      fetchTenants();
      setSelectedTenantId(null);
      setTenantData(null);
    } catch (err) {
      alert((isMr ? 'त्रुटी: ' : 'Error: ') + err.message);
    }
  };

  // -------------------------------------------------------------
  // RENDER 1: PIN AUTHENTICATION SCREEN (Bright & Professional)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-600 selection:text-white font-sans relative">
        {/* Language switch on PIN screen */}
        <div className="absolute top-5 right-5">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-indigo-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isMr ? 'English' : 'मराठी'}</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 space-y-6 text-slate-800">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">
              MedVault Super Admin
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isMr ? 'सुरक्षित डेटाबेस मॅनेजमेंट व थेट नियंत्रण पोर्टल' : 'Secure Database Management & Direct Control Portal'}
            </p>
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-medium">{isMr ? 'हा भाग फक्त मुख्य मालक (Super Admin) साठी राखीव आहे.' : 'Restricted access: Super Admin only.'}</span>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {isMr ? 'मास्टर ॲडमिन PIN (Master PIN)' : 'Master Admin PIN'}
              </label>
              <input 
                type="password" 
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder={isMr ? 'उदा. 7777' : 'e.g. 7777'}
                autoFocus
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-center text-xl tracking-widest text-indigo-700 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition shadow-inner"
              />
              {pinError && (
                <p className="text-xs font-bold text-rose-600 mt-2 text-center animate-fadeIn">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{isMr ? 'डेटाबेस ॲडमिन पोर्टल उघडा' : 'Unlock Database Admin Portal'}</span>
            </button>
          </form>

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isMr ? 'स्टोअर डॅशबोर्डवर परत जा' : 'Back to Store Dashboard'}</span>
            </button>
          )}

          <div className="text-center text-[11px] text-slate-400 font-mono">
            {isMr ? (
              <>टीप: चाचणीसाठी डीफॉल्ट पिन <span className="text-indigo-600 font-bold">7777</span> आहे.</>
            ) : (
              <>Note: Default PIN for testing is <span className="text-indigo-600 font-bold">7777</span>.</>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'unread') return !n.isRead;
    const act = n.actionType || n.action_type || '';
    if (notifFilter === 'medicines') return act.includes('MEDICINE');
    if (notifFilter === 'vouchers') return act.includes('VOUCHER');
    return true;
  });

  // Filtered Tenants
  const filteredTenants = tenants.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.storeName && t.storeName.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q)) ||
      (t.name && t.name.toLowerCase().includes(q))
    );
  });

  const activeTenant = selectedTenantId
    ? (tenants.find(t => t.userId === selectedTenantId)
      || (tenantData?.user ? {
          userId: selectedTenantId || tenantData.user.id,
          phone: tenantData.user.phone || (selectedTenantId ? selectedTenantId.replace(/[^0-9]/g, '').slice(-10) : ''),
          name: tenantData.profile?.ownerName || tenantData.user.name || 'Store Owner',
          storeName: tenantData.profile?.storeName || tenantData.user.store_name || `Medical Store (${tenantData.user.phone || ''})`,
          dbFile: `store_${tenantData.user.phone || ''}.sqlite`,
          fileSizeFormatted: 'SQLite DB',
          medicinesCount: tenantData.medicines?.length || 0
        } : null))
    : null;

  // -------------------------------------------------------------
  // RENDER 2: SUPER ADMIN DASHBOARD (BRIGHT & PROFESSIONAL THEME)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Toast Popup on Real-time User Action */}
      {latestToast && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-white border-2 border-indigo-500 rounded-2xl p-4 shadow-2xl shadow-indigo-500/15 animate-bounce duration-300 flex items-start gap-3 text-slate-900">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 font-mono">
                {isMr ? 'नवीन युजर नोंद!' : 'New User Action!'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{isMr ? 'आत्ताच' : 'Just now'}</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">{latestToast.title}</h4>
            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{latestToast.description}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => handleInspectFromNotification(latestToast)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition cursor-pointer shadow-xs"
              >
                {isMr ? 'थेट तपासा' : 'Inspect Store'}
              </button>
              <button
                onClick={() => setLatestToast(null)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer font-medium"
              >
                {isMr ? 'बंद करा' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Bright Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 font-heading truncate">
                MedVault Admin
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[10px] font-bold shrink-0">
                MASTER CONTROLLER
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
              {isMr ? 'स्वतंत्र SQLite डेटाबेस • थेट नियंत्रण' : 'Isolated SQLite Database • Direct Control'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Switcher Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer"
            title={isMr ? 'Switch to English' : 'मराठीत बदला'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isMr ? 'English' : 'मराठी'}</span>
          </button>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setAudioAlerts(!audioAlerts)}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer ${
              audioAlerts 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={audioAlerts ? (isMr ? 'लाईव्ह ऑडिओ अलर्ट चालू' : 'Audio Alerts ON') : (isMr ? 'ऑडिओ अलर्ट बंद' : 'Audio Alerts OFF')}
          >
            {audioAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchTenants();
              fetchNotifications();
              if (selectedTenantId) fetchTenantData(selectedTenantId);
              playSuccessSound();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition cursor-pointer"
            title={isMr ? 'रिफ्रेश करा' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Back to regular dashboard button */}
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title={isMr ? 'स्टोअर डॅशबोर्ड' : 'Store Dashboard'}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isMr ? 'स्टोअर' : 'Store'}</span>
            </button>
          )}

          {/* Logout Admin */}
          <button
            onClick={handleLogoutAdmin}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
            title={isMr ? 'लॉगआउट' : 'Logout'}
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isMr ? 'लॉगआउट' : 'Logout'}</span>
          </button>
        </div>
      </header>

      {/* Success Notification Bar */}
      {actionSuccessMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="font-bold text-sm cursor-pointer">×</button>
        </div>
      )}

      {/* Main Admin Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: TENANT STORES & LIVE NOTIFICATIONS */}
        <aside className={`w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col shrink-0 ${selectedTenantId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Top Sub-tabs: All Stores vs Notifications */}
          <div className="p-3 border-b border-slate-200 flex gap-2 bg-slate-50/50">
            <button
              onClick={() => setSidebarTab('tenants')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                sidebarTab === 'tenants'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{isMr ? `सर्व स्टोअर्स (${tenants.length})` : `All Stores (${tenants.length})`}</span>
            </button>

            <button
              onClick={() => setSidebarTab('notifications')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                sidebarTab === 'notifications'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isMr ? 'सूचना' : 'Notifs'}</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black leading-none animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Sub-Panel 1: ALL STORES LIST */}
          {sidebarTab === 'tenants' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search input */}
              <div className="p-3 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isMr ? 'स्टोअरचे नाव किंवा फोन शोधा...' : 'Search store name or phone...'}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tenants list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[450px] lg:max-h-none">
                {filteredTenants.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {isMr ? 'कोणतेही स्टोअर सापडले नाही.' : 'No stores registered yet.'}
                  </div>
                ) : (
                  filteredTenants.map((t) => {
                    const isSelected = selectedTenantId === t.userId;
                    return (
                      <div
                        key={t.userId}
                        onClick={() => {
                          setSelectedTenantId(t.userId);
                          setTenantData(null);
                          setDetailTab('medicines');
                          fetchTenantData(t.userId);
                        }}
                        className={`p-3 rounded-2xl border transition cursor-pointer text-left ${
                          isSelected 
                            ? 'bg-indigo-50/70 border-2 border-indigo-600 text-slate-900 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate max-w-[170px]" title={t.storeName}>
                            {t.storeName}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold border border-slate-200">
                            {t.fileSizeFormatted}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono text-slate-700 font-semibold">+91 {t.phone}</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                            {t.medicinesCount} {isMr ? 'औषधे' : 'Items'}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="font-mono text-slate-400 truncate max-w-[130px]" title={t.dbFile}>
                            {t.dbFile}
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={getAdminSqliteDownloadUrl(t.dbFile)}
                              download={t.dbFile}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-bold"
                              title={isMr ? 'SQLite फाईल डाऊनलोड करा' : 'Download SQLite file'}
                            >
                              <Download className="w-3 h-3" />
                              <span>DB</span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTenant(t);
                              }}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title={isMr ? 'स्टोअर हटवा' : 'Delete store'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Sub-Panel 2: LIVE NOTIFICATIONS LIST */}
          {sidebarTab === 'notifications' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Notification Filters */}
              <div className="p-2.5 border-b border-slate-200 flex items-center justify-between text-xs bg-slate-50/50">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      notifFilter === 'all' 
                        ? 'bg-slate-200 text-slate-900 font-extrabold' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {isMr ? `सर्व (${notifications.length})` : `All (${notifications.length})`}
                  </button>
                  <button
                    onClick={() => setNotifFilter('unread')}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      notifFilter === 'unread' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {isMr ? `न वाचलेले (${unreadCount})` : `Unread (${unreadCount})`}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold cursor-pointer"
                  >
                    {isMr ? 'सर्व वाचले' : 'Mark Read'}
                  </button>
                  <button
                    onClick={handleClearNotifications}
                    className="text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer font-medium"
                  >
                    {isMr ? 'साफ करा' : 'Clear'}
                  </button>
                </div>
              </div>

              {/* Notifications Stream */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[450px] lg:max-h-none">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {isMr 
                      ? 'कोणतीही नवीन सूचना नाही. युजरने नोंद करताच येथे दिसेल.' 
                      : 'No notifications. Real-time updates appear here.'}
                  </div>
                ) : (
                  filteredNotifications.map((n) => {
                    const isUnread = !n.isRead && n.is_read !== 1;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleInspectFromNotification(n)}
                        className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                          isUnread
                            ? 'bg-gradient-to-br from-indigo-50/90 to-blue-50/50 border-2 border-indigo-400/90 shadow-xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-indigo-700 truncate max-w-[150px]">
                            {n.store_name || n.storeName || n.user_name || 'Store'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(n.created_at || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 mt-1">{n.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                          {n.description}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/80 pt-1.5">
                          <span className="font-mono font-semibold">+91 {n.user_phone || n.userPhone}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectFromNotification(n);
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isMr ? 'डेटाबेस उघडा →' : 'Open DB →'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: SELECTED TENANT LIVE DATABASE EXPLORER & EDITOR */}
        <main className={`flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50 ${!selectedTenantId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Mobile Back Button to Store List */}
          {selectedTenantId && (
            <button
              onClick={() => {
                setSelectedTenantId(null);
                setTenantData(null);
              }}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition border border-indigo-200 self-start cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isMr ? '← सर्व स्टोअर्सची यादी' : '← Back to All Stores'}</span>
            </button>
          )}

          {activeTenant ? (
            <>
              {/* Tenant Header Banner */}
              <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-indigo-500/20 shrink-0">
                    {activeTenant.storeName ? activeTenant.storeName.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {activeTenant.storeName}
                      </h2>
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[10px] font-mono font-bold">
                        ISOLATED SQLITE
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-mono text-slate-800 font-bold">+91 {activeTenant.phone}</span>
                      </span>
                      <span>
                        {isMr ? 'मालक:' : 'Owner:'} <b className="text-slate-800">{activeTenant.name || 'Pharmacist'}</b>
                      </span>
                      <span className="font-mono text-slate-500">
                        {isMr ? 'फाईल:' : 'File:'} {activeTenant.dbFile} ({activeTenant.fileSizeFormatted})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Download raw .sqlite database file */}
                  <a
                    href={getAdminSqliteDownloadUrl(activeTenant.dbFile)}
                    download={activeTenant.dbFile}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    title={isMr ? 'या युजरची संपूर्ण .sqlite फाईल डाऊनलोड करा' : 'Download raw .sqlite database file'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isMr ? 'डाऊनलोड .sqlite' : 'Download .sqlite'}</span>
                  </a>

                  {/* Edit Store Profile */}
                  <button
                    onClick={() => {
                      setEditingProfile(tenantData?.profile || {
                        storeName: activeTenant.storeName,
                        ownerName: activeTenant.name,
                        phone: activeTenant.phone,
                        drugLicense20B: '',
                        drugLicense21B: '',
                        gstin: '',
                        address: '',
                        email: ''
                      });
                      setIsProfileModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isMr ? 'प्रोफाईल संपादित करा' : 'Edit Profile'}</span>
                  </button>

                  {/* Delete Tenant */}
                  <button
                    onClick={() => handleDeleteTenant(activeTenant)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    title={isMr ? 'हे स्टोअर पूर्णपणे हटवा' : 'Delete store database'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isMr ? 'स्टोअर हटवा' : 'Delete Store'}</span>
                  </button>
                </div>
              </div>

              {/* Data Table Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                  onClick={() => setDetailTab('medicines')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    detailTab === 'medicines'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Pill className="w-4 h-4" />
                  <span>{isMr ? `औषध साठा / प्रॉडक्ट्स (${tenantData?.medicines?.length || 0})` : `Products List (${tenantData?.medicines?.length || 0})`}</span>
                </button>

                <button
                  onClick={() => setDetailTab('vouchers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    detailTab === 'vouchers'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>{isMr ? `व्हाउचर्स व बिले (${tenantData?.vouchers?.length || 0})` : `Vouchers & Invoices (${tenantData?.vouchers?.length || 0})`}</span>
                </button>

                <button
                  onClick={() => setDetailTab('profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    detailTab === 'profile'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>{isMr ? 'स्टोअर तपशील' : 'Store Profile'}</span>
                </button>

                <button
                  onClick={() => setDetailTab('audit')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    detailTab === 'audit'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>{isMr ? 'ऑडिट नोंदी' : 'Audit Logs'}</span>
                </button>

                <button
                  onClick={() => setDetailTab('archive')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                    detailTab === 'archive'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>
                    {isMr 
                      ? `रिसेट डेटा बॅकअप (${(tenantData?.archivedMedicines?.length || 0) + (tenantData?.archivedVouchers?.length || 0)})` 
                      : `Reset Archive (${(tenantData?.archivedMedicines?.length || 0) + (tenantData?.archivedVouchers?.length || 0)})`}
                  </span>
                </button>
              </div>

              {/* TAB 1: MEDICINES / PRODUCTS CRUD IN SQLITE */}
              {detailTab === 'medicines' && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 text-left">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-indigo-600" />
                        <span>{isMr ? 'औषध इन्व्हेंटरी नोंदी (Medicines Table)' : 'Products & Medicines Inventory Table'}</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isMr 
                          ? 'या स्टोअरने जोडलेली सर्व औषधे / प्रॉडक्ट्स खालील तक्त्यामध्ये उपलब्ध आहेत.' 
                          : 'All items and medicines added by this store in their isolated SQLite file.'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingMedicine({
                          id: `med-${Date.now()}`,
                          name: '',
                          composition: '',
                          category: 'Tablets & Capsules',
                          batchNo: '',
                          expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
                          stock: 10,
                          unit: 'Strips',
                          purchasePrice: 20,
                          mrp: 30,
                          rack: 'Rack A-1',
                          manufacturer: '',
                          schedule: 'OTC',
                          status: 'active'
                        });
                        setIsMedicineModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isMr ? 'नवीन औषध जोडा' : 'Add New Medicine'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="p-3">{isMr ? 'औषधाचे नाव' : 'Medicine / Item Name'}</th>
                          <th className="p-3">{isMr ? 'बॅच नंबर' : 'Batch No'}</th>
                          <th className="p-3">{isMr ? 'Expiry तारीख' : 'Expiry Date'}</th>
                          <th className="p-3">{isMr ? 'शिल्लक स्टॉक' : 'Stock Quantity'}</th>
                          <th className="p-3">{isMr ? 'किंमत (MRP)' : 'Price (MRP)'}</th>
                          <th className="p-3">{isMr ? 'रॅक' : 'Rack'}</th>
                          <th className="p-3 text-right">{isMr ? 'कृती' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tenantData?.medicines && tenantData.medicines.length > 0 ? (
                          tenantData.medicines.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-bold text-slate-900">
                                {m.name}
                                {m.composition && (
                                  <div className="text-[10px] text-slate-400 font-normal">{m.composition}</div>
                                )}
                              </td>
                              <td className="p-3 font-mono text-indigo-700 font-semibold">{m.batchNo || '-'}</td>
                              <td className="p-3 font-mono text-slate-600">{m.expiryDate || '-'}</td>
                              <td className="p-3">
                                <span className={`font-black ${m.stock <= 5 ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {m.stock} {m.unit || 'Strips'}
                                </span>
                              </td>
                              <td className="p-3 font-black text-emerald-700">₹{m.mrp}</td>
                              <td className="p-3 text-slate-500 font-mono">{m.rack || '-'}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingMedicine({ ...m });
                                      setIsMedicineModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
                                    title={isMr ? 'संपादित करा' : 'Edit'}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMedicine(m.id, m.name)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                                    title={isMr ? 'हटवा' : 'Delete'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-slate-400">
                              {isMr ? 'या स्टोअरच्या डेटाबेसमध्ये अद्याप कोणतीही औषधे नाहीत.' : 'No medicines added by this store yet.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: VOUCHERS CRUD IN SQLITE */}
              {detailTab === 'vouchers' && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 text-left">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-indigo-600" />
                      <span>{isMr ? 'व्हाउचर्स व बिल नोंदवही (Vouchers Table)' : 'Vouchers & Invoices Table'}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isMr ? 'खरेदी, विक्री व Expiry Return बिलांच्या थेट नोंदी.' : 'Purchase inward, sales bills, and return invoices.'}
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="p-3">{isMr ? 'व्हाउचर क्र.' : 'Voucher No'}</th>
                          <th className="p-3">{isMr ? 'प्रकार' : 'Type'}</th>
                          <th className="p-3">{isMr ? 'पार्टी नाव' : 'Party Name'}</th>
                          <th className="p-3">{isMr ? 'तारीख' : 'Date'}</th>
                          <th className="p-3">{isMr ? 'आयटम्स' : 'Items'}</th>
                          <th className="p-3">{isMr ? 'एकूण रक्कम' : 'Net Amount'}</th>
                          <th className="p-3 text-right">{isMr ? 'हटवा' : 'Delete'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tenantData?.vouchers && tenantData.vouchers.length > 0 ? (
                          tenantData.vouchers.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-mono font-bold text-indigo-700">{v.voucherNo}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  v.voucherType === 'PURCHASE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                  v.voucherType === 'SALES' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {v.voucherType}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-900">{v.partyName}</td>
                              <td className="p-3 font-mono text-slate-500">{v.date}</td>
                              <td className="p-3 font-mono">{(v.items || []).length} {isMr ? 'वस्तू' : 'items'}</td>
                              <td className="p-3 font-black text-emerald-700">₹{v.netAmount}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeleteVoucher(v.id, v.voucherNo)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                                  title={isMr ? 'व्हाउचर हटवा' : 'Delete voucher'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-slate-400">
                              {isMr ? 'या स्टोअरच्या डेटाबेसमध्ये अद्याप कोणतीही व्हाउचर्स नाहीत.' : 'No vouchers recorded in this store yet.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: STORE PROFILE IN SQLITE */}
              {detailTab === 'profile' && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Store className="w-4 h-4 text-indigo-600" />
                        <span>{isMr ? 'स्टोअर प्रोफाईल डेटा (Store Profile Table)' : 'Store Profile & Regulatory Information'}</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isMr ? 'युजरने स्वतः भरलेली माहिती थेट त्यांच्या SQLite मध्ये सेव्ह असते.' : 'Store license, GSTIN, and address saved in tenant database.'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingProfile(tenantData?.profile || {});
                        setIsProfileModalOpen(true);
                      }}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isMr ? 'माहिती संपादित करा' : 'Edit Information'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">{isMr ? 'स्टोअरचे नाव' : 'Store Name'}</span>
                      <span className="text-sm font-black text-slate-900">{tenantData?.profile?.storeName || activeTenant.storeName}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">{isMr ? 'मालकाचे नाव' : 'Owner / Pharmacist'}</span>
                      <span className="text-sm font-bold text-slate-900">{tenantData?.profile?.ownerName || activeTenant.name || (isMr ? 'नोंद नाही' : 'Not Set')}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">{isMr ? 'मोबाईल नंबर' : 'Mobile Number'}</span>
                      <span className="text-sm font-mono text-indigo-700 font-bold">+91 {tenantData?.profile?.phone || activeTenant.phone}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">{isMr ? 'ड्रग्ज लायसन्स (20B)' : 'Drug License (20B)'}</span>
                      <span className="font-mono text-slate-800 font-medium">{tenantData?.profile?.drugLicense20B || '-'}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">{isMr ? 'ड्रग्ज लायसन्स (21B)' : 'Drug License (21B)'}</span>
                      <span className="font-mono text-slate-800 font-medium">{tenantData?.profile?.drugLicense21B || '-'}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">{isMr ? 'GSTIN क्रमांक' : 'GSTIN Number'}</span>
                      <span className="font-mono text-slate-800 font-medium">{tenantData?.profile?.gstin || '-'}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 sm:col-span-2">
                      <span className="text-slate-500 font-bold block mb-1">{isMr ? 'पत्ता' : 'Full Address'}</span>
                      <span className="text-slate-700 font-medium">{tenantData?.profile?.address || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DATABASE AUDIT LOGS */}
              {detailTab === 'audit' && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 text-left">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      <span>{isMr ? 'डेटाबेस ऑडिट लॉग्स (Audit Logs Table)' : 'Database Audit Trail'}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isMr 
                        ? 'या विशिष्ट स्टोअरमध्ये घडलेल्या सर्व ॲक्शन्सची तारीख-वेळेनुसार अचूक नोंद.' 
                        : 'Real-time timestamped audit log of all database operations.'}
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="p-3">{isMr ? 'वेळ' : 'Timestamp'}</th>
                          <th className="p-3">{isMr ? 'टेबल नाव' : 'Table'}</th>
                          <th className="p-3">{isMr ? 'ॲक्शन' : 'Action'}</th>
                          <th className="p-3">{isMr ? 'तपशील' : 'Details'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tenantData?.auditLogs && tenantData.auditLogs.length > 0 ? (
                          tenantData.auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="p-3 font-mono text-indigo-700 font-bold">{log.table_name}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.action.includes('DELETE') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                                {log.details}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-slate-400">
                              {isMr ? 'या स्टोअरसाठी अद्याप ऑडिट नोंदी नाहीत.' : 'No audit entries yet.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: PRESERVED USER RESET ARCHIVE */}
              {detailTab === 'archive' && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-6 text-left">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-amber-600" />
                      <span>{isMr ? 'युजरने रिसेट केलेला डेटा (DB Admin Archive)' : 'User Reset Data (Preserved in DB Admin Archive)'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {isMr 
                        ? 'युजरने त्यांच्या डॅशबोर्डमधून डेटा रिसेट केला तरी तो डेटाबेस ॲडमिनमध्ये कायमस्वरूपी सुरक्षित सेव्ह राहतो.' 
                        : 'Even if the user resets their dashboard, all medicines and vouchers remain safely preserved in DB Admin.'}
                    </p>
                  </div>

                  {/* Archived Medicines Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Pill className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isMr ? `जतन केलेली औषधे (${tenantData?.archivedMedicines?.length || 0})` : `Preserved Medicines (${tenantData?.archivedMedicines?.length || 0})`}</span>
                    </h4>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-amber-50/60 text-slate-700 font-bold border-b border-amber-200 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="p-3">{isMr ? 'रिसेट तारीख/वेळ' : 'Archived At'}</th>
                            <th className="p-3">{isMr ? 'औषधाचे नाव' : 'Medicine Name'}</th>
                            <th className="p-3">{isMr ? 'बॅच' : 'Batch'}</th>
                            <th className="p-3">{isMr ? 'Expiry' : 'Expiry'}</th>
                            <th className="p-3">{isMr ? 'स्टॉक' : 'Stock'}</th>
                            <th className="p-3">{isMr ? 'MRP' : 'MRP'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tenantData?.archivedMedicines && tenantData.archivedMedicines.length > 0 ? (
                            tenantData.archivedMedicines.map((m, idx) => (
                              <tr key={m.id || idx} className="hover:bg-amber-50/30 transition">
                                <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                                  {m.archivedAt ? new Date(m.archivedAt).toLocaleString() : '-'}
                                </td>
                                <td className="p-3 font-bold text-slate-900">{m.name}</td>
                                <td className="p-3 font-mono text-indigo-700 font-semibold">{m.batchNo || '-'}</td>
                                <td className="p-3 font-mono text-slate-600">{m.expiryDate || '-'}</td>
                                <td className="p-3 font-bold text-slate-800">{m.stock} {m.unit || 'Strips'}</td>
                                <td className="p-3 font-black text-emerald-700">₹{m.mrp}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="p-6 text-center text-slate-400">
                                {isMr ? 'या स्टोअरने कोणताही औषध डेटा रिसेट केलेला नाही.' : 'No archived medicines found for this store.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Archived Vouchers Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isMr ? `जतन केलेली व्हाउचर्स / बिले (${tenantData?.archivedVouchers?.length || 0})` : `Preserved Vouchers (${tenantData?.archivedVouchers?.length || 0})`}</span>
                    </h4>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-amber-50/60 text-slate-700 font-bold border-b border-amber-200 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="p-3">{isMr ? 'रिसेट तारीख/वेळ' : 'Archived At'}</th>
                            <th className="p-3">{isMr ? 'प्रकार' : 'Type'}</th>
                            <th className="p-3">{isMr ? 'व्हाउचर क्र.' : 'Voucher No'}</th>
                            <th className="p-3">{isMr ? 'पार्टी नाव' : 'Party Name'}</th>
                            <th className="p-3">{isMr ? 'तारीख' : 'Date'}</th>
                            <th className="p-3">{isMr ? 'रक्कम' : 'Total Amount'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tenantData?.archivedVouchers && tenantData.archivedVouchers.length > 0 ? (
                            tenantData.archivedVouchers.map((v, idx) => (
                              <tr key={v.id || idx} className="hover:bg-amber-50/30 transition">
                                <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                                  {v.archivedAt ? new Date(v.archivedAt).toLocaleString() : '-'}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {v.voucherType || 'PURCHASE'}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-900">{v.voucherNo || '-'}</td>
                                <td className="p-3 font-medium text-slate-800">{v.partyName || '-'}</td>
                                <td className="p-3 font-mono text-slate-600">{v.date || '-'}</td>
                                <td className="p-3 font-black text-emerald-700">₹{v.grandTotal || 0}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="p-6 text-center text-slate-400">
                                {isMr ? 'या स्टोअरने कोणतीही व्हाउचर्स रिसेट केलेली नाहीत.' : 'No archived vouchers found for this store.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-3xl shadow-xs">
              {isMr 
                ? 'डाव्या बाजूच्या यादीतून तपासणीसाठी कोणतेही एक स्टोअर निवडा.' 
                : 'Select a store from the left sidebar to inspect and manage its database.'}
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: MEDICINE EDIT / ADD MODAL (Bright) */}
      {isMedicineModalOpen && editingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 text-left text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-600" />
                <span>{isMr ? 'औषध संपादित करा (Admin SQLite Edit)' : 'Edit Medicine (Admin SQLite Edit)'}</span>
              </h3>
              <button onClick={() => setIsMedicineModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'औषधाचे नाव *' : 'Medicine Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMedicine.name || ''}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'बॅच नंबर' : 'Batch Number'}
                  </label>
                  <input
                    type="text"
                    value={editingMedicine.batchNo || ''}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, batchNo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-indigo-700 font-mono font-semibold focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'Expiry तारीख *' : 'Expiry Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={editingMedicine.expiryDate || ''}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, expiryDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'शिल्लक स्टॉक' : 'Stock Quantity'}
                  </label>
                  <input
                    type="number"
                    value={editingMedicine.stock || 0}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, stock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'MRP किंमत (₹)' : 'MRP Price (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMedicine.mrp || 0}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, mrp: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-emerald-700 font-black focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'खरेदी किंमत (₹)' : 'Purchase Rate (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMedicine.purchasePrice || 0}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'रॅक क्रमांक' : 'Rack Location'}
                  </label>
                  <input
                    type="text"
                    value={editingMedicine.rack || ''}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, rack: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMedicineModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isMr ? 'SQLite मध्ये सेव्ह करा' : 'Save to SQLite'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STORE PROFILE EDIT MODAL (Bright) */}
      {isProfileModalOpen && editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 text-left text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <span>{isMr ? 'स्टोअर प्रोफाईल संपादित करा' : 'Edit Store Profile'}</span>
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'स्टोअरचे नाव' : 'Store Name'}
                  </label>
                  <input
                    type="text"
                    value={editingProfile.storeName || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, storeName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'मालकाचे नाव' : 'Owner Name'}
                  </label>
                  <input
                    type="text"
                    value={editingProfile.ownerName || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, ownerName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={editingProfile.gstin || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, gstin: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'ड्रग्ज लायसन्स 20B' : 'Drug License 20B'}
                  </label>
                  <input
                    type="text"
                    value={editingProfile.drugLicense20B || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, drugLicense20B: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'ड्रग्ज लायसन्स 21B' : 'Drug License 21B'}
                  </label>
                  <input
                    type="text"
                    value={editingProfile.drugLicense21B || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, drugLicense21B: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">
                    {isMr ? 'पत्ता' : 'Full Address'}
                  </label>
                  <textarea
                    rows={2}
                    value={editingProfile.address || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, address: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isMr ? 'प्रोफाईल अपडेट करा' : 'Update Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
