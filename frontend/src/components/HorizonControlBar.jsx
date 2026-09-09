// src/components/HorizonControlBar.jsx
import React, { useState } from 'react'
import { RefreshCw, Radio, Layers } from 'lucide-react'

export default function HorizonControlBar({ onRefresh }) {
  const [activeHorizon, setActiveHorizon] = useState('7D')
  const horizons = ['24H', '7D', '30D', '90D', 'YTD']

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 shadow-sm">
      {/* Left Status Badge */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-950 text-emerald-400 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="font-mono text-xs uppercase tracking-wider font-bold">
            API ONLINE: localhost:8000/api/v1
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-300">48 Metro & Regional Routes Synchronized</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">DGCA-FEED-08</span>
          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">GDS-RT-STREAM</span>
        </div>
      </div>

      {/* Time Horizon Segmented Control & Re-Poll Button */}
      <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
        <div className="inline-flex p-1 rounded-lg bg-slate-950 border border-slate-800">
          {horizons.map((h) => (
            <button
              key={h}
              onClick={() => setActiveHorizon(h)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                activeHorizon === h
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {h}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all text-xs font-mono font-semibold"
        >
          <RefreshCw size={14} className="text-cyan-400" />
          <span>Re-Poll</span>
        </button>
      </div>
    </div>
  )
}
