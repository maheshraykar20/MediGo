import React from 'react';
import { 
  Pill, 
  Clock, 
  AlertOctagon, 
  Calendar, 
  IndianRupee, 
  TrendingDown, 
  ArrowUpRight
} from 'lucide-react';
import { formatINR } from '../utils/expiryUtils';

export default function StatsOverview({ 
  medicines, 
  tomorrowCount, 
  expiredCount, 
  critical7Count, 
  warning30Count, 
  onFilterClick,
  lang 
}) {
  const isMr = lang === 'mr';

  // Compute calculations
  const totalItems = medicines.length;
  const totalUnits = medicines.reduce((acc, m) => acc + (m.stock || 0), 0);
  
  // Total Inventory Value at MRP & Cost
  const totalMrpValue = medicines.reduce((acc, m) => acc + ((m.stock || 0) * (m.mrp || 0)), 0);
  const totalCostValue = medicines.reduce((acc, m) => acc + ((m.stock || 0) * (m.purchasePrice || 0)), 0);

  // Financial Loss Risk: Expired + Next 30 days
  const lossRiskValue = medicines.reduce((acc, m) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(m.expiryDate);
    exp.setHours(0,0,0,0);
    const diffDays = Math.round((exp - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) {
      return acc + ((m.stock || 0) * (m.purchasePrice || (m.mrp * 0.75) || 0));
    }
    return acc;
  }, 0);

  const cards = [
    {
      id: 'total',
      title: isMr ? 'एकूण औषधे व साठा' : 'Total Medicines Stock',
      value: totalItems,
      subValue: isMr ? `${totalUnits} युनिट्स / स्ट्रिप्स` : `${totalUnits} units in store`,
      icon: Pill,
      color: 'teal',
      bgGrad: 'from-teal-500/10 to-emerald-500/5',
      borderColor: 'border-teal-200',
      textColor: 'text-teal-700',
      iconBg: 'bg-teal-600 text-white',
      filterKey: 'all',
    },
    {
      id: 'tomorrow',
      title: isMr ? 'उद्या Expire होणार!' : 'Expiring Tomorrow',
      value: tomorrowCount,
      subValue: tomorrowCount > 0 
        ? (isMr ? '⚠️ तत्काळ सप्लायरला कळवा' : 'Action needed in 24 hrs') 
        : (isMr ? 'कोणतेही औषध नाही' : 'No items tomorrow'),
      icon: Clock,
      color: 'orange',
      bgGrad: 'from-orange-500/15 via-amber-500/10 to-transparent',
      borderColor: tomorrowCount > 0 ? 'border-orange-400 ring-2 ring-orange-400/20' : 'border-orange-200',
      textColor: 'text-orange-900',
      iconBg: 'bg-orange-500 text-white shadow-orange-500/40',
      filterKey: 'tomorrow',
      isPulse: tomorrowCount > 0,
    },
    {
      id: 'expired',
      title: isMr ? 'कालबाह्य औषधे' : 'Already Expired',
      value: expiredCount,
      subValue: expiredCount > 0 
        ? (isMr ? 'विक्री बंद करा / परत करा' : 'Halt sales & return') 
        : (isMr ? 'सर्व औषधे वैध आहेत' : 'All safe'),
      icon: AlertOctagon,
      color: 'rose',
      bgGrad: 'from-rose-500/15 via-red-500/10 to-transparent',
      borderColor: expiredCount > 0 ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-rose-200',
      textColor: 'text-rose-900',
      iconBg: 'bg-rose-600 text-white shadow-rose-600/40',
      filterKey: 'expired',
      isPulse: expiredCount > 0,
    },
    {
      id: 'critical7',
      title: isMr ? 'पुढील ७ दिवसात मुदत संपणार' : 'Expiring in 7 Days',
      value: critical7Count,
      subValue: isMr ? 'क्रेडिट नोट किंवा जलद विक्री' : 'Return chalan ready',
      icon: Calendar,
      color: 'amber',
      bgGrad: 'from-yellow-500/10 to-amber-500/5',
      borderColor: 'border-yellow-200',
      textColor: 'text-amber-800',
      iconBg: 'bg-amber-500 text-white',
      filterKey: 'critical_7',
    },
    {
      id: 'inventoryValue',
      title: isMr ? 'एकूण साठ्याचे मूल्य (MRP)' : 'Total Inventory Worth',
      value: formatINR(totalMrpValue),
      subValue: isMr ? `खरेदी खर्च: ${formatINR(totalCostValue)}` : `Cost Value: ${formatINR(totalCostValue)}`,
      icon: IndianRupee,
      color: 'slate',
      bgGrad: 'from-slate-500/10 to-slate-500/5',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-800',
      iconBg: 'bg-slate-800 text-white',
      filterKey: null,
    },
    {
      id: 'lossRisk',
      title: isMr ? 'नुकसान जोखीम (३० दिवस)' : 'Expiry Loss Risk (30D)',
      value: formatINR(lossRiskValue),
      subValue: isMr ? 'वेळेत परत केल्यास ₹० नुकसान' : 'Prevent by returning stock',
      icon: TrendingDown,
      color: 'rose',
      bgGrad: 'from-rose-500/10 to-orange-500/5',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
      iconBg: 'bg-rose-500 text-white',
      filterKey: 'near_expiry',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => card.filterKey && onFilterClick && onFilterClick(card.filterKey)}
            className={`relative p-3.5 sm:p-4 rounded-2xl bg-white border ${card.borderColor} bg-gradient-to-br ${card.bgGrad} shadow-sm hover:shadow-md transition cursor-pointer group overflow-hidden flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-600 line-clamp-1">
                  {card.title}
                </span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0 shadow-sm ${card.isPulse ? 'animate-bounce-subtle' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className={`text-lg sm:text-xl font-extrabold tracking-tight ${card.textColor}`}>
                {card.value}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
              <span className="truncate">{card.subValue}</span>
              {card.filterKey && (
                <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition shrink-0 ml-1" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
