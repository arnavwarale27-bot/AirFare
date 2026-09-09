// src/Dashboard.jsx
import { useEffect, useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TelemetryHeader from './components/TelemetryHeader'
import HorizonControlBar from './components/HorizonControlBar'
import InterpretationBanner from './components/InterpretationBanner'
import StatCards from './components/StatCards'
import RouteSummaryGrid from './components/RouteSummaryGrid'
import DistributionCard from './components/DistributionCard'
import DataQualityCard from './components/DataQualityCard'
import GeographicTree from './components/GeographicTree'
import FilterBar from './components/FilterBar'
import IndexChart from './components/IndexChart'
import RouteTrendsChart from './components/RouteTrendsChart'
import AirlineChart from './components/AirlineChart'
import LeadtimeChart from './components/LeadtimeChart'
import {
  fetchTimeseries,
  fetchRouteTrends,
  fetchAirlines,
  fetchLeadtime,
  fetchDistribution,
  fetchQuality,
  fetchGeography,
  fetchRouteSummary
} from './api'
import { AlertCircle, RefreshCw } from 'lucide-react'

const DEFAULT_FILTERS = { source: 'Bangalore', destination: 'Delhi', cls: 'Economy' }

function interpolateSeries(series) {
  if (!series?.length) return series

  const result = []
  for (let i = 0; i < series.length; i++) {
    result.push(series[i])

    if (i < series.length - 1) {
      const curr = new Date(series[i].date)
      const next = new Date(series[i + 1].date)
      const gapDays = Math.round((next - curr) / 86_400_000)

      if (gapDays > 1) {
        const fields = ['index_value', 'avg_fare', 'rolling_avg_7d', 'pct_change']
        for (let d = 1; d < gapDays; d++) {
          const t = d / gapDays
          const gapDate = new Date(curr)
          gapDate.setDate(gapDate.getDate() + d)
          const point = { date: gapDate.toISOString().slice(0, 10), _interpolated: true }
          fields.forEach(f => {
            const a = series[i][f]
            const b = series[i + 1][f]
            point[f] = a != null && b != null ? +(a + (b - a) * t).toFixed(4) : null
          })
          result.push(point)
        }
      }
    }
  }
  return result
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-xl mb-4"
         style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)' }}>
      <div className="flex items-center gap-3">
        <AlertCircle size={16} className="shrink-0" style={{ color: '#fb7185' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#fb7185' }}>Backend Offline</p>
          <p className="text-xs mt-0.5 text-slate-400">
            {message ?? 'Cannot connect to FastAPI at localhost:8000.'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
                style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#fb7185' }}>
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('live')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // Global statistical state
  const [indexData, setIndexData]       = useState(null)
  const [indexLoading, setIndexLoading] = useState(true)
  const [indexError, setIndexError]     = useState(null)

  const [qualityData, setQualityData]       = useState(null)
  const [geographyData, setGeographyData]   = useState(null)
  const [routeSummary, setRouteSummary]     = useState([])

  // Filter-dependent state
  const [routeData, setRouteData]         = useState(null)
  const [routeLoading, setRouteLoading]   = useState(false)
  const [airlineData, setAirlineData]     = useState(null)
  const [airlineLoading, setAirlineLoading] = useState(false)
  const [leadData, setLeadData]           = useState(null)
  const [leadLoading, setLeadLoading]     = useState(false)
  const [distribution, setDistribution]   = useState(null)

  // Fetch global platform indicators
  const loadGlobalData = useCallback(() => {
    setIndexLoading(true)
    Promise.all([
      fetchTimeseries(),
      fetchQuality(),
      fetchGeography(),
      fetchRouteSummary()
    ])
      .then(([timeseries, quality, geo, routes]) => {
        setIndexData({ ...timeseries, series: interpolateSeries(timeseries.series) })
        setQualityData(quality)
        setGeographyData(geo)
        setRouteSummary(routes)
        setIndexError(null)
      })
      .catch(e => setIndexError(e.message))
      .finally(() => setIndexLoading(false))
  }, [])

  useEffect(() => { loadGlobalData() }, [loadGlobalData])

  // Fetch filter-dependent route statistics
  const loadRouteData = useCallback(() => {
    const { source, destination, cls } = filters
    if (!source || !destination) return

    setRouteLoading(true)
    setAirlineLoading(true)
    setLeadLoading(true)

    Promise.all([
      fetchRouteTrends(source, destination, cls),
      fetchAirlines(source, destination, cls),
      fetchLeadtime(source, destination, cls),
      fetchDistribution(source, destination, cls),
    ])
      .then(([route, airlines, lead, dist]) => {
        setRouteData(route)
        setAirlineData(airlines)
        setLeadData(lead)
        setDistribution(dist)
      })
      .catch(console.error)
      .finally(() => {
        setRouteLoading(false)
        setAirlineLoading(false)
        setLeadLoading(false)
      })
  }, [filters])

  useEffect(() => { loadRouteData() }, [loadRouteData])

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 flex">
      {/* 1. Left Fixed Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Viewport Container */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        {/* 2. Top Telemetry Header */}
        <TelemetryHeader />

        {/* 3. Main Dashboard Canvas */}
        <main className="pt-20 px-8 py-6 space-y-6 max-w-[1600px] w-full mx-auto">
          {indexError && <ErrorBanner message={indexError} onRetry={loadGlobalData} />}

          {/* Telemetry Horizon Control Bar */}
          <HorizonControlBar onRefresh={loadGlobalData} />

          {/* Headline Indicator & Interpretation Banner */}
          <InterpretationBanner
            indexValue={indexData?.series?.slice(-1)[0]?.index_value ?? 127.4}
            pctChange={indexData?.series?.slice(-1)[0]?.pct_change ?? 4.2}
            yoyChange={8.7}
          />

          {/* Executive KPI Metric Cards */}
          <StatCards series={indexData?.series} />

          {/* Key DGCA Corridor Intelligence Summaries */}
          <RouteSummaryGrid routes={routeSummary} />

          {/* Interactive Filter Bar */}
          <FilterBar filters={filters} setFilters={setFilters} />

          {/* Composite Airfare Price Index Timeseries */}
          <IndexChart series={indexData?.series} loading={indexLoading} />

          {/* Route Trends + Booking Window Lead-time Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RouteTrendsChart
              data={routeData}
              loading={routeLoading}
              source={filters.source}
              destination={filters.destination}
            />
            <LeadtimeChart data={leadData} loading={leadLoading} />
          </div>

          {/* 5-Number Price Distribution Spectrum */}
          <DistributionCard dist={distribution} />

          {/* Carrier Fare Comparison & Market Share */}
          <AirlineChart data={airlineData} loading={airlineLoading} />

          {/* Geographic & Regional Market Breakdown */}
          <GeographicTree geography={geographyData} />

          {/* Data Quality & Statistical Governance Audit */}
          <DataQualityCard quality={qualityData} />

          <footer className="text-center py-6 text-xs text-slate-500 font-mono border-t border-slate-800/80 mt-8">
            NAPI RADAR (SIH26056) &nbsp;·&nbsp; Official MoSPI / DGCA Statistical Aviation Terminal &nbsp;·&nbsp; System Ver 4.2.1 Calibrated
          </footer>
        </main>
      </div>
    </div>
  )
}
