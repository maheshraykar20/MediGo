import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Plus, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Package, 
  MapPin, 
  ArrowUpDown, 
  Send,
  MoreVertical,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  getExpiryClassification, 
  formatINR, 
  formatDisplayDate, 
  generateDistributorWhatsAppMessage 
} from '../utils/expiryUtils';
import { CATEGORIES } from '../data/categories';
import { exportMedicinesToExcel, downloadSampleTemplate } from '../utils/excelUtils';

export default function MedicineList({ 
  medicines, 
  onOpenAddModal, 
  onOpenExcelModal, 
  onEditMedicine, 
  onDeleteMedicine, 
  onSelectMedicine,
  selectedStatusFilter,
  setSelectedStatusFilter,
  searchQuery,
  setSearchQuery,
  storeProfile,
  customCategories = [],
  onDeleteCategory,
  lang 
}) {
  const isMr = lang === 'mr';
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('expiry_asc');

  // Filter & Sort Logic
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = m.name?.toLowerCase().includes(query);
        const matchesComp = m.composition?.toLowerCase().includes(query);
        const matchesBatch = m.batchNo?.toLowerCase().includes(query);
        const matchesRack = m.rack?.toLowerCase().includes(query);
        const matchesMfr = m.manufacturer?.toLowerCase().includes(query);
        if (!matchesName && !matchesComp && !matchesBatch && !matchesRack && !matchesMfr) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        if (m.category !== selectedCategory) return false;
      }

      // 3. Expiry / Stock Status Filter
      if (selectedStatusFilter !== 'all') {
        const classification = getExpiryClassification(m.expiryDate);
        if (selectedStatusFilter === 'tomorrow') {
          if (classification.days !== 0 && classification.days !== 1) return false;
        } else if (selectedStatusFilter === 'expired') {
          if (classification.days >= 0) return false;
        } else if (selectedStatusFilter === 'critical_7') {
          if (classification.days < 2 || classification.days > 7) return false;
        } else if (selectedStatusFilter === 'warning_30') {
          if (classification.days < 8 || classification.days > 30) return false;
        } else if (selectedStatusFilter === 'safe') {
          if (classification.days <= 30) return false;
        } else if (selectedStatusFilter === 'near_expiry') {
          if (classification.days > 30) return false;
        } else if (selectedStatusFilter === 'low_stock') {
          if (m.stock > (m.minStock || 10)) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'expiry_asc') {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      }
      if (sortBy === 'expiry_desc') {
        return new Date(b.expiryDate) - new Date(a.expiryDate);
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'stock_asc') {
        return (a.stock || 0) - (b.stock || 0);
      }
      if (sortBy === 'stock_desc') {
        return (b.stock || 0) - (a.stock || 0);
      }
      if (sortBy === 'value_desc') {
        return ((b.stock || 0) * (b.mrp || 0)) - ((a.stock || 0) * (a.mrp || 0));
      }
      return 0;
    });
  }, [medicines, searchQuery, selectedCategory, selectedStatusFilter, sortBy]);

  const handleExport = () => {
    const filename = isMr 
      ? `औषध_साठा_${selectedStatusFilter}.xlsx` 
      : `Pharmacy_Stock_${selectedStatusFilter}.xlsx`;
    exportMedicinesToExcel(filteredMedicines, filename, lang, storeProfile);
  };

  const handleSendWhatsAppSingle = (med) => {
    const storeName = storeProfile?.storeName || (isMr ? 'संजीवनी मेडिकल' : 'Sanjivani Medical');
    const encoded = generateDistributorWhatsAppMessage([med], med.distributor || 'Distributor', lang, storeName);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Controls Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar inside list view */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isMr ? 'औषधाचे नाव, बॅच, कंपोझिशन किंवा रॅक शोधा...' : 'Search medicine name, salt, batch, rack...'}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
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

          {/* Action Buttons: Export, Download Sample, Add */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="expiry_asc">{isMr ? 'Expiry तारीख (लवकर संपणारे)' : 'Expiry Date (Soonest)'}</option>
                <option value="expiry_desc">{isMr ? 'Expiry तारीख (उशिरा संपणारे)' : 'Expiry Date (Furthest)'}</option>
                <option value="name_asc">{isMr ? 'नाव (A - Z)' : 'Medicine Name (A to Z)'}</option>
                <option value="stock_asc">{isMr ? 'कमी साठा आधी' : 'Stock (Lowest)'}</option>
                <option value="stock_desc">{isMr ? 'जास्त साठा आधी' : 'Stock (Highest)'}</option>
                <option value="value_desc">{isMr ? 'जास्त मूल्य (₹ MRP)' : 'Value (Highest)'}</option>
              </select>
            </div>

            {/* Export Current View */}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition shrink-0"
              title={isMr ? 'सध्याची यादी एक्सेलमध्ये सेव्ह करा' : 'Export current view to Excel'}
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">{isMr ? 'Excel एक्सपोर्ट' : 'Export'}</span>
            </button>

            {/* Template Download */}
            <button
              onClick={() => downloadSampleTemplate(lang)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition shrink-0"
              title={isMr ? 'सॅम्पल एक्सेल शीट डाऊनलोड करा' : 'Download empty sample template to fill medicines'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMr ? 'सॅम्पल शीट' : 'Sample'}</span>
            </button>

            {/* Add Custom Medicine */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isMr ? 'नवीन औषध' : 'Add Item'}</span>
            </button>
          </div>
        </div>

        {/* Expiry Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 border-t border-slate-100 scrollbar-none text-xs">
          {[
            { id: 'all', label: isMr ? 'सर्व औषधे' : 'All Stock', count: medicines.length },
            { 
              id: 'tomorrow', 
              label: isMr ? '🚨 उद्या Expire होणार' : '🚨 Expiring Tomorrow', 
              highlight: true,
              badgeClass: 'bg-orange-600 text-white' 
            },
            { 
              id: 'expired', 
              label: isMr ? '🔴 कालबाह्य' : '🔴 Expired', 
              badgeClass: 'bg-rose-600 text-white' 
            },
            { id: 'critical_7', label: isMr ? '🟠 ७ दिवस' : '🟠 7 Days', badgeClass: 'bg-amber-500 text-white' },
            { id: 'warning_30', label: isMr ? '🟡 ३० दिवस' : '🟡 30 Days', badgeClass: 'bg-sky-600 text-white' },
            { id: 'safe', label: isMr ? '🟢 सुरक्षित (> ३० दिवस)' : '🟢 Safe (> 30 Days)' },
            { id: 'low_stock', label: isMr ? '⚠️ कमी साठा' : '⚠️ Low Stock (< 10)' },
          ].map((tab) => {
            const isActive = selectedStatusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition ${
              selectedCategory === 'ALL'
                ? 'bg-teal-100 text-teal-900 border border-teal-300 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isMr ? 'सर्व कॅटेगरीज' : 'All Categories'}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition text-xs flex items-center gap-1 ${
                selectedCategory === cat.name
                  ? 'bg-teal-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{isMr ? cat.nameMr : cat.name}</span>
            </button>
          ))}
          {/* Custom User Categories with quick delete */}
          {customCategories && customCategories.map((cName, idx) => {
            const isSelected = selectedCategory === cName;
            return (
              <div
                key={`custom-chip-${idx}`}
                className={`inline-flex items-center rounded-lg transition text-xs shrink-0 border ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                    : 'bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cName)}
                  className="pl-2.5 pr-1.5 py-1 font-semibold flex items-center gap-1"
                >
                  <span>✨ {cName}</span>
                </button>
                {onDeleteCategory && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCategory(cName);
                      if (selectedCategory === cName) setSelectedCategory('ALL');
                    }}
                    className={`pr-2 pl-1 py-1 text-xs font-bold transition rounded-r-lg ${
                      isSelected 
                        ? 'text-teal-200 hover:text-white hover:bg-teal-700' 
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={isMr ? `"${cName}" कॅटेगरी हटवा` : `Delete "${cName}"`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
        <div>
          {isMr ? 'एकूण आढळलेली औषधे:' : 'Showing medicines:'}{' '}
          <span className="font-bold text-slate-800">{filteredMedicines.length}</span>
        </div>
        {selectedStatusFilter !== 'all' && (
          <button
            onClick={() => setSelectedStatusFilter('all')}
            className="text-teal-600 hover:underline font-semibold"
          >
            {isMr ? 'फिल्टर हटवा (Show All)' : 'Clear Filter'}
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredMedicines.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-14 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center shadow-xs">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-heading font-black text-slate-900">
              {medicines.length === 0 
                ? (isMr ? 'तुमचा औषध साठा सध्या रिक्त आहे' : 'Your Medicine Inventory is Empty')
                : (isMr ? 'कोणतेही औषध आढळले नाही' : 'No medicines found')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {medicines.length === 0
                ? (isMr 
                    ? 'हे तुमचे नवीन मेडिकल स्टोअर खाते आहे. तुम्ही खालील बटण वापरून तुमच्या दुकानातील औषधांची मॅन्युअली नोंद करू शकता किंवा तुमची Excel शीट थेट अपलोड करू शकता.' 
                    : 'This is your fresh, private pharmacy store. Start by adding your medicines manually or uploading an Excel inventory sheet.')
                : (isMr 
                    ? 'निवडलेल्या फिल्टरनुसार औषध सापडले नाही. कृपया शोध शब्द बदला किंवा नवीन औषध जोडा.' 
                    : 'Try changing your search terms or filters, or add new medicines using Excel or manual entry.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-teal-700 shadow-md shadow-teal-600/20 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isMr ? '+ नवीन औषध जोडा' : '+ Add Custom Medicine'}</span>
            </button>
            <button
              onClick={onOpenExcelModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-100 transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isMr ? '📄 Excel शीट अपलोड करा' : 'Upload Excel Sheet'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{isMr ? 'औषधाचे नाव व घटक' : 'Medicine & Composition'}</th>
                <th className="py-3 px-3">{isMr ? 'प्रकार (Category)' : 'Category'}</th>
                <th className="py-3 px-3">{isMr ? 'बॅच नंबर' : 'Batch No.'}</th>
                <th className="py-3 px-4">{isMr ? 'Expiry मुदत स्थिती' : 'Expiry Status'}</th>
                <th className="py-3 px-3">{isMr ? 'रॅक / जागा' : 'Rack'}</th>
                <th className="py-3 px-3">{isMr ? 'साठा' : 'Stock'}</th>
                <th className="py-3 px-3">{isMr ? 'किंमत (₹)' : 'MRP / Cost'}</th>
                <th className="py-3 px-4 text-right">{isMr ? 'कृती' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.map((med) => {
                const classification = getExpiryClassification(med.expiryDate);
                const isTomorrow = classification.days === 0 || classification.days === 1;
                const isExpired = classification.days < 0;
                const isLowStock = med.stock <= (med.minStock || 10);

                return (
                  <tr 
                    key={med.id} 
                    className={`hover:bg-slate-50/70 transition ${
                      isTomorrow ? 'bg-orange-50/30' : isExpired ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Medicine Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer flex items-center gap-1.5" onClick={() => onSelectMedicine(med)}>
                        <span>{med.name}</span>
                        {med.schedule && med.schedule !== 'OTC' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                            {med.schedule}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {med.composition || med.manufacturer}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {med.category}
                      </span>
                    </td>

                    {/* Batch */}
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-700">
                      {med.batchNo || '-'}
                    </td>

                    {/* Expiry Status */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${classification.badgeColor}`}>
                          {isTomorrow && <Clock className="w-3 h-3 text-orange-600 animate-pulse" />}
                          {isExpired && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          <span>{isMr ? classification.labelMr : classification.labelEn}</span>
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {formatDisplayDate(med.expiryDate)} ({isMr ? classification.sublabelMr : classification.sublabelEn})
                        </div>
                      </div>
                    </td>

                    {/* Rack Location */}
                    <td className="py-3 px-3 text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 font-mono">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        {med.rack || 'Shelf 1'}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {med.stock} <span className="text-[11px] font-normal text-slate-500">{med.unit || 'units'}</span>
                      </div>
                      {isLowStock && (
                        <div className="text-[10px] text-rose-600 font-bold">
                          {isMr ? 'कमी साठा!' : 'Low stock!'}
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        ₹{med.mrp || med.price || 0}
                      </div>
                      {med.purchasePrice && (
                        <div className="text-[10px] text-slate-400">
                          {isMr ? 'खरेदी:' : 'Cost:'} ₹{med.purchasePrice}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSendWhatsAppSingle(med)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title={isMr ? 'WhatsApp वर पाठवा' : 'Send to supplier on WhatsApp'}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectMedicine(med)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                          title={isMr ? 'तपशील पहा' : 'View details'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditMedicine(med)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title={isMr ? 'संपादित करा' : 'Edit'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(isMr ? `औषध "${med.name}" हटवायचे आहे का?` : `Delete "${med.name}"?`)) {
                              onDeleteMedicine(med.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
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

      {/* MOBILE CARDS VIEW */}
      <div className="md:hidden space-y-3">
        {filteredMedicines.map((med) => {
          const classification = getExpiryClassification(med.expiryDate);
          const isTomorrow = classification.days === 0 || classification.days === 1;
          const isExpired = classification.days < 0;

          return (
            <div 
              key={med.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm transition space-y-3 ${
                isTomorrow 
                  ? 'border-orange-300 bg-gradient-to-br from-white to-orange-50/40 ring-1 ring-orange-300' 
                  : isExpired 
                  ? 'border-rose-300 bg-gradient-to-br from-white to-rose-50/40' 
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header: Name + Expiry Pill */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                    <span>{med.name}</span>
                    {med.schedule && med.schedule !== 'OTC' && (
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-100 text-slate-700 rounded border">
                        {med.schedule}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {med.composition || med.category}
                  </div>
                </div>

                {/* Expiry Badge */}
                <div className="shrink-0 text-right">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${classification.badgeColor}`}>
                    {isTomorrow && <Clock className="w-3 h-3 text-orange-600 animate-pulse" />}
                    <span>{isMr ? classification.labelMr : classification.labelEn}</span>
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {formatDisplayDate(med.expiryDate)}
                  </div>
                </div>
              </div>

              {/* Middle Row: Batch, Rack, Stock */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-500">{isMr ? 'बॅच नंबर' : 'Batch'}</div>
                  <div className="font-mono font-bold text-slate-800 truncate">{med.batchNo}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">{isMr ? 'रॅक / जागा' : 'Rack'}</div>
                  <div className="font-semibold text-slate-800 truncate">{med.rack || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">{isMr ? 'साठा' : 'Stock'}</div>
                  <div className="font-bold text-slate-900">
                    {med.stock} <span className="text-[10px] font-normal">{med.unit || 'units'}</span>
                  </div>
                </div>
              </div>

              {/* Price & Action Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">MRP: </span>
                  <span className="font-extrabold text-slate-900">₹{med.mrp || med.price}</span>
                  {med.purchasePrice && (
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      ({isMr ? 'खरेदी' : 'Cost'}: ₹{med.purchasePrice})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSendWhatsAppSingle(med)}
                    className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                    title={isMr ? 'WhatsApp' : 'Send WhatsApp'}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onSelectMedicine(med)}
                    className="p-1.5 text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100"
                    title={isMr ? 'तपशील' : 'Details'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEditMedicine(med)}
                    className="p-1.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    title={isMr ? 'संपादित करा' : 'Edit'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(isMr ? `औषध "${med.name}" हटवायचे आहे का?` : `Delete "${med.name}"?`)) {
                        onDeleteMedicine(med.id);
                      }
                    }}
                    className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"
                    title={isMr ? 'हटवा' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  )}
</div>
  );
}
