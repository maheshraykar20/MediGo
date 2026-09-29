import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Send, 
  FileSpreadsheet, 
  CheckCircle2, 
  PackageX, 
  ArrowRight, 
  MapPin, 
  Phone, 
  TrendingDown,
  ShieldAlert,
  BellRing,
  Download
} from 'lucide-react';
import { 
  getDaysUntilExpiry, 
  getExpiryClassification, 
  formatINR, 
  formatDisplayDate, 
  generateDistributorWhatsAppMessage 
} from '../utils/expiryUtils';
import { exportMedicinesToExcel } from '../utils/excelUtils';
import { sendMedicineExpiryNotification } from '../utils/browserNotification';
import { playUrgentAlertSound } from '../utils/notificationSound';

export default function ExpiryRadarView({ 
  medicines, 
  onSelectMedicine,
  onEditMedicine,
  storeProfile,
  audioEnabled,
  lang 
}) {
  const isMr = lang === 'mr';
  const [radarTab, setRadarTab] = useState('tomorrow');

  // Partition medicines into urgency buckets
  const buckets = useMemo(() => {
    const expired = [];
    const tomorrow = [];
    const critical7 = [];
    const warning30 = [];

    medicines.forEach((m) => {
      const days = getDaysUntilExpiry(m.expiryDate);
      if (days < 0) {
        expired.push(m);
      } else if (days === 0 || days === 1) {
        tomorrow.push(m);
      } else if (days <= 7) {
        critical7.push(m);
      } else if (days <= 30) {
        warning30.push(m);
      }
    });

    const allRisk = [...expired, ...tomorrow, ...critical7, ...warning30].sort(
      (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
    );

    return {
      expired,
      tomorrow,
      critical7,
      warning30,
      allRisk,
    };
  }, [medicines]);

  // Current display list based on active tab
  const activeList = useMemo(() => {
    if (radarTab === 'tomorrow') return buckets.tomorrow;
    if (radarTab === 'expired') return buckets.expired;
    if (radarTab === 'critical_7') return buckets.critical7;
    if (radarTab === 'warning_30') return buckets.warning30;
    return buckets.allRisk;
  }, [radarTab, buckets]);

  // Financial Loss in this tab
  const tabLossValue = activeList.reduce(
    (acc, m) => acc + ((m.stock || 0) * (m.purchasePrice || (m.mrp * 0.75) || 0)), 
    0
  );

  const handleSendWhatsApp = () => {
    if (activeList.length === 0) return;
    const storeName = storeProfile?.storeName || (isMr ? 'संजीवनी मेडिकल' : 'Sanjivani Medical');
    const encoded = generateDistributorWhatsAppMessage(activeList, 'Distributor', lang, storeName);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleExportReturnList = () => {
    if (activeList.length === 0) return;
    const filename = isMr 
      ? `सप्लायर_रिटर्न_चॅलन_${radarTab}.xlsx` 
      : `Distributor_Return_Chalan_${radarTab}.xlsx`;
    exportMedicinesToExcel(activeList, filename, lang, storeProfile);
  };

  const handleTestMobilePush = (medicine) => {
    if (audioEnabled) playUrgentAlertSound();
    sendMedicineExpiryNotification(medicine, radarTab === 'expired' ? 'expired' : 'tomorrow', lang);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: Expiry Loss Prevention Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                {isMr ? 'मुदत संपण्याची पूर्वसूचना रडार' : 'Expiry Intelligence Radar'}
              </span>
              <span className="text-xs text-teal-300 font-mono">100% Zero-Loss Strategy</span>
            </div>

            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight">
              {isMr 
                ? 'औषध मुदत संपण्यापूर्वीच नियंत्रण व सप्लायर रिटर्न' 
                : 'Proactive Expiry Prevention & Stockist Returns'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {isMr 
                ? 'मुदत संपण्याआधी औषधे शोधून सप्लायरला वेळेत परत करा, जेणेकरून तुमचे पैसे बुडणार नाहीत आणि मेडिकल स्टोअर सुरक्षित राहील.' 
                : 'Track medicines before they expire, claim full credit notes from distributors, and safeguard pharmacy compliance.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition"
            >
              <Send className="w-4 h-4" />
              <span>{isMr ? 'WhatsApp वर रिटर्न यादी पाठवा' : 'WhatsApp Distributor'}</span>
            </button>
            <button
              onClick={handleExportReturnList}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl transition"
            >
              <Download className="w-4 h-4" />
              <span>{isMr ? 'रिटर्न चॅलन (Excel)' : 'Export Chalan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expiry Category Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Tab 1: Tomorrow */}
        <button
          onClick={() => setRadarTab('tomorrow')}
          className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
            radarTab === 'tomorrow'
              ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/30'
              : 'bg-white border-slate-200 hover:border-orange-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isMr ? '🚨 उद्या संपणारे' : '🚨 Tomorrow'}
            </span>
            <Clock className={`w-4 h-4 ${radarTab === 'tomorrow' ? 'text-white' : 'text-orange-500'}`} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black">{buckets.tomorrow.length}</div>
            <div className={`text-[11px] ${radarTab === 'tomorrow' ? 'text-orange-100' : 'text-slate-500'}`}>
              {isMr ? '२४ तासांत कारवाई हवी' : 'Within 24 Hours'}
            </div>
          </div>
        </button>

        {/* Tab 2: Expired */}
        <button
          onClick={() => setRadarTab('expired')}
          className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
            radarTab === 'expired'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/30'
              : 'bg-white border-slate-200 hover:border-rose-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isMr ? '🔴 कालबाह्य औषध' : '🔴 Expired'}
            </span>
            <PackageX className={`w-4 h-4 ${radarTab === 'expired' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black">{buckets.expired.length}</div>
            <div className={`text-[11px] ${radarTab === 'expired' ? 'text-rose-100' : 'text-slate-500'}`}>
              {isMr ? 'क्वारंटाईन करा' : 'Quarantine items'}
            </div>
          </div>
        </button>

        {/* Tab 3: Critical 7 Days */}
        <button
          onClick={() => setRadarTab('critical_7')}
          className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
            radarTab === 'critical_7'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/30'
              : 'bg-white border-slate-200 hover:border-amber-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isMr ? '🟠 पुढील ७ दिवस' : '🟠 Next 7 Days'}
            </span>
            <Calendar className={`w-4 h-4 ${radarTab === 'critical_7' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black">{buckets.critical7.length}</div>
            <div className={`text-[11px] ${radarTab === 'critical_7' ? 'text-amber-100' : 'text-slate-500'}`}>
              {isMr ? 'सप्लायर रिटर्न तयार करा' : 'Pack for return'}
            </div>
          </div>
        </button>

        {/* Tab 4: Warning 30 Days */}
        <button
          onClick={() => setRadarTab('warning_30')}
          className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
            radarTab === 'warning_30'
              ? 'bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-600/30'
              : 'bg-white border-slate-200 hover:border-sky-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isMr ? '🟡 पुढील ३० दिवस' : '🟡 Next 30 Days'}
            </span>
            <Calendar className={`w-4 h-4 ${radarTab === 'warning_30' ? 'text-white' : 'text-sky-500'}`} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black">{buckets.warning30.length}</div>
            <div className={`text-[11px] ${radarTab === 'warning_30' ? 'text-sky-100' : 'text-slate-500'}`}>
              {isMr ? 'FIFO नुसार आधी विका' : 'First In First Out'}
            </div>
          </div>
        </button>

        {/* Tab 5: All At Risk */}
        <button
          onClick={() => setRadarTab('all_risk')}
          className={`col-span-2 sm:col-span-4 lg:col-span-1 p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
            radarTab === 'all_risk'
              ? 'bg-slate-900 text-white border-slate-950 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-400 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isMr ? 'सर्व जोखीम साठा' : 'All at Risk'}
            </span>
            <TrendingDown className={`w-4 h-4 ${radarTab === 'all_risk' ? 'text-white' : 'text-slate-600'}`} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black">{buckets.allRisk.length}</div>
            <div className={`text-[11px] ${radarTab === 'all_risk' ? 'text-slate-300' : 'text-slate-500'}`}>
              {isMr ? 'एकूण जोखीम यादी' : 'Combined watchlist'}
            </div>
          </div>
        </button>
      </div>

      {/* Tab Financial Loss Alert Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">
              {isMr ? 'या यादीतील औषधांचे खरेदी मूल्य (Loss Risk):' : 'At-Risk Inventory Cost in this group:'}{' '}
              <span className="text-rose-600 font-extrabold text-base">{formatINR(tabLossValue)}</span>
            </div>
            <div className="text-slate-500 text-[11px]">
              {isMr 
                ? 'वेळेत सप्लायरला परत पाठवून १००% क्रेडिट नोट किंवा नवीन बॅच मिळवून नुकसान टाळा.' 
                : 'Generate distributor chalan and replace with fresh stock to protect margins.'}
            </div>
          </div>
        </div>

        <button
          onClick={handleSendWhatsApp}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition self-end sm:self-auto shrink-0 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isMr ? 'WhatsApp सप्लायर' : 'Send WhatsApp'}</span>
        </button>
      </div>

      {/* Active Medicines Cards */}
      {activeList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">
            {isMr ? 'या गटात कोणतेही औषध नाही' : 'No medicines in this category'}
          </h4>
          <p className="text-xs text-slate-500">
            {isMr ? 'तुमचा औषध साठा सध्या सुरक्षित आहे.' : 'Great job! Stock is well managed.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {activeList.map((med) => {
            const classification = getExpiryClassification(med.expiryDate);
            const isTomorrow = classification.days === 0 || classification.days === 1;
            const isExpired = classification.days < 0;
            const lossVal = (med.stock * (med.purchasePrice || 0));

            return (
              <div
                key={med.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 ${
                  isTomorrow 
                    ? 'border-orange-300 ring-2 ring-orange-200/80 bg-gradient-to-br from-white to-orange-50/40' 
                    : isExpired 
                    ? 'border-rose-300 bg-gradient-to-br from-white to-rose-50/40' 
                    : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 text-sm hover:text-teal-700 cursor-pointer" onClick={() => onSelectMedicine(med)}>
                      {med.name}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {med.composition || med.category}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${classification.badgeColor}`}>
                    {isMr ? classification.labelMr : classification.labelEn}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'बॅच नंबर:' : 'Batch No:'}</span>
                    <span className="font-mono font-bold text-slate-800">{med.batchNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'Expiry मुदत:' : 'Expiry Date:'}</span>
                    <span className="font-mono font-bold text-slate-800">{formatDisplayDate(med.expiryDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'शिल्लक साठा:' : 'Stock in Store:'}</span>
                    <span className="font-bold text-slate-900">{med.stock} {med.unit || 'units'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'नुकसान जोखीम:' : 'Cost at Risk:'}</span>
                    <span className="font-bold text-rose-600">{formatINR(lossVal)}</span>
                  </div>
                </div>

                {/* Shelf & Distributor */}
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3 text-teal-600" />
                    {med.rack || 'Shelf 1'}
                  </span>
                  <span className="truncate max-w-[150px] text-slate-500">
                    {med.distributor || med.manufacturer}
                  </span>
                </div>

                {/* Action Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTestMobilePush(med)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 hover:text-orange-900"
                    title={isMr ? 'या औषधासाठी मोबाईलवर अलर्ट पाठवा' : 'Send mobile push notification for this item'}
                  >
                    <BellRing className="w-3 h-3 text-orange-600" />
                    <span>{isMr ? 'अलर्ट पाठवा' : 'Trigger Alert'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectMedicine(med)}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                    >
                      {isMr ? 'तपशील' : 'Details'}
                    </button>
                    <button
                      onClick={() => onEditMedicine(med)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      {isMr ? 'एडिट' : 'Edit'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
