// Expiry calculation and classification utilities

export const EXPIRY_STATUS = {
  EXPIRED: 'expired',
  TOMORROW: 'tomorrow',
  CRITICAL_7: 'critical_7',
  WARNING_30: 'warning_30',
  SAFE: 'safe',
};

/**
 * Normalizes a date string or object to start of day for accurate day diffs
 */
export function getStartOfDay(dateInput) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculates remaining days until expiry
 * @param {string|Date} expiryDate - Expiry date string (YYYY-MM-DD)
 * @returns {number} days remaining (negative if expired, 0 if today, 1 if tomorrow)
 */
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return 999;
  const today = getStartOfDay(new Date());
  const exp = getStartOfDay(expiryDate);
  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Classifies medicine by expiry urgency
 */
export function getExpiryClassification(expiryDate) {
  const days = getDaysUntilExpiry(expiryDate);

  if (days < 0) {
    return {
      status: EXPIRY_STATUS.EXPIRED,
      days,
      labelEn: 'Expired',
      labelMr: 'कालबाह्य झालेली औषध',
      sublabelEn: `${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} ago`,
      sublabelMr: `${Math.abs(days)} दिवसांपूर्वी संपले`,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      tagColor: 'rose',
      urgencyScore: 1, // Highest urgency
    };
  }

  if (days === 0) {
    return {
      status: EXPIRY_STATUS.TOMORROW,
      days,
      labelEn: 'Expires Today!',
      labelMr: 'आज Expire होत आहे!',
      sublabelEn: 'Ends today',
      sublabelMr: 'आज शेवटचा दिवस',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse',
      tagColor: 'amber',
      urgencyScore: 2,
    };
  }

  if (days === 1) {
    return {
      status: EXPIRY_STATUS.TOMORROW,
      days,
      labelEn: 'Expiring Tomorrow!',
      labelMr: 'उद्या Expire होणार आहे!',
      sublabelEn: 'In 24 hours',
      sublabelMr: '२४ तासांत संपेल',
      badgeColor: 'bg-orange-100 text-orange-900 border-orange-400 font-bold animate-pulse',
      tagColor: 'orange',
      urgencyScore: 2,
    };
  }

  if (days <= 7) {
    return {
      status: EXPIRY_STATUS.CRITICAL_7,
      days,
      labelEn: 'Expiring in 7 Days',
      labelMr: '७ दिवसांत Expire होणार',
      sublabelEn: `${days} days left`,
      sublabelMr: `${days} दिवस शिल्लक`,
      badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      tagColor: 'yellow',
      urgencyScore: 3,
    };
  }

  if (days <= 30) {
    return {
      status: EXPIRY_STATUS.WARNING_30,
      days,
      labelEn: 'Expiring in 30 Days',
      labelMr: '३० दिवसांत Expire होणार',
      sublabelEn: `${days} days left`,
      sublabelMr: `${days} दिवस शिल्लक`,
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      tagColor: 'sky',
      urgencyScore: 4,
    };
  }

  return {
    status: EXPIRY_STATUS.SAFE,
    days,
    labelEn: 'Safe (Long Shelf Life)',
    labelMr: 'सुरक्षित (Valid)',
    sublabelEn: `${days} days left`,
    sublabelMr: `${days} दिवस शिल्लक`,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tagColor: 'emerald',
    urgencyScore: 5,
  };
}

/**
 * Format Indian Rupee currency (e.g. ₹ 1,45,200)
 */
export function formatINR(amount) {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format Date to readable string (e.g. 29 Sep 2026)
 */
export function formatDisplayDate(dateInput) {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateInput;
  }
}

/**
 * Prepares WhatsApp text payload for sending expiring stock list to distributor/supplier
 */
export function generateDistributorWhatsAppMessage(medicines, distributorName = 'Distributor', lang = 'en', storeName = 'Sanjivani Medical Store') {
  const expiringOrExpired = medicines.filter(m => {
    const days = getDaysUntilExpiry(m.expiryDate);
    return days <= 30;
  });

  if (expiringOrExpired.length === 0) {
    return '';
  }

  const isMr = lang === 'mr';

  let text = '';
  if (isMr) {
    text += `*🚨 अतिमहत्त्वाचा: औषध मुदत समाप्ती व रिटर्न यादी*\n`;
    text += `*स्टोअर:* ${storeName}\n`;
    text += `*तारीख:* ${new Date().toLocaleDateString('en-IN')}\n\n`;
    text += `नमस्कार ${distributorName}, खालील मुदत संपत आलेल्या व कालबाह्य औषधांची यादी क्रेडिट नोट व बदलून देण्यासाठी पाठवत आहोत:\n\n`;
  } else {
    text += `*🚨 URGENT: Medicine Expiry & Return Chalan*\n`;
    text += `*Store:* ${storeName}\n`;
    text += `*Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;
    text += `Hello ${distributorName}, please find the list of medicines near expiry / expired for return & credit note replacement:\n\n`;
  }

  expiringOrExpired.forEach((item, index) => {
    const classification = getExpiryClassification(item.expiryDate);
    const statusLabel = isMr ? classification.labelMr : classification.labelEn;
    text += `${index + 1}. *${item.name}*\n`;
    text += `   - Batch: ${item.batchNo || 'N/A'}\n`;
    text += `   - Expiry: ${item.expiryDate} (${statusLabel})\n`;
    text += `   - Stock: ${item.stock} ${item.unit || 'units'} | MRP: ₹${item.mrp || item.price}\n\n`;
  });

  if (isMr) {
    text += `कृपया ही औषधे परत घेऊन क्रेडिट नोट द्यावी. धन्यवाद!`;
  } else {
    text += `Kindly arrange for pickup and credit note issuance. Thank you!`;
  }

  return encodeURIComponent(text);
}
