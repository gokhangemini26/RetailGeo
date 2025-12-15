import React from 'react';
import { MapGroundingChunk } from '../types';

interface GroundingSourcesProps {
  chunks: MapGroundingChunk[];
}

export const GroundingSources: React.FC<GroundingSourcesProps> = ({ chunks }) => {
  if (!chunks || chunks.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Doğrulanmış Kaynaklar (Google Haritalar)</h4>
      <div className="flex flex-wrap gap-2">
        {chunks.map((chunk, idx) => {
          if (chunk.maps) {
            return (
              <a 
                key={idx} 
                href={chunk.maps.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition-colors"
              >
                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span className="truncate max-w-[150px]">{chunk.maps.title}</span>
              </a>
            );
          }
          if (chunk.web) {
            return (
               <a 
                key={idx} 
                href={chunk.web.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition-colors"
              >
                <span className="truncate max-w-[150px]">{chunk.web.title}</span>
              </a>
            )
          }
          return null;
        })}
      </div>
    </div>
  );
};