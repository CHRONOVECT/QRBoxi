/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Download, 
  Clipboard, 
  Check, 
  Trash2, 
  History, 
  ExternalLink, 
  Sliders, 
  Info, 
  Palette, 
  Copy, 
  X, 
  Wifi, 
  WifiOff,
  Sparkles,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces
interface QRHistoryItem {
  id: string;
  url: string;
  timestamp: number;
  fgColor: string;
  bgColor: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}

interface ColorPreset {
  name: string;
  fg: string;
  bg: string;
  label: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Classic Dark', fg: '#000000', bg: '#ffffff', label: 'High contrast standard' },
  { name: 'Midnight Green', fg: '#10b981', bg: '#09090b', label: 'Terminal aesthetic' },
  { name: 'Neon Cyber', fg: '#ec4899', bg: '#020617', label: 'Vibrant cyberpunk' },
  { name: 'Solar Amber', fg: '#f59e0b', bg: '#18181b', label: 'Warm tech' },
  { name: 'Nordic Blue', fg: '#3b82f6', bg: '#f8fafc', label: 'Clean corporate' },
  { name: 'Stealth Grey', fg: '#ffffff', bg: '#1c1917', label: 'Ultra minimalist dark' },
];

export default function App() {
  // Input URL / Text
  const [urlInput, setUrlInput] = useState('https://google.com');
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Customizer Settings
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [margin, setMargin] = useState(4);
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [exportSize, setExportSize] = useState<number>(1024); // resolution in px for downloaded PNG

  // UI state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [history, setHistory] = useState<QRHistoryItem[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showPresetTip, setShowPresetTip] = useState(false);
  const [customizerExpanded, setCustomizerExpanded] = useState(true);

  // Live validation feedback
  const [isValidUrl, setIsValidUrl] = useState(true);

  // References
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Validate URL on change
  useEffect(() => {
    if (!urlInput.trim()) {
      setIsValidUrl(false);
      return;
    }
    try {
      // Check if it looks like a valid URL or at least has a domain/protocol structure
      if (/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(urlInput)) {
        setIsValidUrl(true);
      } else {
        setIsValidUrl(false);
      }
    } catch {
      setIsValidUrl(false);
    }
  }, [urlInput]);

  // Offline status listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load History
    const stored = localStorage.getItem('qrboxi_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading history', e);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save history helper
  const saveToHistory = useCallback((urlText: string, fg: string, bg: string, ecc: 'L' | 'M' | 'Q' | 'H') => {
    const newItem: QRHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      url: urlText,
      timestamp: Date.now(),
      fgColor: fg,
      bgColor: bg,
      errorCorrection: ecc,
    };

    setHistory((prev) => {
      // Avoid duplicate consecutive entries with same config
      const filtered = prev.filter(item => !(item.url === urlText && item.fgColor === fg && item.bgColor === bg));
      const updated = [newItem, ...filtered].slice(0, 30); // Keep last 30 items
      localStorage.setItem('qrboxi_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Generate QR Code
  const generateQRCode = useCallback(async (customUrlText?: string, customFg?: string, customBg?: string, customEcc?: 'L' | 'M' | 'Q' | 'H') => {
    const targetUrl = customUrlText !== undefined ? customUrlText : urlInput;
    const targetFg = customFg !== undefined ? customFg : fgColor;
    const targetBg = customBg !== undefined ? customBg : bgColor;
    const targetEcc = customEcc !== undefined ? customEcc : errorCorrection;

    if (!targetUrl.trim()) {
      setError('Please enter a URL or text content');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Generate a canvas/image with high resolution for exportSize
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: targetEcc,
        margin: margin,
        color: {
          dark: targetFg,
          light: targetBg,
        },
        width: exportSize,
      });

      setQrDataUrl(dataUrl);

      // Only save to history if it's a new or manual generation
      if (customUrlText === undefined) {
        saveToHistory(targetUrl, targetFg, targetBg, targetEcc);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate QR Code');
    } finally {
      setIsGenerating(false);
    }
  }, [urlInput, fgColor, bgColor, margin, errorCorrection, exportSize, saveToHistory]);

  // Generate automatically when URL input or settings change (debounced or simple effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (urlInput.trim()) {
        generateQRCode();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [urlInput, fgColor, bgColor, margin, errorCorrection, exportSize]);

  // Handle preset selection
  const applyPreset = (preset: ColorPreset) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
  };

  // Download QR Code PNG
  const handleDownload = () => {
    if (!qrDataUrl) return;

    try {
      // Clean up the filename from URL
      let filenamePart = 'qr';
      try {
        const urlObj = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`);
        filenamePart = urlObj.hostname.replace('www.', '') || 'qr';
      } catch {
        filenamePart = urlInput.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 20) || 'qr';
      }

      const link = document.createElement('a');
      link.download = `qrboxi-${filenamePart}-${exportSize}px.png`;
      link.href = qrDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to download image. Try copying it instead.');
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(urlInput);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      setError('Failed to copy URL');
    }
  };

  // Copy QR Image to clipboard
  const handleCopyImage = async () => {
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 2000);
    } catch (err) {
      setError('Browser clipboard access limited. Try right-clicking the QR code preview to copy.');
    }
  };

  // Load from history item
  const handleLoadHistory = (item: QRHistoryItem) => {
    setUrlInput(item.url);
    setFgColor(item.fgColor);
    setBgColor(item.bgColor);
    setErrorCorrection(item.errorCorrection);
  };

  // Delete history item
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('qrboxi_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (confirm('Are you sure you want to clear your local QR scan history?')) {
      setHistory([]);
      localStorage.removeItem('qrboxi_history');
    }
  };

  // Quick Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
      }
    } catch (err) {
      setError('Unable to read clipboard. Please paste using keyboard shortcut (Ctrl+V / Cmd+V).');
    }
  };

  // Contrast warning helper
  // Checks if colors are too close (simplistic check for similar light/dark values)
  const isLowContrast = () => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const c1 = hexToRgb(fgColor);
    const c2 = hexToRgb(bgColor);

    // Calculate luminance
    const lum1 = 0.2126 * c1.r + 0.7152 * c1.g + 0.0722 * c1.b;
    const lum2 = 0.2126 * c2.r + 0.7152 * c2.g + 0.0722 * c2.b;

    const diff = Math.abs(lum1 - lum2);
    // If difference in luminance is very small, flag it as potential scanning issue
    return diff < 45;
  };

  // Is inverted warning (dark background, light foreground)
  const isInverted = () => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const c1 = hexToRgb(fgColor);
    const c2 = hexToRgb(bgColor);

    const lumFg = 0.2126 * c1.r + 0.7152 * c1.g + 0.0722 * c1.b;
    const lumBg = 0.2126 * c2.r + 0.7152 * c2.g + 0.0722 * c2.b;

    // Inverted means foreground is lighter than background
    return lumFg > lumBg;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-neutral-800" id="qrboxi-root">
      
      {/* simulated premium desktop app window header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-xl px-5 py-3.5 sticky top-0 z-40 flex items-center justify-between" id="app-header">
        <div className="flex items-center gap-4">
          {/* Mac style window controls */}
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 block"></span>
          </div>
          
          <div className="h-4 w-px bg-neutral-800"></div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-neutral-900 border border-neutral-800 text-emerald-400">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white bg-clip-text">
              QRBoxi
            </span>
            <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Offline status and action badges */}
        <div className="flex items-center gap-3">
          {isOffline ? (
            <div className="flex items-center gap-1.5 text-xs bg-amber-950/40 border border-amber-900/50 text-amber-400 px-2.5 py-1 rounded-full font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-2.5 py-1 rounded-full font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>Ready & Fully Offline Capable</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Application Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6" id="app-main">
        
        {/* Left Side: Inputs, Presets & Settings (8 Columns) */}
        <section className="lg:col-span-8 flex flex-col gap-6" id="controls-section">
          
          {/* Main URL Input Card */}
          <div className="bg-neutral-900/50 border border-neutral-900 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/30 via-neutral-900 to-neutral-900"></div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h2 className="font-display font-semibold text-neutral-200">Paste Your URL</h2>
              </div>
              <span className="text-xs text-neutral-500 font-mono">Any valid URL or custom text</span>
            </div>

            <div className="relative">
              <input
                id="url-input-field"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 rounded-xl py-3.5 pl-4 pr-32 text-neutral-100 placeholder-neutral-600 focus:outline-none transition-all duration-250 font-mono text-sm shadow-inner"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {urlInput && (
                  <button
                    onClick={() => setUrlInput('')}
                    className="p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors"
                    title="Clear content"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handlePaste}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            {/* Validation indicators */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <div>
                {urlInput.trim() ? (
                  isValidUrl ? (
                    <span className="text-emerald-500 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Valid web link format detected
                    </span>
                  ) : (
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-neutral-500" /> Treating as general text content
                    </span>
                  )
                ) : (
                  <span className="text-neutral-500">Input is empty</span>
                )}
              </div>

              {urlInput && (
                <button 
                  onClick={handleCopyUrl}
                  className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Customizer Panel */}
          <div className="bg-neutral-900/50 border border-neutral-900 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <button 
                onClick={() => setCustomizerExpanded(!customizerExpanded)}
                className="flex items-center gap-2.5 text-left focus:outline-none w-full"
              >
                <Sliders className="w-4 h-4 text-emerald-500" />
                <h3 className="font-display font-semibold text-neutral-200">QR Code Customization</h3>
                <span className="text-2xs font-mono text-neutral-500 ml-auto bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  {customizerExpanded ? 'COLLAPSE' : 'EXPAND'}
                </span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {customizerExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-6"
                >
                  
                  {/* Preset Colors */}
                  <div>
                    <label className="text-xs text-neutral-400 font-medium block mb-2.5 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-500" />
                      Aesthetic Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyPreset(preset)}
                          className={`flex items-center gap-2.5 p-2 bg-neutral-950 border rounded-xl hover:border-neutral-700 transition-all text-left group relative ${
                            fgColor === preset.fg && bgColor === preset.bg
                              ? 'border-emerald-500 bg-neutral-900/30'
                              : 'border-neutral-800'
                          }`}
                        >
                          <div 
                            className="w-5 h-5 rounded border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0"
                            style={{ backgroundColor: preset.bg }}
                          >
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: preset.fg }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-neutral-200 truncate leading-tight">{preset.name}</p>
                            <p className="text-[10px] text-neutral-500 truncate mt-0.5">{preset.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Manual Colors */}
                    <div className="flex flex-col gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/60">
                      <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block border-b border-neutral-900 pb-1.5">
                        Manual Palette
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-2xs text-neutral-400 font-medium">Foreground Color</label>
                          <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                            <input
                              type="color"
                              value={fgColor}
                              onChange={(e) => setFgColor(e.target.value)}
                              className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent block"
                            />
                            <input
                              type="text"
                              value={fgColor.toUpperCase()}
                              onChange={(e) => setFgColor(e.target.value)}
                              className="w-full bg-transparent text-xs font-mono text-neutral-200 uppercase focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-2xs text-neutral-400 font-medium">Background Color</label>
                          <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                            <input
                              type="color"
                              value={bgColor}
                              onChange={(e) => setBgColor(e.target.value)}
                              className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent block"
                            />
                            <input
                              type="text"
                              value={bgColor.toUpperCase()}
                              onChange={(e) => setBgColor(e.target.value)}
                              className="w-full bg-transparent text-xs font-mono text-neutral-200 uppercase focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Scanning warnings & hints */}
                      {isLowContrast() && (
                        <div className="text-2xs bg-rose-950/30 border border-rose-900/40 text-rose-300 p-2.5 rounded-lg flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                          <span>
                            <strong>Low Contrast Alert:</strong> The selected colors may make scanning difficult on some older mobile cameras. Try increasing contrast.
                          </span>
                        </div>
                      )}

                      {isInverted() && !isLowContrast() && (
                        <div className="text-2xs bg-amber-950/20 border border-amber-900/30 text-amber-300 p-2.5 rounded-lg flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <span>
                            <strong>Light-on-Dark QR:</strong> Your foreground is lighter than background. Most modern scanners support this perfectly, but standard dark-on-light is most universal.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quality & Formatting settings */}
                    <div className="flex flex-col gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/60">
                      <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block border-b border-neutral-900 pb-1.5">
                        Format & Margin
                      </span>

                      {/* Margin padding slider */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-neutral-300 font-medium">Quiet Zone (Margin)</label>
                          <span className="text-xs font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">{margin} blocks</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          value={margin}
                          onChange={(e) => setMargin(parseInt(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer bg-neutral-800 h-1 rounded-lg focus:outline-none"
                        />
                      </div>

                      {/* Error correction selection */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-neutral-300 font-medium">Error Correction (ECC)</label>
                          <button 
                            onClick={() => setShowPresetTip(!showPresetTip)}
                            className="text-[10px] text-neutral-500 hover:text-emerald-400 flex items-center gap-1"
                          >
                            <HelpCircle className="w-3 h-3" /> Explain ECC
                          </button>
                        </div>
                        
                        {showPresetTip && (
                          <div className="text-2xs text-neutral-400 bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg flex flex-col gap-1">
                            <p>Error Correction allows the QR code to be scanned even if partially dirty, damaged, or covered:</p>
                            <ul className="list-disc pl-4 text-neutral-500 flex flex-col gap-0.5 mt-1">
                              <li><strong>Low (L)</strong>: ~7% recovery. Smallest file size, simplest modules.</li>
                              <li><strong>Medium (M)</strong>: ~15% recovery. Safe default for standard URLs.</li>
                              <li><strong>Quartile (Q)</strong>: ~25% recovery. Ideal for busy backgrounds.</li>
                              <li><strong>High (H)</strong>: ~30% recovery. Best for industrial prints, highest redundancy.</li>
                            </ul>
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                          {(['L', 'M', 'Q', 'H'] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => setErrorCorrection(level)}
                              className={`py-1.5 text-xs rounded-md font-mono font-bold transition-all ${
                                errorCorrection === level
                                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History / Recents list */}
          <div className="bg-neutral-900/50 border border-neutral-900 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-neutral-400" />
                <h3 className="font-display font-semibold text-neutral-200">Recent Generates</h3>
                <span className="text-xs bg-neutral-950 text-neutral-500 px-2 py-0.5 rounded border border-neutral-800 font-mono">
                  {history.length} Saved
                </span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-xs text-neutral-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-6 text-center bg-neutral-950/20 border border-dashed border-neutral-800/50 rounded-xl">
                <p className="text-sm text-neutral-500">No recently generated QR codes</p>
                <p className="text-2xs text-neutral-600 mt-1">Codes you generate will persist locally on this computer</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                <AnimatePresence>
                  {history.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => handleLoadHistory(item)}
                      className={`group p-3 bg-neutral-950 border rounded-xl hover:bg-neutral-900/40 transition-all text-left flex items-center justify-between cursor-pointer ${
                        urlInput === item.url ? 'border-emerald-500/50 bg-neutral-900/20' : 'border-neutral-800/80'
                      }`}
                    >
                      <div className="min-w-0 pr-2 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span 
                            className="w-2.5 h-2.5 rounded-sm shrink-0 border border-neutral-800" 
                            style={{ backgroundColor: item.fgColor }} 
                          />
                          <p className="text-xs font-mono font-medium text-neutral-200 truncate pr-2">
                            {item.url}
                          </p>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' • '}ECC: {item.errorCorrection}
                        </span>
                      </div>
                      
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all duration-150"
                          title="Delete history item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

        </section>

        {/* Right Side: QR Code Real-Time Preview, Copy, and Download Actions (4 Columns) */}
        <section className="lg:col-span-4 flex flex-col gap-6" id="preview-section">
          
          {/* Main Preview Card */}
          <div className="bg-neutral-900/50 border border-neutral-900 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden text-center">
            
            <div className="absolute top-0 right-0 p-3">
              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                Live Preview
              </span>
            </div>

            <h3 className="font-display font-semibold text-neutral-200 mb-6 text-sm self-start">Active Output</h3>

            {/* QR Code Container with nice container spacing and glow */}
            <div 
              ref={previewContainerRef}
              className="relative p-5 rounded-xl border border-neutral-800 bg-neutral-950/40 shadow-inner group transition-all duration-300 hover:border-neutral-700/80 mb-6 flex items-center justify-center min-h-60 min-w-60"
            >
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                    <span className="text-xs text-neutral-400 font-mono">Generating QR...</span>
                  </motion.div>
                ) : qrDataUrl ? (
                  <motion.div
                    key="qr-code"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="relative flex flex-col items-center justify-center"
                  >
                    <img
                      src={qrDataUrl}
                      alt="Generated QR Code Preview"
                      className="w-48 h-48 rounded-lg select-none shadow-md border border-neutral-800"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    className="flex flex-col items-center justify-center text-neutral-600 gap-2 max-w-[200px]"
                  >
                    <QrCode className="w-12 h-12 stroke-1" />
                    <p className="text-xs font-mono">Ready to encode your link</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Live Scanned Metadata Details */}
            <div className="w-full bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 mb-6 text-left">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Target Payload</span>
              <p className="text-xs font-mono text-neutral-200 break-all line-clamp-2" title={urlInput}>
                {urlInput || '(empty text)'}
              </p>
            </div>

            {/* Download and Share Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              
              <button
                disabled={!qrDataUrl || isGenerating}
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <Download className="w-4.5 h-4.5" />
                <span>Save High-Res PNG</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!qrDataUrl}
                  onClick={handleCopyImage}
                  className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs py-2.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Copy QR image to clipboard for quick paste"
                >
                  {copiedImg ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>

                <button
                  disabled={!urlInput}
                  onClick={() => {
                    try {
                      const completeUrl = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;
                      window.open(completeUrl, '_blank');
                    } catch {
                      setError('Failed to open link.');
                    }
                  }}
                  className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs py-2.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Verify link opens correctly in browser"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Test Link</span>
                </button>
              </div>

            </div>

          </div>

          {/* Export Settings Card */}
          <div className="bg-neutral-900/50 border border-neutral-900 rounded-2xl p-5 shadow-xl flex flex-col gap-3">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block border-b border-neutral-800/80 pb-2">
              Export Settings
            </span>

            <div className="flex flex-col gap-2">
              <label className="text-2xs text-neutral-400 font-medium">Download Dimensions</label>
              <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                {[256, 512, 1024].map((size) => (
                  <button
                    key={size}
                    onClick={() => setExportSize(size)}
                    className={`py-1 text-2xs rounded font-mono transition-all ${
                      exportSize === size
                        ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Higher dimensions yield razor-sharp printing results.
              </p>
            </div>
          </div>

        </section>

      </main>

      {/* Elegant minimalist Footer with Brand & Trademark */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-8 px-6 mt-auto text-center" id="app-footer">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
          
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm tracking-tight text-neutral-300">
              QRBoxi Desktop Suite
            </span>
            <span className="text-2xs text-neutral-600 font-mono">•</span>
            <span className="text-xs text-neutral-400">
              Published by <strong className="text-neutral-200">Creophagous ®</strong>
            </span>
          </div>

          {/* Registered Trademark clause */}
          <p className="text-[11px] text-neutral-500 max-w-xl leading-relaxed">
            <strong className="text-neutral-300">CREOPHAGOUS ®</strong> is a registered trademark in the United Kingdom under Registration Number <span className="font-mono text-neutral-400">UK00004091250</span> (Filed: <span className="text-neutral-400">23 August 2024</span>) for Classes <span className="font-mono text-neutral-400">9, 35, 41, and 42</span>. 
            All software code, graphics, and visual assets are copyright and trade dress of their respective proprietors. 
            Licensed for personal use and offline deployment.
          </p>

          <p className="text-[10px] text-neutral-600 font-mono mt-2">
            Designed for secure offline operation. No network trackers or cloud-dependent generation scripts.
          </p>
          
        </div>
      </footer>
    </div>
  );
}
