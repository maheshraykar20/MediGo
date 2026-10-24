import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Keyboard, 
  CheckCircle2, 
  AlertCircle, 
  Pill, 
  Edit3, 
  Plus, 
  RotateCcw, 
  Flashlight, 
  ScanLine, 
  Tag, 
  Calendar, 
  Building2, 
  MapPin, 
  IndianRupee,
  RefreshCw,
  Zap,
  PackageCheck
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { parseMedicineBarcode, findMedicineMatch } from '../utils/barcodeUtils';
import { getExpiryClassification, formatINR } from '../utils/expiryUtils';
import { playSuccessSound } from '../utils/notificationSound';

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  medicines = [],
  onAutoAddMedicine,
  onOpenMedicineDetail,
  onEditMedicine,
  onAddNewWithData,
  lang = 'en'
}) {
  const isMr = lang === 'mr';
  const [activeTab, setActiveTab] = useState('camera'); // 'camera', 'upload', 'manual'
  const [autoAddMode, setAutoAddMode] = useState(true); // Default: Auto-add to inventory immediately!
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState(null); // { raw, parsed, medicine, isNew, scannedAt }
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [torchOn, setTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);

  const scannerRef = useRef(null);
  const containerId = 'barcode-scanner-viewport';

  // Supported pharmaceutical barcode formats
  const formatsToSupport = [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.ITF,
  ];

  // Process detected raw code
  const handleDecodedText = (decodedText) => {
    if (!decodedText || !decodedText.trim()) return;

    playSuccessSound();

    const parsed = parseMedicineBarcode(decodedText);

    // AUTO-ADD FLOW (Requested by user):
    // Directly add the product into the inventory item list upon scanning!
    if (autoAddMode && onAutoAddMedicine) {
      const res = onAutoAddMedicine(parsed);
      if (res && res.medicine) {
        setScanResult({
          raw: decodedText,
          parsed,
          medicine: res.medicine,
          isNew: res.isNew,
          scannedAt: new Date().toLocaleTimeString(),
        });

        // Pause scanner so user can inspect and choose to edit or scan next
        if (scannerRef.current && isScanning) {
          try {
            scannerRef.current.pause(true);
          } catch (e) {}
        }
        return;
      }
    }

    // Fallback search mode if auto-add is toggled off
    const match = findMedicineMatch(medicines, parsed);
    setScanResult({
      raw: decodedText,
      parsed,
      medicine: match,
      isNew: !match,
      scannedAt: new Date().toLocaleTimeString(),
    });

    if (scannerRef.current && isScanning) {
      try {
        scannerRef.current.pause(true);
      } catch (e) {}
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId, {
          formatsToSupport,
          verbose: false,
        });
      }

      // If already scanning, stop first
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Wide box for strip barcodes + square for QR / DataMatrix
          const width = Math.floor(minEdge * 0.85);
          const height = Math.floor(minEdge * 0.65);
          return { width: Math.max(width, 220), height: Math.max(height, 160) };
        },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // Frame failure / no code found in this frame (silent)
        }
      );

      setIsScanning(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities = scannerRef.current.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setIsTorchSupported(true);
        } else {
          setIsTorchSupported(false);
        }
      } catch (e) {
        setIsTorchSupported(false);
      }
    } catch (err) {
      console.warn('Camera scanner start error:', err);
      setIsScanning(false);
      const msg = err?.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError(
          isMr
            ? 'कॅमेरा वापरण्याची परवानगी नाकारली आहे. कृपया ब्राऊझर सेटिंग्जमधून कॅमेरा परवानगी द्या.'
            : 'Camera permission denied. Please allow camera access in your browser settings.'
        );
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        setCameraError(
          isMr
            ? 'कोणताही कॅमेरा सापडला नाही. तुम्ही फोटो अपलोड किंवा मॅन्युअल इनपुट पर्याय वापरू शकता.'
            : 'No camera found on this device. You can upload an image or enter the barcode manually.'
        );
      } else {
        setCameraError(
          isMr
            ? 'कॅमेरा सुरू करताना अडचण आली. कृपया पुन्हा प्रयत्न करा किंवा फोटो अपलोड करा.'
            : 'Could not access camera. Please retry or upload a photo of the medicine strip.'
        );
      }
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !isTorchSupported) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  // Switch between front and back camera
  const switchCamera = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  // Re-arm Scanner to scan next item
  const handleScanNext = async () => {
    setScanResult(null);
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        startCamera();
      }
    } else {
      startCamera();
    }
  };

  // Handle Image File Upload scan
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    try {
      let html5QrCode = scannerRef.current;
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = html5QrCode;
      }

      // Stop camera if currently running
      if (html5QrCode.isScanning) {
        await html5QrCode.stop();
        setIsScanning(false);
      }

      const decodedText = await html5QrCode.scanFile(file, true);
      handleDecodedText(decodedText);
    } catch (err) {
      console.warn('File scan failed:', err);
      alert(
        isMr
          ? 'फोटोमध्ये कोणताही स्पष्ट बारकोड किंवा QR कोड सापडला नाही. कृपया स्पष्ट प्रकाशात फोटो काढून पुन्हा प्रयत्न करा.'
          : 'No clear barcode or QR code found in this image. Please try again with a clear, well-lit photo.'
      );
    } finally {
      e.target.value = '';
    }
  };

  // Handle Manual Barcode / Scanner Gun submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleDecodedText(manualInput.trim());
    setManualInput('');
  };

  // Open Edit / Details Modal for medicine
  const handleOpenEditMedicine = (medicine) => {
    onClose();
    if (onEditMedicine) {
      onEditMedicine(medicine);
    } else if (onOpenMedicineDetail) {
      onOpenMedicineDetail(medicine);
    }
  };

  // Lifecycle: start / stop camera on modal open / tab switch
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, facingMode]);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanResult(null);
      setCameraError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 z-10 overflow-hidden my-auto max-h-[94vh] flex flex-col animate-fadeIn">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-sm">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {isMr ? 'औषध बारकोड / QR स्कॅनर' : 'Medicine Barcode & QR Scanner'}
                </h3>
                {autoAddMode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    <span>{isMr ? 'ऑटो ॲड चालू' : 'Auto-Add ON'}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {isMr ? 'स्कॅन करताच औषध थेट साठ्यात जोडले जाईल' : 'Scanned products are added directly to your stock'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection & Auto-Add Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 bg-white px-3 pt-2 gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab('camera'); setScanResult(null); }}
              className={`py-2 px-3 text-xs font-bold rounded-t-xl transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'camera'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isMr ? 'कॅमेरा' : 'Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('upload'); setScanResult(null); }}
              className={`py-2 px-3 text-xs font-bold rounded-t-xl transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'upload'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isMr ? 'फोटो अपलोड' : 'Upload'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('manual'); setScanResult(null); }}
              className={`py-2 px-3 text-xs font-bold rounded-t-xl transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'manual'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{isMr ? 'मॅन्युअल / गन' : 'Gun / Code'}</span>
            </button>
          </div>

          {/* Auto-Add Switch */}
          <div className="pb-1.5 sm:pb-0 flex items-center justify-end">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer select-none bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={autoAddMode}
                onChange={(e) => setAutoAddMode(e.target.checked)}
                className="w-3.5 h-3.5 accent-teal-600 rounded cursor-pointer"
              />
              <span>{isMr ? '⚡ थेट साठ्यात जोडा (Auto-Add)' : '⚡ Auto-Add to Stock'}</span>
            </label>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">

          {/* TAB 1: LIVE CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {/* Camera Viewport Wrapper */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border-2 border-slate-800 shadow-inner">
                {/* HTML5-QRCode Mount Point */}
                <div id={containerId} className="w-full h-full" />

                {/* Animated Scanner Laser Overlay */}
                {isScanning && !scanResult && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-[80%] h-[60%] border-2 border-teal-400/70 rounded-xl relative shadow-[0_0_15px_rgba(45,212,191,0.3)]">
                      {/* Corner Target Markers */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-teal-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-teal-400" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-teal-400" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-teal-400" />

                      {/* Moving Laser Beam */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_8px_#2dd4bf]" />
                    </div>
                    <span className="text-[11px] font-bold text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full mt-3 backdrop-blur-xs">
                      {isMr ? 'औषधाचा बारकोड किंवा QR चौकोनात आणा' : 'Align medicine barcode / QR inside frame'}
                    </span>
                  </div>
                )}

                {/* Camera Permission Error Notice */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 p-5 flex flex-col items-center justify-center text-center text-white space-y-3 z-20">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <p className="text-xs text-slate-200 max-w-xs">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isMr ? 'पुन्हा प्रयत्न करा' : 'Retry Camera'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Controls Bar */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold px-1">
                  {isScanning 
                    ? (isMr ? '🟢 स्कॅनर सक्रिय (स्कॅन करताच ॲड होईल)' : '🟢 Scanner Active (Auto-Add Ready)') 
                    : (isMr ? 'कॅमेरा सज्ज होत आहे...' : 'Camera standby')}
                </span>

                <div className="flex items-center gap-2">
                  {/* Torch Toggle if supported */}
                  {isTorchSupported && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-1.5 rounded-lg border font-bold transition flex items-center gap-1 ${
                        torchOn 
                          ? 'bg-amber-400 text-slate-950 border-amber-500' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={isMr ? 'फ्लॅश चालू/बंद' : 'Toggle Flashlight'}
                    >
                      <Flashlight className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{torchOn ? 'ON' : 'Flash'}</span>
                    </button>
                  )}

                  {/* Flip Camera */}
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer"
                    title={isMr ? 'कॅमेरा बदला (Front/Back)' : 'Switch Camera'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{isMr ? 'कॅमेरा बदला' : 'Flip'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE / PHOTO */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/30 hover:bg-teal-50/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-110 transition mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">
                  {isMr ? 'औषध स्ट्रिप किंवा बॉक्सचा फोटो निवडा' : 'Upload photo of Medicine Strip / Box'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mb-3">
                  {isMr 
                    ? 'फोटो अपलोड करताच बारकोड वाचून औषध थेट तुमच्या साठ्यात जोडले जाईल.'
                    : 'Upload a photo to automatically decode and add the medicine to your stock.'}
                </p>
                <span className="px-4 py-1.5 bg-teal-600 group-hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                  {isMr ? '📁 फोटो निवडा / Snap Photo' : '📁 Browse Image / Snap Photo'}
                </span>
              </label>
            </div>
          )}

          {/* TAB 3: MANUAL INPUT / BARCODE GUN */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {isMr ? 'बारकोड / QR नंबर टाका किंवा स्कॅनर गनने स्कॅन करा:' : 'Enter Barcode / QR or Scan with Gun:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder={isMr ? 'उदा. 8906017461761 किंवा QR लिंक' : 'e.g. 8906017461761 or QR code'}
                    className="flex-1 px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition shrink-0 cursor-pointer"
                  >
                    {isMr ? 'साठ्यात जोडा' : 'Add to Stock'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isMr ? 'थेट साठा नोंदणी (Instant Auto-Add):' : 'Instant Auto-Add Active:'}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isMr 
                    ? 'बारकोड स्कॅनर गनने किंवा नंबर टाकून एंटर करताच औषध थेट तुमच्या स्टॉक लिस्टमध्ये सेव्ह होईल.'
                    : 'Scanning with a barcode gun will instantly add the medicine product into your inventory.'}
                </p>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* RESULT CARD: PRODUCT SUCCESSFULLY ADDED / UPDATED IN STOCK */}
          {/* ======================================================== */}
          {scanResult && scanResult.medicine && (
            <div className="pt-2 animate-fadeIn space-y-3">
              <div className="bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <PackageCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-200/90 px-2.5 py-0.5 rounded-full border border-emerald-400">
                          {scanResult.isNew 
                            ? (isMr ? '🎉 साठ्यात यशस्वीपणे जोडले गेले!' : '🎉 Added Directly to Stock!') 
                            : (isMr ? '✅ साठ्यात आधीच उपलब्ध (+1 शिल्लक वाढवली)' : '✅ Already in Stock (+1 Qty Added)')}
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-1">
                        {scanResult.medicine.name}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Scanned Medicine Key Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'बॅच नंबर' : 'Batch No'}</span>
                    <span className="font-mono font-bold text-slate-900">{scanResult.medicine.batchNo || '-'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'मुदत (Expiry)' : 'Expiry Date'}</span>
                    <span className="font-mono font-bold text-slate-900">{scanResult.medicine.expiryDate || '-'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'उपलब्ध शिल्लक साठा' : 'Stock Quantity'}</span>
                    <span className="font-black text-emerald-700 text-sm">{scanResult.medicine.stock} {scanResult.medicine.unit || 'Strips'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'रॅक / जागा' : 'Rack Location'}</span>
                    <span className="font-bold text-slate-800">{scanResult.medicine.rack || 'Rack A-1'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'किंमत (MRP)' : 'Selling Price / MRP'}</span>
                    <span className="font-black text-slate-900">₹{parseFloat(scanResult.medicine.mrp || 0).toFixed(2)}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">{isMr ? 'खरेदी किंमत' : 'Purchase Cost'}</span>
                    <span className="font-bold text-slate-700">₹{parseFloat(scanResult.medicine.purchasePrice || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Company & Barcode Badge */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] bg-white/90 p-2 rounded-xl border border-emerald-200">
                  <div className="text-slate-700 font-semibold truncate">
                    <span className="text-slate-400">{isMr ? 'कंपनी: ' : 'Mfr: '}</span>
                    <span>{scanResult.medicine.manufacturer || 'Pharmaceuticals'}</span>
                  </div>
                  <div className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">
                    Code: {scanResult.medicine.barcode || scanResult.raw}
                  </div>
                </div>

                {/* Actions: Edit Name/Price, Scan Next, Done */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditMedicine(scanResult.medicine)}
                    className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-teal-600/30 cursor-pointer"
                    title={isMr ? 'औषधाचे नाव किंवा किंमत बदला' : 'Edit Medicine Name & Details'}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{isMr ? '✏️ नाव किंवा किंमत बदला' : 'Edit Name & Details'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 cursor-pointer"
                    title={isMr ? 'पुढील औषध स्कॅन करा' : 'Scan Next Medicine'}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isMr ? '📷 पुढील औषध स्कॅन करा' : 'Scan Next'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            {isMr ? 'स्कॅन केलेले सर्व औषध आपोआप सेव्ह होते' : 'Scanned medicines are auto-saved to SQLite & inventory'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {isMr ? 'पूर्ण झाले (Done)' : 'Done / Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
