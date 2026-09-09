// src/components/RouteSummaryGrid.jsx
import React from 'react'
import { ArrowRight, Plane, TrendingUp, TrendingDown } from 'lucide-react'

export default function RouteSummaryGrid({ routes = [] }) {
  if (!routes || routes.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Plane size={15} className="text-blue-400" />
          Key DGCA Corridor Intelligence
        </h3>
        <span className="text-xs text-slate-400">Live Traffic-Weighted Basket</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {routes.map((r, i) => {
          const isPos = r.weekly_change_pct >= 0
          return (
            <div key={i}
                 className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
              {/* Header: Route Name */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {r.source} <ArrowRight size={13} className="text-blue-400" /> {r.destination}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Index {r.route_index}
                </span>
              </div>

              {/* Average Fare */}
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Avg Fare</p>
                  <p className="text-xl font-black text-white font-mono">₹{r.average_fare.toLocaleString()}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                  isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {isPos ? '+' : ''}{r.weekly_change_pct}% WoW
                </div>
              </div>

              {/* Min & Max Range */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-slate-800/60">
                <div>
                  <span className="text-slate-400">Lowest: </span>
                  <span className="font-mono font-semibold text-slate-200">₹{r.lowest_fare.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Highest: </span>
                  <span className="font-mono font-semibold text-slate-200">₹{r.highest_fare.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
