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

  const sampleDataEn = [
    {
      'Medicine Name': 'Dolo 650 Tablet',
      'Composition / Salt': 'Paracetamol 650mg',
      'Category': 'Tablets & Capsules',
      'Batch Number': 'DL-8821',
      'Expiry Date (YYYY-MM-DD)': '2026-09-29',
      'Stock Quantity': 45,
      'Unit': 'Strips',
      'Purchase Price': 24.50,
      'MRP': 33.60,
      'Rack Location': 'Rack A-2',
      'Manufacturer / Company': 'Micro Labs',
      'Schedule Type': 'OTC',
    },
    {
      'Medicine Name': 'Augmentin 625 Duo',
      'Composition / Salt': 'Amoxycillin & Potassium Clavulanate',
      'Category': 'Antibiotics & Antivirals',
      'Batch Number': 'AUG-4902',
      'Expiry Date (YYYY-MM-DD)': '2026-10-05',
      'Stock Quantity': 25,
      'Unit': 'Strips',
      'Purchase Price': 148.00,
      'MRP': 201.50,
      'Rack Location': 'Rack C-1',
      'Manufacturer / Company': 'GSK Pharma',
      'Schedule Type': 'Schedule H',
    },
    {
      'Medicine Name': 'Ascoril LS Syrup',
      'Composition / Salt': 'Levosalbutamol, Ambroxol & Guaiphenesin',
      'Category': 'Syrups & Suspensions',
      'Batch Number': 'ASC-1099',
      'Expiry Date (YYYY-MM-DD)': '2026-11-15',
      'Stock Quantity': 18,
      'Unit': 'Bottles',
      'Purchase Price': 85.00,
      'MRP': 118.00,
      'Rack Location': 'Rack B-4',
      'Manufacturer / Company': 'Glenmark',
      'Schedule Type': 'OTC',
    },
    {
      'Medicine Name': 'Pantocid 40 Tablet',
      'Composition / Salt': 'Pantoprazole 40mg',
      'Category': 'Tablets & Capsules',
      'Batch Number': 'PAN-7731',
      'Expiry Date (YYYY-MM-DD)': '2027-04-30',
      'Stock Quantity': 60,
      'Unit': 'Strips',
      'Purchase Price': 98.00,
      'MRP': 145.00,
      'Rack Location': 'Rack A-5',
      'Manufacturer / Company': 'Sun Pharma',
      'Schedule Type': 'OTC',
    },
    {
      'Medicine Name': 'Betadine 10% Ointment',
      'Composition / Salt': 'Povidone Iodine 10% w/w',
      'Category': 'Ointments, Creams & Gels',
      'Batch Number': 'BET-3321',
      'Expiry Date (YYYY-MM-DD)': '2026-09-25',
      'Stock Quantity': 12,
      'Unit': 'Tubes',
      'Purchase Price': 72.00,
      'MRP': 99.00,
      'Rack Location': 'Rack D-2',
      'Manufacturer / Company': 'Win-Medicare',
      'Schedule Type': 'OTC',
    },
  ];

  const sampleDataMr = [
    {
      'औषधाचे नाव': 'Dolo 650 Tablet',
      'रासायनिक घटक': 'Paracetamol 650mg',
      'प्रकार': 'Tablets & Capsules',
      'बॅच नंबर': 'DL-8821',
      'मुदत तारीख (YYYY-MM-DD)': '2026-09-29',
      'उपलब्ध साठा': 45,
      'युनिट': 'Strips',
      'खरेदी किंमत': 24.50,
      'विक्री किंमत (MRP)': 33.60,
      'रॅक / जागा': 'Rack A-2',
      'कंपनी नाव': 'Micro Labs',
      'शेड्युल': 'OTC',
    },
    {
      'औषधाचे नाव': 'Augmentin 625 Duo',
      'रासायनिक घटक': 'Amoxycillin & Potassium Clavulanate',
      'प्रकार': 'Antibiotics & Antivirals',
      'बॅच नंबर': 'AUG-4902',
      'मुदत तारीख (YYYY-MM-DD)': '2026-10-05',
      'उपलब्ध साठा': 25,
      'युनिट': 'Strips',
      'खरेदी किंमत': 148.00,
      'विक्री किंमत (MRP)': 201.50,
      'रॅक / जागा': 'Rack C-1',
      'कंपनी नाव': 'GSK Pharma',
      'शेड्युल': 'Schedule H',
    },
    {
      'औषधाचे नाव': 'Ascoril LS Syrup',
      'रासायनिक घटक': 'Levosalbutamol, Ambroxol & Guaiphenesin',
      'प्रकार': 'Syrups & Suspensions',
      'बॅच नंबर': 'ASC-1099',
      'मुदत तारीख (YYYY-MM-DD)': '2026-11-15',
      'उपलब्ध साठा': 18,
      'युनिट': 'Bottles',
      'खरेदी किंमत': 85.00,
      'विक्री किंमत (MRP)': 118.00,
      'रॅक / जागा': 'Rack B-4',
      'कंपनी नाव': 'Glenmark',
      'शेड्युल': 'OTC',
    },
    {
      'औषधाचे नाव': 'Pantocid 40 Tablet',
      'रासायनिक घटक': 'Pantoprazole 40mg',
      'प्रकार': 'Tablets & Capsules',
      'बॅच नंबर': 'PAN-7731',
      'मुदत तारीख (YYYY-MM-DD)': '2027-04-30',
      'उपलब्ध साठा': 60,
      'युनिट': 'Strips',
      'खरेदी किंमत': 98.00,
      'विक्री किंमत (MRP)': 145.00,
      'रॅक / जागा': 'Rack A-5',
      'कंपनी नाव': 'Sun Pharma',
      'शेड्युल': 'OTC',
    },
  ];

  const dataToExport = isMr ? sampleDataMr : sampleDataEn;
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 25 },
    { wch: 16 },
    { wch: 25 },
    { wch: 15 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 25 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = isMr ? 'नमुना_औषध_साठा' : 'Medicine_Stock_Template';
  const fileName = isMr ? 'औषध_साठा_नमुना_शीट.xlsx' : 'Pharmacy_Medicine_Stock_Template.xlsx';

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

/**
 * Normalizes Indian Pharma expiry formats (4/27, 11/25, 04/2027, Nov-25, Excel serials, etc.)
 */
export function parseIndianPharmaExpiry(val) {
  if (!val) return '2027-12-31';

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

  const clean = String(val).trim();

  // 1. M/YY or MM/YY (e.g. 4/27 -> 2027-04-30, 11/25 -> 2025-11-30)
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

        // 2. Scan top rows for invoice metadata
        let supplierName = '';
        let invoiceNo = '';
        let invoiceDate = '';
        let grandTotal = 0;

        for (let r = 0; r < Math.min(sheetRows.length, 12); r++) {
          const rowText = (sheetRows[r] || []).map(c => String(c || '').trim()).join(' ');
          
          if (!supplierName) {
            // Find distributor name line (e.g. GOVIND MEDICALS, XYZ PHARMA)
            if (/medicals|pharma|drugs|distributor|agencies|agency|chemists|laboratories|enterprises/i.test(rowText) && 
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

        // 3. Intelligent Header Row Finder
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
              score += 1;
              currentMap.hsn = cIdx;
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
            supplierName: supplierName || 'Pharma Supplier',
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
      if (/medicals|pharma|drugs|agencies|distributors|chemists|laboratories/i.test(l)) {
        supplierName = l.replace(/^GST\s*INVOICE\s*/i, '').trim();
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
      supplierName: supplierName || 'Govind Medicals',
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
