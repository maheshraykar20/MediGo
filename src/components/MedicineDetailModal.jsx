import React from 'react';
import { 
  X, 
  Pill, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Building2, 
  Truck, 
  Phone, 
  Send, 
  Clock, 
  AlertTriangle, 
  Edit3, 
  Trash2,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { 
  getExpiryClassification, 
  formatINR, 
  formatDisplayDate, 
  generateDistributorWhatsAppMessage 
} from '../utils/expiryUtils';

export default function MedicineDetailModal({ 
  medicine, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  storeProfile,
  lang 
}) {
  const isMr = lang === 'mr';
  if (!isOpen || !medicine) return null;

  const classification = getExpiryClassification(medicine.expiryDate);
  const isTomorrow = classification.days === 0 || classification.days === 1;
  const isExpired = classification.days < 0;

  const totalCost = (medicine.stock || 0) * (medicine.purchasePrice || 0);
  const totalMrp = (medicine.stock || 0) * (medicine.mrp || 0);
  const marginAmt = (medicine.mrp || 0) - (medicine.purchasePrice || 0);
  const marginPct = (medicine.purchasePrice && marginAmt > 0)
    ? ((marginAmt / medicine.purchasePrice) * 100).toFixed(1)
    : null;

  const handleSendWhatsApp = () => {
    const storeName = storeProfile?.storeName || (isMr ? 'संजीवनी मेडिकल' : 'Sanjivani Medical');
    const encoded = generateDistributorWhatsAppMessage([medicine], medicine.distributor || 'Distributor', lang, storeName);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
      />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden my-auto">
        {/* Header with Expiry Status Color */}
        <div className={`p-5 text-white ${
          isTomorrow 
            ? 'bg-gradient-to-r from-orange-600 to-amber-600' 
            : isExpired 
            ? 'bg-gradient-to-r from-rose-700 to-red-600' 
            : 'bg-gradient-to-r from-teal-800 to-slate-900'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  {medicine.category}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
                  {medicine.name}
                </h3>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Expiry Pill */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-900 shadow-sm flex items-center gap-1.5">
              {isTomorrow && <Clock className="w-3.5 h-3.5 text-orange-600 animate-pulse" />}
              {isExpired && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
              <span>{isMr ? classification.labelMr : classification.labelEn}</span>
            </span>
            <span className="text-xs text-white/90 font-mono">
              Expiry: {formatDisplayDate(medicine.expiryDate)} ({isMr ? classification.sublabelMr : classification.sublabelEn})
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
          {/* Salt / Composition */}
          {medicine.composition && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                {isMr ? 'रासायनिक घटक (Salt Composition)' : 'Salt / Active Ingredients'}
              </div>
              <div className="font-semibold text-slate-800">{medicine.composition}</div>
            </div>
          )}

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">{isMr ? 'बॅच नंबर' : 'Batch No.'}</div>
              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{medicine.batchNo}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">{isMr ? 'उपलब्ध साठा' : 'Stock Quantity'}</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {medicine.stock} <span className="text-xs font-normal text-slate-500">{medicine.unit || 'units'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">{isMr ? 'रॅक / जागा' : 'Rack Location'}</div>
              <div className="font-mono font-bold text-teal-700 text-sm mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{medicine.rack || 'Shelf A-1'}</span>
              </div>
            </div>
          </div>

          {/* Pricing & Financial Metrics */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-2">
            <div className="font-bold text-teal-950 text-xs">
              {isMr ? 'किंमत व नफा विवरण' : 'Financial & Margin Details'}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">{isMr ? 'खरेदी किंमत' : 'Purchase Cost'}</span>
                <span className="font-bold text-slate-800">₹{medicine.purchasePrice || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isMr ? 'विक्री किंमत (MRP)' : 'Retail MRP'}</span>
                <span className="font-bold text-slate-800">₹{medicine.mrp || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isMr ? 'नफा प्रमाण' : 'Margin %'}</span>
                <span className="font-bold text-emerald-700">{marginPct ? `${marginPct}%` : '-'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">{isMr ? 'एकूण साठ्याचे MRP मूल्य:' : 'Total Stock MRP Worth:'}</span>
              <span className="font-extrabold text-teal-900">{formatINR(totalMrp)}</span>
            </div>
          </div>

          {/* Manufacturer & Distributor Contacts */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 text-xs">
              {isMr ? 'कंपनी व सप्लायर संपर्क' : 'Manufacturer & Supplier'}
            </div>
            <div className="space-y-1 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{medicine.manufacturer || 'General Pharmaceuticals'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>{medicine.distributor || 'General Wholesale Stockist'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isMr ? 'सप्लायरला WhatsApp' : 'WhatsApp'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(medicine);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isMr ? 'माहिती बदला' : 'Edit'}</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(isMr ? `औषध "${medicine.name}" हटवायचे आहे का?` : `Delete "${medicine.name}"?`)) {
                  onDelete(medicine.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isMr ? 'हटवा' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
