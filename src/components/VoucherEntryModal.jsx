import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  Plus, 
  Trash2, 
  Check, 
  Calendar, 
  User, 
  Phone, 
  FileText, 
  CreditCard, 
  Sparkles,
  ShoppingBag,
  PackagePlus,
  RotateCcw,
  Printer
} from 'lucide-react';
import { playSuccessSound } from '../utils/notificationSound';

export default function VoucherEntryModal({ 
  isOpen, 
  onClose, 
  onSaveVoucher, 
  medicines = [], 
  existingVoucher = null,
  lang = 'mr' 
}) {
  const isMr = lang === 'mr';

  const [voucherType, setVoucherType] = useState('PURCHASE'); // PURCHASE, SALES, RETURN, EXPENSE
  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [taxPercent, setTaxPercent] = useState(12);
  const [discount, setDiscount] = useState(0);
  const [updateStock, setUpdateStock] = useState(true);

  // Line items
  const [items, setItems] = useState([
    { name: '', batchNo: '', expiryDate: '', quantity: 10, unit: 'Strips', rate: 25, amount: 250 }
  ]);

  useEffect(() => {
    if (existingVoucher) {
      setVoucherType(existingVoucher.voucherType);
      setVoucherNo(existingVoucher.voucherNo);
      setDate(existingVoucher.date);
      setPartyName(existingVoucher.partyName || '');
      setPartyPhone(existingVoucher.partyPhone || '');
      setInvoiceRef(existingVoucher.invoiceRef || '');
      setPaymentMode(existingVoucher.paymentMode || 'Cash');
      setPaymentStatus(existingVoucher.paymentStatus || 'PAID');
      setTaxPercent(existingVoucher.taxPercent || 0);
      setDiscount(existingVoucher.discount || 0);
      setNotes(existingVoucher.notes || '');
      setItems(existingVoucher.items || []);
    } else {
      // Auto-generate fresh voucher code based on type
      const prefix = voucherType === 'PURCHASE' ? 'PV' : voucherType === 'SALES' ? 'SV' : voucherType === 'RETURN' ? 'RV' : 'EV';
      const randomNum = Math.floor(100 + Math.random() * 900);
      setVoucherNo(`${prefix}-${new Date().getFullYear()}-${randomNum}`);
      setDate(new Date().toISOString().split('T')[0]);
      setPartyName('');
      setPartyPhone('');
      setInvoiceRef('');
      setPaymentMode('Cash');
      setPaymentStatus('PAID');
      setNotes('');
      setTaxPercent(voucherType === 'RETURN' ? 0 : 12);
      setDiscount(0);
      setItems([
        { name: '', batchNo: '', expiryDate: '', quantity: 10, unit: 'Strips', rate: 30, amount: 300 }
      ]);
    }
  }, [existingVoucher, voucherType, isOpen]);

  if (!isOpen) return null;

  // Handle Item Changes
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    // Recalculate row amount
    if (field === 'quantity' || field === 'rate') {
      const q = parseFloat(updated[index].quantity) || 0;
      const r = parseFloat(updated[index].rate) || 0;
      updated[index].amount = +(q * r).toFixed(2);
    }

    setItems(updated);
  };

  const handleSelectPreloadedMedicine = (index, medId) => {
    const med = medicines.find(m => m.id === medId);
    if (!med) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      name: med.name,
      batchNo: med.batchNo || '',
      expiryDate: med.expiryDate || '',
      rate: voucherType === 'SALES' ? (med.mrp || 30) : (med.purchasePrice || 25),
      unit: med.unit || 'Strips',
      amount: +(updated[index].quantity * (voucherType === 'SALES' ? (med.mrp || 30) : (med.purchasePrice || 25))).toFixed(2),
    };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { name: '', batchNo: '', expiryDate: '', quantity: 1, unit: 'Strips', rate: 0, amount: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial Computations
  const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const taxAmount = +(subtotal * (parseFloat(taxPercent) / 100)).toFixed(2);
  const grandTotal = +(subtotal + taxAmount - (parseFloat(discount) || 0)).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!partyName.trim()) {
      alert(isMr ? 'कृपया पार्टी / सप्लायर / ग्राहकाचे नाव टाका.' : 'Please enter Party / Supplier / Customer name.');
      return;
    }

    const payload = {
      id: existingVoucher?.id || `vch-${Date.now()}`,
      voucherNo,
      voucherType,
      date,
      partyName,
      partyPhone,
      invoiceRef,
      paymentMode,
      paymentStatus,
      items: items.filter(it => it.name.trim()),
      subtotal,
      taxPercent: parseFloat(taxPercent) || 0,
      taxAmount,
      discount: parseFloat(discount) || 0,
      grandTotal,
      notes,
      updateStock,
      createdAt: existingVoucher?.createdAt || new Date().toISOString(),
    };

    onSaveVoucher(payload);
    playSuccessSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {existingVoucher 
                  ? (isMr ? 'व्हाउचर संपादित करा' : 'Edit Voucher Entry')
                  : (isMr ? 'नवीन व्हाउचर एन्ट्री' : 'New Voucher Entry')}
              </h3>
              <p className="text-xs text-slate-500">
                {isMr 
                  ? 'खरेदी बिल, विक्री पावती, किंवा सप्लायर रिटर्न चलन नोंदवा' 
                  : 'Record purchase inward, customer sale memo, or expiry return chalan'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Voucher Type Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 overflow-x-auto">
            {[
              { id: 'PURCHASE', label: isMr ? '📥 खरेदी व्हाउचर (Purchase)' : '📥 Purchase Inward' },
              { id: 'SALES', label: isMr ? '📤 विक्री पावती (Sales Bill)' : '📤 Retail Sales Memo' },
              { id: 'RETURN', label: isMr ? '🚨 मुदत रिटर्न (Expiry Debit Note)' : '🚨 Expiry Return Chalan' },
              { id: 'EXPENSE', label: isMr ? '💸 खर्च व्हाउचर (Expense)' : '💸 Expense Voucher' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setVoucherType(tab.id)}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition shrink-0 ${
                  voucherType === tab.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Row 1: Voucher Number, Date, Reference Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isMr ? 'व्हाउचर क्रमांक *' : 'Voucher Number *'}
              </label>
              <input
                type="text"
                required
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isMr ? 'तारीख *' : 'Voucher Date *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isMr ? 'सप्लायर बिल / संदर्भ क्र.' : 'Ref Invoice / Bill No.'}
              </label>
              <input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="INV-8891"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          {/* Row 2: Party Name, Phone, Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {voucherType === 'PURCHASE' ? (isMr ? 'सप्लायर नाव *' : 'Distributor / Supplier Name *') : (isMr ? 'ग्राहक / पार्टी नाव *' : 'Party / Customer Name *')}
              </label>
              <input
                type="text"
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder={isMr ? 'उदा. Balaji Pharma Distributors' : 'e.g. Balaji Pharma Distributors'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isMr ? 'संपर्क फोन / मोबाईल' : 'Contact Phone No.'}
              </label>
              <input
                type="tel"
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
                placeholder="+91 98220 12345"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isMr ? 'पेमेंट पद्धत' : 'Payment Mode'}
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="Cash">Cash (रोख)</option>
                <option value="UPI / GPay">UPI / QR Code</option>
                <option value="Bank NEFT / RTGS">Bank NEFT / RTGS</option>
                <option value="Credit / Cheque">Credit / उधारी</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                {isMr ? 'औषधे व साठा तपशील (Voucher Items)' : 'Voucher Line Items'}
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isMr ? '+ औषध जोडा' : '+ Add Item Row'}</span>
              </button>
            </div>

            <div className="p-3 space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Select from Inventory helper */}
                    <div className="sm:col-span-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-600">
                          {isMr ? 'औषधाचे नाव' : 'Medicine Name'}
                        </label>
                        {medicines.length > 0 && (
                          <select
                            onChange={(e) => handleSelectPreloadedMedicine(idx, e.target.value)}
                            className="text-[10px] font-semibold text-teal-700 bg-teal-50 rounded px-1.5 py-0.5 border border-teal-200 focus:outline-none cursor-pointer"
                          >
                            <option value="">{isMr ? '⚡ साठ्यातून निवडा...' : '⚡ Pick Stock...'}</option>
                            {medicines.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.batchNo})</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Dolo 650 Tablet"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                      />
                    </div>

                    {/* Batch */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">
                        {isMr ? 'बॅच नंबर' : 'Batch No.'}
                      </label>
                      <input
                        type="text"
                        value={item.batchNo}
                        onChange={(e) => handleItemChange(idx, 'batchNo', e.target.value)}
                        placeholder="DL-9042"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                      />
                    </div>

                    {/* Expiry */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">
                        {isMr ? 'मुदत (Expiry)' : 'Expiry Date'}
                      </label>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">
                        {isMr ? 'नग' : 'Qty'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 text-center"
                      />
                    </div>

                    {/* Rate */}
                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">
                        {isMr ? 'दर (₹)' : 'Rate (₹)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 text-right"
                      />
                    </div>

                    {/* Amount */}
                    <div className="sm:col-span-1 text-right">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">
                        {isMr ? 'रक्कम' : 'Total'}
                      </label>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{item.amount || 0}
                      </span>
                    </div>

                    {/* Delete row */}
                    <div className="sm:col-span-1 text-center pt-3 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Taxes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isMr ? 'शेरा / टिपा (Narration)' : 'Notes / Narration'}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isMr ? 'उदा. औषधे चांगल्या स्थितीत प्राप्त झाली...' : 'e.g. Received sealed stock in good condition...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 resize-none text-xs"
              />

              {voucherType === 'PURCHASE' && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs font-bold text-teal-800">
                  <input
                    type="checkbox"
                    checked={updateStock}
                    onChange={(e) => setUpdateStock(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>{isMr ? 'हे औषध आपोआप इन्व्हेंटरी साठ्यात जोडा' : 'Auto-add purchased items to stock inventory'}</span>
                </label>
              )}
            </div>

            {/* Calculations Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{isMr ? 'उप-एकूण (Subtotal):' : 'Subtotal:'}</span>
                <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span>{isMr ? 'जीएसटी कर:' : 'GST Tax:'}</span>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </span>
                <span className="font-bold text-slate-900">+ ₹{taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>{isMr ? 'सवलत (Discount ₹):' : 'Discount (₹):'}</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-20 px-2 py-0.5 bg-white border rounded text-right font-bold text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-teal-900">
                <span>{isMr ? 'एकूण बिल रक्कम (Grand Total):' : 'Grand Total:'}</span>
                <span className="text-base text-teal-700">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
          >
            {isMr ? 'रद्द करा' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/30 transition"
          >
            <Check className="w-4 h-4" />
            <span>{isMr ? 'व्हाउचर सेव्ह करा' : 'Save Voucher Entry'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
