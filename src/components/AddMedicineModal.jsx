import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  Calendar, 
  Pill, 
  MapPin, 
  Building2, 
  Tag, 
  Layers, 
  AlertCircle,
  Clock,
  Sparkles,
  Trash2
} from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { getDaysUntilExpiry, getExpiryClassification } from '../utils/expiryUtils';
import { playSuccessSound } from '../utils/notificationSound';

export default function AddMedicineModal({ 
  isOpen, 
  onClose, 
  onSaveMedicine, 
  editingMedicine, 
  customCategories = [],
  onAddCategory,
  onDeleteCategory,
  lang 
}) {
  const isMr = lang === 'mr';
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    composition: '',
    category: 'Tablets & Capsules',
    batchNo: '',
    expiryDate: '',
    stock: 20,
    unit: 'Strips',
    purchasePrice: '',
    mrp: '',
    rack: '',
    manufacturer: '',
    distributor: '',
    distributorPhone: '',
    schedule: 'OTC',
    minStock: 10,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingMedicine) {
      setFormData({
        ...editingMedicine,
        purchasePrice: editingMedicine.purchasePrice || '',
        mrp: editingMedicine.mrp || '',
      });
    } else {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setFormData({
        name: '',
        composition: '',
        category: 'Tablets & Capsules',
        batchNo: `BT-${Math.floor(1000 + Math.random() * 9000)}`,
        expiryDate: nextYear.toISOString().split('T')[0],
        stock: 30,
        unit: 'Strips',
        purchasePrice: '',
        mrp: '',
        rack: 'Rack A-1',
        manufacturer: 'Cipla Ltd',
        distributor: 'Balaji Pharma Distributors',
        distributorPhone: '+919822012345',
        schedule: 'OTC',
        minStock: 10,
      });
    }
    setErrors({});
  }, [editingMedicine, isOpen]);

  if (!isOpen) return null;

  // Real-time calculation of remaining days based on selected expiry date
  const expiryPreview = formData.expiryDate ? getExpiryClassification(formData.expiryDate) : null;

  // Calculate profit margin %
  const purchaseNum = parseFloat(formData.purchasePrice) || 0;
  const mrpNum = parseFloat(formData.mrp) || 0;
  const profitMargin = (mrpNum > 0 && purchaseNum > 0) 
    ? (((mrpNum - purchaseNum) / purchaseNum) * 100).toFixed(1) 
    : null;

  const setPresetDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFormData(prev => ({ ...prev, expiryDate: d.toISOString().split('T')[0] }));
  };

  const handleCreateCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (onAddCategory) {
      onAddCategory(trimmed);
    }
    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryInput('');
    setIsAddingCategory(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = isMr ? 'औषधाचे नाव आवश्यक आहे.' : 'Medicine name is required.';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = isMr ? 'Expiry तारीख निवडा.' : 'Expiry date is required.';
    }
    if (!formData.batchNo.trim()) {
      newErrors.batchNo = isMr ? 'बॅच नंबर आवश्यक आहे.' : 'Batch number is required.';
    }
    if (formData.stock === '' || formData.stock < 0) {
      newErrors.stock = isMr ? 'वैध साठा प्रविष्ट करा.' : 'Valid stock is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...formData,
      id: editingMedicine?.id || `med-${Date.now()}`,
      stock: parseInt(formData.stock, 10) || 0,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      mrp: parseFloat(formData.mrp) || 0,
      minStock: parseInt(formData.minStock, 10) || 10,
      status: 'active',
      addedAt: editingMedicine?.addedAt || new Date().toISOString(),
    };

    onSaveMedicine(payload);
    playSuccessSound();
    onClose();
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
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingMedicine 
                  ? (isMr ? 'औषधाची माहिती अपडेट करा' : 'Edit Medicine Details')
                  : (isMr ? 'नवीन औषध साठ्यात जोडा' : 'Add Custom Medicine')}
              </h3>
              <p className="text-xs text-slate-500">
                {isMr 
                  ? 'नाव, बॅच नंबर, मुदत (Expiry) व किंमत अचूक नोंदवा' 
                  : 'Enter brand name, batch number, expiry date and pricing accurately'}
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Row 1: Medicine Name & Composition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'औषधाचे नाव *' : 'Medicine Brand Name *'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isMr ? 'उदा. Dolo 650, Augmentin 625...' : 'e.g. Dolo 650, Augmentin 625...'}
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition ${
                  errors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-teal-500'
                }`}
              />
              {errors.name && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.name}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'घटक / Salt (Composition)' : 'Generic / Salt Composition'}
              </label>
              <input
                type="text"
                value={formData.composition}
                onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                placeholder={isMr ? 'उदा. Paracetamol 650mg...' : 'e.g. Paracetamol 650mg...'}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              />
            </div>
          </div>

          {/* Row 2: Category & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {isMr ? 'प्रकार (Category) *' : 'Category *'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingCategory ? (isMr ? 'रद्द करा' : 'Cancel') : (isMr ? '+ नवीन कॅटेगरी' : '+ Add New')}</span>
                </button>
              </div>

              {isAddingCategory ? (
                <div className="flex items-center gap-1.5 animate-fadeIn">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    placeholder={isMr ? 'नवीन कॅटेगरीचे नाव टाका...' : 'New category name...'}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-semibold"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm shadow-teal-600/20"
                  >
                    {isMr ? 'जोडा' : 'Add'}
                  </button>
                </div>
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingCategory(true);
                    } else {
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-medium"
                >
                  <optgroup label={isMr ? 'मानक कॅटेगरीज (Standard)' : 'Standard Categories'}>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {isMr ? cat.nameMr : cat.name}
                      </option>
                    ))}
                  </optgroup>
                  {customCategories && customCategories.length > 0 && (
                    <optgroup label={isMr ? 'माझ्या नवीन कॅटेगरीज (Custom)' : 'My Custom Categories'}>
                      {customCategories.map((cName, idx) => (
                        <option key={`custom-${idx}`} value={cName}>
                          ✨ {cName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__add_new__" className="font-bold text-teal-700">
                    {isMr ? '➕ + नवीन कॅटेगरी जोडा...' : '➕ + Add New Category...'}
                  </option>
                </select>
              )}

              {/* List of Custom Categories with One-Click Delete */}
              {customCategories && customCategories.length > 0 && (
                <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>{isMr ? 'माझ्या कॅटेगरीज (हटवण्यासाठी 🗑️ दाबा):' : 'My Categories (Click 🗑️ to delete):'}</span>
                    <span className="text-[10px] text-teal-800 font-mono font-bold bg-teal-50 px-1.5 py-0.2 rounded-full border border-teal-200">
                      {customCategories.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                    {customCategories.map((cName) => {
                      const isCurr = formData.category === cName;
                      return (
                        <span 
                          key={cName} 
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs border shadow-xs transition ${
                            isCurr 
                              ? 'bg-teal-600 text-white border-teal-700 font-bold' 
                              : 'bg-white border-teal-200 text-teal-900 font-medium'
                          }`}
                        >
                          <span 
                            className="cursor-pointer hover:underline"
                            onClick={() => setFormData({ ...formData, category: cName })}
                            title={isMr ? `"${cName}" निवडा` : `Select "${cName}"`}
                          >
                            ✨ {cName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDeleteCategory) {
                                onDeleteCategory(cName);
                                if (formData.category === cName) {
                                  setFormData(prev => ({ ...prev, category: 'Tablets & Capsules' }));
                                }
                              }
                            }}
                            className={`p-0.5 rounded transition ${
                              isCurr 
                                ? 'text-teal-100 hover:text-white hover:bg-teal-700' 
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={isMr ? `"${cName}" कॅटेगरी हटवा` : `Delete "${cName}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'ड्रग शेड्युल (Schedule)' : 'Drug Schedule'}
              </label>
              <select
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              >
                {isMr ? (
                  <>
                    <option value="OTC">OTC (सामान्य विक्री)</option>
                    <option value="Schedule H">Schedule H (डॉक्टरांच्या प्रिस्क्रिप्शनवर)</option>
                    <option value="Schedule H1">Schedule H1 (हाय अलर्ट / अँटीबायोटिक रजिस्टर)</option>
                    <option value="Schedule G">Schedule G (वैद्यकीय देखरेख)</option>
                    <option value="Schedule X">Schedule X (नारकोटिक्स)</option>
                  </>
                ) : (
                  <>
                    <option value="OTC">OTC (General Sales Over The Counter)</option>
                    <option value="Schedule H">Schedule H (Prescription Required)</option>
                    <option value="Schedule H1">Schedule H1 (High Alert / Antibiotic Register)</option>
                    <option value="Schedule G">Schedule G (Medical Supervision)</option>
                    <option value="Schedule X">Schedule X (Narcotics)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Row 3: Batch Number & Expiry Date (WITH LIVE COUNTDOWN / PREVIEW) */}
          <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {isMr ? 'बॅच नंबर *' : 'Batch Number *'}
                </label>
                <input
                  type="text"
                  value={formData.batchNo}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  placeholder={isMr ? 'उदा. DL-9042, B-8812' : 'e.g. DL-9042, B-8812'}
                  className={`w-full px-3 py-2 text-xs sm:text-sm bg-white font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition ${
                    errors.batchNo ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                  }`}
                />
                {errors.batchNo && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.batchNo}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>{isMr ? 'मुदत संपण्याची तारीख (Expiry Date) *' : 'Expiry Date *'}</span>
                  {expiryPreview && (
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${expiryPreview.badgeColor}`}>
                      {isMr ? expiryPreview.labelMr : expiryPreview.labelEn}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className={`w-full px-3 py-2 text-xs sm:text-sm bg-white font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition ${
                    errors.expiryDate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                  }`}
                />
                {errors.expiryDate && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.expiryDate}</span>}
              </div>
            </div>

            {/* Quick Expiry Date Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-500 font-medium">{isMr ? 'जलद मुदत निवडा:' : 'Quick Presets:'}</span>
              <button
                type="button"
                onClick={() => setPresetDate(1)}
                className="px-2 py-0.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold border border-orange-300 transition"
              >
                {isMr ? '🚨 उद्या (24 तास)' : '🚨 Tomorrow (24h)'}
              </button>
              <button
                type="button"
                onClick={() => setPresetDate(5)}
                className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold border border-amber-300 transition"
              >
                {isMr ? '५ दिवस' : '5 Days'}
              </button>
              <button
                type="button"
                onClick={() => setPresetDate(30)}
                className="px-2 py-0.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold border border-sky-300 transition"
              >
                {isMr ? '१ महिना' : '1 Month'}
              </button>
              <button
                type="button"
                onClick={() => setPresetDate(180)}
                className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold border border-emerald-300 transition"
              >
                {isMr ? '६ महिने' : '6 Months'}
              </button>
              <button
                type="button"
                onClick={() => setPresetDate(365)}
                className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold border border-emerald-300 transition"
              >
                {isMr ? '१ वर्ष' : '1 Year'}
              </button>
            </div>
          </div>

          {/* Row 4: Stock Quantity, Unit & Rack Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'उपलब्ध साठा (Quantity) *' : 'Stock Quantity *'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-bold"
              />
              {errors.stock && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.stock}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'युनिट प्रकार (Unit)' : 'Unit Packaging'}
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              >
                {isMr ? (
                  <>
                    <option value="Strips">स्ट्रिप्स (Strips)</option>
                    <option value="Bottles">बाटल्या (Bottles)</option>
                    <option value="Tubes">ट्युब्स (Tubes)</option>
                    <option value="Vials">व्हायाल्स (Vials)</option>
                    <option value="Boxes">खोके (Boxes)</option>
                    <option value="Tablets">सुट्या गोळ्या (Tablets)</option>
                  </>
                ) : (
                  <>
                    <option value="Strips">Strips</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Tubes">Tubes</option>
                    <option value="Vials">Vials</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Tablets">Tablets</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'रॅक / जागा (Rack Location)' : 'Shelf / Rack Location'}
              </label>
              <input
                type="text"
                value={formData.rack}
                onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                placeholder={isMr ? 'उदा. Rack A-3, Drawer 2' : 'e.g. Rack A-3, Drawer 2'}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-mono"
              />
            </div>
          </div>

          {/* Row 5: Pricing (Purchase Price & MRP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'खरेदी किंमत (Purchase Cost ₹)' : 'Purchase Cost (₹)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                placeholder={isMr ? 'उदा. 45.00' : 'e.g. 45.00'}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>{isMr ? 'विक्री किंमत (MRP ₹)' : 'Selling Price / MRP (₹)'}</span>
                {profitMargin !== null && (
                  <span className={`text-[10px] font-bold ${parseFloat(profitMargin) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isMr ? 'नफा:' : 'Margin:'} {profitMargin}%
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder={isMr ? 'उदा. 65.00' : 'e.g. 65.00'}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Row 6: Manufacturer & Distributor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'कंपनी / मॅन्युफॅक्चरर' : 'Manufacturer Company'}
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder={isMr ? 'उदा. Cipla, Sun Pharma, Abbott...' : 'e.g. Cipla, Sun Pharma, Abbott...'}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'सप्लायर / डिस्ट्रीब्यूटर नाव' : 'Supplier / Distributor'}
              </label>
              <input
                type="text"
                value={formData.distributor}
                onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                placeholder={isMr ? 'उदा. Balaji Pharma Distributors...' : 'e.g. Balaji Pharma Distributors...'}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
          >
            {isMr ? 'रद्द करा' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/30 transition"
          >
            <Check className="w-4 h-4" />
            <span>{editingMedicine ? (isMr ? 'अपडेट करा' : 'Update Medicine') : (isMr ? 'साठ्यात जोडा' : 'Save to Inventory')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
