// Client-side API service connecting Frontend to Real Multi-Tenant SQLite Database

const API_BASE = '/api';

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`API call to ${endpoint} failed:`, error.message);
    throw error;
  }
}

// -------------------------------------------------------------
// AUTH & OTP
// -------------------------------------------------------------
export async function apiRequestOtp(phone, customName = '', customStoreName = '', otpCode = null) {
  return fetchJson('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, customName, customStoreName, otpCode }),
  });
}

export async function apiVerifyOtp(phone, code) {
  return fetchJson('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

// -------------------------------------------------------------
// STORE PROFILE
// -------------------------------------------------------------
export async function apiGetProfile(userId) {
  return fetchJson(`/store/profile?userId=${encodeURIComponent(userId)}`);
}

export async function apiSaveProfile(userId, profile, isExplicit = false) {
  return fetchJson('/store/profile', {
    method: 'POST',
    body: JSON.stringify({ userId, profile, isExplicit }),
  });
}

// -------------------------------------------------------------
// INVENTORY
// -------------------------------------------------------------
export async function apiGetInventory(userId) {
  return fetchJson(`/store/inventory?userId=${encodeURIComponent(userId)}`);
}

export async function apiSyncInventory(userId, medicines, isBulkExcelImport = false) {
  return fetchJson('/store/inventory/sync', {
    method: 'POST',
    body: JSON.stringify({ userId, medicines, isBulkExcelImport }),
  });
}

export async function apiSaveMedicine(userId, medicine) {
  return fetchJson('/store/inventory/save', {
    method: 'POST',
    body: JSON.stringify({ userId, medicine }),
  });
}

export async function apiDeleteMedicine(userId, medId) {
  return fetchJson(`/store/inventory/${encodeURIComponent(medId)}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// VOUCHERS
// -------------------------------------------------------------
export async function apiGetVouchers(userId) {
  return fetchJson(`/store/vouchers?userId=${encodeURIComponent(userId)}`);
}

export async function apiSyncVouchers(userId, vouchers) {
  return fetchJson('/store/vouchers/sync', {
    method: 'POST',
    body: JSON.stringify({ userId, vouchers }),
  });
}

export async function apiSaveVoucher(userId, voucher) {
  return fetchJson('/store/vouchers/save', {
    method: 'POST',
    body: JSON.stringify({ userId, voucher }),
  });
}

export async function apiDeleteVoucher(userId, vchId) {
  return fetchJson(`/store/vouchers/${encodeURIComponent(vchId)}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------
export async function apiGetCategories(userId) {
  return fetchJson(`/store/categories?userId=${encodeURIComponent(userId)}`);
}

export async function apiAddCategory(userId, name) {
  return fetchJson('/store/categories', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
  });
}

export async function apiDeleteCategory(userId, name) {
  return fetchJson(`/store/categories?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// THEME
// -------------------------------------------------------------
export async function apiGetTheme(userId) {
  return fetchJson(`/store/theme?userId=${encodeURIComponent(userId)}`);
}

export async function apiSaveTheme(userId, theme) {
  return fetchJson('/store/theme', {
    method: 'POST',
    body: JSON.stringify({ userId, theme }),
  });
}

// -------------------------------------------------------------
// RESET
// -------------------------------------------------------------
export async function apiResetData(userId) {
  return fetchJson('/store/reset', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

// -------------------------------------------------------------
// DATABASE INSPECTOR & STATS (For live user inspection)
// -------------------------------------------------------------
export async function apiGetDatabaseInspector() {
  return fetchJson('/db/inspector');
}

export async function apiGetTableData(userId, table = 'medicines') {
  return fetchJson(`/db/table-data?userId=${encodeURIComponent(userId)}&table=${encodeURIComponent(table)}`);
}

// -------------------------------------------------------------
// SUPER ADMIN NOTIFICATIONS & TENANT EDIT API
// -------------------------------------------------------------
export async function apiAdminGetNotifications(limit = 100, unreadOnly = false) {
  return fetchJson(`/admin/notifications?limit=${limit}&unread=${unreadOnly}`);
}

export async function apiAdminMarkNotificationRead(id = 'all') {
  return fetchJson('/admin/notifications/mark-read', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export async function apiAdminClearNotifications() {
  return fetchJson('/admin/notifications/clear', {
    method: 'POST',
  });
}

export async function apiAdminGetTenants() {
  return fetchJson('/admin/tenants');
}

export async function apiAdminGetTenantData(userId) {
  return fetchJson(`/admin/tenant-data?userId=${encodeURIComponent(userId)}`);
}

export async function apiAdminSaveMedicine(userId, medicine) {
  return fetchJson('/admin/medicine/save', {
    method: 'POST',
    body: JSON.stringify({ userId, medicine }),
  });
}

export async function apiAdminDeleteMedicine(userId, medicineId) {
  return fetchJson(`/admin/medicine?userId=${encodeURIComponent(userId)}&medicineId=${encodeURIComponent(medicineId)}`, {
    method: 'DELETE',
  });
}

export async function apiAdminSaveVoucher(userId, voucher) {
  return fetchJson('/admin/voucher/save', {
    method: 'POST',
    body: JSON.stringify({ userId, voucher }),
  });
}

export async function apiAdminDeleteVoucher(userId, voucherId) {
  return fetchJson(`/admin/voucher?userId=${encodeURIComponent(userId)}&voucherId=${encodeURIComponent(voucherId)}`, {
    method: 'DELETE',
  });
}

export async function apiAdminSaveProfile(userId, profile) {
  return fetchJson('/admin/profile/save', {
    method: 'POST',
    body: JSON.stringify({ userId, profile }),
  });
}

export async function apiAdminDeleteTenant(userId) {
  return fetchJson(`/admin/tenant?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function getAdminSqliteDownloadUrl(fileName) {
  return `/api/admin/download-sqlite?file=${encodeURIComponent(fileName)}`;
}
