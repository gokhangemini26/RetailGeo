import React, { useState } from 'react';
import { AnalysisResult, SegmentType, RecommendedProduct } from '../types';
import { gatherLocationData, analyzeStrategicFit, generateProductRecommendations } from '../services/geminiService';
import { saveStoreToDatabase } from '../services/storageService';
import { MetricsChart } from './MetricsChart';
import { GroundingSources } from './GroundingSources';
import { Button } from './Button';
import ReactMarkdown from 'react-markdown';

export const AnalysisView: React.FC = () => {
  const [address, setAddress] = useState('');
  const [step, setStep] = useState<'idle' | 'gathering' | 'analyzing' | 'complete'>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dbStatus, setDbStatus] = useState<string>('');
  
  // Product Recommendation State
  const [brandUrl, setBrandUrl] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!address) return;
    setStep('gathering');
    setResult(null);
    setRecommendations([]);
    setBrandUrl('');
    setDbStatus('');

    try {
      // Step 1: Grounding with Maps
      const locationData = await gatherLocationData(address);
      
      setStep('analyzing');
      // Step 2: Thinking with Pro Model
      const metrics = await analyzeStrategicFit(locationData.text);

      const finalResult: AnalysisResult = {
        locationName: address,
        rawMapData: locationData.text,
        groundingChunks: locationData.chunks,
        metrics: metrics,
        productStrategy: metrics.productStrategy
      };

      setResult(finalResult);
      
      // Save to Local DB
      saveStoreToDatabase(finalResult);
      setDbStatus('Mağaza veritabanına başarıyla kaydedildi.');
      
      setStep('complete');

    } catch (error: any) {
      console.error("Analiz Hatası:", error);
      let errorMessage = "Bilinmeyen bir hata oluştu.";
      if (error && error.message) {
        errorMessage = error.message;
      }
      
      alert(`Analiz başarısız oldu:\n\n${errorMessage}\n\nLütfen API anahtarınızın tanımlı olduğundan ve internet bağlantınızın çalıştığından emin olun.`);
      setStep('idle');
    }
  };

  const handleFetchProducts = async () => {
      if (!result || !brandUrl) return;
      setRecLoading(true);
      try {
          const prods = await generateProductRecommendations(result.metrics.dominantSegment, brandUrl);
          setRecommendations(prods);
      } catch (e: any) {
          console.error(e);
          alert(`Ürünler getirilemedi: ${e.message || "Bilinmeyen hata"}`);
      } finally {
          setRecLoading(false);
      }
  }

  const getSegmentColor = (seg: SegmentType) => {
    switch (seg) {
        case SegmentType.URBAN_PROFESSIONAL: return "text-emerald-400";
        case SegmentType.YOUNG_TRENDY: return "text-purple-400";
        case SegmentType.FAMILY_RESIDENTIAL: return "text-blue-400";
        default: return "text-slate-400";
    }
  }

  // Group products by category
  const groupedProducts = {
    'Üst Giyim': recommendations.filter(p => p.category === 'Üst Giyim'),
    'Alt Giyim': recommendations.filter(p => p.category === 'Alt Giyim'),
    'Aksesuar': recommendations.filter(p => p.category === 'Aksesuar'),
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Input Section */}
      <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6">Konum Analizi</h2>
        <div className="flex flex-col sm:flex-row gap-4">
            <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Mağaza adresini girin (örn: Bağdat Caddesi, İstanbul)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder-slate-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button 
                onClick={handleAnalyze} 
                isLoading={step === 'gathering' || step === 'analyzing'}
                className="py-3 px-8 text-lg"
            >
                {step === 'gathering' 
                  ? 'Haritalar Taranıyor...' 
                  : step === 'analyzing' 
                    ? 'Puanlar Hesaplanıyor...' 
                    : step === 'complete' 
                      ? 'Yeniden Analiz Et' 
                      : 'Konumu Analiz Et'}
            </Button>
        </div>
      </div>

      {/* Results Section */}
      {result && step === 'complete' && (
        <div className="animate-fade-in space-y-6">
            
            {/* Success Toast */}
            {dbStatus && (
                <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {dbStatus}
                </div>
            )}

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="md:col-span-1">
                    <MetricsChart metrics={result.metrics} />
                </div>

                {/* Persona Card */}
                <div className="md:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 p-6 flex flex-col justify-center">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Baskın Persona</h3>
                    <div className={`text-4xl font-bold mb-4 ${getSegmentColor(result.metrics.dominantSegment)}`}>
                        {result.metrics.dominantSegment}
                    </div>
                    <p className="text-slate-300 leading-relaxed italic">
                        "{result.metrics.reasoning}"
                    </p>
                    <GroundingSources chunks={result.groundingChunks} />
                </div>
            </div>

            {/* Strategy & Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                         <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Ürün Dağıtım Stratejisi
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                        <ReactMarkdown>{result.productStrategy}</ReactMarkdown>
                    </div>
                </div>

                {/* Web Scraping / Product Matching Section */}
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col h-[600px]">
                    <div className="mb-4 flex-shrink-0">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                             <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Akıllı Envanter Eşleştirme
                        </h3>
                        <p className="text-xs text-slate-400">Marka web sitesini girin, AI bu mağazaya en uygun 25+ ürünü seçsin.</p>
                    </div>
                    
                    <div className="flex gap-2 mb-4 flex-shrink-0">
                        <input 
                            type="text" 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500"
                            placeholder="örn: www.zara.com/tr"
                            value={brandUrl}
                            onChange={(e) => setBrandUrl(e.target.value)}
                        />
                        <Button size="sm" onClick={handleFetchProducts} isLoading={recLoading} disabled={!brandUrl}>
                            Ürünleri Getir
                        </Button>
                    </div>

                    <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 p-2 overflow-y-auto custom-scrollbar">
                        {recLoading ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                                 <svg className="animate-spin h-8 w-8 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 <p>Marka koleksiyonu analiz ediliyor...</p>
                                 <p>25+ ürün persona ile eşleştiriliyor...</p>
                             </div>
                        ) : recommendations.length > 0 ? (
                            <div className="space-y-6 p-2">
                                {Object.entries(groupedProducts).map(([category, products]) => (
                                    products.length > 0 && (
                                        <div key={category}>
                                            <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-1 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                                                {category} ({products.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {products.map((item, idx) => (
                                                    <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700 flex gap-3 hover:bg-slate-750 transition-colors">
                                                        <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center flex-shrink-0 text-xl select-none">
                                                            {category === 'Aksesuar' ? '👜' : category === 'Alt Giyim' ? '👖' : '👕'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="text-sm font-medium text-white truncate pr-2">{item.name}</h4>
                                                                <span className="text-xs font-bold text-green-400 whitespace-nowrap">%{item.matchScore}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mb-1">{item.estimatedPrice}</div>
                                                            <p className="text-xs text-slate-400 leading-snug">{item.reason}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                                {recommendations.length === 0 && <div className="text-slate-500 text-center text-xs">Ürün bulunamadı.</div>}
                            </div>
                        ) : (
                             <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center px-4">
                                 Henüz ürün seçilmedi. Bir URL girin ve "Ürünleri Getir" butonuna tıklayın.
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};