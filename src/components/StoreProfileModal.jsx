import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Store, 
  Upload, 
  Trash2, 
  Check, 
  Camera, 
  Building2, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles,
  ShieldCheck,
  Palette,
  CheckCircle2,
  Pipette,
  Tag,
  Plus
} from 'lucide-react';
import { playSuccessSound } from '../utils/notificationSound';
import { THEME_PRESETS, generateCustomTheme, applyDashboardTheme } from '../utils/themeUtils';

export default function StoreProfileModal({ 
  isOpen, 
  onClose, 
  profile, 
  onSaveProfile,
  activeTheme,
  onSaveTheme,
  customCategories = [],
  onAddCategory,
  onDeleteCategory, 
  lang 
}) {
  const isMr = lang === 'mr';
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'theme' | 'categories'
  const [formData, setFormData] = useState(profile || {});
  const [selectedTheme, setSelectedTheme] = useState(activeTheme || THEME_PRESETS[0]);
  const [customHex, setCustomHex] = useState(activeTheme?.color || '#0d9488');
  const [tabNewCategory, setTabNewCategory] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile, isOpen]);

  useEffect(() => {
    if (activeTheme) {
      setSelectedTheme(activeTheme);
      setCustomHex(activeTheme.color || '#0d9488');
    }
  }, [activeTheme, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert(isMr ? 'प्रतिमेचा आकार २ MB पेक्षा कमी असावा.' : 'Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, logoUrl: event.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  const handleSelectPreset = (preset) => {
    setSelectedTheme(preset);
    setCustomHex(preset.color);
    applyDashboardTheme(preset);
    if (onSaveTheme) {
      onSaveTheme(preset);
    }
  };

  const handleCustomHexChange = (newHex) => {
    setCustomHex(newHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      const customThemeObj = generateCustomTheme(newHex, 'Custom Hex', isMr ? 'स्वतःचा रंग' : 'Custom Color');
      setSelectedTheme(customThemeObj);
      applyDashboardTheme(customThemeObj);
      if (onSaveTheme) {
        onSaveTheme(customThemeObj);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveProfile(formData);
    if (onSaveTheme && selectedTheme) {
      onSaveTheme(selectedTheme);
    }
    playSuccessSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 z-10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm shadow-teal-600/30">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {isMr ? 'स्टोअर प्रोफाईल व कलर थीम' : 'Store Profile & Color Theme'}
              </h3>
              <p className="text-xs text-slate-500">
                {isMr ? 'तुमची माहिती, लोगो आणि डॅशबोर्डचा रंग निवडा' : 'Manage pharmacy details, logo and dashboard theme colors'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 pt-2.5 bg-slate-50/40 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{isMr ? 'स्टोअर माहिती (Info)' : 'Store Details'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'theme'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{isMr ? 'कलर थीम' : 'Theme & Colors'}</span>
            <span 
              className="w-2.5 h-2.5 rounded-full inline-block ml-0.5 border border-white shadow-xs" 
              style={{ backgroundColor: selectedTheme?.color || '#0d9488' }} 
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'categories'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{isMr ? 'कॅटेगरीज व्यवस्थापन' : 'Categories'}</span>
            {customCategories && customCategories.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 font-mono font-bold">
                {customCategories.length}
              </span>
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: STORE DETAILS */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Logo / Image Upload Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-teal-500/40 bg-teal-50 shadow-md flex items-center justify-center">
                    {formData.logoUrl ? (
                      <img 
                        src={formData.logoUrl} 
                        alt="Store Logo" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-teal-600 font-bold">
                        <span className="text-2xl font-serif">Rx</span>
                        <span className="text-[9px] uppercase tracking-wider font-sans">{isMr ? 'लोगो' : 'Logo'}</span>
                      </div>
                    )}
                  </div>

                  {/* Upload trigger button overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-md transition"
                    title={isMr ? 'फोटो अपलोड करा' : 'Upload photo'}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>

                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="hidden" 
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-slate-800">
                    {isMr ? 'स्टोअर लोगो किंवा दुकान फोटो' : 'Store Logo or Pharmacy Photo'}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isMr 
                      ? 'PNG, JPG किंवा WebP फॉरमॅट (कमाल २ MB). हा लोगो हेडर व अहवालांवर दिसेल.' 
                      : 'PNG, JPG, or WebP (max 2MB). This logo will appear on the header, invoices and reports.'}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>{isMr ? 'फोटो निवडा' : 'Upload Logo'}</span>
                    </button>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isMr ? 'काढून टाका' : 'Remove'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 1: Store Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isMr ? 'मेडिकल स्टोअरचे नाव' : 'Pharmacy / Store Name'}
                </label>
                <input
                  type="text"
                  value={formData.storeName || ''}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder={isMr ? 'उदा. संजीवनी मेडिकल आणि जनरल स्टोअर्स' : 'e.g. Sanjivani Medical & General Store'}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-bold"
                />
              </div>

              {/* Row 2: Owner Name & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMr ? 'फार्मसिस्ट / मालकाचे नाव' : 'Pharmacist / Owner Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder={isMr ? 'उदा. महेश पाटील (B.Pharm)' : 'e.g. Mahesh Patil (B.Pharm)'}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMr ? 'जीएसटी नंबर (GSTIN)' : 'GSTIN Registration No.'}
                  </label>
                  <input
                    type="text"
                    value={formData.gstin || ''}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder={isMr ? 'उदा. 27AABCS1429B1Z' : 'e.g. 27AABCS1429B1Z'}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-mono uppercase"
                  />
                </div>
              </div>

              {/* Row 3: Drug License Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMr ? 'ड्रग्ज लायसन्स क्रमांक (20B)' : 'Drug License No. (20B)'}
                  </label>
                  <input
                    type="text"
                    value={formData.drugLicense20B || ''}
                    onChange={(e) => setFormData({ ...formData, drugLicense20B: e.target.value })}
                    placeholder={isMr ? 'उदा. MH-PUN-20B-10492' : 'e.g. MH-PUN-20B-10492'}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMr ? 'ड्रग्ज लायसन्स क्रमांक (21B)' : 'Drug License No. (21B)'}
                  </label>
                  <input
                    type="text"
                    value={formData.drugLicense21B || ''}
                    onChange={(e) => setFormData({ ...formData, drugLicense21B: e.target.value })}
                    placeholder={isMr ? 'उदा. MH-PUN-21B-10493' : 'e.g. MH-PUN-21B-10493'}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Row 4: Phone (Verified Login Number) & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{isMr ? 'लॉगिन मोबाईल नंबर' : 'Login Mobile Number'}</span>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-teal-600" />
                      {isMr ? 'पडताळलेला' : 'Verified'}
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.phone ? (formData.phone.startsWith('+91') ? formData.phone : `+91 ${formData.phone}`) : ''}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-mono font-bold cursor-not-allowed select-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {isMr ? 'हा नंबर तुमच्या लॉगिन खात्याचा सुरक्षित नंबर आहे.' : 'Bound strictly to your authenticated mobile login.'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isMr ? 'ईमेल आयडी' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={isMr ? 'उदा. medical@example.com' : 'e.g. medical@example.com'}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
                  />
                </div>
              </div>

              {/* Row 5: Store Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isMr ? 'मेडिकल स्टोअरचा पत्ता' : 'Store Address & Location'}
                </label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={isMr ? 'उदा. शॉप नं. ४, मेन रोड, तालुका / जिल्हा, महाराष्ट्र' : 'e.g. Shop No. 4, Main Road, Maharashtra'}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: COLOR THEME CUSTOMIZER */}
          {activeTab === 'theme' && (
            <div className="space-y-5 py-1">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isMr ? 'डॅशबोर्ड कलर थीम निवडा' : 'Choose Dashboard Color Theme'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMr 
                    ? 'खालीलपैकी कोणताही रंग निवडा किंवा तुमचा स्वतःचा ब्रँड कलर सेट करा.' 
                    : 'Select a clinical preset or enter any custom brand color.'}
                </p>
              </div>

              {/* Preset Color Swatches */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {THEME_PRESETS.map((preset) => {
                  const isSelected = selectedTheme?.id === preset.id || selectedTheme?.color?.toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-3 relative group ${
                        isSelected 
                          ? 'border-slate-900 bg-slate-50 shadow-md ring-2 ring-slate-900/10' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div 
                          className="w-7 h-7 rounded-xl shadow-xs border border-white"
                          style={{ backgroundColor: preset.color }}
                        />
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-slate-900" />
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {isMr ? preset.nameMr : preset.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                          {preset.color}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Picker Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pipette className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-800">
                      {isMr ? 'स्वतःचा आवडता रंग टाका (Custom Hex / Picker)' : 'Custom Hex Color Picker'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    {customHex.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Color Picker input */}
                  <div className="relative shrink-0">
                    <input
                      type="color"
                      value={customHex}
                      onChange={(e) => handleCustomHexChange(e.target.value)}
                      className="w-12 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white shadow-xs"
                      title={isMr ? 'रंग निवडा' : 'Pick a color'}
                    />
                  </div>

                  {/* Hex Text Input */}
                  <input
                    type="text"
                    maxLength={7}
                    value={customHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    placeholder="#0d9488"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl font-mono uppercase font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />

                  {/* Preview Badge */}
                  <div 
                    className="px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-xs shrink-0"
                    style={{ backgroundColor: customHex }}
                  >
                    {isMr ? 'थेट प्रिव्ह्यू' : 'Preview'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-4 py-1">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isMr ? 'औषध कॅटेगरी व्यवस्थापन' : 'Category Management'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMr 
                    ? 'नवीन कॅटेगरी जोडा किंवा नको असलेली कॅटेगरी 🗑️ बटण दाबून हटवा (Delete करा).' 
                    : 'Create new custom categories or delete unwanted categories.'}
                </p>
              </div>

              {/* Add New Category Input */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2">
                <label className="block text-xs font-bold text-teal-900">
                  {isMr ? '+ नवीन कॅटेगरी जोडा:' : '+ Add New Category:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tabNewCategory}
                    onChange={(e) => setTabNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tabNewCategory.trim() && onAddCategory) {
                          onAddCategory(tabNewCategory.trim());
                          setTabNewCategory('');
                        }
                      }
                    }}
                    placeholder={isMr ? 'उदा. Protein & Nutrition, Dental Care...' : 'e.g. Protein & Nutrition, Dental Care...'}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-semibold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tabNewCategory.trim() && onAddCategory) {
                        onAddCategory(tabNewCategory.trim());
                        setTabNewCategory('');
                      }
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
                  >
                    {isMr ? 'जोडा' : 'Add'}
                  </button>
                </div>
              </div>

              {/* User Custom Categories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{isMr ? 'तुमच्या तयार केलेल्या कॅटेगरीज:' : 'Your Custom Categories:'}</span>
                  <span className="text-[11px] text-teal-700 font-mono font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {customCategories.length} {isMr ? 'कॅटेगरीज' : 'items'}
                  </span>
                </div>

                {customCategories.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                    {isMr 
                      ? 'तुम्ही अजून कोणतीही सानुकूल कॅटेगरी जोडलेली नाही. वरून नवीन कॅटेगरी जोडू शकता.' 
                      : 'No custom categories added yet. You can add one using the input above.'}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {customCategories.map((cName) => (
                      <div 
                        key={cName}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-teal-600 font-bold">✨</span>
                          <span className="text-xs font-bold text-slate-800">{cName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteCategory) {
                              onDeleteCategory(cName);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition"
                          title={isMr ? `"${cName}" हटवा` : `Delete "${cName}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isMr ? 'हटवा' : 'Delete'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            {isMr ? 'बदल तत्काळ सुरक्षित जतन होतील' : 'Changes save instantly to your account'}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
            >
              {isMr ? 'बंद करा' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/30 transition"
            >
              <Check className="w-4 h-4" />
              <span>{isMr ? 'माहिती सेव्ह करा' : 'Save Details'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
