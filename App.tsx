
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
  
  const captureRef = useRef<HTMLDivElement>(null);

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
      return parseFloat(customRate) || 1;
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
    const rate = activeRate;
    if (lastFocused === CurrencyType.USD) {
      const usdNum = parseFloat(usdAmount) || 0;
      setVesAmount((usdNum * rate).toFixed(2));
    } else {
      const vesNum = parseFloat(vesAmount) || 0;
      setUsdAmount((vesNum / rate).toFixed(2));
    }
  }, [usdAmount, vesAmount, activeRate, lastFocused]);

  const handleSwap = () => {
    // Intercambiamos los montos literales
    const tempUsd = usdAmount;
    const tempVes = vesAmount;
    setUsdAmount(tempVes);
    setVesAmount(tempUsd);
    // Cambiamos el foco para que el cálculo se mantenga consistente tras el intercambio
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
    if (!captureRef.current) return;
    
    try {
      setLoading(true);
      // Ocultar elementos que no queremos en la captura (como el botón swap flotante)
      const swapBtn = captureRef.current.querySelector('.swap-btn-container');
      if (swapBtn) (swapBtn as HTMLElement).style.opacity = '0';

      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        backgroundColor: isDarkMode ? '#0a0a0b' : '#f9fafb',
        pixelRatio: 3, // Alta calidad para legibilidad
        style: {
          padding: '24px',
          borderRadius: '0px',
        }
      });

      // Restaurar visibilidad
      if (swapBtn) (swapBtn as HTMLElement).style.opacity = '1';

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `bcv-conversion-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Conversión Dólar BCV',
          text: `Conversión realizada: ${usdAmount} USD = ${vesAmount} VES (Tasa: ${activeRate.toFixed(2)})`
        });
      } else {
        const link = document.createElement('a');
        link.download = `bcv-calculo-${Date.now()}.png`;
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
    <div className="max-w-[480px] mx-auto min-h-screen flex flex-col pb-12 transition-colors duration-300 bg-zinc-50 dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center p-6 pb-2 justify-between sticky top-0 z-20 bg-zinc-50/80 dark:bg-background-dark/80 backdrop-blur-md transition-colors">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="text-primary flex w-12 items-center justify-start cursor-pointer hover:opacity-80 transition-all p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800"
          title="Modo Claro/Oscuro"
        >
          <span className="material-symbols-outlined text-2xl">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <h2 className="text-zinc-900 dark:text-white text-lg font-semibold leading-tight tracking-tight flex-1 text-center">Calculadora Dólar</h2>
        <div className="flex w-12 items-center justify-end gap-1">
          <button 
            onClick={shareCapture}
            className="flex items-center justify-center rounded-full w-10 h-10 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Compartir Captura"
          >
            <span className="material-symbols-outlined text-2xl">share</span>
          </button>
          <button 
            onClick={refreshRate}
            className={`flex items-center justify-center rounded-full w-10 h-10 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 ${loading ? 'animate-spin text-primary' : ''}`}
            title="Sincronizar Tasa"
          >
            <span className="material-symbols-outlined text-2xl">sync</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-8">
        {/* Info Header */}
        <div className="mb-4">
          <h1 className="text-zinc-900 dark:text-white tracking-tight text-[32px] md:text-[34px] font-bold leading-tight text-center">
            1 USD = {activeRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES
          </h1>
          <p className="text-zinc-500 text-sm font-normal leading-normal text-center mt-2 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            {useCustomRate ? 'Tasa Personalizada Activa' : `BCV Oficial • ${officialRate?.lastUpdate || '...'}`}
          </p>
        </div>

        {/* Capture Container */}
        <div ref={captureRef} className="mt-8 bg-zinc-50 dark:bg-background-dark">
          {/* Main Display for Capture (Hidden in Web, visible in Capture logic if configured) */}
          <div className="hidden">
            <h2 className="text-center font-bold text-zinc-900 dark:text-white mb-4">Conversión Dólar BCV</h2>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-[28px] border border-zinc-200 dark:border-border-dark p-1 relative shadow-xl dark:shadow-2xl transition-all duration-300">
            {/* USD Input Section */}
            <div className="flex flex-col p-6 pt-7 group cursor-pointer relative" onClick={() => copyToClipboard(usdAmount, CurrencyType.USD)}>
              {copyFeedback.show && copyFeedback.type === CurrencyType.USD && (
                <div className="absolute top-2 right-6 copy-feedback bg-primary text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg z-30">
                  ¡COPIADO!
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-white/10 shadow-sm">
                    <img alt="US Flag" className="w-full h-full object-cover" src="https://flagcdn.com/w80/us.png" />
                  </div>
                  <span className="text-zinc-900 dark:text-white font-bold text-xl tracking-tight">USD</span>
                </div>
                <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Dólares</span>
              </div>
              <div className="flex items-center relative">
                <input 
                  className="w-full bg-transparent border-none p-0 text-5xl font-black text-zinc-900 dark:text-white focus:ring-0 focus:outline-none placeholder:text-zinc-200 dark:placeholder:text-zinc-800 pointer-events-auto"
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
                <span className="text-zinc-200 dark:text-zinc-800 material-symbols-outlined text-4xl absolute right-0 group-hover:text-primary/40 transition-colors">payments</span>
              </div>
            </div>

            {/* Swap Button - Wrapped for easy hiding during capture */}
            <div className="swap-btn-container flex justify-center -my-8 relative z-10 transition-opacity duration-200">
              <button 
                onClick={handleSwap}
                className="bg-primary text-white p-4 rounded-full shadow-2xl border-[6px] border-zinc-50 dark:border-background-dark hover:rotate-180 active:scale-90 transition-all duration-500"
                title="Intercambiar montos"
              >
                <span className="material-symbols-outlined text-2xl font-bold">swap_vert</span>
              </button>
            </div>

            {/* VES Input Section */}
            <div className="flex flex-col p-6 mt-2 pb-8 group cursor-pointer relative" onClick={() => copyToClipboard(vesAmount, CurrencyType.VES)}>
              {copyFeedback.show && copyFeedback.type === CurrencyType.VES && (
                <div className="absolute top-2 right-6 copy-feedback bg-primary text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg z-30">
                  ¡COPIADO!
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-white/10 shadow-sm">
                    <img alt="Venezuela Flag" className="w-full h-full object-cover" src="https://flagcdn.com/w80/ve.png" />
                  </div>
                  <span className="text-zinc-900 dark:text-white font-bold text-xl tracking-tight">VES</span>
                </div>
                <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Bolívares</span>
              </div>
              <div className="flex items-center justify-between">
                <input 
                  className="w-full bg-transparent border-none p-0 text-5xl font-black text-zinc-900 dark:text-white focus:ring-0 focus:outline-none placeholder:text-zinc-200 dark:placeholder:text-zinc-800 pointer-events-auto"
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
                <span className="text-zinc-300 dark:text-zinc-600 font-black text-2xl ml-2 whitespace-nowrap group-hover:text-primary transition-colors">Bs.</span>
              </div>
            </div>
            
            {/* Capture Footer Branding */}
            <div className="pb-4 pt-0 text-center opacity-0 capture-visible">
               <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Calculadora Dólar BCV</p>
            </div>
          </div>
        </div>

        {/* Custom Rate Toggle */}
        <div className="mt-12 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-2xl">
                <span className={`material-symbols-outlined ${useCustomRate ? 'text-primary' : 'text-zinc-400'} text-xl`}>tune</span>
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-800 dark:text-zinc-100 font-bold text-sm">Tasa Personalizada</span>
                <span className="text-zinc-500 text-[11px]">Define tu propio valor del dólar</span>
              </div>
            </div>
            <button 
              onClick={() => setUseCustomRate(!useCustomRate)}
              className={`w-14 h-7 rounded-full relative flex items-center px-1 transition-all duration-300 ${useCustomRate ? 'bg-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${useCustomRate ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
          </div>

          {/* Custom Rate Input Card */}
          <div className={`bg-white dark:bg-card-dark border border-zinc-200 dark:border-border-dark rounded-[24px] p-6 shadow-sm transition-all duration-500 ${useCustomRate ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale pointer-events-none translate-y-4 blur-[1px]'}`}>
            <div className="flex items-center justify-center gap-6">
              <span className="text-zinc-400 font-bold text-xl">1 $ =</span>
              <div className="relative flex-1 max-w-[140px]">
                <input 
                  className="w-full bg-zinc-50 dark:bg-background-dark border-2 border-transparent focus:border-primary/40 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-black text-2xl outline-none transition-all text-center"
                  type="number"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                />
              </div>
              <span className="text-zinc-400 font-bold text-xl">Bs.</span>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="mt-14">
          <div className="flex items-center justify-between px-2 mb-5">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Accesos Directos</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 px-1">
            <QuickValue value="1" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('1.00'); }} />
            <QuickValue value="5" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('5.00'); }} />
            <QuickValue value="10" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('10.00'); }} />
            <QuickValue value="20" onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount('20.00'); }} />
          </div>
        </div>
      </main>
      
      {/* Disclaimer */}
      <footer className="mt-auto pt-8 px-10 text-center opacity-50">
        <p className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em] font-medium leading-relaxed">
          Los valores mostrados corresponden a la tasa oficial establecida por el Banco Central de Venezuela.
        </p>
      </footer>
    </div>
  );
};

const QuickValue: React.FC<{ value: string, onClick: () => void }> = ({ value, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white dark:bg-card-dark border border-zinc-200 dark:border-border-dark rounded-2xl py-4 flex flex-col items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-90 shadow-sm dark:shadow-none group"
  >
    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white/60 mb-1">$</span>
    <span className="text-xl font-black text-zinc-800 dark:text-zinc-200 group-hover:text-white">{value}</span>
  </button>
);

export default App;
