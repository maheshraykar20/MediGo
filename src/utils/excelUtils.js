import * as XLSX from 'xlsx';
import { getExpiryClassification } from './expiryUtils';

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
 * Normalizes an Excel date value (serial number or string) to YYYY-MM-DD
 */
export function normalizeExcelDate(val) {
  if (!val) return '';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().split('T')[0];
  }

  if (typeof val === 'number') {
    const parsedDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const ddmmyyyy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return str;
}

/**
 * Parses an uploaded Excel or CSV file
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('Excel sheet is empty or contains no readable rows.');
        }

        const medicines = [];
        const errors = [];

        rawJson.forEach((row, idx) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedRow[cleanKey] = row[key];
            // Also keep original key lowercased for devanagari matching
            normalizedRow[key.trim().toLowerCase()] = row[key];
          });

          // Match Name
          const name =
            normalizedRow['medicinename'] ||
            normalizedRow['name'] ||
            normalizedRow['productname'] ||
            normalizedRow['product'] ||
            normalizedRow['itemname'] ||
            normalizedRow['medicine'] ||
            normalizedRow['औषधाचे नाव'] ||
            normalizedRow['नाव'] ||
            '';

          if (!name) {
            errors.push(`Row ${idx + 2}: Medicine Name is missing. Skipped.`);
            return;
          }

          // Match Expiry Date
          const rawExpiry =
            normalizedRow['expirydateyyyymmdd'] ||
            normalizedRow['expirydate'] ||
            normalizedRow['expiry'] ||
            normalizedRow['expdate'] ||
            normalizedRow['exp'] ||
            normalizedRow['validtill'] ||
            normalizedRow['मुदत तारीख (yyyy-mm-dd)'] ||
            normalizedRow['मुदत तारीख'] ||
            normalizedRow['मुदत'] ||
            '';

          const formattedExpiry = normalizeExcelDate(rawExpiry);

          // Match Batch
          const batchNo =
            normalizedRow['batchnumber'] ||
            normalizedRow['batchno'] ||
            normalizedRow['batch'] ||
            normalizedRow['lotno'] ||
            normalizedRow['बॅच नंबर'] ||
            normalizedRow['बॅच'] ||
            `B-${Math.floor(1000 + Math.random() * 9000)}`;

          // Match Category
          const category =
            normalizedRow['category'] ||
            normalizedRow['categoryname'] ||
            normalizedRow['type'] ||
            normalizedRow['प्रकार'] ||
            normalizedRow['कॅटेगरी'] ||
            'Tablets & Capsules';

          // Match Stock / Quantity
          const rawStock =
            normalizedRow['stockquantity'] ||
            normalizedRow['stock'] ||
            normalizedRow['quantity'] ||
            normalizedRow['qty'] ||
            normalizedRow['उपलब्ध साठा'] ||
            normalizedRow['साठा'] ||
            0;
          const stock = parseInt(rawStock, 10) || 0;

          // Match Prices
          const rawMrp =
            normalizedRow['mrp'] ||
            normalizedRow['sellingprice'] ||
            normalizedRow['retailprice'] ||
            normalizedRow['विक्री किंमत (mrp)'] ||
            normalizedRow['mrp किंमत'] ||
            0;
          const mrp = parseFloat(rawMrp) || 0;

          const rawPurchase =
            normalizedRow['purchaseprice'] ||
            normalizedRow['costprice'] ||
            normalizedRow['cost'] ||
            normalizedRow['rate'] ||
            normalizedRow['खरेदी किंमत'] ||
            (mrp > 0 ? +(mrp * 0.75).toFixed(2) : 0);
          const purchasePrice = parseFloat(rawPurchase) || 0;

          // Match Rack / Shelf
          const rack =
            normalizedRow['racklocation'] ||
            normalizedRow['rack'] ||
            normalizedRow['shelf'] ||
            normalizedRow['location'] ||
            normalizedRow['रॅक / जागा'] ||
            normalizedRow['रॅक'] ||
            'General Shelf';

          // Match Manufacturer / Supplier
          const manufacturer =
            normalizedRow['manufacturercompany'] ||
            normalizedRow['manufacturer'] ||
            normalizedRow['company'] ||
            normalizedRow['supplier'] ||
            normalizedRow['कंपनी नाव'] ||
            normalizedRow['कंपनी'] ||
            'General Pharma';

          // Match Composition / Salt
          const composition =
            normalizedRow['compositionsalt'] ||
            normalizedRow['composition'] ||
            normalizedRow['salt'] ||
            normalizedRow['रासायनिक घटक'] ||
            normalizedRow['घटक'] ||
            '';

          // Match Unit
          const unit =
            normalizedRow['unit'] ||
            normalizedRow['packaging'] ||
            normalizedRow['युनिट'] ||
            'Strips';

          // Match Schedule
          const schedule =
            normalizedRow['scheduletype'] ||
            normalizedRow['schedule'] ||
            normalizedRow['शेड्युल'] ||
            'OTC';

          medicines.push({
            id: `med-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            name: String(name).trim(),
            composition: String(composition).trim(),
            category: String(category).trim(),
            batchNo: String(batchNo).trim(),
            expiryDate: formattedExpiry || '2026-12-31',
            stock,
            unit,
            purchasePrice,
            mrp,
            rack: String(rack).trim(),
            manufacturer: String(manufacturer).trim(),
            schedule: String(schedule).trim(),
            minStock: 10,
            status: 'active',
            addedAt: new Date().toISOString(),
          });
        });

        resolve({
          medicines,
          totalRows: rawJson.length,
          errors,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };

    reader.readAsArrayBuffer(file);
  });
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
