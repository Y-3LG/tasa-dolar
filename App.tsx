
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

  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tempUsd = usdAmount;
    const tempVes = vesAmount;
    
    // Intercambio directo de valores
    setUsdAmount(tempVes);
    setVesAmount(tempUsd);
    
    // Alternamos el foco lógico para que el siguiente input respete el sentido
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
      // Preparar elementos para una captura "limpia"
      const swapBtn = captureRef.current.querySelector('.swap-btn');
      if (swapBtn) (swapBtn as HTMLElement).style.display = 'none';

      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        backgroundColor: isDarkMode ? '#0a0a0b' : '#f9fafb',
        pixelRatio: 3,
        style: {
          padding: '40px',
          borderRadius: '0px',
          transform: 'scale(1)',
        }
      });

      if (swapBtn) (swapBtn as HTMLElement).style.display = 'flex';

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `bcv-calculo-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Conversión Dólar BCV',
          text: `Cálculo realizado: ${usdAmount} USD = ${vesAmount} VES\nTasa: ${activeRate.toFixed(2)}`
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
    <div className="max-w-[480px] mx-auto min-h-screen flex flex-col pb-12 transition-colors duration-300 bg-zinc-50 dark:bg-background-dark selection:bg-primary/30">
      {/* Header */}
      <header className="flex items-center p-6 pb-2 justify-between sticky top-0 z-30 bg-zinc-50/90 dark:bg-background-dark/90 backdrop-blur-xl border-b border-transparent transition-all">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="text-primary flex w-10 h-10 items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all"
        >
          <span className="material-symbols-outlined text-2xl">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <h2 className="text-zinc-900 dark:text-white text-lg font-bold tracking-tight">Dólar BCV</h2>
        <div className="flex gap-1">
          <button 
            onClick={shareCapture}
            disabled={loading}
            className="flex items-center justify-center rounded-xl w-10 h-10 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-all hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-2xl">share</span>
          </button>
          <button 
            onClick={refreshRate}
            disabled={loading}
            className={`flex items-center justify-center rounded-xl w-10 h-10 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-all hover:bg-zinc-200 dark:hover:bg-zinc-800 ${loading ? 'animate-spin text-primary' : ''}`}
          >
            <span className="material-symbols-outlined text-2xl">sync</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-8">
        {/* Current Rate Hero */}
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-zinc-900 dark:text-white tracking-tighter text-4xl font-black leading-tight text-center">
            {activeRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xl font-bold text-zinc-400">VES</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-md tracking-widest">Oficial</span>
            <p className="text-zinc-500 text-xs font-medium">
              {officialRate?.lastUpdate || 'Cargando...'}
            </p>
          </div>
        </div>

        {/* The Conversion Card (Capture Target) */}
        <div ref={captureRef} className="mt-8 bg-zinc-50 dark:bg-background-dark">
          {/* Header branding only for capture (hidden on web) */}
          <div className="hidden flex-col items-center mb-6 capture-visible">
             <h3 className="text-zinc-900 dark:text-white font-black text-2xl">Calculadora Dólar</h3>
             <p className="text-primary font-bold text-xs uppercase tracking-widest">Tasa: {activeRate.toFixed(2)} Bs.</p>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-[32px] border border-zinc-200/60 dark:border-border-dark p-1 relative shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 group/card overflow-hidden">
            {/* USD Segment */}
            <div className="flex flex-col p-7 pt-8 relative cursor-pointer group" onClick={() => copyToClipboard(usdAmount, CurrencyType.USD)}>
              {copyFeedback.show && copyFeedback.type === CurrencyType.USD && (
                <div className="absolute top-4 right-8 copy-feedback bg-primary text-white text-[10px] px-3 py-1 rounded-full font-black shadow-lg z-30">
                  ¡VALOR COPIADO!
                </div>
              )}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 ring-2 ring-white/10 shadow-md">
                    <img alt="US Flag" className="w-full h-full object-cover" src="https://flagcdn.com/w80/us.png" />
                  </div>
                  <span className="text-zinc-900 dark:text-white font-black text-2xl tracking-tighter">USD</span>
                </div>
                <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Dólares</span>
              </div>
              <div className="flex items-center relative">
                <input 
                  className="w-full bg-transparent border-none p-0 text-5xl font-black text-zinc-900 dark:text-white focus:ring-0 focus:outline-none placeholder:text-zinc-100 dark:placeholder:text-zinc-800"
                  type="number" 
                  step="any"
                  inputMode="decimal"
                  value={usdAmount}
                  onFocus={() => setLastFocused(CurrencyType.USD)}
                  onChange={(e) => setUsdAmount(e.target.value)}
                  placeholder="0.00"
                />
                <span className="text-primary/20 material-symbols-outlined text-4xl absolute right-0 group-hover:text-primary/40 transition-colors">account_balance_wallet</span>
              </div>
            </div>

            {/* Floating Swap Button */}
            <div className="swap-btn flex justify-center -my-9 relative z-20">
              <button 
                onClick={handleSwap}
                className="bg-primary text-white p-4.5 rounded-full shadow-[0_10px_30px_rgba(59,130,246,0.4)] border-[6px] border-zinc-50 dark:border-background-dark hover:scale-110 active:scale-90 hover:rotate-180 transition-all duration-500 ease-out"
                title="Invertir"
              >
                <span className="material-symbols-outlined text-3xl font-black">swap_vert</span>
              </button>
            </div>

            {/* VES Segment */}
            <div className="flex flex-col p-7 mt-2 pb-10 relative cursor-pointer group" onClick={() => copyToClipboard(vesAmount, CurrencyType.VES)}>
              {copyFeedback.show && copyFeedback.type === CurrencyType.VES && (
                <div className="absolute top-4 right-8 copy-feedback bg-primary text-white text-[10px] px-3 py-1 rounded-full font-black shadow-lg z-30">
                  ¡VALOR COPIADO!
                </div>
              )}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 ring-2 ring-white/10 shadow-md">
                    <img alt="Venezuela Flag" className="w-full h-full object-cover" src="https://flagcdn.com/w80/ve.png" />
                  </div>
                  <span className="text-zinc-900 dark:text-white font-black text-2xl tracking-tighter">VES</span>
                </div>
                <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Bolívares</span>
              </div>
              <div className="flex items-center justify-between">
                <input 
                  className="w-full bg-transparent border-none p-0 text-5xl font-black text-zinc-900 dark:text-white focus:ring-0 focus:outline-none placeholder:text-zinc-100 dark:placeholder:text-zinc-800"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={vesAmount}
                  onFocus={() => setLastFocused(CurrencyType.VES)}
                  onChange={(e) => setVesAmount(e.target.value)}
                  placeholder="0.00"
                />
                <span className="text-zinc-300 dark:text-zinc-700 font-black text-2xl ml-2 group-hover:text-primary transition-colors">Bs.</span>
              </div>
            </div>
            
            {/* Hidden capture footer branding */}
            <div className="hidden pb-6 text-center capture-visible">
               <p className="text-[9px] text-zinc-400 font-bold tracking-[0.3em] uppercase">Tasa Oficial Banco Central de Venezuela</p>
            </div>
          </div>
        </div>

        {/* Settings Area */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-2xl shadow-inner">
                <span className={`material-symbols-outlined ${useCustomRate ? 'text-primary' : 'text-zinc-400'} text-xl transition-colors`}>edit_attributes</span>
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-800 dark:text-zinc-100 font-black text-sm">Tasa Manual</span>
                <span className="text-zinc-500 text-[11px] font-medium tracking-tight">Usar valor personalizado</span>
              </div>
            </div>
            <button 
              onClick={() => setUseCustomRate(!useCustomRate)}
              className={`w-14 h-7 rounded-full relative flex items-center px-1 transition-all duration-500 ease-in-out ${useCustomRate ? 'bg-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-500 ${useCustomRate ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className={`bg-white dark:bg-card-dark border border-zinc-200 dark:border-border-dark rounded-3xl p-6 shadow-sm transition-all duration-500 ${useCustomRate ? 'opacity-100 translate-y-0 scale-100' : 'opacity-40 grayscale pointer-events-none translate-y-4 scale-[0.98] blur-[1px]'}`}>
            <div className="flex items-center justify-center gap-6">
              <span className="text-zinc-400 font-black text-xl">1 $ =</span>
              <div className="relative flex-1 max-w-[150px]">
                <input 
                  className="w-full bg-zinc-50 dark:bg-background-dark border-2 border-transparent focus:border-primary/30 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-black text-2xl outline-none transition-all text-center placeholder:text-zinc-200 dark:placeholder:text-zinc-800"
                  type="number"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <span className="text-zinc-400 font-black text-xl">Bs.</span>
            </div>
          </div>
        </div>

        {/* Shortcut Quick Access */}
        <div className="mt-14">
          <div className="flex items-center justify-between px-2 mb-6">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.35em]">Accesos USD</h3>
          </div>
          <div className="grid grid-cols-4 gap-4 px-1">
            {['1', '5', '10', '20'].map((val) => (
              <QuickValue key={val} value={val} onClick={() => { setLastFocused(CurrencyType.USD); setUsdAmount(parseFloat(val).toFixed(2)); }} />
            ))}
          </div>
        </div>
      </main>
      
      {/* Footer Disclaimer */}
      <footer className="mt-auto pt-10 px-12 text-center">
        <p className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.25em] font-bold leading-relaxed opacity-60">
          Valores referenciales BCV oficiales
        </p>
      </footer>

      <style>{`
        @media (max-width: 640px) {
          .capture-visible { display: none !important; }
        }
        .capture-visible { display: flex; }
      `}</style>
    </div>
  );
};

const QuickValue: React.FC<{ value: string, onClick: () => void }> = ({ value, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white dark:bg-card-dark border border-zinc-200/50 dark:border-border-dark rounded-2xl py-5 flex flex-col items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-90 shadow-sm dark:shadow-none group"
  >
    <span className="text-[9px] font-black text-zinc-400 group-hover:text-white/60 mb-1">$</span>
    <span className="text-xl font-black text-zinc-800 dark:text-zinc-200 group-hover:text-white tracking-tighter">{value}</span>
  </button>
);

export default App;
