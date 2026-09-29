// Web Notification API wrapper for real desktop & mobile notifications

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function sendMedicineExpiryNotification(medicine, type = 'tomorrow', lang = 'en') {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  let title = '';
  let body = '';

  if (lang === 'mr') {
    if (type === 'tomorrow') {
      title = `⚠️ औषध मुदत अलर्ट: उद्या Expire होणार!`;
      body = `${medicine.name} (बॅच: ${medicine.batchNo}) उद्या expire होत आहे! स्टॉकमध्ये ${medicine.stock} युनिट्स शिल्लक आहेत.`;
    } else if (type === 'expired') {
      title = `🚨 कालबाह्य औषध अलर्ट`;
      body = `${medicine.name} (बॅच: ${medicine.batchNo}) कालबाह्य झाली आहे. कृपया विक्री बंद करा व सप्लायरला परत करा.`;
    } else if (type === 'soon') {
      title = `⏰ मुदत संपण्याची सूचना (७ दिवस)`;
      body = `${medicine.name} पुढील ७ दिवसांत expire होणार आहे (स्टॉक: ${medicine.stock}).`;
    }
  } else {
    // Pure English
    if (type === 'tomorrow') {
      title = `⚠️ Expiry Alert: Expiring Tomorrow!`;
      body = `${medicine.name} (Batch: ${medicine.batchNo}) expires tomorrow! ${medicine.stock} units remaining in stock.`;
    } else if (type === 'expired') {
      title = `🚨 Expired Medicine Alert`;
      body = `${medicine.name} (Batch: ${medicine.batchNo}) has expired! Please halt sales and return to supplier.`;
    } else if (type === 'soon') {
      title = `⏰ Expiry Notice: 7 Days Remaining`;
      body = `${medicine.name} expires in 7 days (${medicine.stock} units in stock).`;
    }
  }

  try {
    const options = {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/883/883360.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/883/883360.png',
      vibrate: [200, 100, 200],
      tag: `med-expiry-${medicine.id}-${type}`,
      requireInteraction: type === 'tomorrow' || type === 'expired',
      data: {
        medicineId: medicine.id,
        url: window.location.href,
      }
    };

    const notification = new Notification(title, options);
    notification.onclick = function() {
      window.focus();
      this.close();
    };
    return true;
  } catch (err) {
    console.warn('Native notification failed:', err);
    return false;
  }
}
