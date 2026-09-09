// src/components/Sidebar.jsx
import React from 'react'
import {
  Activity,
  BarChart3,
  Flame,
  Globe,
  Radio,
  Sliders,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  Layers
} from 'lucide-react'

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'live', label: 'Live Terminal', icon: Activity },
    { id: 'route-matrix', label: 'Route Matrix', icon: Globe },
    { id: 'cpi', label: 'CPI Correlation', icon: TrendingUp },
    { id: 'lead', label: 'Lead Forecast', icon: BarChart3 },
  ]

  const intelItems = [
    { id: 'atf', label: 'ATF Yields', icon: Flame },
    { id: 'alerts', label: 'Anomaly Alerts', icon: Zap },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-950 border-r border-slate-800/80 z-50 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Radar Logo Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 glow-cyan">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-sm text-white tracking-tight uppercase font-bold flex items-center gap-1.5">
              NAPI RADAR
            </span>
            <span className="font-mono text-[10px] text-cyan-400 font-medium tracking-wider">
              SIH26056 CORE
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-4">
          <div>
            <div className="px-3 py-1 font-mono text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Analytics Terminals
            </div>
            <nav className="flex flex-col gap-1 mt-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 py-1 font-mono text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Intelligence
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {intelItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Engine Status & System Info */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 rounded-md border border-slate-800">
          <span className="font-mono text-[10px] text-slate-400">ENGINE STATE</span>
          <span className="font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            NOMINAL
          </span>
        </div>
        <div className="px-2 text-slate-500 font-mono text-[10px] flex items-center justify-between">
          <span>SYS VER 4.2.1</span>
          <span className="text-cyan-400 font-semibold">CALIBRATED</span>
        </div>
      </div>
    </aside>
  )
}
