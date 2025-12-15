import React, { useState } from 'react';
import { AspectRatio } from '../types';
import { generateMoodBoard } from '../services/geminiService';
import { Button } from './Button';

export const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const ratios: AspectRatio[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const url = await generateMoodBoard(prompt, aspectRatio);
      setGeneratedImage(url);
    } catch (e) {
      alert("Görsel oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Mood Board Oluşturucu
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Görsel Konsept</label>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none min-h-[100px]"
              placeholder="Mağaza iç mekanını, aydınlatmayı, renkleri ve atmosferi tarif edin..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">En Boy Oranı (Aspect Ratio)</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {ratios.map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`px-2 py-1.5 rounded text-xs font-medium border transition-all ${
                    aspectRatio === r 
                      ? 'bg-brand-600 text-white border-brand-500' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleGenerate} isLoading={loading} disabled={!prompt}>
              Görsel Oluştur
            </Button>
          </div>
        </div>
      </div>

      {generatedImage && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 animate-fade-in">
             <div className="relative w-full rounded-lg overflow-hidden shadow-2xl">
                <img 
                    src={generatedImage} 
                    alt="Oluşturulan Mood Board" 
                    className="w-full h-auto object-contain max-h-[600px] bg-black"
                />
            </div>
            <div className="mt-4 flex justify-between items-center text-sm text-slate-400">
                <span>{aspectRatio} Oluşturulan Görsel</span>
                <a 
                    href={generatedImage} 
                    download={`moodboard-${aspectRatio}.png`}
                    className="text-brand-400 hover:text-brand-300 underline"
                >
                    İndir
                </a>
            </div>
        </div>
      )}
    </div>
  );
};