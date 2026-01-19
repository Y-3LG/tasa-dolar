
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchBCVRate } from './services/geminiService';
import { ExchangeRate, CurrencyType } from './types';
import * as htmlToImage from 'html-to-image';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [officialRate, setOfficialRate] = useState<ExchangeRate | null>(null);
  const [customRate, setCustomRate] = useState<string>('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [usdAmount, setUsdAmount] = useState<string>('1.00');
  const [vesAmount, setVesAmount] = useState<string>('');
  const [lastFocused, setLastFocused] = useState<CurrencyType>(CurrencyType.USD);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  const [copyFeedback, setCopyFeedback] = useState<{type: CurrencyType, show: boolean}>({
    type: CurrencyType.USD,
    show: false
  });
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Theme management
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Determine current active rate
  const activeRate = useMemo(() => {
    if (useCustomRate && customRate) {
      return parseFloat(customRate);
    }
    return officialRate?.rate || 1;
  }, [useCustomRate, customRate, officialRate]);

  // Handle Rate Fetch
  const refreshRate = useCallback(async () => {
    setLoading(true);
    const result = await fetchBCVRate();
    setOfficialRate(result);
    setLoading(false);
    
    if (!customRate) {
      setCustomRate(result.rate.toFixed(2));
    }
  }, [customRate]);

  useEffect(() => {
    refreshRate();
  }, []);

  // Sync calculation
  useEffect(() => {
    if (lastFocused === CurrencyType.USD) {
      const usdNum = parseFloat(usdAmount) || 0;
      setVesAmount((usdNum * activeRate).toFixed(2));
    } else {
      const vesNum = parseFloat(vesAmount) || 0;
      setUsdAmount((vesNum / activeRate).toFixed(2));
    }
  }, [usdAmount, vesAmount, activeRate, lastFocused]);

  const handleSwap = () => {
    setLastFocused(lastFocused === CurrencyType.USD ? CurrencyType.VES : CurrencyType.USD);
  };

  const copyToClipboard = async (text: string, type: CurrencyType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback({ type, show: true });
      setTimeout(() => setCopyFeedback({ type, show: false }), 1500);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const shareCapture = async () => {
    if (!cardRef.current) return;
    
    try {
      setLoading(true);
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        backgroundColor: isDarkMode ? '#0a0a0b' : '#f9fafb',
        pixelRatio: 2,
        style: {
          padding: '20px',
          borderRadius: '16px'
        }
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `conversion-bcv-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Conversión Dólar BCV',
          text: `Conversión: ${usdAmount} USD = ${vesAmount} VES (Tasa: ${activeRate})`
        });
      } else {
        const link = document.createElement('a');
        link.download = `bcv-conversion-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Error sharing capture:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen flex flex-col pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center bg-zinc-50 dark:bg-background-dark p-6 pb-2 justify-between sticky top-0 z-20 transition-colors">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="text-primary flex w-12 items-center justify-start cursor-pointer hover:opacity-80 transition-all p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <span className="material-symbols-outlined text-2xl">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <h2 className="text-zinc-900 dark:text-white text-lg font-semibold leading-tight tracking-tight flex-1 text-center">Calculadora Dólar</h2>
        <div className="flex w-12 items-center justify-end gap-2">
          <button 
            onClick={shareCapture}
            className="flex items-center justify-center rounded-full w-10 h-10 bg-transparent text-zinc-600 dark:text-white hover:text-primary transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <span className="material-symbols-outlined text-2xl">share</span>
          </button>
          <button 
            onClick={refreshRate}
            className={`flex items-center justify-center rounded-full w-10 h-10 bg-transparent text-zinc-600 dark:text-white hover:text-primary transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 ${loading ? 'animate-spin text-primary' : ''}`}
          >
            <span className="material-symbols-outlined text-2xl">sync</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-8">
        {/* Main Display */}
        <div className="mb-4">
          <h1 className="text-zinc-900 dark:text-white tracking-tight text-[32px] md:text-[34px] font-bold leading-tight text-center">
            1 USD = {activeRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES
          </h1>
          <p className="text-zinc-500 text-sm font-normal leading-normal text-center mt-2 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">info</span>
            {useCustomRate ? 'Usando Tasa Personalizada' : `Tasa Oficial BCV • Actualizada ${officialRate?.lastUpdate || '...'}`}
          </p>
        </div>

        {/* Currency Card */}
        <div ref={cardRef} className="mt-8 bg-white dark:bg-card-dark rounded-2xl border border-zinc-200 dark:border-border-dark p-1 relative shadow-xl dark:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* USD Input Section */}
          <div className="flex flex-col p-4 pt-5 group cursor-pointer relative" onClick={() => copyToClipboard(usdAmount, CurrencyType.USD)}>
            {copyFeedback.show && copyFeedback.type === CurrencyType.USD && (
              <div className="absolute top-0 right-4 copy-feedback bg-primary text-white text-[10px] px-2 py-1 rounded font-bold shadow-lg z-30">
                ¡COPIADO!
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-white/10 shadow-sm">
                  <img alt="US Flag" className="w-full h-full object-cover" src="https://flagcdn.com/w80/us.png" />
                </div>
                <span className="text-zinc-900 dark:text-white font-bold text-lg">USD</span>
              </div>
              <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-bold uppercase tracking-widest">Desde</span>
            </div>
            <div className="flex items-center relative">
              <input 
                className="w-full bg-transparent border-none p-0 text-4xl font-bold text-zinc-900 dark:text-white focus:ring-0 focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 pointer-events-auto"
                type="number" 
                step="any"
                value={usdAmount}
                onFocus={(e) => {
                   e.stopPropagation();
                   setLastFocused(CurrencyType.USD);
                }}
                onChange={(e) => setUsdAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0.00"
              />
              <span className="text-primary material-symbols-outlined text-3xl font-light absolute right-0 group-hover:scale-110 transition-transform">attach_money</span>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-6 relative z-10">
            <button 
              onClick={handleSwap}
              className="bg-primary text-white p-3 rounded-full shadow-lg border-[6px] border-zinc-50 dark:border-background-dark hover:rotate-180 active:scale-95 transition-all duration-500"
            >
              <span className="material-symbols-outlined text-2xl font-bold">swap_vert</span>
            </button>
          </div>

          {/* VES Input Section */}
          <div className="flex flex-col p-4 mt-2 pb-5 group cursor-pointer relative" onClick={() => copyToClipboard(vesAmount, CurrencyType.VES)}>
            {copyFeedback.show && copyFeedback.type === CurrencyType.VES && (
              <div className="absolute top-0 right-4 copy-feedback bg-primary text-white text-[10px] px-2 py-1 rounded font-bold shadow-lg z-30">
                ¡COPIADO!
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-white/10 shadow-sm">
                  <img alt="Venezuela Flag" className="w-full h-full object-cover" src="https://flagcdn.com/w80/ve.png" />
                </div>
                <span className="text-zinc-900 dark:text-white font-bold text-lg">VES</span>
              </div>
              <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-bold uppercase tracking-widest">A</span>
            </div>
            <div className="flex items-center justify-between">
              <input 
                className="w-full bg-transparent border-none p-0 text-4xl font-bold text-zinc-900 dark:text-white focus:ring-0 focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 pointer-events-auto"
                type="number"
                step="any"
                value={vesAmount}
                onFocus={(e) => {
                  e.stopPropagation();
                  setLastFocused(CurrencyType.VES);
                }}
                onChange={(e) => setVesAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0.00"
              />
              <span className="text-zinc-400 dark:text-zinc-500 font-bold text-xl ml-2 whitespace-nowrap group-hover:text-primary transition-colors">Bs.</span>
            </div>
          </div>
        </div>

        {/* Custom Rate Toggle */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <span className={`material-symbols-outlined ${useCustomRate ? 'text-primary' : 'text-zinc-400'} text-xl transition-colors`}>edit_square</span>
              </div>
              <span className="text-zinc-700 dark:text-zinc-200 font-semibold">Usar Tasa Personalizada</span>
            </div>
            <button 
              onClick={() => setUseCustomRate(!useCustomRate)}
              className={`w-12 h-6 rounded-full relative flex items-center px-1 transition-all duration-300 ${useCustomRate ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${useCustomRate ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          {/* Custom Rate Input Card */}
          <div className={`bg-white dark:bg-card-dark border border-zinc-200 dark:border-border-dark rounded-xl p-5 shadow-sm transition-all duration-300 ${useCustomRate ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale pointer-events-none translate-y-2'}`}>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-3">Tasa de Conversión Manual</label>
            <div className="flex items-center gap-4">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium text-sm whitespace-nowrap">1 USD = </span>
              <div className="relative flex-1">
                <input 
                  className="w-full bg-zinc-50 dark:bg-background-dark border border-zinc-200 dark:border-border-dark rounded-lg px-4 py-3 text-zinc-900 dark:text-white font-bold text-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  type="number"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                />
              </div>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">VES</span>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="mt-12">
          <div className="flex items-center justify-between px-1 mb-4">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Acceso Rápido</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ShortcutButton label="5 USD" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('5.00'); }} />
            <ShortcutButton label="10 USD" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('10.00'); }} />
            <ShortcutButton label="20 USD" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('20.00'); }} />
            <ShortcutButton label="50 USD" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('50.00'); }} />
          </div>
        </div>
      </main>
    </div>
  );
};

interface ShortcutButtonProps {
  label: string;
  onClick: () => void;
}

const ShortcutButton: React.FC<ShortcutButtonProps> = ({ label, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-white dark:bg-card-dark border border-zinc-200 dark:border-border-dark rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all group shadow-sm dark:shadow-none"
    >
      <span className="text-zinc-700 dark:text-zinc-200 text-sm font-bold">{label}</span>
      <span className="material-symbols-outlined text-zinc-400 text-sm group-hover:text-primary transition-colors">chevron_right</span>
    </button>
  );
};

export default App;
