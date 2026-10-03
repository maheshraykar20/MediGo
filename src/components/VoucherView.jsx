import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  TrendingDown,
  Building2,
  Phone,
  Eye,
  Download,
  UploadCloud,
  X,
  Check
} from 'lucide-react';
import { formatINR } from '../utils/expiryUtils';
import { generateVoucherPdf, exportVouchersToExcel, printVoucherHtml } from '../utils/voucherPdfUtils';
import { playSuccessSound } from '../utils/notificationSound';
import { sanitizePartyName } from '../utils/excelUtils';

export default function VoucherView({ 
  vouchers = [], 
  onOpenNewVoucher, 
  onOpenImportModal,
  onEditVoucher, 
  onDeleteVoucher, 
  onUpdatePartyName,
  storeProfile, 
  lang = 'mr' 
}) {
  const isMr = lang === 'mr';
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, PURCHASE, SALES, RETURN, EXPENSE
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPartyVch, setEditingPartyVch] = useState(null);
  const [quickPartyName, setQuickPartyName] = useState('');

  const handleStartQuickEditParty = (vch) => {
    setEditingPartyVch(vch);
    setQuickPartyName(sanitizePartyName(vch.partyName));
  };

  const handleSaveQuickParty = () => {
    if (!editingPartyVch) return;
    const clean = sanitizePartyName(quickPartyName.trim(), 'Om Sai Agency');
    if (onUpdatePartyName) {
      onUpdatePartyName(editingPartyVch.id, clean);
    }
    setEditingPartyVch(null);
  };

  // Calculations
  const stats = useMemo(() => {
    let purchaseTotal = 0;
    let salesTotal = 0;
    let returnTotal = 0;
    let expenseTotal = 0;

    vouchers.forEach(v => {
      const amt = parseFloat(v.grandTotal) || 0;
      if (v.voucherType === 'PURCHASE') purchaseTotal += amt;
      else if (v.voucherType === 'SALES') salesTotal += amt;
      else if (v.voucherType === 'RETURN') returnTotal += amt;
      else if (v.voucherType === 'EXPENSE') expenseTotal += amt;
    });

    return {
      purchaseTotal,
      salesTotal,
      returnTotal,
      expenseTotal,
      totalCount: vouchers.length,
    };
  }, [vouchers]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      if (activeFilter !== 'ALL' && v.voucherType !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = v.voucherNo?.toLowerCase().includes(q);
        const matchParty = v.partyName?.toLowerCase().includes(q);
        const matchRef = v.invoiceRef?.toLowerCase().includes(q);
        const matchItem = v.items?.some(it => it.name?.toLowerCase().includes(q));
        if (!matchNo && !matchParty && !matchRef && !matchItem) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [vouchers, activeFilter, searchQuery]);

  const handleExportExcel = () => {
    const filename = isMr ? `व्हाउचर_नोंदवही_${activeFilter}.xlsx` : `Pharmacy_Vouchers_${activeFilter}.xlsx`;
    exportVouchersToExcel(filteredVouchers, filename, lang, storeProfile);
  };

  const handleDownloadPdf = (vch) => {
    generateVoucherPdf(vch, storeProfile, lang);
    playSuccessSound();
  };

  const handlePrint = (vch) => {
    printVoucherHtml(vch, storeProfile, lang);
  };

  const getVoucherTypeTag = (type) => {
    switch (type) {
      case 'PURCHASE':
        return { label: isMr ? 'खरेदी (Purchase)' : 'Purchase', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'SALES':
        return { label: isMr ? 'विक्री (Sales)' : 'Retail Sales', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'RETURN':
        return { label: isMr ? 'मुदत रिटर्न (Debit Note)' : 'Expiry Return', color: 'bg-orange-50 text-orange-900 border-orange-300 font-bold' };
      case 'EXPENSE':
        return { label: isMr ? 'खर्च (Expense)' : 'Expense', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: type, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isMr ? 'एकूण खरेदी व्हाउचर' : 'Total Purchases (Inward)'}
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatINR(stats.purchaseTotal)}
          </div>
          <div className="text-[11px] text-teal-600 font-semibold mt-1">
            {vouchers.filter(v => v.voucherType === 'PURCHASE').length} {isMr ? 'व्हाउचर्स' : 'vouchers'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isMr ? 'एकूण विक्री पावती (Sales)' : 'Total Sales Volume'}
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {formatINR(stats.salesTotal)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {vouchers.filter(v => v.voucherType === 'SALES').length} {isMr ? 'बिल नोंदी' : 'bills issued'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isMr ? 'मुदत समाप्ती रिटर्न (Chalan)' : 'Expiry Returns Claimed'}
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-600 mt-1">
            {formatINR(stats.returnTotal)}
          </div>
          <div className="text-[11px] text-orange-700 font-semibold mt-1">
            {vouchers.filter(v => v.voucherType === 'RETURN').length} {isMr ? 'रिटर्न चलन्स' : 'debit notes'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isMr ? 'नोंदणीकृत व्हाउचर्स' : 'All Registered Vouchers'}
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-800 mt-1">
            {stats.totalCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isMr ? 'पीडीएफ व एक्सेल उपलब्ध' : 'PDF & Excel ready'}
          </div>
        </div>
      </div>

      {/* Controls Container */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isMr ? 'व्हाउचर नंबर, सप्लायर किंवा औषधाचे नाव शोधा...' : 'Search voucher no, party name, item...'}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shrink-0"
                title={isMr ? 'एक्सेल किंवा PDF बिल अपलोड करा' : 'Import Bill / Invoice (Excel or PDF)'}
              >
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>{isMr ? '📄 बिल इम्पोर्ट (Excel/PDF)' : '📄 Import Bill (Excel/PDF)'}</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shrink-0"
              title={isMr ? 'सर्व व्हाउचर्स एक्सेलमध्ये सेव्ह करा' : 'Export vouchers to Excel'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isMr ? 'Excel एक्सपोर्ट' : 'Export Excel'}</span>
            </button>

            <button
              onClick={onOpenNewVoucher}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-teal-600/30 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isMr ? '+ नवीन व्हाउचर एन्ट्री' : '+ New Voucher Entry'}</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-2 text-xs">
          {[
            { id: 'ALL', label: isMr ? 'सर्व व्हाउचर्स' : 'All Vouchers', count: vouchers.length },
            { id: 'PURCHASE', label: isMr ? '📥 खरेदी (Purchase)' : '📥 Purchase Inward', count: vouchers.filter(v => v.voucherType === 'PURCHASE').length },
            { id: 'SALES', label: isMr ? '📤 विक्री (Sales Memo)' : '📤 Sales Bills', count: vouchers.filter(v => v.voucherType === 'SALES').length },
            { id: 'RETURN', label: isMr ? '🚨 मुदत रिटर्न (Debit Note)' : '🚨 Expiry Returns', count: vouchers.filter(v => v.voucherType === 'RETURN').length },
            { id: 'EXPENSE', label: isMr ? '💸 खर्च (Expense)' : '💸 Expense Vouchers', count: vouchers.filter(v => v.voucherType === 'EXPENSE').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFilter === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers Table & Card List */}
      {filteredVouchers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-800 text-sm">
            {isMr ? 'कोणतेही व्हाउचर सापडले नाही' : 'No vouchers found'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isMr 
              ? 'निवडलेल्या फिल्टरनुसार कोणतीही नोंद नाही. तुम्ही "+ नवीन व्हाउचर एन्ट्री" वर क्लिक करून नवीन बिल किंवा खरेदी नोंदवू शकता.' 
              : 'Record new purchase invoices, sales bills, or return chalans using the "+ New Voucher Entry" button.'}
          </p>
          <button
            onClick={onOpenNewVoucher}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            {isMr ? '+ नवीन व्हाउचर तयार करा' : '+ Create Voucher'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">{isMr ? 'व्हाउचर क्र. व प्रकार' : 'Voucher No & Type'}</th>
                  <th className="py-3 px-3">{isMr ? 'तारीख' : 'Date'}</th>
                  <th className="py-3 px-3">{isMr ? 'सप्लायर / एजन्सी / ग्राहक' : 'Party / Supplier Agency'}</th>
                  <th className="py-3 px-3">{isMr ? 'औषधे साठा' : 'Items'}</th>
                  <th className="py-3 px-3">{isMr ? 'बिल रक्कम (₹)' : 'Total (₹)'}</th>
                  <th className="py-3 px-3">{isMr ? 'पेमेंट स्थिती' : 'Status'}</th>
                  <th className="py-3 px-3.5 text-right">{isMr ? 'दस्तऐवज कृती' : 'PDF / Print Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVouchers.map((vch) => {
                  const tag = getVoucherTypeTag(vch.voucherType);

                  return (
                    <tr key={vch.id} className="hover:bg-slate-50/70 transition">
                      {/* Voucher No & Tag */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {vch.voucherNo}
                        </div>
                        <span className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold border mt-0.5 ${tag.color}`}>
                          {tag.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {vch.date}
                      </td>

                      {/* Party / Supplier Agency */}
                      <td className="py-3 px-3 min-w-[160px]">
                        <div className="flex items-center gap-1.5 group">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">
                            {sanitizePartyName(vch.partyName)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartQuickEditParty(vch)}
                            className="p-1 rounded text-teal-600 hover:text-teal-800 hover:bg-teal-50 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                            title={isMr ? 'एजन्सी / पार्टी नाव बदला' : 'Edit Agency / Party Name'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {vch.invoiceRef && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {vch.invoiceRef}</div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3 text-xs text-slate-600 max-w-[200px]">
                        <div className="truncate font-medium">
                          {(vch.items || []).map(i => i.name).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {vch.items?.length || 0} {isMr ? 'आयटम्स' : 'items recorded'}
                        </div>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          ₹{Number(vch.grandTotal || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">{vch.paymentMode}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          vch.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {vch.paymentStatus || 'PAID'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* PDF Download Button */}
                          <button
                            onClick={() => handleDownloadPdf(vch)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition"
                            title={isMr ? 'PDF डाऊनलोड करा' : 'Download Voucher PDF'}
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Print Invoice Button */}
                          <button
                            onClick={() => handlePrint(vch)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title={isMr ? 'बिल प्रिंट करा' : 'Print Invoice'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => onEditVoucher(vch)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                            title={isMr ? 'संपादित करा' : 'Edit'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => {
                              if (window.confirm(isMr ? `व्हाउचर ${vch.voucherNo} हटवायचे आहे का?` : `Delete voucher ${vch.voucherNo}?`)) {
                                onDeleteVoucher(vch.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition"
                            title={isMr ? 'हटवा' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Edit Party Name Modal */}
      {editingPartyVch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div 
            onClick={() => setEditingPartyVch(null)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {isMr ? 'सप्लायर / एजन्सी नाव बदला' : 'Edit Supplier / Agency Name'}
              </h3>
              <button
                onClick={() => setEditingPartyVch(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-500">
                <span>{isMr ? 'व्हाउचर क्र: ' : 'Voucher No: '}</span>
                <span className="font-mono font-bold text-slate-800">{editingPartyVch.voucherNo}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingPartyVch.voucherType === 'PURCHASE' ? (isMr ? 'सप्लायर / एजन्सी नाव' : 'Supplier / Agency Name') : (isMr ? 'ग्राहक / पार्टी नाव' : 'Customer / Party Name')}
                </label>
                <input
                  type="text"
                  value={quickPartyName}
                  onChange={(e) => setQuickPartyName(e.target.value)}
                  placeholder={isMr ? 'उदा. Om Sai Agency, Mayur Raykar' : 'e.g. Om Sai Agency, Mayur Raykar'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                />
              </div>

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-semibold">{isMr ? 'निवडा:' : 'Quick Select:'}</span>
                {['Om Sai Agency', 'Mayur Raykar', 'Seema Ayurvedic Aushadhalay', 'Shree Ganesh Pharma'].map((ag) => (
                  <button
                    key={ag}
                    type="button"
                    onClick={() => setQuickPartyName(ag)}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 font-semibold transition cursor-pointer"
                  >
                    {ag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPartyVch(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                {isMr ? 'रद्द करा' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveQuickParty}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isMr ? 'जतन करा' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
