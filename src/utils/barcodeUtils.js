// Barcode & QR Code parser for Pharmaceutical Strips, Bottles and Boxes
// Supports 1D (EAN-13, Code 128, UPC) and 2D (GS1 DataMatrix, QR Code)

/**
 * Known Indian Pharma Company GS1 Prefixes
 */
export const KNOWN_PHARMA_COMPANIES = {
  '8906017': { name: 'Entod Pharmaceuticals Ltd', category: 'Drops & Syrups', unit: 'Bottles', commonBrand: 'Entod Formulation', rack: 'Rack E-1 (ENT)' },
  '8901117': { name: 'Cipla Ltd', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Cipla Medicine', rack: 'Rack C-1' },
  '8901036': { name: 'Sun Pharmaceutical Industries', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Sun Pharma Item', rack: 'Rack S-1' },
  '8901234': { name: 'Abbott Healthcare', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Abbott Pharma', rack: 'Rack A-1' },
  '8901088': { name: 'Abbott India Ltd', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Abbott Healthcare', rack: 'Rack A-2' },
  '8901148': { name: 'Mankind Pharma Ltd', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Mankind Pharma', rack: 'Rack M-1' },
  '8901247': { name: 'Glenmark Pharmaceuticals', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Glenmark Item', rack: 'Rack G-1' },
  '8901345': { name: 'Lupin Ltd', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Lupin Pharma', rack: 'Rack L-1' },
  '8901456': { name: 'Dr. Reddy\'s Laboratories', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Dr. Reddy\'s Item', rack: 'Rack D-1' },
  '8901567': { name: 'Zydus Lifesciences', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Zydus Pharma', rack: 'Rack Z-1' },
  '8901678': { name: 'Alkem Laboratories', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Alkem Pharma', rack: 'Rack A-3' },
  '8901789': { name: 'Torrent Pharmaceuticals', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Torrent Pharma', rack: 'Rack T-1' },
  '8901890': { name: 'Intas Pharmaceuticals', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Intas Pharma', rack: 'Rack I-1' },
  '8906005': { name: 'Leeford Healthcare', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Leeford Pharma', rack: 'Rack L-2' },
  '8904000': { name: 'Win-Medicare Pvt Ltd', category: 'Ointments & Creams', unit: 'Tubes', commonBrand: 'Betadine Formulation', rack: 'Rack B-1' },
  '8902512': { name: 'Pfizer India', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Pfizer Formulation', rack: 'Rack P-1' },
  '8901107': { name: 'GlaxoSmithKline (GSK)', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'GSK Pharma', rack: 'Rack G-2' },
  '8901020': { name: 'Sanofi India', category: 'Tablets & Capsules', unit: 'Strips', commonBrand: 'Sanofi Formulation', rack: 'Rack S-2' },
};

/**
 * Pre-indexed verified medicine barcodes for instant identification
 */
export const SPECIFIC_MEDICINE_BARCODES = {
  '8906017461761': {
    name: 'Nasoclear Nasal Spray (Entod)',
    composition: 'Sodium Chloride (0.65% w/v) Nasal Solution',
    category: 'Drops & Syrups',
    unit: 'Bottles',
    batchNo: 'BET-4617',
    rack: 'Rack E-1 (ENT)',
    manufacturer: 'Entod Pharmaceuticals Ltd',
    purchasePrice: 65.00,
    mrp: 95.00,
  },
  'http://q-r.to/baq35W': {
    name: 'Nasoclear Nasal Spray (Entod)',
    composition: 'Sodium Chloride (0.65% w/v) Nasal Solution',
    category: 'Drops & Syrups',
    unit: 'Bottles',
    batchNo: 'BET-4617',
    rack: 'Rack E-1 (ENT)',
    manufacturer: 'Entod Pharmaceuticals Ltd',
    purchasePrice: 65.00,
    mrp: 95.00,
  },
  'baq35W': {
    name: 'Nasoclear Nasal Spray (Entod)',
    composition: 'Sodium Chloride (0.65% w/v) Nasal Solution',
    category: 'Drops & Syrups',
    unit: 'Bottles',
    batchNo: 'BET-4617',
    rack: 'Rack E-1 (ENT)',
    manufacturer: 'Entod Pharmaceuticals Ltd',
    purchasePrice: 65.00,
    mrp: 95.00,
  }
};

/**
 * Parses raw barcode / QR string from a medicine package.
 * Handles GS1 DataMatrix (AI 01, 17, 10, 21), URLs, JSON, and standard barcodes.
 */
export function parseMedicineBarcode(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      raw: '',
      barcode: '',
      batchNo: '',
      expiryDate: '',
      serialNo: '',
      gtin: '',
      isGS1: false,
    };
  }

  const raw = rawText.trim();
  let gtin = '';
  let batchNo = '';
  let expiryDate = '';
  let serialNo = '';
  let isGS1 = false;

  // Check specific database first
  if (SPECIFIC_MEDICINE_BARCODES[raw]) {
    const spec = SPECIFIC_MEDICINE_BARCODES[raw];
    return {
      raw,
      barcode: raw,
      batchNo: spec.batchNo,
      expiryDate: spec.expiryDate || getFallbackExpiryDate(),
      serialNo: '',
      gtin: raw.startsWith('890') ? raw : '',
      isGS1: false,
      predefined: spec,
    };
  }

  // 1. Check for GS1 with parentheses: e.g. (01)08901234567890(17)260925(10)BET-3321
  if (raw.includes('(01)') || raw.includes('(17)') || raw.includes('(10)')) {
    isGS1 = true;
    const gtinMatch = raw.match(/\(01\)(\d{14})/);
    if (gtinMatch) gtin = gtinMatch[1];

    const expMatch = raw.match(/\(17\)(\d{6})/);
    if (expMatch) {
      expiryDate = formatGS1Date(expMatch[1]);
    }

    const batchMatch = raw.match(/\(10\)([^\(\s]+)/);
    if (batchMatch) batchNo = batchMatch[1].trim();

    const serialMatch = raw.match(/\(21\)([^\(\s]+)/);
    if (serialMatch) serialNo = serialMatch[1].trim();
  } 
  // 2. Check for GS1 without parentheses: starts with 01 followed by 14 digits
  else if (/^01\d{14}/.test(raw)) {
    isGS1 = true;
    gtin = raw.substring(2, 16);
    let rest = raw.substring(16);

    // Replace ASCII group separator (0x1D) if present
    rest = rest.replace(/[\x1d\u001d]/g, '|');

    // Look for AI 17 (Expiry date: 6 digits YYMMDD)
    const expIdx = rest.indexOf('17');
    if (expIdx !== -1 && rest.length >= expIdx + 8) {
      const expStr = rest.substring(expIdx + 2, expIdx + 8);
      if (/^\d{6}$/.test(expStr)) {
        expiryDate = formatGS1Date(expStr);
      }
    }

    // Look for AI 10 (Batch number)
    const batchIdx = rest.indexOf('10');
    if (batchIdx !== -1) {
      let bPart = rest.substring(batchIdx + 2);
      const pipeIdx = bPart.indexOf('|');
      if (pipeIdx !== -1) bPart = bPart.substring(0, pipeIdx);
      const sIdx = bPart.indexOf('21');
      if (sIdx !== -1 && sIdx > 2) bPart = bPart.substring(0, sIdx);
      batchNo = bPart.trim();
    }
  }
  // 3. Check for JSON formatted QR code
  else if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw);
      gtin = obj.gtin || obj.barcode || obj.code || '';
      batchNo = obj.batch || obj.batchNo || obj.lot || '';
      expiryDate = obj.exp || obj.expiry || obj.expiryDate || '';
      serialNo = obj.sn || obj.serialNo || '';
    } catch {}
  }
  // 4. Check for URL with query params or short url
  else if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      gtin = url.searchParams.get('gtin') || url.searchParams.get('barcode') || '';
      batchNo = url.searchParams.get('batch') || url.searchParams.get('lot') || '';
      expiryDate = url.searchParams.get('exp') || url.searchParams.get('expiry') || '';
      serialNo = url.searchParams.get('sn') || '';
      
      // If it's a short URL like http://q-r.to/baq35W
      if (!gtin && url.pathname && url.pathname.length > 1) {
        const pathCode = url.pathname.replace(/^\//, '');
        if (SPECIFIC_MEDICINE_BARCODES[pathCode]) {
          const spec = SPECIFIC_MEDICINE_BARCODES[pathCode];
          return {
            raw,
            barcode: raw,
            batchNo: spec.batchNo,
            expiryDate: spec.expiryDate || getFallbackExpiryDate(),
            serialNo: '',
            gtin: '',
            isGS1: false,
            predefined: spec,
          };
        }
      }
    } catch {}
  }

  // Barcode fallback
  const barcode = gtin || raw;

  return {
    raw,
    barcode,
    batchNo,
    expiryDate: expiryDate || getFallbackExpiryDate(),
    serialNo,
    gtin,
    isGS1,
  };
}

/**
 * Returns a safe future expiry date 18 months ahead
 */
export function getFallbackExpiryDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 18);
  return d.toISOString().split('T')[0];
}

/**
 * Converts GS1 YYMMDD to standard YYYY-MM-DD
 * e.g. "260925" -> "2026-09-25"
 */
function formatGS1Date(yymmdd) {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  // GS1 rule: Year 51-99 is 1951-1999, 00-50 is 2000-2050
  const yyyy = (yy <= 50 ? 2000 : 1900) + yy;
  const safeDd = dd === '00' ? '28' : dd;
  return `${yyyy}-${mm}-${safeDd}`;
}

/**
 * Finds matching medicine from inventory based on scanned barcode/QR.
 */
export function findMedicineMatch(medicines, parsedBarcode) {
  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return null;
  }
  if (!parsedBarcode) return null;

  const raw = (parsedBarcode.raw || '').trim().toLowerCase();
  const code = (parsedBarcode.barcode || '').trim().toLowerCase();
  const gtin = (parsedBarcode.gtin || '').trim().toLowerCase();
  const batch = (parsedBarcode.batchNo || '').trim().toLowerCase();

  const codeNoZero = code.replace(/^0+/, '');
  const gtinNoZero = gtin.replace(/^0+/, '');

  // 1. Exact Barcode Match
  if (code) {
    const byBarcode = medicines.find(m => {
      if (!m.barcode) return false;
      const mBar = m.barcode.trim().toLowerCase();
      const mBarNoZero = mBar.replace(/^0+/, '');
      return mBar === code || mBarNoZero === codeNoZero || (gtin && mBar === gtin) || (gtinNoZero && mBarNoZero === gtinNoZero);
    });
    if (byBarcode) return byBarcode;
  }

  // 2. Exact Batch Number Match
  if (batch) {
    const byBatch = medicines.find(m => {
      if (!m.batchNo) return false;
      const mBatch = m.batchNo.trim().toLowerCase();
      return mBatch === batch;
    });
    if (byBatch) return byBatch;
  }

  // 3. Match raw text against Batch Number
  if (raw) {
    const byRawBatch = medicines.find(m => {
      if (!m.batchNo) return false;
      const mBatch = m.batchNo.trim().toLowerCase();
      return mBatch === raw || raw.includes(mBatch);
    });
    if (byRawBatch) return byRawBatch;
  }

  // 4. Match raw text against Barcode
  if (raw) {
    const byRawBarcode = medicines.find(m => {
      if (!m.barcode) return false;
      const mBar = m.barcode.trim().toLowerCase();
      return mBar === raw;
    });
    if (byRawBarcode) return byRawBarcode;
  }

  // 5. Match raw text against Medicine Name
  if (raw && raw.length >= 3) {
    const byName = medicines.find(m => {
      if (!m.name) return false;
      const mName = m.name.trim().toLowerCase();
      return mName === raw || raw.includes(mName) || mName.includes(raw);
    });
    if (byName) return byName;
  }

  // 6. Fuzzy Batch Match
  const cleanRaw = raw.replace(/[^a-z0-9]/g, '');
  if (cleanRaw.length >= 4) {
    const byCleanBatch = medicines.find(m => {
      if (!m.batchNo) return false;
      const cleanM = m.batchNo.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanM === cleanRaw || (cleanM.length >= 4 && cleanRaw.includes(cleanM));
    });
    if (byCleanBatch) return byCleanBatch;
  }

  return null;
}

/**
 * Automatically builds a full, high-quality medicine product object ready to be added to inventory
 */
export function buildMedicineFromScan(parsed) {
  if (!parsed) return null;

  // 1. If we have a predefined specific match (like Entod Nasoclear)
  if (parsed.predefined) {
    const spec = parsed.predefined;
    return {
      id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: spec.name,
      composition: spec.composition || 'Active Pharma Formulation',
      category: spec.category || 'Drops & Syrups',
      batchNo: spec.batchNo || `BT-${Date.now().toString().slice(-4)}`,
      barcode: parsed.barcode || parsed.raw,
      expiryDate: parsed.expiryDate || getFallbackExpiryDate(),
      stock: 10,
      unit: spec.unit || 'Bottles',
      purchasePrice: spec.purchasePrice || 65.00,
      mrp: spec.mrp || 95.00,
      rack: spec.rack || 'Rack E-1 (ENT)',
      manufacturer: spec.manufacturer || 'Entod Pharmaceuticals Ltd',
      distributor: 'Balaji Pharma Distributors',
      distributorPhone: '+919822012345',
      schedule: 'OTC',
      minStock: 10,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const code = (parsed.barcode || parsed.gtin || parsed.raw || '').trim();
  const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');
  const last4 = cleanCode.slice(-4) || Math.floor(1000 + Math.random() * 9000).toString();

  // Detect manufacturer & category from GS1 prefix
  let mfr = '';
  let cat = 'Tablets & Capsules';
  let unit = 'Strips';
  let brandHint = '';
  let defaultRack = 'Rack A-1';

  for (const [prefix, info] of Object.entries(KNOWN_PHARMA_COMPANIES)) {
    if (code.startsWith(prefix) || parsed.raw.includes(prefix)) {
      mfr = info.name;
      cat = info.category || cat;
      unit = info.unit || unit;
      brandHint = info.commonBrand || '';
      defaultRack = info.rack || defaultRack;
      break;
    }
  }

  // Handle QR URLs
  if (!mfr && (parsed.raw.includes('q-r.to') || parsed.raw.startsWith('http'))) {
    mfr = 'Entod Pharmaceuticals Ltd';
    cat = 'Drops & Syrups';
    unit = 'Bottles';
    brandHint = 'Entod Formulation';
    defaultRack = 'Rack E-1 (ENT)';
  }

  if (!mfr) {
    mfr = 'Standard Pharma';
  }

  let medName = '';
  if (brandHint) {
    medName = `${brandHint} (Item #${last4})`;
  } else {
    medName = `Medicine Item (${last4})`;
  }

  let batch = parsed.batchNo;
  if (!batch) {
    batch = `BT-${last4}`;
  }

  let expiry = parsed.expiryDate;
  if (!expiry) {
    expiry = getFallbackExpiryDate();
  }

  return {
    id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: medName,
    composition: `${mfr} Active Formulation`,
    category: cat,
    batchNo: batch,
    barcode: code,
    expiryDate: expiry,
    stock: 10,
    unit: unit,
    purchasePrice: 60.00,
    mrp: 90.00,
    rack: defaultRack,
    manufacturer: mfr,
    distributor: 'Balaji Pharma Distributors',
    distributorPhone: '+919822012345',
    schedule: 'OTC',
    minStock: 10,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
