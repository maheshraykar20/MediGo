import React from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  PieChart, 
  ShieldAlert, 
  CheckCircle2, 
  FileSpreadsheet, 
  Calendar, 
  Boxes,
  HelpCircle
} from 'lucide-react';
import { formatINR, getExpiryClassification, getDaysUntilExpiry } from '../utils/expiryUtils';
import { exportMedicinesToExcel } from '../utils/excelUtils';

export default function AnalyticsView({ medicines, storeProfile, lang }) {
  const isMr = lang === 'mr';

  // Financial metrics
  const totalCost = medicines.reduce((sum, m) => sum + ((m.stock || 0) * (m.purchasePrice || 0)), 0);
  const totalMrp = medicines.reduce((sum, m) => sum + ((m.stock || 0) * (m.mrp || 0)), 0);
  const potentialGrossProfit = totalMrp - totalCost;

  // Expiry risk loss breakdown
  let expiredLoss = 0;
  let tomorrowLoss = 0;
  let critical7Loss = 0;
  let warning30Loss = 0;

  // Category breakdown
  const categoryMap = {};

  medicines.forEach((m) => {
    const cost = (m.stock || 0) * (m.purchasePrice || (m.mrp * 0.75) || 0);
    const days = getDaysUntilExpiry(m.expiryDate);

    if (days < 0) {
      expiredLoss += cost;
    } else if (days === 0 || days === 1) {
      tomorrowLoss += cost;
    } else if (days <= 7) {
      critical7Loss += cost;
    } else if (days <= 30) {
      warning30Loss += cost;
    }

    const cat = m.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, units: 0, cost: 0, mrp: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].units += (m.stock || 0);
    categoryMap[cat].cost += ((m.stock || 0) * (m.purchasePrice || 0));
    categoryMap[cat].mrp += ((m.stock || 0) * (m.mrp || 0));
  });

  const totalRisk30Days = expiredLoss + tomorrowLoss + critical7Loss + warning30Loss;

  const categoriesList = Object.entries(categoryMap).map(([name, data]) => ({
    name,
    ...data,
  })).sort((a, b) => b.cost - a.cost);

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {isMr ? 'इन्व्हेंटरी विश्लेषण व नफा-तोटा अहवाल' : 'Financial & Expiry Risk Analytics'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMr 
                ? 'स्टॉकमधील पैशांचे वाटप, संभाव्य नुकसान आणि कॅटेगरीनिहाय साठा अहवाल' 
                : 'Capital allocation, expiry loss risk and category wise inventory insights'}
            </p>
          </div>

          <button
            onClick={() => {
              const filename = isMr ? 'संपूर्ण_औषध_अहवाल.xlsx' : 'Comprehensive_Pharmacy_Report.xlsx';
              exportMedicinesToExcel(medicines, filename, lang, storeProfile);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start md:self-auto"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isMr ? 'संपूर्ण अहवाल Excel डाऊनलोड' : 'Download Full Excel Report'}</span>
          </button>
        </div>

        {/* 3 Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isMr ? 'एकूण इन्व्हेस्ट केलेला खर्च' : 'Total Capital Invested (Cost)'}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {formatINR(totalCost)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {medicines.length} {isMr ? 'वेगवेगळी औषधे' : 'distinct medicines'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">
              {isMr ? 'अपेक्षित विक्री मूल्य (MRP)' : 'Expected Sales Value (MRP)'}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-teal-900 mt-1">
              {formatINR(totalMrp)}
            </div>
            <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
              {isMr ? 'संभाव्य एकूण नफा:' : 'Gross Profit:'} {formatINR(potentialGrossProfit)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
              {isMr ? '३० दिवसांत संभाव्य नुकसान (Expiry Loss)' : '30-Day Expiry Loss Risk'}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1">
              {formatINR(totalRisk30Days)}
            </div>
            <span className="text-[11px] text-rose-600 mt-1 block font-medium">
              {isMr ? 'सप्लायरला परत करून १००% वाचवा' : 'Preventable via credit notes'}
            </span>
          </div>
        </div>
      </div>

      {/* Expiry Loss Distribution Bars */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-600" />
          <span>{isMr ? 'Expiry मुदतीनुसार नुकसान जोखीम विभाजन (₹)' : 'Expiry Risk Distribution Breakdown (₹ Cost)'}</span>
        </h3>

        <div className="space-y-3 text-xs">
          {/* Tomorrow */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-orange-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                {isMr ? 'उद्या Expire होणाऱ्या औषधांचे मूल्य (24 Hours):' : 'Tomorrow (24 Hours):'}
              </span>
              <span className="font-extrabold text-orange-700">{formatINR(tomorrowLoss)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-500" 
                style={{ width: `${totalCost > 0 ? (tomorrowLoss / totalCost) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Expired */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                {isMr ? 'कालबाह्य औषधांचे मूल्य (Already Expired):' : 'Already Expired:'}
              </span>
              <span className="font-extrabold text-rose-700">{formatINR(expiredLoss)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-600 transition-all duration-500" 
                style={{ width: `${totalCost > 0 ? (expiredLoss / totalCost) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 7 Days */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                {isMr ? 'पुढील ७ दिवसांत (Critical 7 Days):' : 'Next 7 Days:'}
              </span>
              <span className="font-extrabold text-amber-700">{formatINR(critical7Loss)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-500" 
                style={{ width: `${totalCost > 0 ? (critical7Loss / totalCost) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 30 Days */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sky-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                {isMr ? 'पुढील ३० दिवसांत (1 Month):' : 'Next 30 Days:'}
              </span>
              <span className="font-extrabold text-sky-700">{formatINR(warning30Loss)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-600 transition-all duration-500" 
                style={{ width: `${totalCost > 0 ? (warning30Loss / totalCost) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Wise Stock Health Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Boxes className="w-4 h-4 text-teal-600" />
          <span>{isMr ? 'कॅटेगरीनुसार औषध साठा व मूल्य (Category Breakdown)' : 'Category-wise Inventory & Value'}</span>
        </h3>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">{isMr ? 'प्रकार (Category)' : 'Category'}</th>
                <th className="py-2.5 px-3">{isMr ? 'औषध संख्या' : 'Items'}</th>
                <th className="py-2.5 px-3">{isMr ? 'एकूण युनिट्स' : 'Total Units'}</th>
                <th className="py-2.5 px-3">{isMr ? 'खर्च मूल्य (Cost ₹)' : 'Cost (₹)'}</th>
                <th className="py-2.5 px-3">{isMr ? 'विक्री मूल्य (MRP ₹)' : 'MRP (₹)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoriesList.map((cat, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{cat.name}</td>
                  <td className="py-2.5 px-3">{cat.count}</td>
                  <td className="py-2.5 px-3">{cat.units}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{formatINR(cat.cost)}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-teal-800">{formatINR(cat.mrp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
