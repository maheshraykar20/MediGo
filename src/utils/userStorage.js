// Multi-tenant and User Isolation storage utilities (Supports 500+ Private Pharmacy Stores)
import * as api from './apiService.js';

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

// Returns currently logged in session user, or null if fresh link visit
export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (raw) return JSON.parse(raw);
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

  const otpPayload = {
    phone: cleanPhone,
    code: otpCode,
    expiresAt,
    customName: customName.trim(),
    customStoreName: customStoreName.trim(),
    generatedAt: new Date().toLocaleTimeString(),
  };

  try {
    sessionStorage.setItem(`${OTP_STORE_KEY}_${cleanPhone}`, JSON.stringify(otpPayload));
    // Sync OTP to central SQLite database with the exact code
    api.apiRequestOtp(cleanPhone, customName, customStoreName, otpCode).catch(e => console.warn('SQLite OTP sync:', e));
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
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load user inventory:', e);
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
    api.apiSyncInventory(userId, inventory).catch(e => console.warn('SQLite inventory sync:', e));
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
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load user vouchers:', e);
  }

  // Fresh user starts with 100% BLANK vouchers!
  return [];
}

export function saveUserVouchers(userId, vouchers) {
  if (!userId) return;
  const key = `medvault_vouchers_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(vouchers));
    // Persist to user's dedicated SQLite database!
    api.apiSyncVouchers(userId, vouchers).catch(e => console.warn('SQLite vouchers sync:', e));
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
  if (!userId) return fallback;
  const cleanPhone = (userId || '').replace('usr_', '');
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

  // Fresh user profile: 100% blank slate so the user manually fills everything,
  // with only the verified login phone number populated.
  const blankProfile = {
    storeName: '',
    ownerName: '',
    drugLicense20B: '',
    drugLicense21B: '',
    gstin: '',
    phone: cleanPhone,
    email: '',
    address: '',
    logoUrl: '',
  };

  saveUserProfile(userId, blankProfile);
  return blankProfile;
}

export function saveUserProfile(userId, profile) {
  if (!userId) return;
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

// Load and hydrate user's data from their dedicated SQLite database file
export async function loadUserDataFromDatabase(userId) {
  if (!userId) return null;
  try {
    const [invRes, vchRes, profRes, catRes, themeRes] = await Promise.allSettled([
      api.apiGetInventory(userId),
      api.apiGetVouchers(userId),
      api.apiGetProfile(userId),
      api.apiGetCategories(userId),
      api.apiGetTheme(userId),
    ]);

    const result = {};
    if (invRes.status === 'fulfilled' && invRes.value?.medicines) {
      saveUserInventory(userId, invRes.value.medicines);
      result.medicines = invRes.value.medicines;
    }
    if (vchRes.status === 'fulfilled' && vchRes.value?.vouchers) {
      saveUserVouchers(userId, vchRes.value.vouchers);
      result.vouchers = vchRes.value.vouchers;
    }
    if (profRes.status === 'fulfilled' && profRes.value?.profile) {
      saveUserProfile(userId, profRes.value.profile);
      result.profile = profRes.value.profile;
    }
    if (catRes.status === 'fulfilled' && catRes.value?.categories) {
      saveUserCategories(userId, catRes.value.categories);
      result.categories = catRes.value.categories;
    }
    if (themeRes.status === 'fulfilled' && themeRes.value?.theme) {
      saveUserTheme(userId, themeRes.value.theme);
      result.theme = themeRes.value.theme;
    }
    return result;
  } catch (e) {
    console.warn('Could not load user data from database:', e);
    return null;
  }
}
