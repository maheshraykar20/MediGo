import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
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
  adminDeleteTenantStore
} from './dbService.js';

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
    // PROFILE ROUTES
    // ---------------------------------------------------------
    if (pathname === '/api/store/profile' && req.method === 'GET') {
      const userId = query.userId;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required' });
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
    // DATABASE INSPECTOR (For Live User Inspection of All SQLite DBs)
    // ---------------------------------------------------------
    if (pathname === '/api/db/inspector' && req.method === 'GET') {
      const inspectorData = getDatabaseInspectorData();
      sendJson(res, 200, inspectorData);
      return true;
    }

    if (pathname === '/api/db/table-data' && req.method === 'GET') {
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
    // SUPER ADMIN EXCLUSIVE ROUTES
    // ---------------------------------------------------------
    if (pathname === '/api/admin/notifications' && req.method === 'GET') {
      const limit = parseInt(query.limit, 10) || 100;
      const unreadOnly = query.unread === 'true';
      const data = getAdminNotifications(limit, unreadOnly);
      sendJson(res, 200, data);
      return true;
    }

    if (pathname === '/api/admin/notifications/mark-read' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = markAdminNotificationRead(body.id || 'all');
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/notifications/clear' && req.method === 'POST') {
      const result = clearAdminNotifications();
      sendJson(res, 200, result);
      return true;
    }

    if (pathname === '/api/admin/tenants' && req.method === 'GET') {
      const inspectorData = getDatabaseInspectorData();
      sendJson(res, 200, inspectorData);
      return true;
    }

    if (pathname === '/api/admin/tenant-data' && req.method === 'GET') {
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
      const fileName = query.file;
      if (!fileName || !fileName.endsWith('.sqlite')) {
        sendJson(res, 400, { error: 'Valid .sqlite file name required' });
        return true;
      }

      const filePath = path.resolve(process.cwd(), 'data', 'databases', path.basename(fileName));
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
    console.error('API Error in', pathname, error);
    sendJson(res, 500, { error: error.message || 'Internal Server Error' });
    return true;
  }
}
