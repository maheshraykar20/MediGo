// Barcode & QR Code parser for Pharmaceutical Strips, Bottles and Boxes
// Supports 1D (EAN-13, Code 128, UPC) and 2D (GS1 DataMatrix, QR Code)

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
      // Stop before AI 21 if present
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
  // 4. Check for URL with query params
  else if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      gtin = url.searchParams.get('gtin') || url.searchParams.get('barcode') || '';
      batchNo = url.searchParams.get('batch') || url.searchParams.get('lot') || '';
      expiryDate = url.searchParams.get('exp') || url.searchParams.get('expiry') || '';
      serialNo = url.searchParams.get('sn') || '';
    } catch {}
  }

  // Barcode fallback
  const barcode = gtin || raw;

  return {
    raw,
    barcode,
    batchNo,
    expiryDate,
    serialNo,
    gtin,
    isGS1,
  };
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
  // If dd is '00', default to the end of that month
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

  // Strip leading zeroes for flexible barcode matching (e.g. 0890... -> 890...)
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

  // 2. Exact Batch Number Match (very common for medicine strips!)
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

  // 5. Match raw text against Medicine Name (e.g. if QR has medicine name)
  if (raw && raw.length >= 3) {
    const byName = medicines.find(m => {
      if (!m.name) return false;
      const mName = m.name.trim().toLowerCase();
      return mName === raw || raw.includes(mName) || mName.includes(raw);
    });
    if (byName) return byName;
  }

  // 6. Fuzzy Batch Match (e.g. "BET-3321" matches "BET3321" or "3321")
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
