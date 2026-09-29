// PDF, Excel and Print generators for Pharmacy Vouchers

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatINR } from './expiryUtils';

/**
 * Generates and downloads a clean, professional PDF for a single Voucher
 */
export function generateVoucherPdf(voucher, storeProfile = {}, lang = 'en') {
  const isMr = lang === 'mr';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const storeName = storeProfile?.storeName || (isMr ? 'संजीवनी मेडिकल स्टोअर्स' : 'Sanjivani Medical Store');
  const ownerName = storeProfile?.ownerName || 'Pharmacist Incharge';
  const dl20B = storeProfile?.drugLicense20B || 'MH-PUN-20B-10492';
  const dl21B = storeProfile?.drugLicense21B || 'MH-PUN-21B-10493';
  const gstin = storeProfile?.gstin || '27AABCS1429B1Z';
  const phone = storeProfile?.phone || '+91 98220 12345';
  const address = storeProfile?.address || 'Shop No. 4, Sai Complex, Main Road, Pune';

  // Titles based on voucher type
  let voucherTypeTitle = 'TAX INVOICE / VOUCHER';
  if (voucher.voucherType === 'PURCHASE') {
    voucherTypeTitle = isMr ? 'खरेदी व्हाउचर (PURCHASE VOUCHER)' : 'PURCHASE INWARD VOUCHER';
  } else if (voucher.voucherType === 'SALES') {
    voucherTypeTitle = isMr ? 'विक्री पावती / बिल (SALES VOUCHER)' : 'RETAIL PHARMACY CASH MEMO';
  } else if (voucher.voucherType === 'RETURN') {
    voucherTypeTitle = isMr ? 'मुदत समाप्ती रिटर्न चॅलन (EXPIRY DEBIT NOTE)' : 'EXPIRY RETURN CHALAN & DEBIT NOTE';
  } else if (voucher.voucherType === 'EXPENSE') {
    voucherTypeTitle = isMr ? 'खर्च व्हाउचर (EXPENSE VOUCHER)' : 'EXPENSE PAYMENT VOUCHER';
  }

  // Header background banner
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.rect(0, 0, 210, 26, 'F');

  // Header White Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(storeName.toUpperCase(), 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${address} | Phone: ${phone}`, 14, 17);
  doc.text(`DL No: ${dl20B}, ${dl21B} | GSTIN: ${gstin}`, 14, 22);

  // Voucher Title Banner
  doc.setFillColor(241, 245, 249); // slate 100
  doc.rect(0, 26, 210, 10, 'F');
  doc.setTextColor(15, 23, 42); // slate 900
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(voucherTypeTitle, 105, 33, { align: 'center' });

  // Voucher Metadata Info Box
  doc.setDrawColor(226, 232, 240); // slate 200
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 40, 182, 28, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Voucher No:`, 18, 47);
  doc.setFont('helvetica', 'normal');
  doc.text(`${voucher.voucherNo}`, 42, 47);

  doc.setFont('helvetica', 'bold');
  doc.text(`Date:`, 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${voucher.date || new Date().toISOString().split('T')[0]}`, 42, 54);

  doc.setFont('helvetica', 'bold');
  doc.text(`Ref Invoice:`, 18, 61);
  doc.setFont('helvetica', 'normal');
  doc.text(`${voucher.invoiceRef || 'N/A'}`, 42, 61);

  // Right side of metadata
  doc.setFont('helvetica', 'bold');
  doc.text(`Party / Supplier:`, 110, 47);
  doc.setFont('helvetica', 'normal');
  doc.text(`${voucher.partyName || 'General Cash Counter'}`, 140, 47);

  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Mode:`, 110, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${voucher.paymentMode || 'Cash'}`, 140, 54);

  doc.setFont('helvetica', 'bold');
  doc.text(`Status:`, 110, 61);
  doc.setFont('helvetica', 'normal');
  doc.text(`${voucher.paymentStatus || 'COMPLETED'}`, 140, 61);

  // Items Table
  const tableRows = (voucher.items || []).map((item, idx) => [
    idx + 1,
    item.name || '-',
    item.batchNo || '-',
    item.expiryDate || '-',
    `${item.quantity || 1} ${item.unit || 'Strips'}`,
    `Rs. ${Number(item.rate || 0).toFixed(2)}`,
    `Rs. ${Number(item.amount || ((item.quantity || 1) * (item.rate || 0))).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Item / Medicine Description', 'Batch', 'Expiry', 'Qty', 'Rate (Rs)', 'Amount (Rs)']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 24, font: 'courier' },
      3: { cellWidth: 24 },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate totals block position
  const finalY = doc.lastAutoTable.finalY + 6;

  // Totals Box on Right
  doc.setFillColor(248, 250, 252);
  doc.rect(120, finalY, 76, 32, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(120, finalY, 76, 32, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal:`, 124, finalY + 6);
  doc.text(`Rs. ${Number(voucher.subtotal || 0).toFixed(2)}`, 192, finalY + 6, { align: 'right' });

  doc.text(`GST Tax (${voucher.taxPercent || 0}%):`, 124, finalY + 12);
  doc.text(`Rs. ${Number(voucher.taxAmount || 0).toFixed(2)}`, 192, finalY + 12, { align: 'right' });

  doc.text(`Discount:`, 124, finalY + 18);
  doc.text(`Rs. ${Number(voucher.discount || 0).toFixed(2)}`, 192, finalY + 18, { align: 'right' });

  doc.setDrawColor(13, 148, 136);
  doc.line(122, finalY + 21, 194, finalY + 21);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(`Grand Total:`, 124, finalY + 28);
  doc.text(`Rs. ${Number(voucher.grandTotal || 0).toFixed(2)}`, 192, finalY + 28, { align: 'right' });

  // Notes on Left
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Narration / Remarks:`, 14, finalY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(voucher.notes || 'Goods received/issued in good sealed condition.', 100), 14, finalY + 12);

  // Signatures at Bottom
  const bottomY = Math.max(finalY + 44, 255);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, bottomY, 70, bottomY);
  doc.line(136, bottomY, 196, bottomY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Receiver's Signature`, 14, bottomY + 5);
  doc.text(`For ${storeName.toUpperCase()} (Authorized Signatory)`, 136, bottomY + 5);

  // Save the PDF
  const filename = `${voucher.voucherNo || 'Voucher'}_${voucher.date || 'doc'}.pdf`;
  doc.save(filename);
}

/**
 * Exports all or filtered vouchers to an Excel spreadsheet (.xlsx) with pure language isolation
 */
export function exportVouchersToExcel(vouchers, filename = 'Pharmacy_Vouchers_Register.xlsx', lang = 'en', storeProfile = null) {
  const isMr = lang === 'mr';

  const exportData = vouchers.map((v, index) => {
    const itemsCount = v.items?.length || 0;
    const itemsNames = (v.items || []).map(i => `${i.name} (${i.quantity} ${i.unit || 'Strips'})`).join('; ');

    if (isMr) {
      return {
        'अनु. क्र.': index + 1,
        'व्हाउचर नंबर': v.voucherNo,
        'व्हाउचर प्रकार': v.voucherType,
        'तारीख': v.date,
        'पार्टी / सप्लायर / ग्राहक': v.partyName || '-',
        'संपर्क': v.partyPhone || '-',
        'संदर्भ बिल क्र.': v.invoiceRef || '-',
        'एकूण औषधे संख्या': itemsCount,
        'औषधांचा तपशील': itemsNames,
        'उप-एकूण (₹)': v.subtotal,
        'जीएसटी %': v.taxPercent,
        'जीएसटी रक्कम (₹)': v.taxAmount,
        'सवलत (₹)': v.discount,
        'एकूण बिल रक्कम (₹)': v.grandTotal,
        'पेमेंट मोड': v.paymentMode,
        'पेमेंट स्थिती': v.paymentStatus,
        'शेरा / टिपा': v.notes || '-',
      };
    } else {
      return {
        'Sr. No.': index + 1,
        'Voucher No.': v.voucherNo,
        'Voucher Type': v.voucherType,
        'Date': v.date,
        'Party / Supplier / Customer': v.partyName || '-',
        'Contact Phone': v.partyPhone || '-',
        'Reference Invoice': v.invoiceRef || '-',
        'Items Count': itemsCount,
        'Medicines Breakdown': itemsNames,
        'Subtotal (₹)': v.subtotal,
        'GST %': v.taxPercent,
        'Tax Amount (₹)': v.taxAmount,
        'Discount (₹)': v.discount,
        'Grand Total (₹)': v.grandTotal,
        'Payment Mode': v.paymentMode,
        'Payment Status': v.paymentStatus,
        'Notes / Narration': v.notes || '-',
      };
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 35 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = isMr ? 'व्हाउचर_नोंदवही' : 'Voucher_Register';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanFilename = isMr ? 'व्हाउचर_नोंदवही.xlsx' : filename;
  XLSX.writeFile(workbook, cleanFilename);
}

/**
 * Opens a print-optimized clean invoice window
 */
export function printVoucherHtml(voucher, storeProfile = {}, lang = 'en') {
  const isMr = lang === 'mr';
  const storeName = storeProfile?.storeName || (isMr ? 'संजीवनी मेडिकल स्टोअर्स' : 'Sanjivani Medical Store');
  const dl20B = storeProfile?.drugLicense20B || 'MH-PUN-20B-10492';
  const dl21B = storeProfile?.drugLicense21B || 'MH-PUN-21B-10493';
  const gstin = storeProfile?.gstin || '27AABCS1429B1Z';
  const phone = storeProfile?.phone || '+91 98220 12345';
  const address = storeProfile?.address || 'Shop No. 4, Sai Complex, Main Road, Pune';

  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) return;

  const itemsHtml = (voucher.items || []).map((item, idx) => `
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${idx + 1}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${item.name}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace;">${item.batchNo || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px;">${item.expiryDate || '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${item.quantity} ${item.unit || 'Strips'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">₹${Number(item.rate || 0).toFixed(2)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">₹${Number(item.amount || ((item.quantity || 1) * (item.rate || 0))).toFixed(2)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${voucher.voucherNo} - ${storeName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 15px; }
          .store-name { font-size: 22px; font-weight: bold; color: #0f766e; text-transform: uppercase; }
          .meta-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
          th { background: #0d9488; color: white; border: 1px solid #0d9488; padding: 8px; }
          .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 30px; }
          .totals-table { width: 280px; font-size: 13px; }
          .totals-table td { padding: 4px 6px; }
          .grand-total { font-size: 15px; font-weight: bold; color: #0f766e; border-top: 1px solid #0d9488; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; color: #475569; }
          .sig-line { border-top: 1px solid #94a3b8; width: 200px; padding-top: 5px; text-align: center; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${storeName}</div>
          <div style="font-size: 12px; margin-top: 4px;">${address} | Phone: ${phone}</div>
          <div style="font-size: 12px; color: #475569;">DL No: ${dl20B}, ${dl21B} | GSTIN: ${gstin}</div>
          <h3 style="margin: 8px 0 0 0; color: #0d9488; text-transform: uppercase;">${voucher.voucherType} VOUCHER / INVOICE</h3>
        </div>

        <div class="meta-box">
          <div>
            <div><strong>Voucher No:</strong> ${voucher.voucherNo}</div>
            <div><strong>Date:</strong> ${voucher.date}</div>
            <div><strong>Ref Invoice:</strong> ${voucher.invoiceRef || '-'}</div>
          </div>
          <div>
            <div><strong>Party Name:</strong> ${voucher.partyName || 'Cash Customer'}</div>
            <div><strong>Payment Mode:</strong> ${voucher.paymentMode || 'Cash'}</div>
            <div><strong>Status:</strong> ${voucher.paymentStatus || 'PAID'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Medicine Description</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-wrap">
          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right; font-weight: bold;">₹${Number(voucher.subtotal || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td>GST Tax (${voucher.taxPercent || 0}%):</td>
              <td style="text-align: right;">₹${Number(voucher.taxAmount || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Discount:</td>
              <td style="text-align: right;">₹${Number(voucher.discount || 0).toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td>Grand Total:</td>
              <td style="text-align: right;">₹${Number(voucher.grandTotal || 0).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="font-size: 11px; color: #64748b;">
          <strong>Narration:</strong> ${voucher.notes || 'Goods received/sold in good condition.'}
        </div>

        <div class="signatures">
          <div class="sig-line">Receiver's Signature</div>
          <div class="sig-line">For ${storeName}<br>(Authorized Signatory)</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
