import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface Props {
  label: string;
  score: number;
}

function scoreColor(score: number) {
  if (score >= 80) return { stroke: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Good' };
  if (score >= 50) return { stroke: '#f59e0b', bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   label: 'Needs work' };
  return           { stroke: '#ef4444', bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     label: 'Critical' };
}

export function ScoreGauge({ label, score }: Props) {
  const { stroke, bg, border, text, label: rating } = scoreColor(score);
  const data = [{ value: score, fill: stroke }];

  return (
    <div className={`flex flex-col items-center px-6 py-5 rounded-2xl border ${bg} ${border}`}>
      <div className="relative w-24 h-24">
        <RadialBarChart
          width={96} height={96}
          cx={48} cy={48}
          innerRadius={32} outerRadius={44}
          startAngle={90} endAngle={-270}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={4} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold leading-none ${text}`}>{score}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      <p className={`text-xs mt-0.5 font-medium ${text}`}>{rating}</p>
    </div>
  );
}
