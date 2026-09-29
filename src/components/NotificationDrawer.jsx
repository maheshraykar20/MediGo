import React from 'react';
import { 
  X, 
  Bell, 
  Smartphone, 
  Check, 
  AlertTriangle, 
  Clock, 
  Volume2, 
  PackageX, 
  CheckCircle2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { getExpiryClassification, formatDisplayDate } from '../utils/expiryUtils';
import { playUrgentAlertSound } from '../utils/notificationSound';
import { sendMedicineExpiryNotification } from '../utils/browserNotification';

export default function NotificationDrawer({ 
  isOpen, 
  onClose, 
  tomorrowMedicines, 
  expiredMedicines, 
  critical7Medicines,
  onSelectMedicine,
  audioEnabled,
  lang 
}) {
  const isMr = lang === 'mr';
  if (!isOpen) return null;

  const handleTestChime = (med, type) => {
    if (audioEnabled) playUrgentAlertSound();
    sendMedicineExpiryNotification(med, type, lang);
  };

  const allAlerts = [
    ...tomorrowMedicines.map(m => ({ ...m, alertType: 'tomorrow' })),
    ...expiredMedicines.map(m => ({ ...m, alertType: 'expired' })),
    ...critical7Medicines.map(m => ({ ...m, alertType: 'critical_7' })),
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-sm shadow-orange-500/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {isMr ? 'लाईव्ह सूचना केंद्र' : 'Live Notification Center'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isMr ? 'उद्या व कालबाह्य होणाऱ्या औषधांचे अलर्ट्स' : 'Immediate expiry alerts & mobile notifications'}
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

          {/* Smartphone Lockscreen Preview Mockup */}
          <div className="p-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white border-b border-slate-700">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                {isMr ? 'मोबाईल लॉकस्क्रीन अलर्ट असा दिसेल:' : 'Mobile Lockscreen Preview:'}
              </span>
              <span className="font-mono text-teal-400">9:41 AM</span>
            </div>

            {tomorrowMedicines.length > 0 ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-[10px] font-bold">Rx</div>
                    <span className="text-[11px] font-bold text-orange-300">MedVault Alert • {isMr ? 'आत्ताच' : 'Just now'}</span>
                  </div>
                  <span className="text-[10px] text-slate-300">🚨 URGENT</span>
                </div>
                <div className="text-xs font-bold text-white">
                  {tomorrowMedicines[0].name} ({isMr ? 'बॅच:' : 'Batch:'} {tomorrowMedicines[0].batchNo})
                </div>
                <div className="text-[11px] text-slate-200 leading-relaxed">
                  {isMr 
                    ? `उद्या expire होत आहे! स्टॉकमध्ये ${tomorrowMedicines[0].stock} स्ट्रिप्स शिल्लक आहेत. सप्लायरला लगेच कळवा.` 
                    : `Expiring tomorrow! ${tomorrowMedicines[0].stock} units in stock. Return to supplier immediately.`}
                </div>
              </div>
            ) : (
              <div className="bg-white/10 rounded-xl p-3 text-xs text-slate-300 text-center">
                {isMr ? 'सध्या उद्या संपणारे कोणतेही औषध नाही.' : 'No items expiring tomorrow.'}
              </div>
            )}
          </div>

          {/* Alerts Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{isMr ? 'सक्रिय नोटिफिकेशन्स' : 'Active Alerts'} ({allAlerts.length})</span>
            </div>

            {allAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <div>{isMr ? 'कोणत्याही नवीन सूचना नाहीत!' : 'No new notifications!'}</div>
              </div>
            ) : (
              allAlerts.map((item) => {
                const isTomorrow = item.alertType === 'tomorrow';
                const isExpired = item.alertType === 'expired';

                return (
                  <div
                    key={`${item.id}-${item.alertType}`}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                      isTomorrow
                        ? 'bg-orange-50/70 border-orange-200'
                        : isExpired
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isTomorrow ? (
                          <Clock className="w-4 h-4 text-orange-600 animate-pulse shrink-0" />
                        ) : isExpired ? (
                          <PackageX className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <span className="font-bold text-xs text-slate-900">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.batchNo}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug">
                      {isTomorrow && (isMr 
                        ? `🚨 हे औषध उद्या expire होणार आहे. स्टॉकमध्ये ${item.stock} युनिट्स शिल्लक आहेत.`
                        : `🚨 Expires tomorrow! ${item.stock} units remaining.`)}
                      {isExpired && (isMr
                        ? `🔴 हे औषध कालबाह्य झाले आहे. विक्री थांबवून सप्लायरला परत करा.`
                        : `🔴 Already expired. Stop sales & return to supplier.`)}
                      {!isTomorrow && !isExpired && (isMr
                        ? `⏰ पुढील ७ दिवसात expire होईल (साठा: ${item.stock}).`
                        : `⏰ Expiring in 7 days (stock: ${item.stock}).`)}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                      <button
                        onClick={() => handleTestChime(item, item.alertType)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                      >
                        <Volume2 className="w-3 h-3 text-teal-600" />
                        <span>{isMr ? 'मोबाईलवर अलर्ट द्या' : 'Push Notification'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectMedicine(item);
                          onClose();
                        }}
                        className="text-[11px] font-bold text-slate-700 hover:underline"
                      >
                        {isMr ? 'औषध पहा' : 'View Item'} →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {isMr ? 'स्वयंचलित २४/७ मॉनिटरिंग' : 'Auto 24/7 Expiry Engine'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition"
            >
              {isMr ? 'बंद करा' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
