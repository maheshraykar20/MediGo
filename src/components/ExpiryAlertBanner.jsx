import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Send, 
  ChevronRight, 
  ArrowRight,
  PackageX,
  BellRing
} from 'lucide-react';
import { formatINR, generateDistributorWhatsAppMessage } from '../utils/expiryUtils';
import { playUrgentAlertSound } from '../utils/notificationSound';
import { sendMedicineExpiryNotification } from '../utils/browserNotification';

export default function ExpiryAlertBanner({ 
  tomorrowMedicines, 
  expiredMedicines, 
  onViewExpiryRadar, 
  onSelectMedicine,
  storeProfile,
  audioEnabled,
  lang 
}) {
  const isMr = lang === 'mr';

  if (tomorrowMedicines.length === 0 && expiredMedicines.length === 0) {
    return null;
  }

  const handleTestAlert = (med, type) => {
    if (audioEnabled) {
      playUrgentAlertSound();
    }
    sendMedicineExpiryNotification(med, type, lang);
  };

  const handleSendWhatsApp = (medicines) => {
    const storeName = storeProfile?.storeName || (isMr ? 'संजीवनी मेडिकल' : 'Sanjivani Medical');
    const encoded = generateDistributorWhatsAppMessage(medicines, 'Distributor', lang, storeName);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-3 mb-6">
      {/* 🚨 TOMORROW EXPIRY ALERT - Top Priority Highlight */}
      {tomorrowMedicines.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/70 border-2 border-orange-300 shadow-md p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/30 pulse-ring-amber">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-600 text-white shadow-sm">
                    {isMr ? '🚨 उद्या Expire होणार!' : '🚨 Expiring Tomorrow!'}
                  </span>
                  <span className="text-xs font-semibold text-orange-950">
                    {tomorrowMedicines.length} {isMr ? 'औषधे धोक्यात' : 'Medicines at Risk'}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {isMr 
                    ? 'खालील औषधांची मुदत उद्या संपत आहे! त्वरित सप्लायरला परत पाठवा किंवा डिस्काउंटवर विका.' 
                    : 'The following medicines expire tomorrow! Take immediate action to prevent financial loss.'}
                </h3>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={() => handleSendWhatsApp(tomorrowMedicines)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                title={isMr ? 'WhatsApp वर सप्लायरला यादी पाठवा' : 'Send list to supplier on WhatsApp'}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isMr ? 'सप्लायरला WhatsApp करा' : 'WhatsApp Supplier'}</span>
              </button>
              <button
                onClick={onViewExpiryRadar}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-800 border border-orange-200 rounded-xl text-xs font-semibold transition"
              >
                <span>{isMr ? 'सर्व पहा' : 'View All'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of Medicines Expiring Tomorrow */}
          <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {tomorrowMedicines.slice(0, 3).map((med) => {
              const lossAtCost = (med.stock * (med.purchasePrice || 0));
              return (
                <div 
                  key={med.id}
                  className="bg-white/95 rounded-xl p-3 border border-orange-200/90 shadow-sm flex flex-col justify-between hover:border-orange-400 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{med.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{med.composition || med.category}</div>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold border border-orange-200">
                      {med.batchNo}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">{isMr ? 'शिल्लक साठा:' : 'Stock:'} </span>
                      <span className="font-bold text-slate-900">{med.stock} {med.unit || 'units'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">{isMr ? 'नुकसान:' : 'Loss:'} </span>
                      <span className="font-bold text-rose-600">{formatINR(lossAtCost)}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleTestAlert(med, 'tomorrow')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700 hover:text-orange-900 hover:underline"
                    >
                      <BellRing className="w-3 h-3 text-orange-600" />
                      <span>{isMr ? 'मोबाईल अलर्ट टेस्ट' : 'Test Alert'}</span>
                    </button>
                    <button
                      onClick={() => onSelectMedicine(med)}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-0.5"
                    >
                      <span>{isMr ? 'माहिती पहा' : 'Details'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔴 ALREADY EXPIRED ALERT */}
      {expiredMedicines.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-rose-100/60 border border-rose-300 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30 pulse-ring-red">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                  {isMr ? 'कालबाह्य औषधे' : 'Expired Medicines'}
                </span>
                <span className="text-xs font-semibold text-rose-900">
                  {expiredMedicines.length} {isMr ? 'औषधांची मुदत संपली आहे' : 'items already expired'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isMr 
                  ? 'ही औषधे तत्काळ रॅकमधून काढून क्वारंटाईन बॉक्समध्ये ठेवा, जेणेकरून ग्राहकांना चुकून दिली जाणार नाहीत.' 
                  : 'Remove these from sales counter immediately to avoid regulatory non-compliance.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => handleSendWhatsApp(expiredMedicines)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isMr ? 'रिटर्न लिस्ट पाठवा' : 'Send Return List'}</span>
            </button>
            <button
              onClick={onViewExpiryRadar}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold transition"
            >
              {isMr ? 'तपासा' : 'Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
