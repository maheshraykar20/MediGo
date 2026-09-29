import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  KeyRound, 
  ShieldCheck, 
  Store, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  Lock, 
  Building2, 
  Receipt, 
  Calendar, 
  Check, 
  Sparkles, 
  ChevronRight,
  BadgeAlert,
  SlidersHorizontal,
  Pill
} from 'lucide-react';
import { requestPhoneOTP, verifyPhoneOTP } from '../utils/userStorage';
import { playSuccessSound, playUrgentAlertSound, playWarningSound } from '../utils/notificationSound';

export default function LoginScreen({ onLoginSuccess, lang = 'mr', setLang }) {
  const isMr = lang === 'mr';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [pharmacistName, setPharmacistName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showCustomDetails, setShowCustomDetails] = useState(false);

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [incomingSmsOtp, setIncomingSmsOtp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);

  const otpInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Resend Countdown
  useEffect(() => {
    let timer;
    if (step === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCountdown]);

  // Request new OTP
  const handleSendOtp = (overridePhone = null) => {
    const targetPhone = overridePhone || phoneNumber;
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '').slice(-10);
    const trimmedStoreName = storeName.trim();

    if (!trimmedStoreName) {
      setErrorMessage(isMr ? 'कृपया तुमच्या मेडिकल स्टोअरचे नाव टाका.' : 'Please enter your Medical Store Name.');
      playUrgentAlertSound();
      return;
    }

    if (cleanPhone.length !== 10) {
      setErrorMessage(isMr ? 'कृपया वैध १०-अंकी मोबाईल नंबर टाका.' : 'Please enter a valid 10-digit mobile number.');
      playUrgentAlertSound();
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      // Generate a fresh unique OTP for this mobile number with storeName
      const res = requestPhoneOTP(cleanPhone, pharmacistName, trimmedStoreName);
      setIsLoading(false);

      if (res.success) {
        setPhoneNumber(cleanPhone);
        setIncomingSmsOtp(res.otpCode);
        setStep('otp');
        setResendCountdown(30);
        setOtpDigits(['', '', '', '']);
        playWarningSound();

        // Focus first OTP digit
        setTimeout(() => otpInputRefs[0].current?.focus(), 150);
      } else {
        setErrorMessage(isMr ? res.errorMr : res.errorEn);
        playUrgentAlertSound();
      }
    }, 400);
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setErrorMessage('');

    // Advance to next box
    if (value && index < 3) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  // Support pasting full 4-digit OTP
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (!pasteData) return;

    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setOtpDigits(newDigits);
    if (pasteData.length === 4) {
      otpInputRefs[3].current?.focus();
    } else {
      otpInputRefs[pasteData.length].current?.focus();
    }
  };

  // Strictly verify OTP
  const handleVerifyOtp = (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length < 4) {
      setErrorMessage(isMr ? 'कृपया ४-अंकी संपूर्ण ओटीपी टाका.' : 'Please enter the complete 4-digit OTP.');
      playUrgentAlertSound();
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      const res = verifyPhoneOTP(phoneNumber, fullOtp);
      setIsLoading(false);

      if (res.success) {
        playSuccessSound();
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(isMr ? res.errorMr : res.errorEn);
        playUrgentAlertSound();
        setOtpDigits(['', '', '', '']);
        otpInputRefs[0].current?.focus();
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white antialiased font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-600/30 font-bold text-lg font-serif">
            Rx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                MedVault <span className="text-teal-600">Pro</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                500+ Pharmacy Cloud
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {isMr ? '१ डॅशबोर्ड • सुरक्षित साठा • Expiry रडार' : '1 Dashboard • Isolated Stock • Expiry Radar'}
            </p>
          </div>
        </div>

        {/* Right Header Options */}
        <div className="flex items-center gap-2.5">
          {/* Security Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>FDA 20B/21B Architecture</span>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(isMr ? 'en' : 'mr')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-teal-700 transition shadow-xs"
            title={isMr ? 'Switch to English' : 'मराठीत बदला'}
          >
            {isMr ? 'English' : 'मराठी'}
          </button>
        </div>
      </header>

      {/* Main Hero & Auth Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left Hero Column: Value Proposition & Live Radar Highlights */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/70 border border-teal-200 text-teal-900 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>{isMr ? '५००+ मेडिकल स्टोअर्ससाठी खास तयार' : 'Designed for 500+ Medical Stores'}</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-heading font-black text-slate-900 leading-tight">
                {isMr ? (
                  <>
                    प्रत्येक मेडिकल स्टोअरसाठी <br className="hidden sm:inline" />
                    <span className="text-teal-600">१००% स्वतंत्र</span> आणि सुरक्षित डॅशबोर्ड
                  </>
                ) : (
                  <>
                    Unified Pharmacy Cloud with <br className="hidden sm:inline" />
                    <span className="text-teal-600">100% Data Isolation</span> for All Stores
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                {isMr 
                  ? 'तुमचा मोबाईल नंबर टाका आणि तुमच्या मेडिकलचा संपूर्ण औषध साठा, उद्याच्या मुदत समाप्तीचे (Expiry) अलर्ट्स आणि खरेदी-विक्री व्हाउचर्स सुरक्षितपणे हाताळा.' 
                  : 'Enter your 10-digit mobile number to access your isolated medical inventory, real-time tomorrow-expiry alerts, and official billing vouchers.'}
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isMr ? '१००% डेटा गोपनीयता' : 'Total Data Privacy'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isMr ? 'User A चा साठा किंवा व्हाउचर्स User B ला कधीही दिसणार नाहीत.' : 'User A data is strictly invisible to User B and vice-versa.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <BadgeAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isMr ? 'Expiry वॉच रडार' : 'Live Expiry Radar'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isMr ? 'उद्या एक्सपायर होणाऱ्या औषधांचा ध्वनीसह अचूक इशारा.' : 'Real-time chime alerts for medicines expiring tomorrow.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isMr ? 'खरेदी-विक्री व्हाउचर्स' : 'Voucher Register'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isMr ? 'GST इनव्हॉइस, रिटर्न चलन, PDF डाऊनलोड व प्रिंट.' : 'Purchase inward, sales memo, PDF bills, and thermal print.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isMr ? 'नवा OTP प्रमाणीकरण' : 'Fresh Dynamic OTP'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isMr ? 'प्रत्येक वेळी नवा सुरक्षित ४-अंकी ओटीपी पाठवला जातो.' : 'Fresh random 4-digit code generated for every single login.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonials or Stats Counter */}
            <div className="p-3 rounded-2xl bg-teal-900 text-white flex items-center justify-between text-xs px-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-300" />
                <span className="font-semibold">{isMr ? 'सक्रिय मेडिकल स्टोअर्स:' : 'Active Pharmacy Network:'}</span>
              </div>
              <span className="font-mono font-black text-teal-200 text-sm">500+ STORES LIVE</span>
            </div>
          </div>

          {/* Right Column: Dedicated Full-Height Auth Card */}
          <div className="lg:col-span-6 w-full max-w-lg mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
              
              {/* Card Header */}
              <div className="p-6 sm:p-7 border-b border-slate-100 bg-gradient-to-b from-teal-50/50 to-white text-left">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                    <KeyRound className="w-3.5 h-3.5" />
                    {step === 'phone' ? (isMr ? 'पायरी १: स्टोअर व मोबाईल' : 'Step 1: Store & Mobile') : (isMr ? 'पायरी २: OTP पडताळणी' : 'Step 2: Verify OTP')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">256-BIT ENCRYPTED</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 mt-3 tracking-tight">
                  {step === 'phone' 
                    ? (isMr ? 'फार्मसी लॉगिन करा' : 'Sign In to Your Pharmacy')
                    : (isMr ? 'ओटीपी पडताळणी करा' : 'Verify Mobile OTP')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {step === 'phone'
                    ? (isMr ? 'तुमच्या मेडिकल स्टोअरचे नाव आणि १०-अंकी मोबाईल नंबर टाका.' : 'Enter your Medical Store Name and 10-digit mobile number.')
                    : (isMr ? `"${storeName || 'स्टोअर'}" (+91 ${phoneNumber}) साठी पाठवलेला ४-अंकी ओटीपी टाका.` : `Enter the 4-digit code sent for "${storeName || 'Store'}" (+91 ${phoneNumber}).`)}
                </p>
              </div>

              {/* Realistic Simulated Live SMS Toast Banner (Only visible on OTP step) */}
              {incomingSmsOtp && step === 'otp' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-orange-200 p-4 px-6 flex items-start gap-3.5 animate-fadeIn">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm mt-0.5">
                    SMS
                  </div>
                  <div className="flex-1 text-xs text-left">
                    <div className="flex items-center justify-between font-bold text-orange-950">
                      <span>{isMr ? '📱 मेसेज आला (MedVault SMS):' : '📱 Incoming SMS Notification:'}</span>
                      <span className="text-[10px] text-orange-700 font-mono">Just now</span>
                    </div>
                    <p className="text-slate-800 mt-1 leading-snug">
                      {isMr ? (
                        <>
                          तुमच्या मोबाईलसाठी नवा लॉगिन ओटीपी{' '}
                          <span className="font-mono font-black text-slate-950 bg-white px-2 py-0.5 rounded-lg border border-orange-300 text-sm shadow-xs">
                            {incomingSmsOtp}
                          </span>{' '}
                          हा आहे. हा ५ मिनिटांसाठी वैध आहे.
                        </>
                      ) : (
                        <>
                          Your fresh MedVault Pro login OTP is{' '}
                          <span className="font-mono font-black text-slate-950 bg-white px-2 py-0.5 rounded-lg border border-orange-300 text-sm shadow-xs">
                            {incomingSmsOtp}
                          </span>. Valid for 5 mins.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Form Content */}
              <div className="p-6 sm:p-7 space-y-5">
                {step === 'phone' ? (
                  /* ------------------------------------------------------------- */
                  /* STEP 1: ENTER PHONE NUMBER                                    */
                  /* ------------------------------------------------------------- */
                  <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                    {/* 1. MEDICAL STORE NAME (DIRECT & PROMINENT) */}
                    <div className="text-left">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-teal-600" />
                          <span>{isMr ? 'मेडिकल स्टोअरचे नाव *' : 'Medical Store Name *'}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {isMr ? 'आवश्यक' : 'Required'}
                        </span>
                      </label>

                      <div className="flex items-center rounded-2xl border-2 border-slate-200 bg-slate-50 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/10 transition overflow-hidden">
                        <div className="pl-3.5 pr-2 text-slate-400">
                          <Store className="w-4 h-4 text-teal-600" />
                        </div>
                        <input
                          type="text"
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder={isMr ? 'उदा. श्री गणेश मेडिकल ॲन्ड जनरल स्टोअर / ABC Medical' : 'e.g. Shree Ganesh Medical / ABC Pharma'}
                          className="w-full pr-3.5 py-3 text-sm font-bold text-slate-900 bg-transparent focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                          autoFocus
                        />
                        {storeName && (
                          <button
                            type="button"
                            onClick={() => setStoreName('')}
                            className="mr-3 text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center shrink-0"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. MOBILE NUMBER */}
                    <div className="text-left">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-teal-600" />
                          <span>{isMr ? 'मोबाईल नंबर *' : 'Mobile Number *'}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">10 Digits</span>
                      </label>

                      <div className="flex items-center rounded-2xl border-2 border-slate-200 bg-slate-50 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/10 transition overflow-hidden">
                        <span className="px-3.5 py-3 text-sm font-black text-slate-700 bg-slate-100 border-r border-slate-200 font-mono">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder={isMr ? 'उदा. 98220 12345' : 'e.g. 98220 12345'}
                          className="w-full px-3.5 py-3 text-base font-black tracking-widest text-slate-900 bg-transparent focus:outline-none font-mono"
                        />
                        {phoneNumber && (
                          <button
                            type="button"
                            onClick={() => setPhoneNumber('')}
                            className="mr-3 text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center shrink-0"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. OPTIONAL PHARMACIST / OWNER NAME */}
                    <div className="text-left pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCustomDetails(!showCustomDetails)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>
                          {showCustomDetails 
                            ? (isMr ? 'मालकाचे नाव लपवा' : 'Hide Owner Details')
                            : (isMr ? '+ फार्मसिस्ट / मालकाचे नाव नोंदवा (पर्यायी)' : '+ Add Pharmacist / Owner Name (Optional)')}
                        </span>
                      </button>

                      {showCustomDetails && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 animate-fadeIn">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {isMr ? 'फार्मसिस्ट / मालकाचे नाव' : 'Pharmacist / Owner Name'}
                          </label>
                          <input
                            type="text"
                            value={pharmacistName}
                            onChange={(e) => setPharmacistName(e.target.value)}
                            placeholder={isMr ? 'उदा. डॉ. सचिन कांबळे (D.Pharm)' : 'e.g. Dr. Sachin Kamble (D.Pharm)'}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                          />
                        </div>
                      )}
                    </div>

                    {/* Error Box */}
                    {errorMessage && (
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium animate-fadeIn">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !storeName.trim() || phoneNumber.length < 10}
                      className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>{isMr ? 'ओटीपी पाठवा (Get OTP)' : 'Send Secure OTP'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* 100% Privacy Note */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                      <Lock className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isMr ? 'तुमचा डेटा इतर कोणत्याही युजरला दिसणार नाही.' : 'Your pharmacy data is 100% private & isolated.'}</span>
                    </div>
                  </form>
                ) : (
                  /* ------------------------------------------------------------- */
                  /* STEP 2: ENTER OTP                                             */
                  /* ------------------------------------------------------------- */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center space-y-1">
                      <div className="text-xs text-slate-500">
                        {isMr ? 'ओटीपी खालील मोबाईल नंबरवर पाठवला आहे:' : 'Enter 4-digit code sent to:'}
                      </div>
                      <div className="text-base font-black text-slate-900 font-mono tracking-wider">
                        +91 {phoneNumber.slice(0, 5)} {phoneNumber.slice(5)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('phone');
                          setErrorMessage('');
                          setIncomingSmsOtp(null);
                        }}
                        className="text-xs font-bold text-teal-600 hover:underline inline-block mt-0.5"
                      >
                        {isMr ? '← मोबाईल नंबर बदला (Change Number)' : '← Change Mobile Number'}
                      </button>
                    </div>

                    {/* 4 Digit OTP Boxes */}
                    <div className="flex justify-center gap-3 py-2" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={otpInputRefs[index]}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/15 transition font-mono shadow-inner"
                        />
                      ))}
                    </div>

                    {/* Error Alert */}
                    {errorMessage && (
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium animate-fadeIn">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Verify Button */}
                    <button
                      type="submit"
                      disabled={isLoading || otpDigits.join('').length < 4}
                      className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-teal-600/30 transition flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isMr ? 'पडताळणी करा व डॅशबोर्ड उघडा' : 'Verify & Open Dashboard'}</span>
                        </>
                      )}
                    </button>

                    {/* Resend Timer & Action */}
                    <div className="text-center text-xs text-slate-500 pt-1">
                      {resendCountdown > 0 ? (
                        <span>
                          {isMr ? `नवा ओटीपी पाठवा (${resendCountdown} सेकंदात)` : `Resend OTP in ${resendCountdown}s`}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          className="font-bold text-teal-600 hover:underline"
                        >
                          {isMr ? 'नवा ओटीपी पाठवा (Resend OTP Now)' : 'Resend OTP Now'}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Card Security Guarantee */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  {isMr 
                    ? '५००+ युजर्सचा डेटा १००% स्वतंत्र व खाजगी राहतो.' 
                    : 'End-to-End data isolation across 500+ independent stores.'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm px-4 sm:px-8 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <strong>MedVault Pro</strong> - Intelligent Medical Store & Expiry Radar Cloud
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>FDA & Drug Control Architecture</span>
            <span>•</span>
            <span>Local & Cloud Multi-Tenant Isolation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
