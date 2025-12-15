
import React, { useState } from 'react';
import { AnalysisView } from './components/AnalysisView';
import { ProductAnalyzer } from './components/ProductAnalyzer';

function App() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'products'>('analysis');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/20">
              R
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              RetailGeo <span className="text-brand-400 font-light">Intelligence</span>
            </h1>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'analysis' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Konum Analizi
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'products' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ürün Analizi
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analysis' && <AnalysisView />}
        {activeTab === 'products' && <ProductAnalyzer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-8 text-center text-slate-500 text-sm">
        <p>Google Gemini 2.5 Flash ve Gemini 3 Pro (Thinking) ile güçlendirilmiştir.</p>
        <p className="mt-2 text-xs">Harita Verileri Google Maps Grounding Tool tarafından sağlanmaktadır.</p>
      </footer>
    </div>
  );
}

export default App;