import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { getExpiryClassification } from './expiryUtils';

// Configure pdfjs worker
if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

/**
 * Downloads a sample Excel template for users to populate their pharmacy stock
 */
export function downloadSampleTemplate(lang = 'en') {
  const isMr = lang === 'mr';

  // Exact pharma bill columns from client invoice
  const sampleData = [
    {
      'Mfg.': 'ZAND',
      'HSN': '30049011',
      'Product Name': 'ZANDU NITYAM CHURNA-(NO EXP)',
      'Pack': '50GM',
      'Qty': 1,
      'Scm': 0,
      'Batch': 'BT-4011',
      'Exp': 'NO EXP',
      'MRP': 51.56,
      'Rate': 40.92,
      'Disc': 0.00,
      'Taxable': 40.92,
      '% GST': '5.00%',
      'Amt': 2.04,
    },
    {
      'Mfg.': 'ZYDU',
      'HSN': '30049029',
      'Product Name': 'RINGOZONE OINTMENT (NO EXP)',
      'Pack': '13GM',
      'Qty': 3,
      'Scm': 0,
      'Batch': '4143',
      'Exp': '6/29',
      'MRP': 42.00,
      'Rate': 34.96,
      'Disc': 0.00,
      'Taxable': 104.88,
      '% GST': '5.00%',
      'Amt': 5.24,
    },
    {
      'Mfg.': 'CIPLA',
      'HSN': '30049010',
      'Product Name': 'DOLO 650 TABLET',
      'Pack': "15'S",
      'Qty': 10,
      'Scm': 0,
      'Batch': 'DL-8821',
      'Exp': '12/28',
      'MRP': 33.60,
      'Rate': 24.50,
      'Disc': 0.00,
      'Taxable': 245.00,
      '% GST': '12.00%',
      'Amt': 29.40,
    },
    {
      'Mfg.': 'GSK',
      'HSN': '30049020',
      'Product Name': 'AUGMENTIN 625 DUO',
      'Pack': "10'S",
      'Qty': 5,
      'Scm': 0,
      'Batch': 'AG-4902',
      'Exp': '10/27',
      'MRP': 201.50,
      'Rate': 148.00,
      'Disc': 0.00,
      'Taxable': 740.00,
      '% GST': '12.00%',
      'Amt': 88.80,
    },
    {
      'Mfg.': 'SUN',
      'HSN': '30049030',
      'Product Name': 'PANTOCID 40 TABLET',
      'Pack': "10'S",
      'Qty': 12,
      'Scm': 0,
      'Batch': 'PT-7731',
      'Exp': '04/29',
      'MRP': 145.00,
      'Rate': 98.00,
      'Disc': 0.00,
      'Taxable': 1176.00,
      '% GST': '12.00%',
      'Amt': 141.12,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  worksheet['!cols'] = [
    { wch: 10 }, // Mfg.
    { wch: 14 }, // HSN
    { wch: 34 }, // Product Name
    { wch: 10 }, // Pack
    { wch: 8 },  // Qty
    { wch: 8 },  // Scm
    { wch: 14 }, // Batch
    { wch: 12 }, // Exp
    { wch: 10 }, // MRP
    { wch: 10 }, // Rate
    { wch: 8 },  // Disc
    { wch: 12 }, // Taxable
    { wch: 10 }, // % GST
    { wch: 10 }, // Amt
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = 'Pharma_Invoice';
  const fileName = isMr ? 'फार्मा_बिल_इनव्हॉईस_फॉरमॅट.xlsx' : 'Pharma_Invoice_Bill_Template.xlsx';

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

/**
 * Normalizes Indian Pharma expiry formats (4/27, 11/25, 04/2027, Nov-25, Excel serials, etc.)
 */
export function parseIndianPharmaExpiry(val) {
  if (!val) return '2027-12-31';

  const clean = String(val).trim();
  if (/no\s*exp/i.test(clean)) {
    return '2035-12-31';
  }

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '2027-12-31';
    return val.toISOString().split('T')[0];
  }

  // Handle Excel date serial numbers
  if (typeof val === 'number') {
    const num = Math.round(val);
    if (num > 25000 && num < 65000) {
      const parsedDate = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
  }

  // 1. M/YY or MM/YY (e.g. 4/27 -> 2027-04-30, 11/25 -> 2025-11-30, 6/29 -> 2029-06-30)
  const myMatch = clean.match(/^(\d{1,2})[-/](\d{2})$/);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    const yr = 2000 + parseInt(myMatch[2], 10);
    if (month >= 1 && month <= 12) {
      const lastDay = new Date(yr, month, 0).getDate();
      return `${yr}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 2. M/YYYY or MM/YYYY (e.g. 4/2027, 04/2027 -> 2027-04-30)
  const myyyyMatch = clean.match(/^(\d{1,2})[-/](\d{4})$/);
  if (myyyyMatch) {
    const month = parseInt(myyyyMatch[1], 10);
    const yr = parseInt(myyyyMatch[2], 10);
    if (month >= 1 && month <= 12) {
      const lastDay = new Date(yr, month, 0).getDate();
      return `${yr}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 3. Month Name + YY / YYYY (e.g. Nov-25, APR/2027)
  const monthNames = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const textMonthMatch = clean.match(/^([a-zA-Z]{3,})[-/\s]+(\d{2,4})$/);
  if (textMonthMatch) {
    const mStr = textMonthMatch[1].toLowerCase().slice(0, 3);
    const mNum = monthNames[mStr];
    let yr = parseInt(textMonthMatch[2], 10);
    if (yr < 100) yr += 2000;
    if (mNum) {
      const lastDay = new Date(yr, mNum, 0).getDate();
      return `${yr}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 4. DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
  }

  // 5. YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '2027-12-31';
}

export function normalizeExcelDate(val) {
  return parseIndianPharmaExpiry(val);
}

/**
 * Checks if a string contains typical medicine names, salts, or row contents
 * to prevent medicine information from being mistakenly identified as an agency/supplier name.
 */
export function isLikelyMedicineText(text) {
  if (!text || typeof text !== 'string') return false;
  const s = text.toLowerCase().trim();
  return (
    s.length > 45 ||
    s.includes('amoxycillin') ||
    s.includes('clavulanate') ||
    s.includes('antivirals') ||
    s.includes('antibiotics') ||
    s.includes('paracetamol') ||
    s.includes('tablet') ||
    s.includes('capsule') ||
    s.includes('syrup') ||
    s.includes('ointment') ||
    s.includes('injection') ||
    s.includes('schedule h') ||
    s.includes('schedule x') ||
    s.includes('rack ') ||
    /\b\d+\s*strips\b/i.test(s) ||
    /\baug[-_]\d+/i.test(s) ||
    /\bdolo\b/i.test(s) ||
    /\bchurna\b/i.test(s)
  );
}

/**
 * Ensures a party/agency name is clean and never medicine junk
 */
export function sanitizePartyName(name, fallback = 'Om Sai Agency') {
  if (!name || typeof name !== 'string') return fallback;
  const s = name.trim();
  if (!s || isLikelyMedicineText(s)) {
    if (/om\s*sai/i.test(s)) return 'Om Sai Agency';
    if (/mayur/i.test(s)) return 'Mayur Raykar';
    if (/seema/i.test(s)) return 'Seema Ayurvedic Aushadhalay';
    return fallback;
  }
  return s;
}

/**
 * Intelligent parser for Indian Pharma Invoices & Excel Sheets
 * Automatically detects header rows anywhere between row 0 and 25,
 * maps Marg ERP / Busy / Tally / Custom columns, and extracts invoice metadata.
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 1. Read sheet as 2D array of rows to reliably scan for header rows and invoice details
        const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!sheetRows || sheetRows.length === 0) {
          throw new Error('Excel sheet is empty or contains no readable rows.');
        }

        // 2. Intelligent Header Row Finder (run FIRST so we know where column titles are)
        // Matches common column names across Marg, Busy, Tally, and custom spreadsheets
        let headerRowIndex = -1;
        let colMap = {};
        let bestScore = 0;

        for (let r = 0; r < Math.min(sheetRows.length, 25); r++) {
          const row = sheetRows[r] || [];
          let score = 0;
          const currentMap = {};

          row.forEach((cellVal, cIdx) => {
            const s = String(cellVal || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!s) return;

            // Name
            if (s.includes('product') || s.includes('medicine') || s.includes('item') || s.includes('particular') || s === 'name' || s.includes('description') || s.includes('औषध')) {
              score += 6;
              currentMap.name = cIdx;
            }
            // Batch
            else if (s.includes('batch') || s === 'lotno' || s.includes('बॅच')) {
              score += 4;
              currentMap.batch = cIdx;
            }
            // Expiry
            else if (s.startsWith('exp') || s.includes('expiry') || s.includes('मुदत') || s === 'validthru') {
              score += 4;
              currentMap.expiry = cIdx;
            }
            // Quantity
            else if (s === 'qty' || s.includes('quantity') || s === 'billedqty' || s.includes('साठा')) {
              score += 3;
              currentMap.qty = cIdx;
            }
            // Scheme / Free quantity
            else if (s === 'scm' || s.includes('free') || s.includes('scheme') || s === 'freeqty' || s === 'fqty') {
              score += 2;
              currentMap.scm = cIdx;
            }
            // MRP
            else if (s === 'mrp' || s.includes('retailprice') || s.includes('विक्री')) {
              score += 3;
              currentMap.mrp = cIdx;
            }
            // Rate / Purchase Cost
            else if (s === 'rate' || s.includes('purrate') || s.includes('cost') || s === 'ptr' || s.includes('price') || s.includes('खरेदी')) {
              score += 3;
              currentMap.rate = cIdx;
            }
            // Pack / Unit
            else if (s === 'pack' || s.includes('packing') || s === 'unit' || s.includes('युनिट')) {
              score += 2;
              currentMap.pack = cIdx;
            }
            // Manufacturer / Company
            else if (s === 'mfg' || s === 'mfr' || s.includes('company') || s.includes('manufacturer') || s.includes('कंपनी')) {
              score += 2;
              currentMap.mfg = cIdx;
            }
            // HSN
            else if (s === 'hsn' || s === 'hsncode') {
              score += 2;
              currentMap.hsn = cIdx;
            }
            // Discount %
            else if (s === 'disc' || s.includes('discount')) {
              score += 1;
              currentMap.disc = cIdx;
            }
            // Taxable Amount
            else if (s === 'taxable' || s.includes('taxableamt') || s.includes('taxable')) {
              score += 1;
              currentMap.taxable = cIdx;
            }
            // % GST / GST Rate
            else if (s.includes('gst') || s.includes('tax%')) {
              score += 1;
              currentMap.gst = cIdx;
            }
          });

          if (score > bestScore && score >= 5) {
            bestScore = score;
            headerRowIndex = r;
            colMap = currentMap;
          }
        }

        // Fallback: If no header found, default to Row 0
        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          colMap = { name: 0, batch: 1, expiry: 2, qty: 3, rate: 4, mrp: 5 };
        }

        // 3. Scan ONLY pre-header rows (r < headerRowIndex) for supplier/agency & invoice metadata
        // CRITICAL: NEVER scan rows at or after headerRowIndex, as those are medicine data rows!
        let supplierName = '';
        let invoiceNo = '';
        let invoiceDate = '';
        let grandTotal = 0;

        if (headerRowIndex > 0) {
          for (let r = 0; r < headerRowIndex; r++) {
            const row = sheetRows[r] || [];
            const rowText = row.map(c => String(c || '').trim()).join(' ').trim();
            if (!rowText) continue;

            // Reject rows with multiple numeric cells (data rows)
            const numCount = row.filter(c => typeof c === 'number' || /^\d+(\.\d+)?$/.test(String(c || '').trim())).length;
            if (numCount > 1) continue;

            if (!supplierName && !isLikelyMedicineText(rowText) && rowText.length <= 60) {
              if (/medicals|pharma|drugs|distributor|agencies|agency|chemists|laboratories|enterprises|aushadhalay|trading/i.test(rowText) && 
                  !/gst\s*invoice|original\s*for\s*buyer|tax\s*invoice/i.test(rowText)) {
                supplierName = rowText.split(/[,•|]/)[0].trim();
              }
            }

            if (!invoiceNo) {
              const invMatch = rowText.match(/(?:Invoice\s*No|Inv\s*No|Bill\s*No|Invoice\s*#|Inv\s*#)\s*[:.\s-]*([A-Za-z0-9\/-]+)/i);
              if (invMatch) invoiceNo = invMatch[1].trim();
            }

            if (!invoiceDate) {
              const dtMatch = rowText.match(/(?:Date|Dated|Dt)\s*[:.\s-]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
              if (dtMatch) {
                const rawDt = dtMatch[1].trim();
                const p = rawDt.split(/[-/.]/);
                if (p.length === 3) {
                  const yr = p[2].length === 2 ? `20${p[2]}` : p[2];
                  invoiceDate = `${yr}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                } else {
                  invoiceDate = rawDt;
                }
              }
            }
          }
        }

        supplierName = sanitizePartyName(supplierName, 'Om Sai Agency');

        // 4. Parse Data Rows
        const medicines = [];
        const errors = [];

        for (let r = headerRowIndex + 1; r < sheetRows.length; r++) {
          const row = sheetRows[r] || [];
          if (!row || row.length === 0) continue;

          // Check if entire row is summary/total
          const fullRowStr = row.map(c => String(c || '').trim()).join(' ').toLowerCase();
          if (
            fullRowStr.includes('grand total') || 
            fullRowStr.includes('sub total') || 
            fullRowStr.includes('class total') ||
            fullRowStr.includes('total items') ||
            fullRowStr.includes('gst 12.00') ||
            fullRowStr.includes('gst 18.00') ||
            fullRowStr.includes('sgst payble') ||
            fullRowStr.includes('cgst payble') ||
            fullRowStr.includes('cr/dr note') ||
            fullRowStr.includes('cash.disc') ||
            fullRowStr.includes('freight')
          ) {
            // Check for Grand total amount in this row
            const totalMatch = fullRowStr.match(/(?:grand\s*total|total\s*amount)\s*[:.\s-]*([0-9,]+(?:\.\d{1,2})?)/);
            if (totalMatch && !grandTotal) {
              grandTotal = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
            }
            continue;
          }

          const rawName = colMap.name !== undefined ? row[colMap.name] : '';
          const name = String(rawName || '').trim();

          // Skip empty or summary rows
          if (!name || /^(total|sub\s*total|grand\s*total|remark|terms|for\s+|bank\s+name)/i.test(name)) {
            continue;
          }

          // If row has only 1 string and no numbers/batches, it might be a section header
          const hasBatchOrExp = (colMap.batch !== undefined && row[colMap.batch]) || (colMap.expiry !== undefined && row[colMap.expiry]);
          const hasNumbers = row.some(cell => typeof cell === 'number' || /^\d+(\.\d+)?$/.test(String(cell || '').trim()));
          if (!hasBatchOrExp && !hasNumbers) {
            continue;
          }

          // Batch
          const rawBatch = colMap.batch !== undefined ? row[colMap.batch] : '';
          const batchNo = String(rawBatch || '').trim() || `B-${Math.floor(1000 + Math.random() * 9000)}`;

          // Expiry
          const rawExpiry = colMap.expiry !== undefined ? row[colMap.expiry] : '';
          const expiryDate = parseIndianPharmaExpiry(rawExpiry);

          // Quantity & Scheme
          const rawQty = colMap.qty !== undefined ? row[colMap.qty] : 0;
          const rawScm = colMap.scm !== undefined ? row[colMap.scm] : 0;
          const billedQty = parseFloat(rawQty) || 0;
          const freeQty = parseFloat(rawScm) || 0;
          const stock = Math.max(1, Math.round(billedQty + freeQty));

          // Prices
          const rawMrp = colMap.mrp !== undefined ? row[colMap.mrp] : 0;
          const mrp = parseFloat(String(rawMrp).replace(/[^0-9.]/g, '')) || 0;

          const rawRate = colMap.rate !== undefined ? row[colMap.rate] : 0;
          let purchasePrice = parseFloat(String(rawRate).replace(/[^0-9.]/g, '')) || 0;
          if (purchasePrice === 0 && mrp > 0) {
            purchasePrice = +(mrp * 0.75).toFixed(2);
          }

          // Pack / Unit
          const rawPack = colMap.pack !== undefined ? row[colMap.pack] : '';
          const unit = String(rawPack || '').trim() || 'Strips';

          // Manufacturer / Company
          const rawMfg = colMap.mfg !== undefined ? row[colMap.mfg] : '';
          const manufacturer = String(rawMfg || '').trim() || supplierName || 'General Pharma';

          // HSN Code
          const rawHsn = colMap.hsn !== undefined ? row[colMap.hsn] : '';
          const hsn = String(rawHsn || '').trim();

          // Discount %
          const rawDisc = colMap.disc !== undefined ? row[colMap.disc] : 0;
          const discount = parseFloat(String(rawDisc).replace(/[^0-9.]/g, '')) || 0;

          // Taxable Amount
          const rawTaxable = colMap.taxable !== undefined ? row[colMap.taxable] : 0;
          const taxableAmt = parseFloat(String(rawTaxable).replace(/[^0-9.]/g, '')) || 0;

          // % GST
          const rawGst = colMap.gst !== undefined ? row[colMap.gst] : 0;
          const gstPercent = parseFloat(String(rawGst).replace(/[^0-9.]/g, '')) || 5;

          medicines.push({
            id: `med-${Date.now()}-${r}-${Math.random().toString(36).substr(2, 5)}`,
            name,
            composition: name,
            category: 'Tablets & Capsules',
            batchNo,
            expiryDate,
            stock,
            unit,
            purchasePrice,
            mrp: mrp > 0 ? mrp : +(purchasePrice * 1.3).toFixed(2),
            rack: 'General Rack',
            manufacturer,
            schedule: 'OTC',
            minStock: 10,
            status: 'active',
            distributor: supplierName || 'Pharma Distributor',
            hsn,
            discount,
            taxableAmt,
            gstPercent,
            addedAt: new Date().toISOString(),
          });
        }

        if (medicines.length === 0) {
          throw new Error('No valid medicine rows could be parsed. Please check if the file contains product names and stock.');
        }

        resolve({
          medicines,
          totalRows: sheetRows.length,
          errors,
          invoiceMeta: {
            supplierName: sanitizePartyName(supplierName, 'Om Sai Agency'),
            invoiceNo: invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
            invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
            grandTotal: grandTotal || medicines.reduce((sum, m) => sum + (m.stock * m.purchasePrice), 0),
          }
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Universal PDF Invoice Parser
 * Extracts text and lines from PDF invoices (e.g. Govind Medicals, Marg ERP, Busy)
 */
export async function parsePdfInvoice(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const lines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group items by line (y-coordinate)
      const lineMap = new Map();
      textContent.items.forEach((item) => {
        // Group items within 3px tolerance
        const y = Math.round(item.transform[5] / 3) * 3;
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y).push({ x: item.transform[4], str: item.str });
      });

      // Sort lines top to bottom
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      sortedYs.forEach((y) => {
        const itemsOnLine = lineMap.get(y).sort((a, b) => a.x - b.x);
        const lineText = itemsOnLine.map(it => it.str).join(' ').trim();
        if (lineText) lines.push(lineText);
      });
    }

    if (lines.length === 0) {
      throw new Error('No readable text found in PDF file.');
    }

    return parseInvoiceLines(lines);
  } catch (err) {
    console.error('PDF Parse error:', err);
    throw new Error('Failed to parse PDF invoice: ' + err.message);
  }
}

/**
 * Parses raw text lines from a printed/digital pharmacy invoice
 */
export function parseInvoiceLines(lines) {
  let supplierName = '';
  let invoiceNo = '';
  let invoiceDate = '';
  let grandTotal = 0;

  // 1. Extract metadata from header lines
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const l = lines[i];

    if (!supplierName && !/gst\s*invoice|original\s*for\s*buyer|tax\s*invoice/i.test(l)) {
      if (/medicals|pharma|drugs|agencies|agency|distributors|distributor|chemists|laboratories|aushadhalay|trading/i.test(l)) {
        const candidate = l.replace(/^GST\s*INVOICE\s*/i, '').trim();
        if (!isLikelyMedicineText(candidate) && candidate.length <= 60) {
          supplierName = candidate;
        }
      }
    }

    const invMatch = l.match(/(?:Invoice\s*No|Inv\s*No|Bill\s*No)\s*[:.\s-]*([A-Za-z0-9\/-]+)/i);
    if (invMatch && !invoiceNo) invoiceNo = invMatch[1].trim();

    const dtMatch = l.match(/(?:Date|Dated)\s*[:.\s-]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
    if (dtMatch && !invoiceDate) {
      const parts = dtMatch[1].split(/[-/.]/);
      if (parts.length === 3) {
        const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        invoiceDate = `${yr}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        invoiceDate = dtMatch[1];
      }
    }
  }

  // 2. Scan for Grand total in footer lines
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
    const l = lines[i];
    const gtMatch = l.match(/(?:GRAND\s*TOTAL|TOTAL\s*AMOUNT|NET\s*PAYABLE)\s*[:.\s-]*([0-9,]+(?:\.\d{1,2})?)/i);
    if (gtMatch && !grandTotal) {
      grandTotal = parseFloat(gtMatch[1].replace(/,/g, '')) || 0;
      break;
    }
  }

  // 3. Extract medicine items
  const medicines = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Look for expiry pattern (e.g. 4/27 or 11/25 or 04/2027)
    const expMatch = l.match(/\b(\d{1,2}\/\d{2,4})\b/);
    if (!expMatch) continue;

    // Skip header or metadata lines
    if (/invoice|operator|salesman|mfg\.|date\s*:|dl\s*no|gstin/i.test(l)) continue;

    const tokens = l.split(/\s+/).filter(Boolean);
    const expToken = expMatch[1];
    const expIdx = tokens.indexOf(expToken);
    if (expIdx < 0) continue;

    const formattedExpiry = parseIndianPharmaExpiry(expToken);

    // Look for Batch: either token before or token after exp
    let batchNo = `B-${Math.floor(1000 + Math.random() * 9000)}`;
    if (expIdx > 0 && /^[A-Z0-9-]{4,}$/i.test(tokens[expIdx - 1]) && !/^\d{8}$/.test(tokens[expIdx - 1])) {
      batchNo = tokens[expIdx - 1];
    } else if (expIdx + 1 < tokens.length && /^[A-Z0-9-]{4,}$/i.test(tokens[expIdx + 1])) {
      batchNo = tokens[expIdx + 1];
    }

    // Look for prices (MRP and Rate)
    let mrp = 0;
    let rate = 0;
    const decimalTokens = tokens
      .filter(t => /^\d+\.\d{2}$/.test(t))
      .map(t => parseFloat(t))
      .filter(n => n > 0);

    if (decimalTokens.length >= 2) {
      mrp = Math.max(decimalTokens[0], decimalTokens[1]);
      rate = Math.min(decimalTokens[0], decimalTokens[1]);
    } else if (decimalTokens.length === 1) {
      mrp = decimalTokens[0];
      rate = +(mrp * 0.75).toFixed(2);
    }

    // Look for Quantity
    let qty = 1;
    for (let t = expIdx - 1; t >= 0; t--) {
      const val = parseInt(tokens[t], 10);
      if (!isNaN(val) && val > 0 && val < 10000 && !/^\d{8}$/.test(tokens[t])) {
        qty = val;
        break;
      }
    }

    // Clean Product Name
    let mfg = 'General Pharma';
    const nameWords = [];
    tokens.forEach((t, idx) => {
      if (idx === expIdx || t === batchNo) return;
      if (/^\d+\.\d{2}$/.test(t) || /^\d{1,2}%$/.test(t) || /^\d{8}$/.test(t)) return;
      if (['TAB', 'CAP', '10TAB', '10CAP', '10 CAP', '10 TAB', 'SYP', 'INJ'].includes(t.toUpperCase())) {
        nameWords.push(t);
        return;
      }
      if (idx === 0 && t.length <= 5 && /^[A-Z]+$/.test(t)) {
        mfg = t;
        return;
      }
      if (!/^\d+$/.test(t)) {
        nameWords.push(t);
      }
    });

    const name = nameWords.join(' ').replace(/^(EMCU|HETE|GSK|CIPLA|SUN)\s*/i, '').trim() || `Medicine ${medicines.length + 1}`;

    medicines.push({
      id: `med-pdf-${Date.now()}-${medicines.length}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      composition: name,
      category: name.toLowerCase().includes('cap') ? 'Tablets & Capsules' : name.toLowerCase().includes('syp') ? 'Syrups & Suspensions' : 'Tablets & Capsules',
      batchNo,
      expiryDate: formattedExpiry,
      stock: qty,
      unit: name.toLowerCase().includes('cap') ? '10 CAP' : '10 TAB',
      purchasePrice: rate || 25,
      mrp: mrp || 35,
      rack: 'General Rack',
      manufacturer: mfg || supplierName || 'General Pharma',
      schedule: 'OTC',
      minStock: 10,
      status: 'active',
      distributor: supplierName || 'Distributor',
      addedAt: new Date().toISOString(),
    });
  }

  if (medicines.length === 0) {
    throw new Error('Could not identify any medicine items in the invoice text.');
  }

  return {
    medicines,
    totalRows: lines.length,
    errors,
    invoiceMeta: {
      supplierName: sanitizePartyName(supplierName, 'Om Sai Agency'),
      invoiceNo: invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      grandTotal: grandTotal || medicines.reduce((s, m) => s + (m.stock * m.purchasePrice), 0),
    }
  };
}

/**
 * Universal document loader: parses Excel (.xlsx, .xls, .csv) or PDF (.pdf)
 */
export async function parseInvoiceDocument(file) {
  if (!file) throw new Error('No file provided.');
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'pdf' || file.type === 'application/pdf') {
    return await parsePdfInvoice(file);
  }

  return await parseExcelFile(file);
}

/**
 * Exports current or filtered medicines to an Excel file with strict language segregation
 * @param {Array} medicines
 * @param {string} filename
 * @param {string} lang ('en' or 'mr')
 * @param {Object} storeProfile
 */
export function exportMedicinesToExcel(medicines, filename = 'Medical_Store_Inventory.xlsx', lang = 'en', storeProfile = null) {
  const isMr = lang === 'mr';

  let exportData = [];

  if (isMr) {
    // 100% Pure Marathi Export
    exportData = medicines.map((m, index) => {
      const classification = getExpiryClassification(m.expiryDate);
      const stockVal = +(m.stock * (m.purchasePrice || 0)).toFixed(2);
      const mrpVal = +(m.stock * (m.mrp || 0)).toFixed(2);

      return {
        'अनु. क्र.': index + 1,
        'औषधाचे नाव': m.name,
        'रासायनिक घटक': m.composition || '-',
        'प्रकार (Category)': m.category,
        'बॅच नंबर': m.batchNo,
        'मुदत संपण्याची तारीख': m.expiryDate,
        'मुदत स्थिती (Expiry Status)': classification.labelMr,
        'शिल्लक दिवस': classification.days,
        'उपलब्ध साठा': m.stock,
        'युनिट': m.unit || 'Strips',
        'खरेदी किंमत (₹)': m.purchasePrice,
        'विक्री किंमत MRP (₹)': m.mrp,
        'एकूण खरेदी मूल्य (₹)': stockVal,
        'एकूण MRP मूल्य (₹)': mrpVal,
        'रॅक / जागा': m.rack || 'General',
        'कंपनी / मॅन्युफॅक्चरर': m.manufacturer || '-',
        'सप्लायर / डिस्ट्रीब्यूटर': m.distributor || '-',
        'ड्रग शेड्युल': m.schedule || 'OTC',
      };
    });
  } else {
    // 100% Pure English Export (NO Marathi columns, NO Marathi status words)
    exportData = medicines.map((m, index) => {
      const classification = getExpiryClassification(m.expiryDate);
      const stockVal = +(m.stock * (m.purchasePrice || 0)).toFixed(2);
      const mrpVal = +(m.stock * (m.mrp || 0)).toFixed(2);

      return {
        'Sr. No.': index + 1,
        'Medicine Name': m.name,
        'Composition / Salt': m.composition || '-',
        'Category': m.category,
        'Batch No.': m.batchNo,
        'Expiry Date': m.expiryDate,
        'Expiry Status': classification.labelEn,
        'Days Remaining': classification.days,
        'Stock Quantity': m.stock,
        'Unit': m.unit || 'Strips',
        'Purchase Cost (₹)': m.purchasePrice,
        'MRP (₹)': m.mrp,
        'Total Cost Value (₹)': stockVal,
        'Total MRP Value (₹)': mrpVal,
        'Rack Location': m.rack || 'General',
        'Manufacturer': m.manufacturer || '-',
        'Distributor': m.distributor || '-',
        'Schedule': m.schedule || 'OTC',
      };
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Column width definitions
  worksheet['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 25 }, // Medicine Name
    { wch: 32 }, // Composition
    { wch: 22 }, // Category
    { wch: 15 }, // Batch
    { wch: 16 }, // Expiry Date
    { wch: 24 }, // Expiry Status (Single Clean Language column!)
    { wch: 15 }, // Days
    { wch: 15 }, // Stock
    { wch: 10 }, // Unit
    { wch: 18 }, // Purchase Cost
    { wch: 14 }, // MRP
    { wch: 22 }, // Cost Value
    { wch: 20 }, // MRP Value
    { wch: 16 }, // Rack Location
    { wch: 24 }, // Manufacturer
    { wch: 25 }, // Distributor
    { wch: 14 }, // Schedule
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = isMr ? 'औषध_रिटर्न_यादी' : 'Pharmacy_Inventory';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Compute clean localized filename if not specified
  let outFilename = filename;
  if (!outFilename) {
    outFilename = isMr ? 'औषध_साठा_अहवाल.xlsx' : 'Pharmacy_Inventory_Report.xlsx';
  } else if (!isMr && outFilename.includes('औषध')) {
    outFilename = 'Pharmacy_Inventory_Report.xlsx';
  }

  XLSX.writeFile(workbook, outFilename);
}
