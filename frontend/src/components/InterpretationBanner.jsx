// src/components/InterpretationBanner.jsx
import React from 'react'
import { TrendingUp, Info, CheckCircle2 } from 'lucide-react'

export default function InterpretationBanner({ indexValue = 127.4, pctChange = 4.2, yoyChange = 8.7 }) {
  const diffFromBase = (indexValue - 100).toFixed(1)

  return (
    <div className="rounded-2xl p-6 relative overflow-hidden"
         style={{
           background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
           border: '1px solid rgba(51, 65, 85, 0.8)',
           boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
         }}>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        {/* Primary Value */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              National Airfare Price Index (APIx)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              MoSPI / DGCA Standard
            </span>
          </div>

          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-black tracking-tight text-white font-mono">
              {indexValue.toFixed(1)}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <TrendingUp size={14} />
              +{pctChange}% vs prev month
            </div>
          </div>
        </div>

        {/* Statistical Context */}
        <div className="grid grid-cols-3 gap-4 py-3 px-5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Base Period</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">100.0 <span className="text-[10px] text-slate-400 font-normal">(2024 Base)</span></p>
          </div>
          <div className="border-l border-slate-800/80 pl-4">
            <p className="text-[11px] text-slate-400 font-medium">Current Period</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">September 2026</p>
          </div>
          <div className="border-l border-slate-800/80 pl-4">
            <p className="text-[11px] text-slate-400 font-medium">YoY Change</p>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">+{yoyChange}%</p>
          </div>
        </div>
      </div>

      {/* Human Interpretation Text */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-300">
        <Info size={14} className="text-blue-400 shrink-0" />
        <p>
          <span className="font-semibold text-white">Interpretation:</span> Airfares are approximately{' '}
          <span className="font-bold text-emerald-400">{diffFromBase}% higher</span> than the base reference period across Indian domestic corridors.
        </p>
      </div>
    </div>
  )
}
