import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { LocationMetrics } from '../types';

interface MetricsChartProps {
  metrics: LocationMetrics;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ metrics }) => {
  const data = [
    { subject: 'Refah (Zenginlik)', A: metrics.affluenceScore, fullMark: 100 },
    { subject: 'Trend (Gençlik)', A: metrics.trendScore, fullMark: 100 },
    { subject: 'Aile Odağı', A: metrics.familyScore, fullMark: 100 },
  ];

  return (
    <div className="h-64 w-full bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider flex-shrink-0">Demografik Radar</h3>
      <div className="flex-1 w-full min-h-0 min-w-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#475569" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Puan"
              dataKey="A"
              stroke="#6366f1"
              strokeWidth={2}
              fill="#6366f1"
              fillOpacity={0.4}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
              itemStyle={{ color: '#818cf8' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};