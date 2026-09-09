// src/components/DistributionCard.jsx
import React from 'react'
import { BarChart2 } from 'lucide-react'

export default function DistributionCard({ dist }) {
  if (!dist || dist.count === 0) return null

  const items = [
    { label: 'Minimum', val: dist.min, highlight: false },
    { label: '25th Percentile (P25)', val: dist.p25, highlight: false },
    { label: 'Median (P50)', val: dist.median, highlight: true },
    { label: 'Average (Mean)', val: Math.round(dist.mean), highlight: true },
    { label: '75th Percentile (P75)', val: dist.p75, highlight: false },
    { label: 'Maximum', val: dist.max, highlight: false },
  ]

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart2 size={16} className="text-indigo-400" />
          Price Distribution Statistics
        </h3>
        <span className="text-xs text-slate-400">
          Based on {dist.count.toLocaleString()} observations
        </span>
      </div>

      {/* 5-Number Visual Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {items.map((item, idx) => (
          <div key={idx}
               className={`p-3 rounded-xl border text-center transition-all ${
                 item.highlight
                   ? 'bg-indigo-500/10 border-indigo-500/30'
                   : 'bg-slate-950/60 border-slate-800/80'
               }`}>
            <p className="text-[10px] text-slate-400 font-medium truncate">{item.label}</p>
            <p className={`text-base font-black font-mono mt-1 ${
              item.highlight ? 'text-indigo-300' : 'text-white'
            }`}>
              ₹{item.val.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-400 italic">
        * Displaying full percentile spectrum eliminates outlier distortion caused by premium last-minute bookings.
      </p>
    </div>
  )
}
