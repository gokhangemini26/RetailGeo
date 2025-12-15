import React, { useState, useRef } from 'react';
import { ProductDNA, SegmentType, StoreMatchResult } from '../types';
import { analyzeProductDna } from '../services/geminiService';
import { getStoredStores } from '../services/storageService';
import { Button } from './Button';

export const ProductAnalyzer: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductDNA | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [storeMatches, setStoreMatches] = useState<StoreMatchResult[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert URL or File to Base64 (minus prefix) and MIME type for Gemini
  const processImage = async (source: string | File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise(async (resolve, reject) => {
      if (typeof source === 'string') {
        try {
            let blob: Blob;
            try {
                // Try direct fetch first
                const res = await fetch(source);
                if (!res.ok) throw new Error("Direct fetch failed");
                blob = await res.blob();
            } catch (directError) {
                console.log("Direct fetch failed, trying CORS proxy...", directError);
                // Fallback to CORS proxy (using allorigins.win)
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error("Proxy fetch failed");
                blob = await res.blob();
            }

             const reader = new FileReader();
             reader.onloadend = () => {
                 const result = reader.result as string;
                 // reader.result is like "data:image/jpeg;base64,....."
                 const base64 = result.split(',')[1];
                 const mimeType = result.match(/:(.*?);/)?.[1] || 'image/jpeg';
                 resolve({ base64, mimeType });
             }
             reader.onerror = () => reject("Görsel verisi okunamadı.");
             reader.readAsDataURL(blob);

        } catch (e) {
            console.error(e);
            reject("Görsel URL'den çekilemedi. Web sitesi erişime izin vermiyor. Lütfen görseli bilgisayarınıza indirip 'Dosya Yükle' seçeneğini kullanın.");
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          const mimeType = result.match(/:(.*?);/)?.[1] || 'image/jpeg';
          resolve({ base64, mimeType });
        };
        reader.readAsDataURL(source);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewBase64(reader.result as string);
        setImageUrl(''); // Clear URL input if file is selected
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateStoreMatches = (productAnalysis: ProductDNA) => {
    const stores = getStoredStores();
    if (stores.length === 0) return;

    const matches: StoreMatchResult[] = stores.map(store => {
        let fitScore = 0;
        let fitLabel: StoreMatchResult['fitLabel'] = 'Uyumsuz';
        let reason = '';

        // 1. Direct Persona Match
        if (store.segment === productAnalysis.bestMatchPersona) {
            fitScore = productAnalysis.matchScore; // High fit, use the product's confidence
            fitLabel = fitScore > 85 ? 'Mükemmel' : 'Yüksek';
            reason = `Mağaza ve ürün aynı '${store.segment}' segmentinde.`;
        } 
        // 2. Partial Logic (Simplified for demonstration)
        else if (
            (store.segment === SegmentType.URBAN_PROFESSIONAL && productAnalysis.bestMatchPersona === SegmentType.YOUNG_TRENDY) ||
            (store.segment === SegmentType.YOUNG_TRENDY && productAnalysis.bestMatchPersona === SegmentType.URBAN_PROFESSIONAL)
        ) {
            fitScore = 50;
            fitLabel = 'Orta';
            reason = 'Segmentler arası kısmi geçişkenlik (Şehirli/Genç).';
        } else {
            fitScore = 20;
            fitLabel = 'Düşük';
            reason = `Mağaza segmenti (${store.segment}) ürün hedefiyle uyuşmuyor.`;
        }

        return { store, fitScore, fitLabel, reason };
    });

    // Sort by score descending
    matches.sort((a, b) => b.fitScore - a.fitScore);
    setStoreMatches(matches);
  };

  const handleAnalyze = async () => {
    if ((!imageUrl && !previewBase64) || !price) {
        alert("Lütfen bir görsel yükleyin veya URL girin, ve fiyatı belirtin.");
        return;
    }
    setLoading(true);
    setResult(null);
    setStoreMatches([]);

    try {
      let imageData: { base64: string, mimeType: string };

      if (previewBase64) {
         // Extract from the already loaded preview
         const base64 = previewBase64.split(',')[1];
         const mimeType = previewBase64.match(/:(.*?);/)?.[1] || 'image/jpeg';
         imageData = { base64, mimeType };
      } else {
         // Trying to fetch the URL provided
         imageData = await processImage(imageUrl);
      }

      console.log("Analyzing with MIME:", imageData.mimeType);
      const analysis = await analyzeProductDna(imageData.base64, imageData.mimeType, Number(price));
      setResult(analysis);
      
      // After analysis, check stored stores
      calculateStoreMatches(analysis);

    } catch (error: any) {
      console.error(error);
      const msg = error.message || error.toString();
      alert(`Analiz sırasında bir hata oluştu:\n\n${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const getPersonaBadgeColor = (type: SegmentType) => {
    switch (type) {
      case SegmentType.URBAN_PROFESSIONAL: return "bg-emerald-900/50 text-emerald-300 border-emerald-700";
      case SegmentType.YOUNG_TRENDY: return "bg-purple-900/50 text-purple-300 border-purple-700";
      case SegmentType.FAMILY_RESIDENTIAL: return "bg-blue-900/50 text-blue-300 border-blue-700";
      default: return "bg-slate-700 text-slate-300";
    }
  };

  const getFitLabelColor = (label: string) => {
      switch(label) {
          case 'Mükemmel': return 'text-green-400';
          case 'Yüksek': return 'text-emerald-400';
          case 'Orta': return 'text-yellow-400';
          case 'Düşük': return 'text-orange-400';
          default: return 'text-red-400';
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input / Simulated Scraper */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Ürün Veri Girişi (Scraper)
            </h2>
            
            <div className="space-y-4">
               {/* Image Upload Area */}
               <div 
                  className="border-2 border-dashed border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors relative overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
               >
                  {previewBase64 ? (
                     <img src={previewBase64} alt="Preview" className="h-48 object-contain z-10" />
                  ) : imageUrl ? (
                     <img src={imageUrl} alt="Preview" className="h-48 object-contain z-10" onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x400?text=Gorsel+Hata')} />
                  ) : (
                    <div className="text-center z-10">
                        <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-1 text-sm text-slate-400">Görsel Yüklemek için Tıklayın</p>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-400 mb-1">Veya Görsel URL'i yapıştırın</label>
                 <input 
                    type="text" 
                    value={imageUrl} 
                    onChange={(e) => { setImageUrl(e.target.value); setPreviewBase64(null); }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="https://example.com/jacket.jpg"
                 />
                 <p className="text-xs text-slate-500 mt-1">Not: URL kullanırken hata alırsanız lütfen görseli indirip yukarıdan dosya olarak yükleyin.</p>
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-400 mb-1">Ürün Fiyatı (TL)</label>
                 <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="Örn: 2500"
                 />
               </div>

               <Button onClick={handleAnalyze} isLoading={loading} className="w-full mt-4">
                 DNA Analizini Başlat
               </Button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis Results */}
        <div className="lg:col-span-7 space-y-6">
           {result ? (
             <>
             <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        Ürün DNA Raporu
                    </h2>
                    <span className="px-3 py-1 rounded-full bg-slate-700 text-xs font-mono text-slate-300">
                        AI Confidence: High
                    </span>
                </div>

                <div className="space-y-6">
                    {/* Match Result */}
                    <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700">
                        <div className="text-sm text-slate-400 mb-2 uppercase tracking-wide">En Uygun Mağaza Personası</div>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-2 rounded-lg border font-bold text-lg ${getPersonaBadgeColor(result.bestMatchPersona)}`}>
                                {result.bestMatchPersona}
                            </div>
                            <div className="flex items-center gap-1 text-slate-300">
                                <span className="text-2xl font-bold text-green-400">%{result.matchScore}</span>
                                <span className="text-sm text-slate-500">Uyum Skoru</span>
                            </div>
                        </div>
                        <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                            {result.analysisReasoning}
                        </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-700/20 rounded-lg">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Stil Etiketleri</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.styleTags.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-700 text-slate-200 text-xs rounded">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-700/20 rounded-lg">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Algılanan Kalite</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{result.perceivedQuality}</span>
                            </div>
                        </div>
                    </div>

                    {/* Color Palette */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Renk Paleti</h4>
                        <div className="flex gap-2">
                            {result.colorPalette.map((color, i) => (
                                <div key={i} className="px-3 py-1.5 bg-slate-700 rounded text-xs text-slate-200">
                                    {color}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>

             {/* STORE MATCHING REPORT */}
             <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl animate-fade-in">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Mağaza Dağıtım Önerileri
                 </h2>
                 
                 {storeMatches.length > 0 ? (
                     <div className="space-y-3">
                         <div className="text-xs text-slate-400 mb-2">Veritabanındaki mağazalar uyum skoruna göre sıralanmıştır.</div>
                         {storeMatches.map((match, idx) => (
                             <div key={idx} className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                 <div>
                                     <div className="flex items-center gap-2">
                                         <h4 className="font-bold text-white">{match.store.name}</h4>
                                         <span className={`text-xs px-2 py-0.5 rounded border border-slate-700 ${getPersonaBadgeColor(match.store.segment)}`}>
                                             {match.store.segment}
                                         </span>
                                     </div>
                                     <p className="text-xs text-slate-500 mt-1">{match.store.address}</p>
                                     <p className="text-xs text-slate-400 mt-2">{match.reason}</p>
                                 </div>
                                 <div className="flex items-center gap-4 flex-shrink-0">
                                     <div className="text-right">
                                         <div className={`text-sm font-bold ${getFitLabelColor(match.fitLabel)}`}>{match.fitLabel} Uyum</div>
                                         <div className="text-xs text-slate-500">Skor: {match.fitScore}/100</div>
                                     </div>
                                     <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                                         <div className={`h-full ${match.fitScore > 80 ? 'bg-green-500' : match.fitScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${match.fitScore}%`}}></div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                         <p className="text-slate-400 text-sm">Veritabanında kayıtlı mağaza bulunamadı.</p>
                         <p className="text-slate-500 text-xs mt-1">Önce 'Konum Analizi' sekmesinden mağaza ekleyin.</p>
                     </div>
                 )}
             </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl p-12">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Veri girişi yapın ve analizi başlatın.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};