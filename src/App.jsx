import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import StatsOverview from './components/StatsOverview';
import ExpiryAlertBanner from './components/ExpiryAlertBanner';
import MedicineList from './components/MedicineList';
import AddMedicineModal from './components/AddMedicineModal';
import ExcelImportModal from './components/ExcelImportModal';
import ExpiryRadarView from './components/ExpiryRadarView';
import AnalyticsView from './components/AnalyticsView';
import NotificationDrawer from './components/NotificationDrawer';
import MedicineDetailModal from './components/MedicineDetailModal';
import StoreProfileModal from './components/StoreProfileModal';
import LoginModal from './components/LoginModal';
import LoginScreen from './components/LoginScreen';
import VoucherView from './components/VoucherView';
import VoucherEntryModal from './components/VoucherEntryModal';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import AdminPortal from './admin/AdminPortal';
import { 
  apiSaveMedicine, 
  apiDeleteMedicine, 
  apiSaveVoucher, 
  apiDeleteVoucher, 
  apiSaveProfile, 
  apiSyncInventory 
} from './utils/apiService';

import { 
  getCurrentUser, 
  setCurrentUser as setStoredCurrentUser, 
  logoutUser, 
  getUserInventory, 
  saveUserInventory, 
  getUserVouchers, 
  saveUserVouchers, 
  getUserProfile, 
  saveUserProfile,
  clearUserAllData,
  getUserCategories,
  saveUserCategories,
  deleteUserCategory,
  getUserTheme,
  saveUserTheme,
  loadUserDataFromDatabase
} from './utils/userStorage';
import { THEME_PRESETS, applyDashboardTheme } from './utils/themeUtils';
import { INITIAL_MEDICINES } from './data/initialMedicines';
import { getDaysUntilExpiry } from './utils/expiryUtils';
import { playUrgentAlertSound, playSuccessSound } from './utils/notificationSound';
import { sendMedicineExpiryNotification } from './utils/browserNotification';

const AUDIO_KEY = 'medvault_audio_enabled_v1';
const LANG_KEY = 'medvault_lang_pref_v1';

// Clean, zero-autofill default profile as requested by user
const DEFAULT_PROFILE = {
  storeName: '',
  ownerName: '',
  drugLicense20B: '',
  drugLicense21B: '',
  gstin: '',
  phone: '',
  email: '',
  address: '',
  logoUrl: '',
};

export default function App() {
  // 1. Current Authenticated User (Multi-tenant)
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('admin') || 
      window.location.hash.includes('admin')
    );
  });

  // 2. Language & Audio Preferences
  const [lang, setLang] = useState(() => {
    return localStorage.getItem(LANG_KEY) || 'mr'; // Marathi or English
  });

  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem(AUDIO_KEY) !== 'false';
  });

  // 3. User-isolated Inventory State (Starts 100% blank for every new pharmacy user)
  const [medicines, setMedicines] = useState(() => {
    return currentUser ? getUserInventory(currentUser.id) : [];
  });

  // 4. User-isolated Store Profile State
  const [storeProfile, setStoreProfile] = useState(() => {
    return currentUser ? getUserProfile(currentUser.id, DEFAULT_PROFILE) : DEFAULT_PROFILE;
  });

  // 5. User-isolated Vouchers State
  const [vouchers, setVouchers] = useState(() => {
    return currentUser ? getUserVouchers(currentUser.id) : [];
  });

  // 6. User Custom Categories
  const [customCategories, setCustomCategories] = useState(() => {
    return currentUser ? getUserCategories(currentUser.id) : [];
  });

  // 7. User Color Theme
  const [currentTheme, setCurrentTheme] = useState(() => {
    return currentUser ? (getUserTheme(currentUser.id) || THEME_PRESETS[0]) : THEME_PRESETS[0];
  });

  // 8. UI Navigation & View State
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'medicines', 'expiry', 'vouchers', 'excel', 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 9. Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);

  // Apply active color theme immediately across all UI components
  useEffect(() => {
    applyDashboardTheme(currentTheme);
  }, [currentTheme]);

  // Synchronize isolated data to localStorage whenever it changes
  useEffect(() => {
    if (currentUser?.id) {
      saveUserInventory(currentUser.id, medicines);
    }
  }, [medicines, currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      saveUserProfile(currentUser.id, storeProfile);
    }
  }, [storeProfile, currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      saveUserVouchers(currentUser.id, vouchers);
    }
  }, [vouchers, currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      saveUserCategories(currentUser.id, customCategories);
    }
  }, [customCategories, currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      saveUserTheme(currentUser.id, currentTheme);
    }
  }, [currentTheme, currentUser]);

  useEffect(() => {
    localStorage.setItem(AUDIO_KEY, String(audioEnabled));
  }, [audioEnabled]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // Hydrate data from isolated SQLite DB on mount or user change
  useEffect(() => {
    if (currentUser?.id) {
      loadUserDataFromDatabase(currentUser.id).then((dbData) => {
        if (dbData) {
          if (Array.isArray(dbData.medicines)) setMedicines(dbData.medicines);
          if (Array.isArray(dbData.vouchers)) setVouchers(dbData.vouchers);
          if (dbData.profile && (dbData.profile.storeName || dbData.profile.ownerName || dbData.profile.phone)) {
            setStoreProfile(dbData.profile);
          }
          if (Array.isArray(dbData.categories) && dbData.categories.length > 0) {
            setCustomCategories(dbData.categories);
          }
          if (dbData.theme) {
            setCurrentTheme(dbData.theme);
            applyDashboardTheme(dbData.theme);
          }
        }
      }).catch((e) => {
        console.warn('SQLite load warning:', e);
      });
    }
  }, [currentUser?.id]);

  // Handle User Login Success (From full screen LoginScreen or LoginModal)
  const handleLoginSuccess = async (user) => {
    setCurrentUserState(user);
    setIsLoginModalOpen(false);

    try {
      // Try to load isolated records directly from per-user SQLite database
      const dbData = await loadUserDataFromDatabase(user.id);
      if (dbData) {
        setMedicines(Array.isArray(dbData.medicines) ? dbData.medicines : []);
        setVouchers(Array.isArray(dbData.vouchers) ? dbData.vouchers : []);
        setStoreProfile(dbData.profile || DEFAULT_PROFILE);
        setCustomCategories(Array.isArray(dbData.categories) ? dbData.categories : []);
        if (dbData.theme) {
          setCurrentTheme(dbData.theme);
          applyDashboardTheme(dbData.theme);
        }
        setActiveView('dashboard');
        return;
      }
    } catch (err) {
      console.warn('Fallback to local storage data:', err);
    }

    // Fallback to localStorage isolated store
    const loadedMeds = getUserInventory(user.id);
    const loadedVouchers = getUserVouchers(user.id);
    const loadedProfile = getUserProfile(user.id, DEFAULT_PROFILE);
    const loadedCategories = getUserCategories(user.id);
    const loadedTheme = getUserTheme(user.id) || THEME_PRESETS[0];

    setMedicines(loadedMeds);
    setVouchers(loadedVouchers);
    setStoreProfile(loadedProfile);
    setCustomCategories(loadedCategories);
    setCurrentTheme(loadedTheme);
    applyDashboardTheme(loadedTheme);
    setActiveView('dashboard');
  };

  // Trigger Logout confirmation modal instead of direct sudden logout
  const handleRequestLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  // Confirmed Logout execution
  const handleConfirmLogout = () => {
    logoutUser();
    setCurrentUserState(null);
    setIsLoginModalOpen(false);
    setIsLogoutConfirmOpen(false);
  };

  const handleAddCategory = (newCat) => {
    const trimmed = (newCat || '').trim();
    if (!trimmed) return;
    setCustomCategories((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
    playSuccessSound();
  };

  const handleDeleteCategory = (categoryNameToDelete) => {
    if (!categoryNameToDelete) return;
    const confirmMsg = lang === 'mr'
      ? `तुम्हाला "${categoryNameToDelete}" ही कॅटेगरी खरोखर हटवायची आहे का?`
      : `Are you sure you want to delete category "${categoryNameToDelete}"?`;

    if (window.confirm(confirmMsg)) {
      // 1. Remove from state
      setCustomCategories((prev) => prev.filter((c) => c !== categoryNameToDelete));

      // 2. Remove from user storage
      if (currentUser?.id) {
        deleteUserCategory(currentUser.id, categoryNameToDelete);
      }

      // 3. Fallback any existing medicines using this category to 'Tablets & Capsules'
      setMedicines((prevMeds) => {
        return prevMeds.map((m) => {
          if (m.category === categoryNameToDelete) {
            return { ...m, category: 'Tablets & Capsules' };
          }
          return m;
        });
      });

      playSuccessSound();
    }
  };

  const handleSaveTheme = (theme) => {
    setCurrentTheme(theme);
    applyDashboardTheme(theme);
  };

  // Compute Expiry Urgency Groups
  const { tomorrowMedicines, expiredMedicines, critical7Medicines, warning30Medicines } = useMemo(() => {
    const tomorrow = [];
    const expired = [];
    const critical7 = [];
    const warning30 = [];

    medicines.forEach((m) => {
      const days = getDaysUntilExpiry(m.expiryDate);
      if (days < 0) {
        expired.push(m);
      } else if (days === 0 || days === 1) {
        tomorrow.push(m);
      } else if (days <= 7) {
        critical7.push(m);
      } else if (days <= 30) {
        warning30.push(m);
      }
    });

    return {
      tomorrowMedicines: tomorrow,
      expiredMedicines: expired,
      critical7Medicines: critical7,
      warning30Medicines: warning30,
    };
  }, [medicines]);

  // Initial sound / notification check on app launch
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      if (tomorrowMedicines.length > 0 && audioEnabled) {
        playUrgentAlertSound();
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        if (tomorrowMedicines.length > 0) {
          sendMedicineExpiryNotification(tomorrowMedicines[0], 'tomorrow', lang);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentUser]);

  // CRUD Handlers for Medicines
  const handleSaveMedicine = (medicineData) => {
    setMedicines((prev) => {
      const existsIndex = prev.findIndex((m) => m.id === medicineData.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = medicineData;
        return updated;
      }
      return [medicineData, ...prev];
    });

    // Directly save and log notification for this specific medicine
    if (currentUser?.id) {
      apiSaveMedicine(currentUser.id, medicineData).catch(e => console.warn('SQLite medicine save:', e));
    }
  };

  const handleDeleteMedicine = (id) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
    if (currentUser?.id) {
      apiDeleteMedicine(currentUser.id, id).catch(e => console.warn('SQLite medicine delete:', e));
    }
    playSuccessSound();
  };

  const handleEditMedicine = (med) => {
    setEditingMedicine(med);
    setIsAddModalOpen(true);
  };

  const handleSelectMedicine = (med) => {
    setSelectedMedicine(med);
    setIsDetailModalOpen(true);
  };

  const handleImportComplete = (importedMeds, mode = 'append') => {
    let nextMeds = [];
    if (mode === 'replace') {
      nextMeds = importedMeds;
    } else {
      nextMeds = [...importedMeds, ...medicines];
    }
    setMedicines(nextMeds);
    if (currentUser?.id) {
      apiSyncInventory(currentUser.id, nextMeds, true).catch(e => console.warn('SQLite excel import sync:', e));
    }
    setActiveView('medicines');
    setSelectedStatusFilter('all');
  };

  const handleResetData = () => {
    if (currentUser?.id) {
      clearUserAllData(currentUser.id);
      setMedicines([]);
      setVouchers([]);
      playSuccessSound();
    }
  };

  const handleFilterClick = (statusKey) => {
    if (statusKey === 'tomorrow' || statusKey === 'expired' || statusKey === 'critical_7') {
      setActiveView('expiry');
    } else {
      setActiveView('medicines');
      setSelectedStatusFilter(statusKey);
    }
  };

  const handleSaveProfile = (updatedProfile) => {
    setStoreProfile(updatedProfile);
    if (currentUser?.id) {
      apiSaveProfile(currentUser.id, updatedProfile, true).catch(e => console.warn('SQLite profile save:', e));
    }
  };

  // CRUD Handlers for Vouchers
  const handleSaveVoucher = (voucherData) => {
    setVouchers((prev) => {
      const existsIndex = prev.findIndex((v) => v.id === voucherData.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = voucherData;
        return updated;
      }
      return [voucherData, ...prev];
    });

    if (currentUser?.id) {
      apiSaveVoucher(currentUser.id, voucherData).catch(e => console.warn('SQLite voucher save:', e));
    }

    // Auto-update inventory stock if requested
    if (voucherData.updateStock && voucherData.items && voucherData.items.length > 0) {
      setMedicines((prevMeds) => {
        const updatedMeds = [...prevMeds];
        voucherData.items.forEach((vItem) => {
          if (!vItem.name) return;
          const trimmedName = vItem.name.trim().toLowerCase();
          const existingIdx = updatedMeds.findIndex((m) =>
            m.name.trim().toLowerCase() === trimmedName ||
            (vItem.batchNo && m.batchNo && m.batchNo.trim().toLowerCase() === vItem.batchNo.trim().toLowerCase())
          );

          const qty = parseInt(vItem.quantity) || 0;

          if (existingIdx >= 0) {
            const current = updatedMeds[existingIdx];
            if (voucherData.voucherType === 'PURCHASE') {
              updatedMeds[existingIdx] = {
                ...current,
                stock: (current.stock || 0) + qty,
                purchasePrice: vItem.rate || current.purchasePrice,
                mrp: vItem.mrp || current.mrp,
                expiryDate: vItem.expiryDate || current.expiryDate,
                batchNo: vItem.batchNo || current.batchNo,
              };
            } else if (voucherData.voucherType === 'SALES' || voucherData.voucherType === 'RETURN') {
              updatedMeds[existingIdx] = {
                ...current,
                stock: Math.max(0, (current.stock || 0) - qty),
              };
            }
          } else if (voucherData.voucherType === 'PURCHASE') {
            // Add new medicine to inventory
            const newMed = {
              id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: vItem.name,
              composition: vItem.name,
              category: 'Tablets & Capsules',
              batchNo: vItem.batchNo || `BT-${Math.floor(1000 + Math.random() * 9000)}`,
              expiryDate: vItem.expiryDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
              stock: qty,
              unit: vItem.unit || 'Strips',
              purchasePrice: vItem.rate || 25,
              mrp: vItem.mrp || (vItem.rate ? +(vItem.rate * 1.3).toFixed(2) : 35),
              rack: 'Rack A-1',
              manufacturer: voucherData.partyName || 'Pharma Supplier',
              schedule: 'OTC',
              minStock: 10,
              distributor: voucherData.partyName || 'Direct Purchase',
              status: 'active',
            };
            updatedMeds.unshift(newMed);
          }
        });
        return updatedMeds;
      });
    }

    playSuccessSound();
  };

  const handleDeleteVoucher = (voucherId) => {
    setVouchers((prev) => prev.filter((v) => v.id !== voucherId));
    if (currentUser?.id) {
      apiDeleteVoucher(currentUser.id, voucherId).catch(e => console.warn('SQLite voucher delete:', e));
    }
    playSuccessSound();
  };

  const handleEditVoucher = (vch) => {
    setEditingVoucher(vch);
    setIsVoucherModalOpen(true);
  };

  // -------------------------------------------------------------
  // SUPER ADMIN DB MANAGEMENT PORTAL (Strictly for Store Owner/Admin)
  // -------------------------------------------------------------
  if (isAdminViewOpen) {
    return <AdminPortal onBackToDashboard={() => setIsAdminViewOpen(false)} />;
  }

  // -------------------------------------------------------------
  // PRIMARY REQUIREMENT: If user is not authenticated, show
  // the dedicated full-page LoginScreen before opening dashboard!
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        lang={lang}
        setLang={setLang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans text-slate-800 selection:bg-teal-500 selection:text-white">
      {/* Sidebar for Desktop & Mobile Drawer */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenAdminPortal={() => setIsAdminViewOpen(true)}
        onLogout={handleRequestLogout}
        currentUser={currentUser}
        storeProfile={storeProfile}
        totalMedicines={medicines.length}
        tomorrowCount={tomorrowMedicines.length}
        expiredCount={expiredMedicines.length}
        critical7Count={critical7Medicines.length}
        vouchersCount={vouchers.length}
        onResetData={handleResetData}
        lang={lang}
      />

      {/* Main Content Area */}
      <div className="md:pl-64 lg:pl-72 flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Sticky Header */}
        <Header
          onOpenAddModal={() => {
            setEditingMedicine(null);
            setIsAddModalOpen(true);
          }}
          onOpenExcelModal={() => setIsExcelModalOpen(true)}
          onOpenVoucherModal={() => {
            setEditingVoucher(null);
            setIsVoucherModalOpen(true);
          }}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleRequestLogout}
          currentUser={currentUser}
          storeProfile={storeProfile}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
          urgentCount={tomorrowMedicines.length + expiredMedicines.length}
          tomorrowMedicines={tomorrowMedicines}
          activeView={activeView}
          lang={lang}
          setLang={setLang}
        />

        {/* Page Body */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Expiry Alert Banner (Visible if urgent items exist) */}
          <ExpiryAlertBanner
            tomorrowMedicines={tomorrowMedicines}
            expiredMedicines={expiredMedicines}
            onViewExpiryRadar={() => setActiveView('expiry')}
            onSelectMedicine={handleSelectMedicine}
            storeProfile={storeProfile}
            audioEnabled={audioEnabled}
            lang={lang}
          />

          {/* VIEW 1: DASHBOARD */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <StatsOverview
                medicines={medicines}
                tomorrowCount={tomorrowMedicines.length}
                expiredCount={expiredMedicines.length}
                critical7Count={critical7Medicines.length}
                warning30Count={warning30Medicines.length}
                onFilterClick={handleFilterClick}
                lang={lang}
              />

              <MedicineList
                medicines={medicines}
                onOpenAddModal={() => {
                  setEditingMedicine(null);
                  setIsAddModalOpen(true);
                }}
                onOpenExcelModal={() => setIsExcelModalOpen(true)}
                onEditMedicine={handleEditMedicine}
                onDeleteMedicine={handleDeleteMedicine}
                onSelectMedicine={handleSelectMedicine}
                selectedStatusFilter={selectedStatusFilter}
                setSelectedStatusFilter={setSelectedStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                storeProfile={storeProfile}
                customCategories={customCategories}
                onDeleteCategory={handleDeleteCategory}
                lang={lang}
              />
            </div>
          )}

          {/* VIEW 2: ALL MEDICINES */}
          {activeView === 'medicines' && (
            <MedicineList
              medicines={medicines}
              onOpenAddModal={() => {
                setEditingMedicine(null);
                setIsAddModalOpen(true);
              }}
              onOpenExcelModal={() => setIsExcelModalOpen(true)}
              onEditMedicine={handleEditMedicine}
              onDeleteMedicine={handleDeleteMedicine}
              onSelectMedicine={handleSelectMedicine}
              selectedStatusFilter={selectedStatusFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              storeProfile={storeProfile}
              customCategories={customCategories}
              onDeleteCategory={handleDeleteCategory}
              lang={lang}
            />
          )}

          {/* VIEW 3: EXPIRY WATCH RADAR */}
          {activeView === 'expiry' && (
            <ExpiryRadarView
              medicines={medicines}
              onSelectMedicine={handleSelectMedicine}
              onEditMedicine={handleEditMedicine}
              storeProfile={storeProfile}
              audioEnabled={audioEnabled}
              lang={lang}
            />
          )}

          {/* VIEW 4: VOUCHER REGISTER (PURCHASE / SALES / EXPIRY RETURN) */}
          {activeView === 'vouchers' && (
            <VoucherView
              vouchers={vouchers}
              onOpenNewVoucher={() => {
                setEditingVoucher(null);
                setIsVoucherModalOpen(true);
              }}
              onEditVoucher={handleEditVoucher}
              onDeleteVoucher={handleDeleteVoucher}
              storeProfile={storeProfile}
              lang={lang}
            />
          )}

          {/* VIEW 5: EXCEL SHEET UPLOAD */}
          {activeView === 'excel' && (
            <div className="max-w-2xl mx-auto py-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <ExcelImportModal
                  isOpen={true}
                  onClose={() => setActiveView('medicines')}
                  onImportComplete={handleImportComplete}
                  lang={lang}
                />
              </div>
            </div>
          )}

          {/* VIEW 6: ANALYTICS & LOSS INTELLIGENCE */}
          {activeView === 'analytics' && (
            <AnalyticsView
              medicines={medicines}
              storeProfile={storeProfile}
              lang={lang}
            />
          )}
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation (< 768px) */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAddModal={() => {
          setEditingMedicine(null);
          setIsAddModalOpen(true);
        }}
        tomorrowCount={tomorrowMedicines.length}
        expiredCount={expiredMedicines.length}
        lang={lang}
      />

      {/* Switch User Modal (when user clicks 'बदला / Switch' while logged in) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        canClose={true}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        lang={lang}
      />

      {/* Voucher Entry Modal */}
      <VoucherEntryModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setEditingVoucher(null);
        }}
        onSaveVoucher={handleSaveVoucher}
        medicines={medicines}
        existingVoucher={editingVoucher}
        storeProfile={storeProfile}
        lang={lang}
      />

      {/* Add / Edit Custom Medicine Modal */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMedicine(null);
        }}
        onSaveMedicine={handleSaveMedicine}
        editingMedicine={editingMedicine}
        customCategories={customCategories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        lang={lang}
      />

      {/* Excel Import Modal */}
      {isExcelModalOpen && (
        <ExcelImportModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onImportComplete={handleImportComplete}
          lang={lang}
        />
      )}

      {/* Live Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        tomorrowMedicines={tomorrowMedicines}
        expiredMedicines={expiredMedicines}
        critical7Medicines={critical7Medicines}
        onSelectMedicine={handleSelectMedicine}
        audioEnabled={audioEnabled}
        lang={lang}
      />

      {/* Single Medicine Details Modal */}
      <MedicineDetailModal
        medicine={selectedMedicine}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedMedicine(null);
        }}
        onEdit={handleEditMedicine}
        onDelete={handleDeleteMedicine}
        storeProfile={storeProfile}
        lang={lang}
      />

      {/* Store Profile, Logo & Theme Customizer Modal */}
      <StoreProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={storeProfile}
        onSaveProfile={handleSaveProfile}
        activeTheme={currentTheme}
        onSaveTheme={handleSaveTheme}
        customCategories={customCategories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        lang={lang}
      />

      {/* Logout Confirmation Dialog Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        currentUser={currentUser}
        lang={lang}
      />
    </div>
  );
}
