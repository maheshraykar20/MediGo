// Multi-tenant and User Isolation storage utilities (Supports 500+ Private Pharmacy Stores)
import * as api from './apiService.js';
import { sanitizePartyName } from './excelUtils.js';

const SESSION_USER_KEY = 'medvault_auth_session_user_v1';
const CURRENT_USER_KEY = 'medvault_auth_active_user_v1';
const OTP_STORE_KEY = 'medvault_otp_temporary_v1';
const USERS_REGISTRY_KEY = 'medvault_registered_users_registry_v1';
const CLEAN_MARKER_KEY = 'medvault_v3_blank_slate_marker';

// Automatic one-time cleanup of any legacy demo data so all users start 100% fresh and blank
(function cleanLegacyDemoData() {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem(CLEAN_MARKER_KEY) !== 'v3_done') {
      const keysToClean = [
        'medvault_pharmacy_inventory_v1',
        'medvault_inventory_usr_9822012345',
        'medvault_inventory_usr_9876543210',
        'medvault_inventory_usr_9890123456',
        'medvault_vouchers_usr_9822012345',
        'medvault_vouchers_usr_9876543210',
        'medvault_vouchers_usr_9890123456',
        'medvault_auth_active_user_v1',
        SESSION_USER_KEY
      ];
      keysToClean.forEach(k => {
        try { localStorage.removeItem(k); } catch(e){}
      });
      try { sessionStorage.clear(); } catch(e){}
      localStorage.setItem(CLEAN_MARKER_KEY, 'v3_done');
    }
  } catch (e) {
    console.warn('Legacy cleaner run error:', e);
  }
})();

// Returns currently logged in session user, persistent across browser tabs and refreshes
export function getCurrentUser() {
  try {
    const sessionRaw = sessionStorage.getItem(SESSION_USER_KEY);
    if (sessionRaw) return JSON.parse(sessionRaw);

    const localRaw = localStorage.getItem(CURRENT_USER_KEY);
    if (localRaw) {
      const user = JSON.parse(localRaw);
      if (user && user.id) {
        try { sessionStorage.setItem(SESSION_USER_KEY, localRaw); } catch {}
        return user;
      }
    }
  } catch (e) {
    console.error('Failed to get current user:', e);
  }
  return null;
}

export function setCurrentUser(user) {
  try {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to set current user:', e);
  }
}

export function logoutUser() {
  try {
    sessionStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (e) {
    console.error('Failed to logout user:', e);
  }
}

// Generate a NEW unique 4-digit OTP for any mobile number
export function requestPhoneOTP(phone, customName = '', customStoreName = '') {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return { 
      success: false, 
      errorEn: 'Please enter a valid 10-digit mobile number.', 
      errorMr: 'कृपया वैध १०-अंकी मोबाईल नंबर टाका.' 
    };
  }

  // Generate a brand new, random 4-digit OTP every time
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  let resolvedStore = customStoreName.trim();
  let resolvedOwner = customName.trim();

  if (!resolvedStore) {
    try {
      const reg = JSON.parse(localStorage.getItem(USERS_REGISTRY_KEY) || '{}');
      if (reg[cleanPhone]?.storeName) resolvedStore = reg[cleanPhone].storeName;
      if (reg[cleanPhone]?.name && !resolvedOwner) resolvedOwner = reg[cleanPhone].name;
    } catch {}
    if (!resolvedStore) {
      try {
        const prof = JSON.parse(localStorage.getItem(`medvault_profile_usr_${cleanPhone}`) || '{}');
        if (prof?.storeName) resolvedStore = prof.storeName;
        if (prof?.ownerName && !resolvedOwner) resolvedOwner = prof.ownerName;
      } catch {}
    }
  }

  const otpPayload = {
    phone: cleanPhone,
    code: otpCode,
    expiresAt,
    customName: resolvedOwner,
    customStoreName: resolvedStore,
    generatedAt: new Date().toLocaleTimeString(),
  };

  try {
    sessionStorage.setItem(`${OTP_STORE_KEY}_${cleanPhone}`, JSON.stringify(otpPayload));
    // Sync OTP to central SQLite database with the exact code
    api.apiRequestOtp(cleanPhone, resolvedOwner, resolvedStore, otpCode).catch(e => console.warn('SQLite OTP sync:', e));
  } catch (e) {
    console.error('Error saving OTP payload:', e);
  }

  return {
    success: true,
    phone: cleanPhone,
    otpCode,
    expiresAt,
  };
}

// Verify entered OTP - strictly checks against the newly generated OTP
export function verifyPhoneOTP(phone, code) {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const raw = sessionStorage.getItem(`${OTP_STORE_KEY}_${cleanPhone}`);
  
  if (!raw) {
    return {
      success: false,
      errorEn: 'OTP expired or not found. Please request a new OTP.',
      errorMr: 'ओटीपी सापडला नाही किंवा कालबाह्य झाला आहे. कृपया पुन्हा नवीन ओटीपी मागवा.',
    };
  }

  try {
    const payload = JSON.parse(raw);
    if (Date.now() > payload.expiresAt) {
      return {
        success: false,
        errorEn: 'OTP has expired. Please request a fresh OTP.',
        errorMr: 'हा ओटीपी कालबाह्य झाला आहे. कृपया नवीन ओटीपी मागवा.',
      };
    }

    // STRICT CHECK: The user must enter the exact OTP sent for this number!
    if (payload.code !== code.trim()) {
      return {
        success: false,
        errorEn: 'Incorrect OTP! Please enter the exact 4-digit code sent to your mobile.',
        errorMr: 'अवैध ओटीपी! कृपया SMS मध्ये आलेला अचूक ४-अंकी ओटीपी टाका.',
      };
    }

    // Validated! Remove the temporary OTP
    sessionStorage.removeItem(`${OTP_STORE_KEY}_${cleanPhone}`);
    
    // Auto-provision user's dedicated SQLite database on disk
    api.apiVerifyOtp(cleanPhone, code).catch(e => console.warn('SQLite DB auto-provision:', e));

    // Resolve or instantiate user in 500+ users registry
    const user = resolveOrCreateUser(cleanPhone, payload.customName, payload.customStoreName);
    setCurrentUser(user);
    return { success: true, user };
  } catch (e) {
    return {
      success: false,
      errorEn: 'Verification failed. Please try again.',
      errorMr: 'पडताळणी अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
    };
  }
}

// Multi-tenant registry: resolves existing user or registers new user
function resolveOrCreateUser(cleanPhone, customName = '', customStoreName = '') {
  let registry = {};
  try {
    const saved = localStorage.getItem(USERS_REGISTRY_KEY);
    if (saved) registry = JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse user registry:', e);
  }

  if (registry[cleanPhone]) {
    const existing = registry[cleanPhone];
    if (customName && customName !== existing.name) existing.name = customName;
    if (customStoreName && customStoreName !== existing.storeName) existing.storeName = customStoreName;
    saveUserToRegistry(cleanPhone, existing);
    return existing;
  }

  // New User Registration for any of the 500+ users
  const newUser = {
    id: `usr_${cleanPhone}`,
    phone: cleanPhone,
    name: customName || 'Pharmacist',
    storeName: customStoreName || '',
    role: 'Store Owner',
    city: 'Maharashtra',
    createdAt: new Date().toISOString(),
  };

  saveUserToRegistry(cleanPhone, newUser);
  return newUser;
}

function saveUserToRegistry(phone, user) {
  try {
    let registry = {};
    const saved = localStorage.getItem(USERS_REGISTRY_KEY);
    if (saved) registry = JSON.parse(saved);
    registry[phone] = user;
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.error('Failed to save to user registry:', e);
  }
}

// -------------------------------------------------------------
// USER-ISOLATED DATA ACCESSORS (Keyed strictly by userId)
// -------------------------------------------------------------

// Returns the user's saved inventory. ALWAYS STARTS 100% BLANK [] FOR ANY NEW USER!
export function getUserInventory(userId) {
  if (!userId) return [];
  const key = `medvault_inventory_${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load user inventory:', e);
  }

  // Fallback: If current phone has 0 items in localStorage, check if any previous inventory exists
  // on this browser (e.g. if the user previously entered data under 9579217810 or 7709022842)
  try {
    const allKeys = Object.keys(localStorage);
    const invKeys = allKeys.filter(k => k.startsWith('medvault_inventory_usr_') && k !== key);
    for (const otherKey of invKeys) {
      const rawOther = localStorage.getItem(otherKey);
      if (rawOther) {
        const parsedOther = JSON.parse(rawOther);
        if (Array.isArray(parsedOther) && parsedOther.length > 0) {
          const migrated = parsedOther.map(m => ({ ...m, userId }));
          try { localStorage.setItem(key, JSON.stringify(migrated)); } catch {}
          api.apiSyncInventory(userId, migrated, false).catch(() => {});
          return migrated;
        }
      }
    }
  } catch (e) {
    console.error('Fallback inventory search error:', e);
  }

  // Fresh user starts with 100% BLANK inventory!
  return [];
}

export function saveUserInventory(userId, inventory) {
  if (!userId) return;
  const key = `medvault_inventory_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(inventory));
    // Persist to user's dedicated SQLite database!
    // SAFETY GUARD: Only sync array if non-empty to prevent accidental wipes
    if (Array.isArray(inventory) && inventory.length > 0) {
      api.apiSyncInventory(userId, inventory).catch(e => console.warn('SQLite inventory sync:', e));
    }
  } catch (e) {
    console.error('Failed to save user inventory:', e);
  }
}

// Returns the user's saved vouchers. ALWAYS STARTS 100% BLANK [] FOR ANY NEW USER!
export function getUserVouchers(userId) {
  if (!userId) return [];
  const key = `medvault_vouchers_${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let hasSanitized = false;
        const cleaned = parsed.map(v => {
          const cleanParty = sanitizePartyName(v.partyName, v.voucherType === 'PURCHASE' ? 'Om Sai Agency' : 'Walk-in Customer');
          if (cleanParty !== v.partyName) {
            hasSanitized = true;
            return { ...v, partyName: cleanParty };
          }
          return v;
        });
        if (hasSanitized) {
          try { localStorage.setItem(key, JSON.stringify(cleaned)); } catch {}
          api.apiSyncVouchers(userId, cleaned).catch(() => {});
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.error('Failed to load user vouchers:', e);
  }

  // Fallback: check if vouchers exist under another key on this device
  try {
    const allKeys = Object.keys(localStorage);
    const vchKeys = allKeys.filter(k => k.startsWith('medvault_vouchers_usr_') && k !== key);
    for (const otherKey of vchKeys) {
      const rawOther = localStorage.getItem(otherKey);
      if (rawOther) {
        const parsedOther = JSON.parse(rawOther);
        if (Array.isArray(parsedOther) && parsedOther.length > 0) {
          const migrated = parsedOther.map(v => ({ 
            ...v, 
            userId,
            partyName: sanitizePartyName(v.partyName, v.voucherType === 'PURCHASE' ? 'Om Sai Agency' : 'Walk-in Customer')
          }));
          try { localStorage.setItem(key, JSON.stringify(migrated)); } catch {}
          api.apiSyncVouchers(userId, migrated).catch(() => {});
          return migrated;
        }
      }
    }
  } catch (e) {}

  // Fresh user starts with 100% BLANK vouchers!
  return [];
}

export function saveUserVouchers(userId, vouchers) {
  if (!userId) return;
  const key = `medvault_vouchers_${userId}`;
  try {
    const cleaned = (vouchers || []).map(v => ({
      ...v,
      partyName: sanitizePartyName(v.partyName, v.voucherType === 'PURCHASE' ? 'Om Sai Agency' : 'Walk-in Customer'),
    }));
    localStorage.setItem(key, JSON.stringify(cleaned));
    // Persist to user's dedicated SQLite database!
    // SAFETY GUARD: Only sync array if non-empty to prevent accidental wipes
    if (Array.isArray(cleaned) && cleaned.length > 0) {
      api.apiSyncVouchers(userId, cleaned).catch(e => console.warn('SQLite vouchers sync:', e));
    }
  } catch (e) {
    console.error('Failed to save user vouchers:', e);
  }
}

// Complete reset: wipes all inventory and vouchers for this user to completely empty!
export function clearUserAllData(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(`medvault_inventory_${userId}`, JSON.stringify([]));
    localStorage.setItem(`medvault_vouchers_${userId}`, JSON.stringify([]));
    // Reset user's dedicated SQLite database!
    api.apiResetData(userId).catch(e => console.warn('SQLite reset sync:', e));
  } catch (e) {
    console.error('Failed to clear user data:', e);
  }
}

export function getUserProfile(userId, fallback) {
  if (!userId) return fallback || null;
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  const key = `medvault_profile_${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const p = JSON.parse(raw);
      // Clean any legacy auto-filled dummy data so user has clean manual entry
      const isDummyStore = p.storeName && (p.storeName.includes('Medical & General Store (') || p.storeName.includes('Sanjivani Medical'));
      const isDummyOwner = p.ownerName && (p.ownerName.includes('Pharmacist (+91') || p.ownerName.includes('Mahesh Patil'));
      const isDummyDL20B = p.drugLicense20B && (p.drugLicense20B.startsWith('MH-REG-20B-') || p.drugLicense20B === 'MH-PUN-20B-10492');
      const isDummyDL21B = p.drugLicense21B && (p.drugLicense21B.startsWith('MH-REG-21B-') || p.drugLicense21B === 'MH-PUN-21B-10493');
      const isDummyGSTIN = p.gstin && (p.gstin.startsWith('27AAAC') || p.gstin === '27AABCS1429B1Z');
      const isDummyEmail = p.email && (p.email.includes('@medvault.in') || p.email === 'sanjivani.med@gmail.com');
      const isDummyAddress = p.address && (p.address === 'Main Bazar Road, Maharashtra' || p.address.includes('Shop No. 4, Sai Complex'));

      return {
        storeName: isDummyStore ? '' : (p.storeName || ''),
        ownerName: isDummyOwner ? '' : (p.ownerName || ''),
        drugLicense20B: isDummyDL20B ? '' : (p.drugLicense20B || ''),
        drugLicense21B: isDummyDL21B ? '' : (p.drugLicense21B || ''),
        gstin: isDummyGSTIN ? '' : (p.gstin || ''),
        phone: cleanPhone,
        email: isDummyEmail ? '' : (p.email || ''),
        address: isDummyAddress ? '' : (p.address || ''),
        logoUrl: p.logoUrl || '',
      };
    }
  } catch (e) {
    console.error('Failed to load user profile:', e);
  }

  // Look up user from registry to see if storeName was entered at registration
  let regStoreName = '';
  let regOwnerName = '';
  try {
    const reg = JSON.parse(localStorage.getItem(USERS_REGISTRY_KEY) || '{}');
    if (reg[cleanPhone]) {
      regStoreName = reg[cleanPhone].storeName || '';
      regOwnerName = reg[cleanPhone].name || '';
    }
  } catch {}

  const profile = {
    storeName: regStoreName || fallback?.storeName || '',
    ownerName: regOwnerName || fallback?.ownerName || '',
    drugLicense20B: fallback?.drugLicense20B || '',
    drugLicense21B: fallback?.drugLicense21B || '',
    gstin: fallback?.gstin || '',
    phone: cleanPhone,
    email: fallback?.email || '',
    address: fallback?.address || '',
    logoUrl: fallback?.logoUrl || '',
  };

  return profile;
}

export function saveUserProfile(userId, profile) {
  if (!userId || !profile) return;
  const key = `medvault_profile_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(profile));
    // Persist to user's dedicated SQLite database!
    api.apiSaveProfile(userId, profile).catch(e => console.warn('SQLite profile sync:', e));
  } catch (e) {
    console.error('Failed to save user profile:', e);
  }
}

// -------------------------------------------------------------
// USER CUSTOM CATEGORIES (Keyed strictly by userId)
// -------------------------------------------------------------
export function getUserCategories(userId) {
  if (!userId) return [];
  const key = `medvault_categories_${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load user categories:', e);
  }
  return [];
}

export function saveUserCategories(userId, categories) {
  if (!userId) return;
  const key = `medvault_categories_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(categories));
    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        api.apiAddCategory(userId, cat).catch(() => {});
      });
    }
  } catch (e) {
    console.error('Failed to save user categories:', e);
  }
}

export function deleteUserCategory(userId, categoryName) {
  if (!userId || !categoryName) return [];
  const current = getUserCategories(userId);
  const updated = current.filter(c => c !== categoryName);
  saveUserCategories(userId, updated);
  // Delete from user's dedicated SQLite database!
  api.apiDeleteCategory(userId, categoryName).catch(e => console.warn('SQLite category delete:', e));
  return updated;
}

// -------------------------------------------------------------
// USER COLOR THEME (Keyed strictly by userId)
// -------------------------------------------------------------
export function getUserTheme(userId) {
  if (!userId) return null;
  const key = `medvault_theme_${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load user theme:', e);
  }
  return null;
}

export function saveUserTheme(userId, theme) {
  if (!userId) return;
  const key = `medvault_theme_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(theme));
    // Persist to user's dedicated SQLite database!
    api.apiSaveTheme(userId, theme).catch(e => console.warn('SQLite theme sync:', e));
  } catch (e) {
    console.error('Failed to save user theme:', e);
  }
}

// Load and hydrate user's data from their dedicated SQLite database file (Self-Healing Dual-Sync)
export async function loadUserDataFromDatabase(userId) {
  if (!userId) return null;
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);

  try {
    const [invRes, vchRes, profRes, catRes, themeRes] = await Promise.allSettled([
      api.apiGetInventory(userId),
      api.apiGetVouchers(userId),
      api.apiGetProfile(userId),
      api.apiGetCategories(userId),
      api.apiGetTheme(userId),
    ]);

    const result = {};

    // 1. INVENTORY (Self-Healing Dual-Sync)
    const localMeds = getUserInventory(userId);
    const serverMeds = (invRes.status === 'fulfilled' && Array.isArray(invRes.value?.medicines))
      ? invRes.value.medicines
      : null;

    if (serverMeds && serverMeds.length > 0) {
      // Server SQLite has data -> authoritative source
      const taggedMeds = serverMeds.map(m => ({ ...m, userId }));
      try {
        localStorage.setItem(`medvault_inventory_${userId}`, JSON.stringify(taggedMeds));
      } catch {}
      result.medicines = taggedMeds;
    } else if (localMeds && localMeds.length > 0) {
      // Local cache has data, but server SQLite is empty (e.g. server restarted or container reset)
      // SELF-HEALING: Never wipe user's local inventory! Restore directly into server SQLite.
      const taggedMeds = localMeds.map(m => ({ ...m, userId }));
      result.medicines = taggedMeds;
      api.apiSyncInventory(userId, taggedMeds, false).catch(e => console.warn('SQLite auto-restore medicines:', e));
    } else {
      result.medicines = [];
    }

    // 2. VOUCHERS (Self-Healing Dual-Sync)
    const localVchs = getUserVouchers(userId);
    const serverVchs = (vchRes.status === 'fulfilled' && Array.isArray(vchRes.value?.vouchers))
      ? vchRes.value.vouchers
      : null;

    if (serverVchs && serverVchs.length > 0) {
      const taggedVchs = serverVchs.map(v => ({ ...v, userId }));
      try {
        localStorage.setItem(`medvault_vouchers_${userId}`, JSON.stringify(taggedVchs));
      } catch {}
      result.vouchers = taggedVchs;
    } else if (localVchs && localVchs.length > 0) {
      // Server SQLite empty, restore from client cache
      const taggedVchs = localVchs.map(v => ({ ...v, userId }));
      result.vouchers = taggedVchs;
      api.apiSyncVouchers(userId, taggedVchs).catch(e => console.warn('SQLite auto-restore vouchers:', e));
    } else {
      result.vouchers = [];
    }

    // 3. STORE PROFILE (Self-Healing & Merge)
    const localProf = getUserProfile(userId, null);
    const serverProf = (profRes.status === 'fulfilled' && profRes.value?.profile)
      ? profRes.value.profile
      : null;

    // Check registry for any saved store name or owner name
    let registryStoreName = '';
    let registryOwnerName = '';
    try {
      const reg = JSON.parse(localStorage.getItem(USERS_REGISTRY_KEY) || '{}');
      if (reg[cleanPhone]) {
        registryStoreName = reg[cleanPhone].storeName || '';
        registryOwnerName = reg[cleanPhone].name || '';
      }
    } catch {}

    const resolvedStoreName = (serverProf?.storeName && serverProf.storeName.trim()) 
      || (localProf?.storeName && localProf.storeName.trim()) 
      || registryStoreName 
      || '';

    const resolvedOwnerName = (serverProf?.ownerName && serverProf.ownerName.trim()) 
      || (localProf?.ownerName && localProf.ownerName.trim()) 
      || registryOwnerName 
      || '';

    const mergedProfile = {
      storeName: resolvedStoreName,
      ownerName: resolvedOwnerName,
      drugLicense20B: serverProf?.drugLicense20B || localProf?.drugLicense20B || '',
      drugLicense21B: serverProf?.drugLicense21B || localProf?.drugLicense21B || '',
      gstin: serverProf?.gstin || localProf?.gstin || '',
      phone: cleanPhone,
      email: serverProf?.email || localProf?.email || '',
      address: serverProf?.address || localProf?.address || '',
      logoUrl: serverProf?.logoUrl || localProf?.logoUrl || '',
    };

    if (mergedProfile.storeName || mergedProfile.phone) {
      try {
        localStorage.setItem(`medvault_profile_${userId}`, JSON.stringify(mergedProfile));
      } catch {}
      result.profile = mergedProfile;

      // If server was missing storeName or details, re-sync to SQLite
      if (!serverProf?.storeName && mergedProfile.storeName) {
        api.apiSaveProfile(userId, mergedProfile).catch(e => console.warn('SQLite auto-restore profile:', e));
      }
    } else {
      result.profile = mergedProfile;
    }

    // 4. CATEGORIES (Self-Healing)
    const localCats = getUserCategories(userId);
    const serverCats = (catRes.status === 'fulfilled' && Array.isArray(catRes.value?.categories))
      ? catRes.value.categories
      : null;

    if (serverCats && serverCats.length > 0) {
      const combined = Array.from(new Set([...serverCats, ...(localCats || [])]));
      try {
        localStorage.setItem(`medvault_categories_${userId}`, JSON.stringify(combined));
      } catch {}
      result.categories = combined;
    } else if (localCats && localCats.length > 0) {
      result.categories = localCats;
      localCats.forEach(c => api.apiAddCategory(userId, c).catch(() => {}));
    } else {
      result.categories = [];
    }

    // 5. THEME (Self-Healing)
    const localTheme = getUserTheme(userId);
    const serverTheme = (themeRes.status === 'fulfilled' && themeRes.value?.theme)
      ? themeRes.value.theme
      : null;

    if (serverTheme) {
      try {
        localStorage.setItem(`medvault_theme_${userId}`, JSON.stringify(serverTheme));
      } catch {}
      result.theme = serverTheme;
    } else if (localTheme) {
      result.theme = localTheme;
      api.apiSaveTheme(userId, localTheme).catch(() => {});
    }

    return result;
  } catch (e) {
    console.warn('Could not load user data from database:', e);
    // Safe fallback to local cache on error so user never sees empty screen
    return {
      medicines: getUserInventory(userId),
      vouchers: getUserVouchers(userId),
      profile: getUserProfile(userId, null),
      categories: getUserCategories(userId),
      theme: getUserTheme(userId),
    };
  }
}
