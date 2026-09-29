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
  UserCheck,
  Building2,
  Lock,
  Sparkles
} from 'lucide-react';
import { requestPhoneOTP, verifyPhoneOTP } from '../utils/userStorage';
import { playSuccessSound, playUrgentAlertSound } from '../utils/notificationSound';

export default function LoginModal({ 
  isOpen, 
  onLoginSuccess, 
  onClose,
  canClose = false,
  lang = 'mr' 
}) {
  const isMr = lang === 'mr';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [incomingSmsOtp, setIncomingSmsOtp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);

  const otpInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    let timer;
    if (step === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCountdown]);

  if (!isOpen) return null;

  const handleSendOtp = (phoneToUse) => {
    const targetPhone = phoneToUse || phoneNumber;
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = requestPhoneOTP(targetPhone);
      setIsLoading(false);

      if (res.success) {
        setPhoneNumber(res.phone);
        setIncomingSmsOtp(res.otpCode);
        setStep('otp');
        setResendCountdown(30);
        setOtpDigits(['', '', '', '']);
        playSuccessSound();
        // Focus first OTP input
        setTimeout(() => otpInputRefs[0].current?.focus(), 150);
      } else {
        setErrorMessage(isMr ? res.errorMr : res.errorEn);
        playUrgentAlertSound();
      }
    }, 400);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setErrorMessage('');

    // Auto advance
    if (value && index < 3) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

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

  const handleVerifyOtp = (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 4) {
      setErrorMessage(isMr ? 'कृपया ४-अंकी संपूर्ण ओटीपी टाका.' : 'Please enter all 4 digits of OTP.');
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
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-fadeIn">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-6 text-white text-center relative">
          {canClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              ✕
            </button>
          )}

          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-white mx-auto flex items-center justify-center shadow-lg font-bold text-2xl mb-3">
            <span className="font-serif">Rx</span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">
            {isMr ? 'MedVault Pro लॉगिन' : 'MedVault Pro Login'}
          </h2>
          <p className="text-xs text-teal-100 mt-1">
            {isMr 
              ? '१ डॅशबोर्ड, अनेक युजर्स (प्रत्येक युजरचा डेटा १००% स्वतंत्र)' 
              : '1 Dashboard, Multi-User Cloud (100% Isolated Private Data)'}
          </p>
        </div>

        {/* Realistic SMS Notification Banner Simulation */}
        {incomingSmsOtp && step === 'otp' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-orange-200 p-3.5 px-5 flex items-start gap-3 animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              SMS
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between font-bold text-orange-950">
                <span>{isMr ? 'मोबाईल SMS अलर्ट' : 'Incoming SMS Alert'}</span>
                <span className="text-[10px] text-orange-700 font-mono">Just now</span>
              </div>
              <p className="text-slate-700 mt-0.5 leading-snug">
                {isMr 
                  ? <>तुमचा MedVault लॉगिन ओटीपी <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-orange-300 font-mono">{incomingSmsOtp}</span> हा आहे.</>
                  : <>Your MedVault login verification OTP is <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-orange-300 font-mono">{incomingSmsOtp}</span>. Valid for 5 mins.</>}
              </p>
            </div>
          </div>
        )}

        {/* Modal Form Body */}
        <div className="p-6 space-y-5">
          {step === 'phone' ? (
            /* STEP 1: ENTER PHONE NUMBER */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  <span>{isMr ? 'मोबाईल नंबर टाका' : 'Enter 10-Digit Mobile Number'}</span>
                </label>
                <div className="flex items-center rounded-2xl border border-slate-300 bg-slate-50 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20 transition overflow-hidden">
                  <span className="px-3.5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 border-r border-slate-200">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="98220 12345"
                    className="w-full px-3.5 py-2.5 text-sm font-bold tracking-wider text-slate-900 bg-transparent focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isLoading || phoneNumber.length < 10}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-teal-600/30 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{isMr ? 'ओटीपी पाठवा (Send OTP)' : 'Send Verification OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Privacy Note */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                <span>{isMr ? 'तुमचा डेटा इतर कोणत्याही युजरला दिसणार नाही.' : 'Your data is 100% private & isolated.'}</span>
              </div>
            </div>
          ) : (
            /* STEP 2: ENTER OTP */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-slate-500">
                  {isMr ? 'ओटीपी खालील नंबरवर पाठवला आहे:' : 'Enter 4-digit code sent to:'}
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  +91 {phoneNumber.slice(0, 5)} {phoneNumber.slice(5)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setErrorMessage('');
                  }}
                  className="text-[11px] font-semibold text-teal-600 hover:underline"
                >
                  {isMr ? 'नंबर बदला' : 'Change Number'}
                </button>
              </div>

              {/* 4 Digit Input Boxes */}
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
                    className="w-12 h-14 text-center text-xl font-extrabold text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition font-mono"
                  />
                ))}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otpDigits.join('').length < 4}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-teal-600/30 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isMr ? 'पडताळणी करा व डॅशबोर्ड उघडा' : 'Verify & Access Dashboard'}</span>
                  </>
                )}
              </button>

              {/* Resend Timer */}
              <div className="text-center text-xs text-slate-500 pt-1">
                {resendCountdown > 0 ? (
                  <span>
                    {isMr ? `पुन्हा ओटीपी पाठवा ${resendCountdown} सेकंदात` : `Resend OTP in ${resendCountdown}s`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="font-bold text-teal-600 hover:underline"
                  >
                    {isMr ? 'नवीन ओटीपी पाठवा (Resend OTP)' : 'Resend OTP Now'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security / Privacy Footnote */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>
            {isMr 
              ? '१००% सुरक्षित व खाजगी: प्रत्येक युजरचा डेटा इतरांपासून विभक्त राहतो.' 
              : 'End-to-End Isolated Data: User A cannot access User B data.'}
          </span>
        </div>
      </div>
    </div>
  );
}
