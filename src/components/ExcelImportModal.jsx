import React, { useState, useRef } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ArrowRight,
  RefreshCw,
  Plus,
  FileCheck,
  Receipt,
  Building2
} from 'lucide-react';
import { parseInvoiceDocument, downloadSampleTemplate, sanitizePartyName } from '../utils/excelUtils';
import { playSuccessSound } from '../utils/notificationSound';
import { formatDisplayDate } from '../utils/expiryUtils';

export default function ExcelImportModal({ 
  isOpen, 
  onClose, 
  onImportComplete, 
  lang 
}) {
  const isMr = lang === 'mr';
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [importMode, setImportMode] = useState('append'); // 'append' or 'replace'
  const [createVoucher, setCreateVoucher] = useState(true);
  const [agencyName, setAgencyName] = useState('Om Sai Agency');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile) => {
    setFile(selectedFile);
    setErrorMsg('');
    setIsProcessing(true);

    try {
      const result = await parseInvoiceDocument(selectedFile);
      setParsedData(result);
      const cleanAgency = sanitizePartyName(result.invoiceMeta?.supplierName, 'Om Sai Agency');
      setAgencyName(cleanAgency);
      setInvoiceNo(result.invoiceMeta?.invoiceNo || `INV-${Date.now().toString().slice(-6)}`);
      setInvoiceDate(result.invoiceMeta?.invoiceDate || new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        isMr
          ? 'फाईल वाचण्यात त्रुटी आली. कृपया फाईलचे फॉरमॅट तपासा किंवा सॅम्पल शीट डाऊनलोड करून पहा: ' + err.message
          : 'Could not parse invoice / Excel file: ' + err.message
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.medicines.length === 0) return;

    const cleanAgency = sanitizePartyName(agencyName.trim(), 'Om Sai Agency');
    const cleanInvNo = invoiceNo.trim() || parsedData.invoiceMeta?.invoiceNo || `INV-${Date.now().toString().slice(-6)}`;
    const cleanInvDate = invoiceDate || parsedData.invoiceMeta?.invoiceDate || new Date().toISOString().split('T')[0];

    const finalInvoiceMeta = createVoucher ? {
      ...parsedData.invoiceMeta,
      supplierName: cleanAgency,
      invoiceNo: cleanInvNo,
      invoiceDate: cleanInvDate,
    } : null;

    // Stamp clean agency/distributor on all medicines
    const finalMeds = parsedData.medicines.map(m => ({
      ...m,
      distributor: cleanAgency,
    }));

    onImportComplete(
      finalMeds, 
      importMode, 
      finalInvoiceMeta
    );
    playSuccessSound();
    onClose();
    // Reset state
    setFile(null);
    setParsedData(null);
    setAgencyName('Om Sai Agency');
    setInvoiceNo('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isMr ? 'एक्सेल किंवा इनव्हॉईस द्वारे औषधे अपलोड करा' : 'Bulk Upload Medicines via Excel or Invoice'}
              </h3>
              <p className="text-xs text-slate-500">
                {isMr ? '.xlsx, .xls, .csv किंवा .pdf इनव्हॉईस फाईल अपलोड करा' : 'Supports Excel (.xlsx, .xls, .csv) & PDF Bills'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Step 1: Download Template Helper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <div className="font-bold text-emerald-900">
                  {isMr ? 'नक्की फॉरमॅट कसा असावा?' : 'Not sure about Excel format?'}
                </div>
                <div className="text-emerald-700 text-[11px]">
                  {isMr 
                    ? 'तयार सॅम्पल शीट डाऊनलोड करा व त्यात तुमची औषधे भरून अपलोड करा.' 
                    : 'Download our pre-formatted pharmacy template with standard columns.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadSampleTemplate(lang)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isMr ? 'सॅम्पल शीट डाऊनलोड' : 'Download Sample'}</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {!parsedData ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .pdf, application/pdf"
                onChange={handleFileInput}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="font-bold text-slate-800 text-sm">
                {isMr ? 'येथे एक्सेल किंवा PDF इनव्हॉईस ड्रॅग करा, किंवा क्लिक करा' : 'Drag & drop Excel or PDF invoice here, or click to browse'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isMr ? '.XLSX, .XLS, .CSV किंवा PDF बिल (Marg / Busy / Tally फॉरमॅट ऑटो-डिटेक्शन)' : '.XLSX, .XLS, .CSV, .PDF (Automatic format & column detection)'}
              </p>

              {isProcessing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isMr ? 'शीट/बिल वाचत आहे...' : 'Processing Excel / PDF invoice...'}</span>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Preview Area */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-900">{file?.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {parsedData.medicines.length} {isMr ? 'औषधे ओळखली गेली' : 'medicines identified successfully'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setParsedData(null);
                    setFile(null);
                  }}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  {isMr ? 'दुसरी फाईल निवडा' : 'Change File'}
                </button>
              </div>

              {/* Supplier / Agency & Invoice Configuration */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs space-y-3 text-left">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-teal-950 flex items-center gap-1.5 text-xs sm:text-sm">
                      <Building2 className="w-4 h-4 text-teal-700" />
                      <span>{isMr ? 'सप्लायर / एजन्सीचे नाव (Supplier / Agency Name) *' : 'Distributor / Agency Name *'}</span>
                    </label>
                    <span className="text-[10px] text-teal-700 font-semibold">{isMr ? 'व्हाउचरमध्ये हेच नाव दिसेल' : 'Visible in voucher'}</span>
                  </div>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder={isMr ? 'उदा. Om Sai Agency, Mayur Raykar...' : 'e.g. Om Sai Agency, Mayur Raykar...'}
                    className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-slate-900 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                  />
                  {/* Quick Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-teal-800 font-semibold">{isMr ? 'झटपट निवडा:' : 'Quick Select:'}</span>
                    {['Om Sai Agency', 'Mayur Raykar', 'Seema Ayurvedic Aushadhalay', 'Shree Ganesh Pharma'].map((ag) => (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => setAgencyName(ag)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          agencyName === ag
                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                            : 'bg-white text-teal-900 border-teal-200 hover:bg-teal-100 hover:border-teal-400'
                        }`}
                      >
                        {ag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-teal-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-teal-900 mb-1">
                      {isMr ? 'इनव्हॉईस / बिल क्र.' : 'Invoice / Bill No.'}
                    </label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="CR-004621"
                      className="w-full px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-teal-900 mb-1">
                      {isMr ? 'बिल तारीख' : 'Invoice Date'}
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {parsedData.invoiceMeta?.grandTotal > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-teal-200/60 text-teal-900">
                    <span className="text-[11px] font-bold">{isMr ? 'एकूण इनव्हॉईस रक्कम:' : 'Invoice Grand Total:'}</span>
                    <span className="text-sm font-black font-mono">₹{parsedData.invoiceMeta.grandTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Auto Create Purchase Voucher Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={createVoucher}
                  onChange={(e) => setCreateVoucher(e.target.checked)}
                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4 shrink-0"
                />
                <div>
                  <div className="font-bold text-slate-800">
                    {isMr 
                      ? 'व्हाउचर नोंदवहीत खरेदी व्हाउचर आपोआप नोंद करा' 
                      : 'Auto-create Purchase Voucher in Voucher Register'}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {isMr 
                      ? 'हे निवडल्यास खरेदी व्हाउचर तयार होईल आणि ही सर्व औषधे थेट तुमच्या साठ्यात (Products) उपलब्ध होतील.' 
                      : 'Creates a purchase inward voucher and automatically adds/updates items in your available stock.'}
                  </div>
                </div>
              </label>

              {/* Import Mode Options */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700">
                  {isMr ? 'आयात करण्याची पद्धत निवडा:' : 'Select Import Mode:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                    importMode === 'append' ? 'bg-white border-teal-500 ring-1 ring-teal-500' : 'bg-white/60 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">
                        {isMr ? 'सध्याच्या साठ्यात जोडा (Append)' : 'Add to Existing Stock'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isMr ? 'जुनी औषधे राहतील आणि नवीन औषधे जोडली जातील.' : 'Preserves current items and merges uploaded ones.'}
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                    importMode === 'replace' ? 'bg-white border-rose-500 ring-1 ring-rose-500' : 'bg-white/60 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">
                        {isMr ? 'जुना साठा बदलून टाका (Replace)' : 'Replace Entire Stock'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isMr ? 'जुना सर्व डेटा काढून फक्त ही नवीन एक्सेल दिसेल.' : 'Clears current items and sets only this file.'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview Table of First 5 Items */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{isMr ? 'नमुन्यासाठी पहिले औषध पूर्वदृश्य (Preview):' : 'Preview (First few rows):'}</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {isMr ? `एकूण ${parsedData.medicines.length} पैकी` : `Showing 5 of ${parsedData.medicines.length}`}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2">{isMr ? 'नाव' : 'Name'}</th>
                        <th className="p-2">{isMr ? 'बॅच' : 'Batch'}</th>
                        <th className="p-2">{isMr ? 'मुदत (Expiry)' : 'Expiry'}</th>
                        <th className="p-2">{isMr ? 'साठा' : 'Stock'}</th>
                        <th className="p-2">{isMr ? 'MRP' : 'MRP'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.medicines.slice(0, 5).map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-800 truncate max-w-[140px]">{m.name}</td>
                          <td className="p-2 font-mono text-slate-600">{m.batchNo}</td>
                          <td className="p-2 font-mono text-slate-600">{formatDisplayDate(m.expiryDate)}</td>
                          <td className="p-2 font-bold text-slate-800">{m.stock}</td>
                          <td className="p-2 text-slate-800">₹{m.mrp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
          >
            {isMr ? 'रद्द करा' : 'Cancel'}
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isMr 
                  ? `${parsedData.medicines.length} औषधे साठ्यात जोडा` 
                  : `Confirm Import (${parsedData.medicines.length} Items)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
