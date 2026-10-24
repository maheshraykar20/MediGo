import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { 
  createOtpSession, 
  verifyOtpAndGetUser, 
  getDbUserProfile, 
  saveDbUserProfile, 
  getDbUserInventory, 
  saveDbUserMedicine,
  syncDbAllMedicines, 
  deleteDbUserMedicine, 
  getDbUserVouchers, 
  saveDbUserVoucher,
  syncDbAllVouchers, 
  deleteDbUserVoucher, 
  getDbUserCategories, 
  addDbUserCategory, 
  deleteDbUserCategory, 
  getDbUserSetting, 
  saveDbUserSetting, 
  resetDbUserData,
  getDatabaseInspectorData,
  getUserDatabase,
  getAdminNotifications,
  markAdminNotificationRead,
  clearAdminNotifications,
  getAdminTenantFullData,
  adminSaveTenantMedicine,
  adminDeleteTenantMedicine,
  adminSaveTenantVoucher,
  adminDeleteTenantVoucher,
  adminSaveTenantProfile,
  adminDeleteTenantStore,
  getActiveStoresCount,
  isStoreDeleted,
  DB_DIR,
  verifyDatabasePersistence
} from './dbService.js';

// -------------------------------------------------------------
// SERVER-SIDE ADMIN AUTHENTICATION & SECURITY (Addresses /admin route security)
// -------------------------------------------------------------
const ADMIN_MASTER_PIN = process.env.ADMIN_PIN || process.env.ADMIN_SECRET || '7777';

// Active cryptographically random admin sessions (in-memory)
// token -> { token, createdAt, expiresAt, ip }
const activeAdminSessions = new Map();

// Rate limiting: ip -> { count, lockedUntil }
const adminLoginAttempts = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

function checkAdminRateLimit(ip) {
  const record = adminLoginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const waitSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { 
      allowed: false, 
      message: `Too many failed attempts. Security lock active. Try again in ${waitSec} seconds.` 
    };
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    adminLoginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordAdminFailedAttempt(ip) {
  const record = adminLoginAttempts.get(ip) || { count: 0, lockedUntil: null };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
  }
  adminLoginAttempts.set(ip, record);
}

function clearAdminRateLimit(ip) {
  adminLoginAttempts.delete(ip);
}

function createAdminSession(ip) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  activeAdminSessions.set(token, {
    token,
    createdAt: Date.now(),
    expiresAt,
    ip
  });
  return { token, expiresAt };
}

function verifyAdminSession(token) {
  if (!token || typeof token !== 'string') return false;
  const session = activeAdminSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return false;
  }
  return true;
}

function extractAdminToken(req, query) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.headers['x-admin-token']) {
    return req.headers['x-admin-token'].toString().trim();
  }
  if (query && query.token) {
    return query.token.toString().trim();
  }
  return null;
}

function requireAdminAuth(req, res, query) {
  const token = extractAdminToken(req, query);
  if (!verifyAdminSession(token)) {
    sendJson(res, 401, {
      success: false,
      error: 'Unauthorized: Admin authentication required. Please login with your Admin Master PIN.',
      code: 'ADMIN_UNAUTHORIZED'
    });
    return false;
  }
  return true;
}

// Helper to parse JSON body from incoming HTTP request
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (!pathname.startsWith('/api/')) {
    return false; // Not an API request, let Vite handle it
  }

  try {
    // ---------------------------------------------------------
    // PUBLIC STATS ROUTE (Real Dynamic Active Pharmacy Count)
    // ---------------------------------------------------------
    if (pathname === '/api/public/stats' && req.method === 'GET') {
      const activeCount = getActiveStoresCount();
      sendJson(res, 200, { success: true, activeStoresCount: activeCount });
      return true;
    }

    // ---------------------------------------------------------
    // AUTH & OTP ROUTES
    // ---------------------------------------------------------
    if ((pathname === '/api/auth/request-otp' || pathname === '/api/auth/send-otp') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = createOtpSession(body.phone || '', body.customName, body.customStoreName, body.otpCode || body.code);
      sendJson(res, result.success ? 200 : 400, result);
      return true;
    }

    if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const otpCode = body.code || body.otp || '';
      const result = verifyOtpAndGetUser(body.phone || '', otpCode);
      sendJson(res, result.success ? 200 : 400, result);
      return true;
    }

    // ---------------------------------------------------------
    // STORE SESSION & DELETION STATUS (Auto-logout if deleted by admin)
    // ---------------------------------------------------------
    if (pathname === '/api/store/session-status' && req.method === 'GET') {
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const deleted = isStoreDeleted(userId);
      sendJson(res, 200, { success: true, valid: !deleted, isDeleted: deleted });
      return true;
    }

    // ---------------------------------------------------------
    // PROFILE ROUTES
    // ---------------------------------------------------------
    if (pathname === '/api/store/profile' && req.method === 'GET') {
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      if (isStoreDeleted(userId)) {
        sendJson(res, 403, { error: 'STORE_DELETED', isDeleted: true, message: 'This store has been deleted by administrator' });
        return true;
      }
      const profile = getDbUserProfile(userId);
      sendJson(res, 200, { success: true, profile });
      return true;
    }

    if (pathname === '/api/store/profile' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = saveDbUserProfile(userId, body.profile || {}, body.isExplicit === true);
      sendJson(res, 200, result);
      return true;
    }

    // ---------------------------------------------------------
    // INVENTORY ROUTES
    // ---------------------------------------------------------
    if (pathname === '/api/store/inventory' && req.method === 'GET') {
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      if (isStoreDeleted(userId)) {
        sendJson(res, 403, { error: 'STORE_DELETED', isDeleted: true, message: 'This store has been deleted by administrator' });
        return true;
      }
      const medicines = getDbUserInventory(userId);
      sendJson(res, 200, { success: true, medicines, count: medicines.length });
      return true;
    }

    if (pathname === '/api/store/inventory/sync' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      if (isStoreDeleted(userId)) {
        sendJson(res, 403, { error: 'STORE_DELETED', isDeleted: true, message: 'This store has been deleted by administrator' });
        return true;
      }
      const result = syncDbAllMedicines(userId, body.medicines || [], body.isBulkExcelImport === true);
      sendJson(res, 200, result);
      return true;
    }

    if ((pathname === '/api/store/inventory/save' || pathname === '/api/store/inventory/medicine') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = saveDbUserMedicine(userId, body.medicine || {});
      sendJson(res, 200, result);
      return true;
    }

    if (pathname.startsWith('/api/store/inventory/') && req.method === 'DELETE') {
      const medId = pathname.replace('/api/store/inventory/', '');
      const userId = query.userId;
      if (!userId || !medId) {
        sendJson(res, 400, { error: 'userId and medId required' });
        return true;
      }
      const result = deleteDbUserMedicine(userId, medId);
      sendJson(res, 200, result);
      return true;
    }

    // ---------------------------------------------------------
    // VOUCHER ROUTES
    // ---------------------------------------------------------
    if (pathname === '/api/store/vouchers' && req.method === 'GET') {
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const vouchers = getDbUserVouchers(userId);
      sendJson(res, 200, { success: true, vouchers, count: vouchers.length });
      return true;
    }

    if (pathname === '/api/store/vouchers/sync' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = syncDbAllVouchers(userId, body.vouchers || []);
      sendJson(res, 200, result);
      return true;
    }

    if ((pathname === '/api/store/vouchers/save' || pathname === '/api/store/vouchers/voucher') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = saveDbUserVoucher(userId, body.voucher || {});
      sendJson(res, 200, result);
      return true;
    }

    if (pathname.startsWith('/api/store/vouchers/') && req.method === 'DELETE') {
      const vchId = pathname.replace('/api/store/vouchers/', '');
      const userId = query.userId;
      if (!userId || !vchId) {
        sendJson(res, 400, { error: 'userId and vchId required' });
        return true;
      }
      const result = deleteDbUserVoucher(userId, vchId);
      sendJson(res, 200, result);
      return true;
    }

    // ---------------------------------------------------------
    // CATEGORY ROUTES
    // ---------------------------------------------------------
    if (pathname === '/api/store/categories' && req.method === 'GET') {
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const categories = getDbUserCategories(userId);
      sendJson(res, 200, { success: true, categories });
      return true;
    }

    if (pathname === '/api/store/categories' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = addDbUserCategory(userId, body.name || '');
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/store/categories' && req.method === 'DELETE') {
      const userId = query.userId;
      const name = query.name;
      if (!userId || !name) {
        sendJson(res, 400, { error: 'userId and category name required' });
        return true;
      }
      const result = deleteDbUserCategory(userId, decodeURIComponent(name));
      sendJson(res, 200, result);
      return true;
    }

    // ---------------------------------------------------------
    // THEME & SETTINGS ROUTES
    // ---------------------------------------------------------
    if (pathname === '/api/store/theme' && req.method === 'GET') {
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const theme = getDbUserSetting(userId, 'color_theme', null);
      sendJson(res, 200, { success: true, theme });
      return true;
    }

    if (pathname === '/api/store/theme' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = saveDbUserSetting(userId, 'color_theme', body.theme);
      sendJson(res, 200, result);
      return true;
    }

    // ---------------------------------------------------------
    // RESET ROUTE
    // ---------------------------------------------------------
    if (pathname === '/api/store/reset' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userId = body.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = resetDbUserData(userId);
      sendJson(res, 200, result);
      return true;
    }

    // ---------------------------------------------------------
    // ADMIN AUTHENTICATION & SESSION MANAGEMENT
    // ---------------------------------------------------------
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const ip = getClientIp(req);
      const rateCheck = checkAdminRateLimit(ip);
      if (!rateCheck.allowed) {
        sendJson(res, 429, { success: false, error: rateCheck.message });
        return true;
      }

      const body = await parseJsonBody(req);
      const enteredPin = (body.pin || body.password || '').toString().trim();

      if (enteredPin && enteredPin === ADMIN_MASTER_PIN) {
        clearAdminRateLimit(ip);
        const session = createAdminSession(ip);
        sendJson(res, 200, {
          success: true,
          token: session.token,
          expiresAt: session.expiresAt,
          message: 'Admin authorization granted successfully'
        });
        return true;
      }

      recordAdminFailedAttempt(ip);
      // Subtle delay to mitigate timing attacks & brute force
      await new Promise(r => setTimeout(r, 600));
      sendJson(res, 401, { 
        success: false, 
        error: 'Invalid Master PIN. Admin access denied.' 
      });
      return true;
    }

    if (pathname === '/api/admin/verify-session' && req.method === 'GET') {
      const token = extractAdminToken(req, query);
      const isValid = verifyAdminSession(token);
      if (isValid) {
        sendJson(res, 200, { success: true, valid: true });
      } else {
        sendJson(res, 401, { success: false, valid: false, error: 'Session expired or invalid' });
      }
      return true;
    }

    if (pathname === '/api/admin/logout' && req.method === 'POST') {
      const token = extractAdminToken(req, query);
      if (token) {
        activeAdminSessions.delete(token);
      }
      sendJson(res, 200, { success: true, message: 'Logged out successfully' });
      return true;
    }

    // ---------------------------------------------------------
    // DATABASE INSPECTOR & DIAGNOSTICS (Server-Side Authorized)
    // ---------------------------------------------------------
    if (pathname === '/api/admin/diagnostics' && req.method === 'GET') {
      if (!requireAdminAuth(req, res, query)) return true;
      const persistenceData = verifyDatabasePersistence();
      sendJson(res, 200, {
        success: true,
        diagnostics: {
          ...persistenceData,
          serverUptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          activeAdminSessionsCount: activeAdminSessions.size,
          environment: process.env.NODE_ENV || 'production'
        }
      });
      return true;
    }

    if (pathname === '/api/db/inspector' && req.method === 'GET') {
      if (!requireAdminAuth(req, res, query)) return true;
      const inspectorData = getDatabaseInspectorData();
      sendJson(res, 200, inspectorData);
      return true;
    }

    if (pathname === '/api/db/table-data' && req.method === 'GET') {
      if (!requireAdminAuth(req, res, query)) return true;
      const userId = query.userId;
      const table = query.table || 'medicines';
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }

      // Safe whitelist of tables
      const allowed = ['medicines', 'vouchers', 'custom_categories', 'store_profile', 'database_audit_logs'];
      if (!allowed.includes(table)) {
        sendJson(res, 400, { error: 'Invalid table' });
        return true;
      }

      const db = getUserDatabase(userId);
      const rows = db.prepare(`SELECT * FROM ${table} LIMIT 100`).all();
      sendJson(res, 200, { success: true, table, rows, count: rows.length });
      return true;
    }

    // ---------------------------------------------------------
    // SUPER ADMIN EXCLUSIVE ROUTES (Protected by Bearer Token)
    // ---------------------------------------------------------
    if (pathname === '/api/admin/notifications' && req.method === 'GET') {
      if (!requireAdminAuth(req, res, query)) return true;
      const limit = parseInt(query.limit, 10) || 100;
      const unreadOnly = query.unread === 'true';
      const data = getAdminNotifications(limit, unreadOnly);
      sendJson(res, 200, data);
      return true;
    }

    if (pathname === '/api/admin/notifications/mark-read' && req.method === 'POST') {
      if (!requireAdminAuth(req, res, query)) return true;
      const body = await parseJsonBody(req);
      const result = markAdminNotificationRead(body.id || 'all');
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/notifications/clear' && req.method === 'POST') {
      if (!requireAdminAuth(req, res, query)) return true;
      const result = clearAdminNotifications();
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/tenants' && req.method === 'GET') {
      if (!requireAdminAuth(req, res, query)) return true;
      const inspectorData = getDatabaseInspectorData();
      sendJson(res, 200, inspectorData);
      return true;
    }

    if (pathname === '/api/admin/tenant-data' && req.method === 'GET') {
      if (!requireAdminAuth(req, res, query)) return true;
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const data = getAdminTenantFullData(userId);
      sendJson(res, 200, data);
      return true;
    }

    if (pathname === '/api/admin/medicine/save' && req.method === 'POST') {
      if (!requireAdminAuth(req, res, query)) return true;
      const body = await parseJsonBody(req);
      if (!body.userId || !body.medicine) {
        sendJson(res, 400, { error: 'userId and medicine are required' });
        return true;
      }
      const result = adminSaveTenantMedicine(body.userId, body.medicine);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/medicine' && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res, query)) return true;
      const userId = query.userId;
      const medId = query.medicineId;
      if (!userId || !medId) {
        sendJson(res, 400, { error: 'userId and medicineId are required' });
        return true;
      }
      const result = adminDeleteTenantMedicine(userId, medId);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/voucher/save' && req.method === 'POST') {
      if (!requireAdminAuth(req, res, query)) return true;
      const body = await parseJsonBody(req);
      if (!body.userId || !body.voucher) {
        sendJson(res, 400, { error: 'userId and voucher are required' });
        return true;
      }
      const result = adminSaveTenantVoucher(body.userId, body.voucher);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/voucher' && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res, query)) return true;
      const userId = query.userId;
      const voucherId = query.voucherId;
      if (!userId || !voucherId) {
        sendJson(res, 400, { error: 'userId and voucherId are required' });
        return true;
      }
      const result = adminDeleteTenantVoucher(userId, voucherId);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/profile/save' && req.method === 'POST') {
      if (!requireAdminAuth(req, res, query)) return true;
      const body = await parseJsonBody(req);
      if (!body.userId || !body.profile) {
        sendJson(res, 400, { error: 'userId and profile are required' });
        return true;
      }
      const result = adminSaveTenantProfile(body.userId, body.profile);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/tenant' && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res, query)) return true;
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
        return true;
      }
      const result = adminDeleteTenantStore(userId);
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/download-sqlite' && req.method === 'GET') {
      if (!requireAdminAuth(req, res, query)) return true;
      const fileName = query.file;
      if (!fileName || !fileName.endsWith('.sqlite')) {
        sendJson(res, 400, { error: 'Valid .sqlite file name required' });
        return true;
      }

      const filePath = path.join(DB_DIR, path.basename(fileName));
      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { error: 'Database file not found on disk' });
        return true;
      }

      const fileBuffer = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${path.basename(fileName)}"`,
        'Content-Length': fileBuffer.length,
      });
      res.end(fileBuffer);
      return true;
    }

    sendJson(res, 404, { error: 'API endpoint not found', path: pathname });
    return true;
  } catch (error) {
    console.error('[API_INTERNAL_ERROR]', pathname, error);
    // Generic error message for clients to avoid leaking stack traces, file paths, or DB schemas
    sendJson(res, 500, { 
      success: false, 
      error: 'Internal Server Error' 
    });
    return true;
  }
}
