// src/components/GeographicTree.jsx
import React from 'react'
import { MapPin, Globe } from 'lucide-react'

export default function GeographicTree({ geography }) {
  if (!geography || !geography.regions) return null

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Globe size={16} className="text-cyan-400" />
          Geographic & Regional Market Hierarchy
        </h3>
        <span className="text-xs text-slate-400">National Index = {geography.national_index}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {geography.regions.map((reg, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <MapPin size={13} className="text-cyan-400" /> {reg.region} Region
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                Index {reg.region_index}
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-[11px] text-slate-400">Avg Fare</span>
              <span className="text-base font-bold text-white font-mono">₹{reg.average_fare.toLocaleString()}</span>
            </div>

            <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-slate-800/60">
              Cities: {reg.cities.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
