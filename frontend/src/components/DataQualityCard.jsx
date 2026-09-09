// src/components/DataQualityCard.jsx
import React from 'react'
import { ShieldCheck, Database, Layers, CheckCircle2, Clock } from 'lucide-react'

export default function DataQualityCard({ quality }) {
  if (!quality) return null

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          Data Quality & Governance Audit
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 size={12} />
          {quality.validation_rate_pct}% Valid Observations
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Collected</p>
          <p className="text-sm font-bold text-white font-mono mt-0.5">{quality.observations_collected.toLocaleString()}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Valid Records</p>
          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{quality.valid_observations.toLocaleString()}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Routes Covered</p>
          <p className="text-sm font-bold text-blue-400 font-mono mt-0.5">{quality.routes_covered}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Airlines</p>
          <p className="text-sm font-bold text-indigo-400 font-mono mt-0.5">{quality.airlines_covered}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium">OTAs Tracked</p>
          <p className="text-sm font-bold text-purple-400 font-mono mt-0.5">{quality.otas_covered}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Last Updated</p>
          <p className="text-xs font-semibold text-slate-300 mt-1 flex items-center justify-center gap-1">
            <Clock size={11} className="text-slate-400" />
            {quality.last_updated}
          </p>
        </div>
      </div>
    </div>
  )
}
