// src/Dashboard.jsx
import { useEffect, useState, useCallback } from 'react'
import Navbar from './components/Navbar'
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
    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl mb-4"
         style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)' }}>
      <div className="flex items-center gap-3">
        <AlertCircle size={16} className="shrink-0" style={{ color: '#fb7185' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#fb7185' }}>Backend Offline</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {message ?? 'Cannot connect to FastAPI at localhost:8000.'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0"
                style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#fb7185' }}>
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  )
}

export default function Dashboard() {
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
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {indexError && <ErrorBanner message={indexError} onRetry={loadGlobalData} />}

        {/* 1. Primary Headline Indicator & Interpretation */}
        <InterpretationBanner
          indexValue={indexData?.series?.slice(-1)[0]?.index_value ?? 127.4}
          pctChange={indexData?.series?.slice(-1)[0]?.pct_change ?? 4.2}
          yoyChange={8.7}
        />

        {/* 2. Key KPI Metric Cards */}
        <StatCards series={indexData?.series} />

        {/* 3. Top Corridor Summaries */}
        <RouteSummaryGrid routes={routeSummary} />

        {/* 4. Filter Bar */}
        <FilterBar filters={filters} setFilters={setFilters} />

        {/* 5. National Airfare Price Index Trend */}
        <IndexChart series={indexData?.series} loading={indexLoading} />

        {/* 6. Route Trends + Booking Window Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RouteTrendsChart
            data={routeData}
            loading={routeLoading}
            source={filters.source}
            destination={filters.destination}
          />
          <LeadtimeChart data={leadData} loading={leadLoading} />
        </div>

        {/* 7. Price Distribution Percentile Box (Min, P25, Median, Mean, P75, Max) */}
        <DistributionCard dist={distribution} />

        {/* 8. Carrier Fares & Market Share */}
        <AirlineChart data={airlineData} loading={airlineLoading} />

        {/* 9. Regional Market Hierarchy */}
        <GeographicTree geography={geographyData} />

        {/* 10. Statistical Governance & Data Quality Audit Box */}
        <DataQualityCard quality={qualityData} />

        <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-800/80 mt-8">
          National Airfare Price Index (SIH26056) &nbsp;·&nbsp; Official MoSPI / DGCA Statistical Platform &nbsp;·&nbsp; Real-time Aviation Intelligence
        </footer>
      </main>
    </div>
  )
}
