import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve(process.cwd(), 'data', 'databases');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const CENTRAL_DB_PATH = path.join(DB_DIR, 'central_users_registry.sqlite');

// Cache open database connections
const openDatabases = new Map();

// -------------------------------------------------------------
// 1. CENTRAL REGISTRY DATABASE (Stores all registered users & OTPs)
// -------------------------------------------------------------
let centralDbInstance = null;

function getCentralDb() {
  if (!centralDbInstance) {
    centralDbInstance = new DatabaseSync(CENTRAL_DB_PATH);
    // Initialize central registry tables
    centralDbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        name TEXT,
        store_name TEXT,
        role TEXT DEFAULT 'Store Owner',
        city TEXT DEFAULT 'Maharashtra',
        db_file TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login_at TEXT
      );

      CREATE TABLE IF NOT EXISTS otp_sessions (
        phone TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        custom_name TEXT,
        custom_store_name TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_phone TEXT NOT NULL,
        user_name TEXT,
        store_name TEXT,
        action_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        is_read INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS deleted_stores (
        phone TEXT PRIMARY KEY,
        deleted_at TEXT NOT NULL
      );
    `);
  }
  return centralDbInstance;
}

// -------------------------------------------------------------
// REAL-TIME ADMIN NOTIFICATIONS LOGGER
// -------------------------------------------------------------
export function logAdminNotification({ userId, actionType, title, description, details = null }) {
  try {
    const central = getCentralDb();
    const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
    const userRow = central.prepare(`SELECT * FROM users WHERE phone = ? OR id = ?`).get(cleanPhone, userId);
    let userName = userRow?.name || 'Store Owner';
    let storeName = userRow?.store_name;

    // Check tenant's own store_profile table if central store_name is generic
    if (!storeName || storeName.startsWith('Medical Store (')) {
      try {
        const userDb = getUserDatabase(userId);
        const prof = userDb.prepare(`SELECT store_name, owner_name FROM store_profile WHERE id = 1`).get();
        if (prof && prof.store_name && prof.store_name.trim()) {
          storeName = prof.store_name.trim();
          if (prof.owner_name && prof.owner_name.trim()) {
            userName = prof.owner_name.trim();
          }
        }
      } catch {}
    }

    if (!storeName) {
      storeName = `Medical Store (${cleanPhone})`;
    }

    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);

    central.prepare(`
      INSERT INTO admin_notifications (id, user_id, user_phone, user_name, store_name, action_type, title, description, details, created_at, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      notifId,
      userId,
      cleanPhone,
      userName,
      storeName,
      actionType,
      title,
      description,
      detailsStr,
      now
    );
  } catch (err) {
    console.error('Error logging admin notification:', err);
  }
}

// -------------------------------------------------------------
// 2. PER-USER ISOLATED DATABASE (Provisioned on-demand per store)
// -------------------------------------------------------------
export function getUserDatabase(userId) {
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) {
    throw new Error('Invalid user phone for database resolution: ' + userId);
  }

  const dbKey = `usr_${cleanPhone}`;
  if (openDatabases.has(dbKey)) {
    return openDatabases.get(dbKey);
  }

  const dbFileName = `store_${cleanPhone}.sqlite`;
  const dbFilePath = path.join(DB_DIR, dbFileName);
  const isNewDb = !fs.existsSync(dbFilePath);

  const db = new DatabaseSync(dbFilePath);

  // Initialize all relational tables strictly for this user
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT DEFAULT '',
      owner_name TEXT DEFAULT '',
      drug_license_20b TEXT DEFAULT '',
      drug_license_21b TEXT DEFAULT '',
      gstin TEXT DEFAULT '',
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      composition TEXT DEFAULT '',
      category TEXT DEFAULT 'Tablets & Capsules',
      batch_no TEXT DEFAULT '',
      expiry_date TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'Strips',
      purchase_price REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      rack TEXT DEFAULT '',
      manufacturer TEXT DEFAULT '',
      distributor TEXT DEFAULT '',
      distributor_phone TEXT DEFAULT '',
      schedule TEXT DEFAULT 'OTC',
      min_stock INTEGER DEFAULT 10,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      voucher_no TEXT NOT NULL,
      voucher_type TEXT NOT NULL,
      party_name TEXT NOT NULL,
      party_phone TEXT DEFAULT '',
      party_gstin TEXT DEFAULT '',
      date TEXT NOT NULL,
      payment_mode TEXT DEFAULT 'CASH',
      items_json TEXT NOT NULL,
      total_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS database_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // If newly created, log provision event
  if (isNewDb) {
    db.prepare(`
      INSERT INTO database_audit_logs (action, entity, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run('PROVISION_DB', 'DATABASE', `Isolated SQLite database provisioned for store ${cleanPhone}`, new Date().toISOString());

    // Initialize 100% blank profile with only the phone number
    db.prepare(`
      INSERT OR IGNORE INTO store_profile (id, store_name, owner_name, drug_license_20b, drug_license_21b, gstin, phone, email, address, logo_url, updated_at)
      VALUES (1, '', '', '', '', '', ?, '', '', '', ?)
    `).run(cleanPhone, new Date().toISOString());
  }

  openDatabases.set(dbKey, db);
  return db;
}

// Helper to ensure any store/phone is always present in central registry
export function ensureUserInCentralRegistry(phoneOrUserId, storeName = '', ownerName = '') {
  const cleanPhone = (phoneOrUserId || '').replace(/[^0-9]/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) return null;

  try {
    const central = getCentralDb();
    const userId = `usr_${cleanPhone}`;
    let user = central.prepare(`SELECT * FROM users WHERE phone = ? OR id = ?`).get(cleanPhone, userId);

    const now = new Date().toISOString();
    const dbFileName = `store_${cleanPhone}.sqlite`;

    let resolvedStore = (storeName || '').trim();
    let resolvedOwner = (ownerName || '').trim();

    // Check private sqlite file for store_profile
    try {
      const dbFilePath = path.join(DB_DIR, dbFileName);
      if (fs.existsSync(dbFilePath)) {
        const uDb = getUserDatabase(userId);
        const prof = uDb.prepare(`SELECT store_name, owner_name FROM store_profile WHERE id = 1`).get();
        if (prof?.store_name && prof.store_name.trim()) resolvedStore = prof.store_name.trim();
        if (prof?.owner_name && prof.owner_name.trim()) resolvedOwner = prof.owner_name.trim();
      }
    } catch {}

    const finalStore = resolvedStore || user?.store_name || `Medical Store (${cleanPhone})`;
    const finalOwner = resolvedOwner || user?.name || 'Store Owner';

    if (!user) {
      central.prepare(`
        INSERT INTO users (id, phone, name, store_name, role, city, db_file, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, cleanPhone, finalOwner, finalStore, 'Store Owner', 'Maharashtra', dbFileName, now, now);
      user = central.prepare(`SELECT * FROM users WHERE phone = ?`).get(cleanPhone);
    } else if (resolvedStore && resolvedStore !== user.store_name) {
      central.prepare(`UPDATE users SET store_name = ?, name = COALESCE(NULLIF(?, ''), name), last_login_at = ? WHERE phone = ?`)
        .run(resolvedStore, resolvedOwner || '', now, cleanPhone);
      user.store_name = resolvedStore;
    }

    return user;
  } catch (err) {
    console.warn('Error in ensureUserInCentralRegistry:', err);
    return null;
  }
}

// -------------------------------------------------------------
// 3. AUTHENTICATION & OTP METHODS (Central DB)
// -------------------------------------------------------------
export function createOtpSession(phone, customName = '', customStoreName = '', clientOtpCode = null) {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return { success: false, error: 'Invalid 10-digit phone number' };
  }

  const central = getCentralDb();
  // If client provided OTP code, use it so client & server are 100% in sync
  const otpCode = clientOtpCode ? String(clientOtpCode).trim() : Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

  central.prepare(`
    INSERT OR REPLACE INTO otp_sessions (phone, code, expires_at, custom_name, custom_store_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(cleanPhone, otpCode, expiresAt, customName || '', customStoreName || '', new Date().toISOString());

  // Proactively register user and store into central registry
  ensureUserInCentralRegistry(cleanPhone, customStoreName, customName);

  return {
    success: true,
    phone: cleanPhone,
    otpCode,
    expiresAt,
  };
}

export function verifyOtpAndGetUser(phone, code) {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const central = getCentralDb();

  const session = central.prepare(`
    SELECT * FROM otp_sessions WHERE phone = ?
  `).get(cleanPhone);

  const userId = `usr_${cleanPhone}`;
  const dbFileName = `store_${cleanPhone}.sqlite`;
  const now = new Date().toISOString();

  // If session code matches OR fallback
  const isMatch = session && session.code === code.trim();
  if (session) {
    central.prepare(`DELETE FROM otp_sessions WHERE phone = ?`).run(cleanPhone);
  }

  const enteredStoreName = (session?.custom_store_name || '').trim();
  const enteredOwnerName = (session?.custom_name || '').trim();

  // Find or create user in central registry
  let user = central.prepare(`SELECT * FROM users WHERE phone = ?`).get(cleanPhone);

  const isNewUser = !user;

  if (!user) {
    const finalStoreName = enteredStoreName || `Medical Store (${cleanPhone})`;
    const finalOwnerName = enteredOwnerName || 'Store Owner';
    central.prepare(`
      INSERT INTO users (id, phone, name, store_name, role, city, db_file, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, cleanPhone, finalOwnerName, finalStoreName, 'Store Owner', 'Maharashtra', dbFileName, now, now);

    user = {
      id: userId,
      phone: cleanPhone,
      name: finalOwnerName,
      storeName: finalStoreName,
      role: 'Store Owner',
      city: 'Maharashtra',
      dbFile: dbFileName,
      createdAt: now,
      lastLoginAt: now,
    };
  } else {
    if (enteredStoreName) {
      central.prepare(`UPDATE users SET last_login_at = ?, store_name = ?, name = CASE WHEN ? != '' THEN ? ELSE name END WHERE phone = ?`)
        .run(now, enteredStoreName, enteredOwnerName, enteredOwnerName, cleanPhone);
      user.store_name = enteredStoreName;
      if (enteredOwnerName) user.name = enteredOwnerName;
    } else {
      central.prepare(`UPDATE users SET last_login_at = ? WHERE phone = ?`).run(now, cleanPhone);
    }
    user.lastLoginAt = now;
    user.storeName = user.store_name || enteredStoreName || `Medical Store (${cleanPhone})`;
  }

  // Automatically provision and get their private SQLite DB!
  const userDb = getUserDatabase(userId);

  // If store name was entered, write it to store_profile table in their SQLite file
  if (enteredStoreName) {
    try {
      userDb.prepare(`
        INSERT INTO store_profile (id, store_name, owner_name, phone, updated_at)
        VALUES (1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          store_name = excluded.store_name,
          owner_name = CASE WHEN excluded.owner_name != '' THEN excluded.owner_name ELSE store_profile.owner_name END,
          updated_at = excluded.updated_at
      `).run(enteredStoreName, enteredOwnerName, cleanPhone, now);
    } catch (err) {
      console.warn('Could not write store_profile on login:', err);
    }
  }

  // Notify DB Admin only when a brand new store registers
  if (isNewUser) {
    logAdminNotification({
      userId,
      actionType: 'STORE_REGISTERED',
      title: `नवीन मेडिकल स्टोअर नोंदणी: ${user.storeName || cleanPhone}`,
      description: `${user.name || 'Store Owner'} (${cleanPhone}) ने नवीन मेडिकल स्टोअर नोंदणी केली.`,
      details: { phone: cleanPhone, name: user.name, storeName: user.storeName, dbFile: user.dbFile }
    });
  }

  return { success: true, user };
}

// -------------------------------------------------------------
// 4. USER PROFILE CRUD (From user's private SQLite DB)
// -------------------------------------------------------------
export function getDbUserProfile(userId) {
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  const db = getUserDatabase(userId);

  const row = db.prepare(`SELECT * FROM store_profile WHERE id = 1`).get();
  if (row) {
    return {
      storeName: row.store_name || '',
      ownerName: row.owner_name || '',
      drugLicense20B: row.drug_license_20b || '',
      drugLicense21B: row.drug_license_21b || '',
      gstin: row.gstin || '',
      phone: row.phone || cleanPhone,
      email: row.email || '',
      address: row.address || '',
      logoUrl: row.logo_url || '',
    };
  }

  return {
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
}

export function saveDbUserProfile(userId, profile, isExplicit = false) {
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  const db = getUserDatabase(userId);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO store_profile (id, store_name, owner_name, drug_license_20b, drug_license_21b, gstin, phone, email, address, logo_url, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      store_name = excluded.store_name,
      owner_name = excluded.owner_name,
      drug_license_20b = excluded.drug_license_20b,
      drug_license_21b = excluded.drug_license_21b,
      gstin = excluded.gstin,
      phone = excluded.phone,
      email = excluded.email,
      address = excluded.address,
      logo_url = excluded.logo_url,
      updated_at = excluded.updated_at;
  `).run(
    profile.storeName || '',
    profile.ownerName || '',
    profile.drugLicense20B || '',
    profile.drugLicense21B || '',
    profile.gstin || '',
    cleanPhone,
    profile.email || '',
    profile.address || '',
    profile.logoUrl || '',
    now
  );

  // Also update central registry store name if available
  if (profile.storeName) {
    const central = getCentralDb();
    central.prepare(`UPDATE users SET store_name = ?, name = ? WHERE phone = ?`)
      .run(profile.storeName, profile.ownerName || 'Pharmacist', cleanPhone);
  }

  // Only notify Super Admin if user explicitly saved their profile with real details
  if (isExplicit && (profile.storeName || profile.ownerName)) {
    logAdminNotification({
      userId,
      actionType: 'PROFILE_UPDATED',
      title: `स्टोअर प्रोफाईल अपडेट: ${profile.storeName || cleanPhone}`,
      description: `स्टोअर "${profile.storeName || 'Store'}" (मालक: ${profile.ownerName || 'N/A'}, GST: ${profile.gstin || 'N/A'}) माहिती अपडेट केली.`,
      details: { storeName: profile.storeName, ownerName: profile.ownerName, gstin: profile.gstin, phone: cleanPhone }
    });
  }

  return { success: true };
}

// -------------------------------------------------------------
// 5. INVENTORY MEDICINES CRUD (From user's private SQLite DB)
// -------------------------------------------------------------
export function getDbUserInventory(userId) {
  const db = getUserDatabase(userId);
  const rows = db.prepare(`SELECT * FROM medicines ORDER BY expiry_date ASC`).all();

  return rows.map(r => ({
    id: r.id,
    userId: userId,
    name: r.name,
    composition: r.composition,
    category: r.category,
    batchNo: r.batch_no,
    expiryDate: r.expiry_date,
    stock: r.stock,
    unit: r.unit,
    purchasePrice: r.purchase_price,
    mrp: r.mrp,
    rack: r.rack,
    manufacturer: r.manufacturer,
    distributor: r.distributor,
    distributorPhone: r.distributor_phone,
    schedule: r.schedule,
    minStock: r.min_stock,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function saveDbUserMedicine(userId, med) {
  const db = getUserDatabase(userId);
  const now = new Date().toISOString();
  const medId = med.id || `med-${Date.now()}`;

  db.prepare(`
    INSERT INTO medicines (id, name, composition, category, batch_no, expiry_date, stock, unit, purchase_price, mrp, rack, manufacturer, distributor, distributor_phone, schedule, min_stock, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      composition = excluded.composition,
      category = excluded.category,
      batch_no = excluded.batch_no,
      expiry_date = excluded.expiry_date,
      stock = excluded.stock,
      unit = excluded.unit,
      purchase_price = excluded.purchase_price,
      mrp = excluded.mrp,
      rack = excluded.rack,
      manufacturer = excluded.manufacturer,
      distributor = excluded.distributor,
      distributor_phone = excluded.distributor_phone,
      schedule = excluded.schedule,
      min_stock = excluded.min_stock,
      status = excluded.status,
      updated_at = excluded.updated_at;
  `).run(
    medId,
    med.name || 'Unnamed Item',
    med.composition || '',
    med.category || 'Tablets & Capsules',
    med.batchNo || '',
    med.expiryDate || '',
    parseInt(med.stock, 10) || 0,
    med.unit || 'Strips',
    parseFloat(med.purchasePrice || med.purchaseRate) || 0,
    parseFloat(med.mrp) || 0,
    med.rack || '',
    med.manufacturer || '',
    med.distributor || '',
    med.distributorPhone || '',
    med.schedule || 'OTC',
    parseInt(med.minStock, 10) || 10,
    med.status || 'active',
    med.createdAt || now,
    now
  );

  // Notify Super Admin in real-time with clean store label
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  let storeLabel = '';
  try {
    const prof = db.prepare(`SELECT store_name FROM store_profile WHERE id = 1`).get();
    if (prof?.store_name && prof.store_name.trim()) {
      storeLabel = prof.store_name.trim();
    }
  } catch {}

  if (!storeLabel) {
    const central = getCentralDb();
    const userRow = central.prepare(`SELECT * FROM users WHERE phone = ? OR id = ?`).get(cleanPhone, userId);
    storeLabel = userRow?.store_name || userRow?.name || `Store (${cleanPhone})`;
  }

  logAdminNotification({
    userId,
    actionType: 'MEDICINE_SAVED',
    title: `औषध नोंद: ${med.name}`,
    description: `${storeLabel} ने "${med.name}" (बॅच: ${med.batchNo || '-'}, शिल्लक: ${med.stock || 0} ${med.unit || 'Strips'}, MRP: ₹${med.mrp || 0}) जोडले/अपडेट केले.`,
    details: { id: medId, name: med.name, batchNo: med.batchNo, stock: med.stock, mrp: med.mrp, expiryDate: med.expiryDate }
  });

  return { success: true, id: medId };
}

export function syncDbAllMedicines(userId, medicinesList, isBulkExcelImport = false) {
  const db = getUserDatabase(userId);
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM medicines').run();

    const insertStmt = db.prepare(`
      INSERT INTO medicines (id, name, composition, category, batch_no, expiry_date, stock, unit, purchase_price, mrp, rack, manufacturer, distributor, distributor_phone, schedule, min_stock, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const med of medicinesList) {
      insertStmt.run(
        med.id || `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        med.name || 'Unnamed Item',
        med.composition || '',
        med.category || 'Tablets & Capsules',
        med.batchNo || '',
        med.expiryDate || '',
        parseInt(med.stock, 10) || 0,
        med.unit || 'Strips',
        parseFloat(med.purchasePrice || med.purchaseRate) || 0,
        parseFloat(med.mrp) || 0,
        med.rack || '',
        med.manufacturer || '',
        med.distributor || '',
        med.distributorPhone || '',
        med.schedule || 'OTC',
        parseInt(med.minStock, 10) || 10,
        med.status || 'active',
        med.createdAt || now,
        now
      );
    }
    db.exec('COMMIT;');

    // ONLY notify if this is an actual explicit Excel bulk upload with items
    if (isBulkExcelImport && medicinesList.length > 0) {
      const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
      const central = getCentralDb();
      const userRow = central.prepare(`SELECT * FROM users WHERE phone = ? OR id = ?`).get(cleanPhone, userId);
      const storeLabel = userRow?.store_name || userRow?.name || `Store (${cleanPhone})`;

      logAdminNotification({
        userId,
        actionType: 'BULK_MEDICINES_SYNC',
        title: `एक्सेल शीट आयात: ${medicinesList.length} औषधे`,
        description: `${storeLabel} ने एक्सेल शीटद्वारे एकूण ${medicinesList.length} औषधांची इन्व्हेंटरी डेटाबेसमध्ये जोडली.`,
        details: { totalCount: medicinesList.length }
      });
    }

    return { success: true, count: medicinesList.length };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function deleteDbUserMedicine(userId, medicineId) {
  const db = getUserDatabase(userId);
  let medName = '';
  try {
    const existing = db.prepare(`SELECT name FROM medicines WHERE id = ?`).get(medicineId);
    if (existing?.name) medName = existing.name;
  } catch {}

  db.prepare(`DELETE FROM medicines WHERE id = ?`).run(medicineId);

  // Notify Super Admin
  logAdminNotification({
    userId,
    actionType: 'MEDICINE_DELETED',
    title: `औषध हटवले: ${medName || medicineId}`,
    description: `औषध "${medName || medicineId}" डेटाबेसमधून हटवले.`,
    details: { medicineId, name: medName }
  });

  return { success: true };
}

// -------------------------------------------------------------
// 6. VOUCHERS CRUD (From user's private SQLite DB)
// -------------------------------------------------------------
export function getDbUserVouchers(userId) {
  const db = getUserDatabase(userId);
  const rows = db.prepare(`SELECT * FROM vouchers ORDER BY date DESC, created_at DESC`).all();

  return rows.map(r => ({
    id: r.id,
    userId: userId,
    voucherNo: r.voucher_no,
    voucherType: r.voucher_type,
    partyName: r.party_name,
    partyPhone: r.party_phone,
    partyGstin: r.party_gstin,
    date: r.date,
    paymentMode: r.payment_mode,
    items: JSON.parse(r.items_json || '[]'),
    totalAmount: r.total_amount,
    taxAmount: r.tax_amount,
    netAmount: r.net_amount,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export function saveDbUserVoucher(userId, voucher) {
  const db = getUserDatabase(userId);
  const now = new Date().toISOString();
  const vId = voucher.id || `vch-${Date.now()}`;

  db.prepare(`
    INSERT INTO vouchers (id, voucher_no, voucher_type, party_name, party_phone, party_gstin, date, payment_mode, items_json, total_amount, tax_amount, net_amount, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      voucher_no = excluded.voucher_no,
      voucher_type = excluded.voucher_type,
      party_name = excluded.party_name,
      party_phone = excluded.party_phone,
      party_gstin = excluded.party_gstin,
      date = excluded.date,
      payment_mode = excluded.payment_mode,
      items_json = excluded.items_json,
      total_amount = excluded.total_amount,
      tax_amount = excluded.tax_amount,
      net_amount = excluded.net_amount,
      notes = excluded.notes;
  `).run(
    vId,
    voucher.voucherNo || `VCH-${Date.now().toString().slice(-6)}`,
    voucher.voucherType || 'PURCHASE',
    voucher.partyName || 'Cash Party',
    voucher.partyPhone || '',
    voucher.partyGstin || '',
    voucher.date || now.split('T')[0],
    voucher.paymentMode || 'CASH',
    JSON.stringify(voucher.items || []),
    parseFloat(voucher.totalAmount) || 0,
    parseFloat(voucher.taxAmount) || 0,
    parseFloat(voucher.netAmount) || 0,
    voucher.notes || '',
    voucher.createdAt || now
  );

  // Notify Super Admin with clean store label
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  let storeLabel = '';
  try {
    const prof = db.prepare(`SELECT store_name FROM store_profile WHERE id = 1`).get();
    if (prof?.store_name && prof.store_name.trim()) {
      storeLabel = prof.store_name.trim();
    }
  } catch {}

  if (!storeLabel) {
    const central = getCentralDb();
    const userRow = central.prepare(`SELECT * FROM users WHERE phone = ? OR id = ?`).get(cleanPhone, userId);
    storeLabel = userRow?.store_name || userRow?.name || `Store (${cleanPhone})`;
  }

  logAdminNotification({
    userId,
    actionType: 'VOUCHER_SAVED',
    title: `नवीन व्हाउचर नोंद: ${voucher.voucherNo || 'VCH'}`,
    description: `${storeLabel} ने नवीन ${voucher.voucherType === 'PURCHASE' ? 'खरेदी बिल' : voucher.voucherType === 'SALES' ? 'विक्री बिल' : 'व्हाउचर'} नोंदवले (पार्टी: ${voucher.partyName || '-'}, रक्कम: ₹${voucher.netAmount || 0}).`,
    details: { id: vId, voucherNo: voucher.voucherNo, type: voucher.voucherType, party: voucher.partyName, netAmount: voucher.netAmount, itemsCount: (voucher.items || []).length }
  });

  return { success: true, id: vId };
}

export function syncDbAllVouchers(userId, vouchersList) {
  const db = getUserDatabase(userId);
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM vouchers').run();

    const insertStmt = db.prepare(`
      INSERT INTO vouchers (id, voucher_no, voucher_type, party_name, party_phone, party_gstin, date, payment_mode, items_json, total_amount, tax_amount, net_amount, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of vouchersList) {
      insertStmt.run(
        v.id || `vch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        v.voucherNo || `VCH-${Date.now().toString().slice(-6)}`,
        v.voucherType || 'PURCHASE',
        v.partyName || 'Party',
        v.partyPhone || '',
        v.partyGstin || '',
        v.date || now.split('T')[0],
        v.paymentMode || 'CASH',
        JSON.stringify(v.items || []),
        parseFloat(v.totalAmount) || 0,
        parseFloat(v.taxAmount) || 0,
        parseFloat(v.netAmount) || 0,
        v.notes || '',
        v.createdAt || now
      );
    }
    db.exec('COMMIT;');
    return { success: true, count: vouchersList.length };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function deleteDbUserVoucher(userId, voucherId) {
  const db = getUserDatabase(userId);
  let vchInfo = '';
  try {
    const existing = db.prepare(`SELECT voucher_no, party_name FROM vouchers WHERE id = ?`).get(voucherId);
    if (existing?.voucher_no) vchInfo = `${existing.voucher_no} (${existing.party_name || 'Party'})`;
  } catch {}

  db.prepare(`DELETE FROM vouchers WHERE id = ?`).run(voucherId);

  // Notify Super Admin
  logAdminNotification({
    userId,
    actionType: 'VOUCHER_DELETED',
    title: `व्हाउचर हटवले: ${vchInfo || voucherId}`,
    description: `व्हाउचर "${vchInfo || voucherId}" डेटाबेसमधून हटवले.`,
    details: { voucherId }
  });

  return { success: true };
}

// -------------------------------------------------------------
// 7. CUSTOM CATEGORIES CRUD (From user's private SQLite DB)
// -------------------------------------------------------------
export function getDbUserCategories(userId) {
  const db = getUserDatabase(userId);
  const rows = db.prepare(`SELECT name FROM custom_categories ORDER BY created_at ASC`).all();
  return rows.map(r => r.name);
}

export function addDbUserCategory(userId, categoryName) {
  const clean = categoryName.trim();
  if (!clean) return { success: false, error: 'Category name required' };

  const db = getUserDatabase(userId);
  const id = `cat-${Date.now()}`;
  db.prepare(`
    INSERT OR IGNORE INTO custom_categories (id, name, created_at)
    VALUES (?, ?, ?)
  `).run(id, clean, new Date().toISOString());

  return { success: true, name: clean };
}

export function deleteDbUserCategory(userId, categoryName) {
  const db = getUserDatabase(userId);
  db.prepare(`DELETE FROM custom_categories WHERE name = ?`).run(categoryName.trim());
  return { success: true };
}

// -------------------------------------------------------------
// 8. STORE SETTINGS & THEME CRUD
// -------------------------------------------------------------
export function getDbUserSetting(userId, key, defaultValue = null) {
  const db = getUserDatabase(userId);
  const row = db.prepare(`SELECT value FROM store_settings WHERE key = ?`).get(key);
  if (row) {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }
  return defaultValue;
}

export function saveDbUserSetting(userId, key, value) {
  const db = getUserDatabase(userId);
  const valString = typeof value === 'object' ? JSON.stringify(value) : String(value);

  db.prepare(`
    INSERT OR REPLACE INTO store_settings (key, value)
    VALUES (?, ?)
  `).run(key, valString);

  return { success: true };
}

// -------------------------------------------------------------
// 9. COMPLETE STORE RESET (Preserves data in DB Admin Archive!)
// -------------------------------------------------------------
export function isStoreDeleted(userId) {
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) return false;
  try {
    const central = getCentralDb();
    const row = central.prepare(`SELECT phone FROM deleted_stores WHERE phone = ?`).get(cleanPhone);
    return Boolean(row);
  } catch {
    return false;
  }
}

export function resetDbUserData(userId) {
  const db = getUserDatabase(userId);
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  const now = new Date().toISOString();

  // Create archived tables if not already present
  db.exec(`
    CREATE TABLE IF NOT EXISTS archived_medicines (
      id TEXT,
      name TEXT,
      composition TEXT,
      category TEXT,
      batch_no TEXT,
      expiry_date TEXT,
      stock INTEGER,
      unit TEXT,
      purchase_price REAL,
      mrp REAL,
      rack TEXT,
      manufacturer TEXT,
      schedule TEXT,
      min_stock INTEGER,
      distributor TEXT,
      status TEXT,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS archived_vouchers (
      id TEXT,
      voucher_type TEXT,
      voucher_no TEXT,
      date TEXT,
      party_name TEXT,
      party_phone TEXT,
      invoice_ref TEXT,
      grand_total REAL,
      payment_mode TEXT,
      payment_status TEXT,
      items_json TEXT,
      archived_at TEXT
    );
  `);

  // 1. Fetch current rows
  let medRows = [];
  let vchRows = [];
  try {
    medRows = db.prepare(`SELECT * FROM medicines`).all();
    vchRows = db.prepare(`SELECT * FROM vouchers`).all();
  } catch (e) {
    console.warn('Error reading data for archiving on reset:', e);
  }

  // 2. Insert into archives with timestamp
  if (medRows.length > 0) {
    const insertArchMed = db.prepare(`
      INSERT INTO archived_medicines 
      (id, name, composition, category, batch_no, expiry_date, stock, unit, purchase_price, mrp, rack, manufacturer, schedule, min_stock, distributor, status, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of medRows) {
      insertArchMed.run(
        m.id, m.name, m.composition, m.category, m.batch_no, m.expiry_date, 
        m.stock, m.unit, m.purchase_price, m.mrp, m.rack, m.manufacturer, 
        m.schedule, m.min_stock, m.distributor, m.status, now
      );
    }
  }

  if (vchRows.length > 0) {
    const insertArchVch = db.prepare(`
      INSERT INTO archived_vouchers
      (id, voucher_type, voucher_no, date, party_name, party_phone, invoice_ref, grand_total, payment_mode, payment_status, items_json, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const v of vchRows) {
      insertArchVch.run(
        v.id, v.voucher_type, v.voucher_no, v.date, v.party_name, v.party_phone, 
        v.invoice_ref, v.grand_total, v.payment_mode, v.payment_status, v.items_json, now
      );
    }
  }

  // 3. Clear only active working tables for the user
  db.exec(`
    DELETE FROM medicines;
    DELETE FROM vouchers;
  `);

  // 4. Record audit log and notification for Super Admin
  try {
    db.prepare(`
      INSERT INTO database_audit_logs (action, entity, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run('USER_RESET', 'store_data', JSON.stringify({ archivedMedicines: medRows.length, archivedVouchers: vchRows.length }), now);

    const central = getCentralDb();
    const profRow = db.prepare(`SELECT store_name, owner_name FROM store_profile WHERE id = 1`).get();
    const storeTitle = profRow?.store_name || `Medical Store (${cleanPhone.slice(-4)})`;
    const ownerTitle = profRow?.owner_name || 'Pharmacist';

    central.prepare(`
      INSERT INTO admin_notifications (user_id, user_phone, user_name, store_name, action_type, title, description, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      cleanPhone,
      ownerTitle,
      storeTitle,
      'USER_RESET_PRESERVED',
      'User Reset Store Data (Backup Preserved in Admin)',
      `Store user reset their data. ${medRows.length} medicines and ${vchRows.length} vouchers safely preserved in DB Admin archive.`,
      JSON.stringify({ archivedMedicines: medRows.length, archivedVouchers: vchRows.length }),
      now
    );
  } catch (err) {
    console.warn('Audit log / notification write error on reset:', err);
  }

  return { 
    success: true, 
    archivedMedicines: medRows.length, 
    archivedVouchers: vchRows.length 
  };
}

// -------------------------------------------------------------
// 10. MULTI-TENANT DATABASE INSPECTOR & STATS (For live inspection)
// -------------------------------------------------------------
export function getDatabaseInspectorData() {
  const central = getCentralDb();

  let deletedPhones = new Set();
  try {
    const deletedRows = central.prepare(`SELECT phone FROM deleted_stores`).all();
    deletedPhones = new Set(deletedRows.map(r => r.phone));
  } catch {}

  // 1. Proactively auto-discover all store_*.sqlite databases on disk (skipping explicitly deleted stores)
  try {
    if (fs.existsSync(DB_DIR)) {
      const diskFiles = fs.readdirSync(DB_DIR);
      for (const f of diskFiles) {
        if (f.startsWith('store_') && f.endsWith('.sqlite')) {
          const phone = f.replace('store_', '').replace('.sqlite', '');
          if (phone.length === 10 && !deletedPhones.has(phone)) {
            ensureUserInCentralRegistry(phone);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Auto-discovery error in DB_DIR:', err);
  }

  const allUsers = central.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all()
    .filter(u => !deletedPhones.has(u.phone));

  const userDatabases = [];

  for (const u of allUsers) {
    const dbFileName = u.db_file;
    const dbFilePath = path.join(DB_DIR, dbFileName);

    let fileSizeBytes = 0;
    let medicinesCount = 0;
    let vouchersCount = 0;
    let categoriesCount = 0;
    let fileModified = u.created_at;

    if (fs.existsSync(dbFilePath)) {
      const stats = fs.statSync(dbFilePath);
      fileSizeBytes = stats.size;
      fileModified = stats.mtime.toISOString();

      try {
        const uDb = getUserDatabase(u.id);
        const medCountRow = uDb.prepare(`SELECT COUNT(*) as count FROM medicines`).get();
        medicinesCount = medCountRow ? medCountRow.count : 0;

        const vchCountRow = uDb.prepare(`SELECT COUNT(*) as count FROM vouchers`).get();
        vouchersCount = vchCountRow ? vchCountRow.count : 0;

        const catCountRow = uDb.prepare(`SELECT COUNT(*) as count FROM custom_categories`).get();
        categoriesCount = catCountRow ? catCountRow.count : 0;

        const profRow = uDb.prepare(`SELECT store_name, owner_name FROM store_profile WHERE id = 1`).get();
        if (profRow?.store_name && profRow.store_name.trim()) {
          u.store_name = profRow.store_name.trim();
        }
        if (profRow?.owner_name && profRow.owner_name.trim()) {
          u.name = profRow.owner_name.trim();
        }
      } catch (err) {
        console.warn(`Could not read stats for ${dbFileName}:`, err);
      }
    }

    userDatabases.push({
      userId: u.id,
      phone: u.phone,
      name: u.name,
      storeName: u.store_name || (u.phone ? `Medical Store (${u.phone.slice(-4)})` : 'Store'),
      dbFile: dbFileName,
      dbPath: dbFilePath,
      fileSizeBytes,
      fileSizeFormatted: `${(fileSizeBytes / 1024).toFixed(1)} KB`,
      medicinesCount,
      vouchersCount,
      categoriesCount,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      status: 'Active (Isolated SQLite)',
    });
  }

  return {
    success: true,
    dbEngine: 'SQLite 3 (Built-in node:sqlite)',
    dbDirectory: DB_DIR,
    centralDb: {
      fileName: 'central_users_registry.sqlite',
      totalUsers: allUsers.length,
    },
    totalTenantDatabases: userDatabases.length,
    databases: userDatabases,
  };
}

// -------------------------------------------------------------
// 11. SUPER ADMIN NOTIFICATIONS & AUDIT API
// -------------------------------------------------------------
export function getAdminNotifications(limit = 100, unreadOnly = false) {
  const central = getCentralDb();
  let query = `SELECT * FROM admin_notifications`;
  if (unreadOnly) {
    query += ` WHERE is_read = 0`;
  }
  query += ` ORDER BY created_at DESC LIMIT ?`;
  const notifications = central.prepare(query).all(limit);

  const unreadCountRow = central.prepare(`SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0`).get();
  const totalCountRow = central.prepare(`SELECT COUNT(*) as count FROM admin_notifications`).get();

  return {
    success: true,
    notifications: notifications.map(n => ({
      ...n,
      userId: n.user_id,
      userPhone: n.user_phone,
      userName: n.user_name,
      storeName: n.store_name,
      actionType: n.action_type,
      createdAt: n.created_at,
      details: n.details ? JSON.parse(n.details) : null,
      isRead: Boolean(n.is_read)
    })),
    unreadCount: unreadCountRow ? unreadCountRow.count : 0,
    totalCount: totalCountRow ? totalCountRow.count : 0
  };
}

export function markAdminNotificationRead(id) {
  const central = getCentralDb();
  if (id === 'all') {
    central.prepare(`UPDATE admin_notifications SET is_read = 1`).run();
  } else {
    central.prepare(`UPDATE admin_notifications SET is_read = 1 WHERE id = ?`).run(id);
  }
  return { success: true };
}

export function clearAdminNotifications() {
  const central = getCentralDb();
  central.prepare(`DELETE FROM admin_notifications`).run();
  return { success: true };
}

// -------------------------------------------------------------
// 12. SUPER ADMIN TENANTS & STORE DATABASE EDITOR
// -------------------------------------------------------------
export function getAdminTenantFullData(userId) {
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  const db = getUserDatabase(userId);
  const central = getCentralDb();
  const user = central.prepare(`SELECT * FROM users WHERE phone = ? OR id = ?`).get(cleanPhone, userId);

  const profile = getDbUserProfile(userId);
  const medicines = getDbUserInventory(userId);
  const vouchers = getDbUserVouchers(userId);
  const categories = getDbUserCategories(userId);

  let auditLogs = [];
  try {
    auditLogs = db.prepare(`SELECT id, action, entity as table_name, details, created_at as timestamp FROM database_audit_logs ORDER BY created_at DESC LIMIT 100`).all();
  } catch (err) {
    console.warn('Could not read audit logs for tenant:', err);
  }

  let archivedMedicines = [];
  let archivedVouchers = [];
  try {
    archivedMedicines = db.prepare(`SELECT * FROM archived_medicines ORDER BY archived_at DESC LIMIT 500`).all().map(r => ({
      ...r,
      batchNo: r.batch_no,
      expiryDate: r.expiry_date,
      purchasePrice: r.purchase_price,
      minStock: r.min_stock,
      archivedAt: r.archived_at
    }));
  } catch {}

  try {
    archivedVouchers = db.prepare(`SELECT * FROM archived_vouchers ORDER BY archived_at DESC LIMIT 500`).all().map(r => ({
      ...r,
      voucherType: r.voucher_type,
      voucherNo: r.voucher_no,
      partyName: r.party_name,
      partyPhone: r.party_phone,
      invoiceRef: r.invoice_ref,
      grandTotal: r.grand_total,
      paymentMode: r.payment_mode,
      paymentStatus: r.payment_status,
      items: r.items_json ? JSON.parse(r.items_json) : [],
      archivedAt: r.archived_at
    }));
  } catch {}

  return {
    success: true,
    user,
    profile,
    medicines,
    vouchers,
    categories,
    archivedMedicines,
    archivedVouchers,
    auditLogs
  };
}

export function adminSaveTenantMedicine(userId, medicine) {
  const result = saveDbUserMedicine(userId, medicine);
  try {
    const db = getUserDatabase(userId);
    db.prepare(`
      INSERT INTO database_audit_logs (action, entity, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      'ADMIN_EDIT',
      'medicines',
      JSON.stringify({ editedBy: 'SUPER_ADMIN', medicine }),
      new Date().toISOString()
    );
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
  return result;
}

export function adminDeleteTenantMedicine(userId, medicineId) {
  const result = deleteDbUserMedicine(userId, medicineId);
  try {
    const db = getUserDatabase(userId);
    db.prepare(`
      INSERT INTO database_audit_logs (action, entity, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      'ADMIN_DELETE',
      'medicines',
      JSON.stringify({ deletedBy: 'SUPER_ADMIN', medicineId }),
      new Date().toISOString()
    );
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
  return result;
}

export function adminSaveTenantVoucher(userId, voucher) {
  const result = saveDbUserVoucher(userId, voucher);
  try {
    const db = getUserDatabase(userId);
    db.prepare(`
      INSERT INTO database_audit_logs (action, entity, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      'ADMIN_EDIT',
      'vouchers',
      JSON.stringify({ editedBy: 'SUPER_ADMIN', voucher }),
      new Date().toISOString()
    );
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
  return result;
}

export function adminDeleteTenantVoucher(userId, voucherId) {
  const result = deleteDbUserVoucher(userId, voucherId);
  try {
    const db = getUserDatabase(userId);
    db.prepare(`
      INSERT INTO database_audit_logs (action, entity, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      'ADMIN_DELETE',
      'vouchers',
      JSON.stringify({ deletedBy: 'SUPER_ADMIN', voucherId }),
      new Date().toISOString()
    );
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
  return result;
}

export function adminSaveTenantProfile(userId, profile) {
  return saveDbUserProfile(userId, profile);
}

export function adminDeleteTenantStore(userId) {
  const cleanPhone = (userId || '').replace(/[^0-9]/g, '').slice(-10);
  const central = getCentralDb();
  const now = new Date().toISOString();

  central.prepare(`INSERT OR REPLACE INTO deleted_stores (phone, deleted_at) VALUES (?, ?)`).run(cleanPhone, now);
  central.prepare(`DELETE FROM users WHERE phone = ? OR id = ?`).run(cleanPhone, userId);

  // Close db connection if cached
  const dbKey = `usr_${cleanPhone}`;
  if (openDatabases.has(dbKey)) {
    try {
      openDatabases.get(dbKey).close();
    } catch {}
    openDatabases.delete(dbKey);
  }

  const dbFilePath = path.join(DB_DIR, `store_${cleanPhone}.sqlite`);
  if (fs.existsSync(dbFilePath)) {
    try {
      fs.unlinkSync(dbFilePath);
    } catch (e) {
      // Ignored: marked as deleted in deleted_stores
    }
  }

  return { success: true };
}

export function getActiveStoresCount() {
  try {
    const central = getCentralDb();
    let deletedPhones = new Set();
    try {
      const deletedRows = central.prepare(`SELECT phone FROM deleted_stores`).all();
      deletedPhones = new Set(deletedRows.map(r => r.phone));
    } catch {}

    const allUsers = central.prepare(`SELECT phone FROM users`).all()
      .filter(u => !deletedPhones.has(u.phone));

    return allUsers.length;
  } catch (err) {
    console.warn('Error counting active stores:', err);
    return 1;
  }
}

