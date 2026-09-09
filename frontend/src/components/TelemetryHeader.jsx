// src/components/TelemetryHeader.jsx
import React, { useState, useEffect } from 'react'
import { Plane, ShieldCheck, User, Clock, Radio } from 'lucide-react'

export default function TelemetryHeader() {
  const [timeStr, setTimeStr] = useState('')
  const [utcStr, setUtcStr] = useState('')

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-IN', { hour12: false }))
      setUtcStr(now.toISOString().slice(11, 19))
    }
    updateClocks()
    const timer = setInterval(updateClocks, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 z-40 flex items-center justify-between px-6">
      {/* Title & Badge */}
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Plane size={18} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-bold text-white tracking-tight">
              National Airfare Price Index
            </span>
            <span className="font-mono text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 uppercase font-semibold">
              SIH26056
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Real-time domestic fare analytics & CPI augmentation — India
          </span>
        </div>
      </div>

      {/* Live Telemetry & Clocks */}
      <div className="flex items-center gap-6">
        {/* Live Feed Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-wider">LIVE FEED</span>
          <span className="text-slate-600 text-xs">•</span>
          <span className="font-mono text-[10px] text-slate-300">120ms</span>
        </div>

        {/* Real-time UTC / IST Clocks */}
        <div className="hidden lg:flex flex-col text-right font-mono text-xs leading-tight">
          <span className="text-slate-200 font-semibold">{timeStr} <span className="text-slate-500">IST</span></span>
          <span className="text-slate-400 text-[10px]">{utcStr} <span className="text-slate-500">UTC</span></span>
        </div>

        {/* User Icon */}
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
          <User size={16} />
        </div>
      </div>
    </header>
  )
}
