import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from 'recharts'
import { MdShowChart, MdTrendingUp, MdInfoOutline, MdCheckCircle } from 'react-icons/md'
import api from '../../services/api'

const HORIZON_OPTIONS = ['1 Year', '2 Years', '3 Years']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  // If both rate and forecast exist on this point, it's the bridge point (first forecast year).
  // Show only the Forecast value — rate here is just a visual connector, not real new history.
  const fcVal    = payload.find(p => p.dataKey === 'forecast')?.value
  const hasBoth  = fcVal != null && payload.find(p => p.dataKey === 'rate')?.value != null
  return (
    <div className="bg-white rounded-xl px-4 py-3 text-xs shadow-lg border border-gray-100 min-w-[160px]">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map(p => {
        if (p.value == null) return null
        const isFC = p.dataKey === 'forecast'
        // On bridge point: hide the historical entry, keep forecast
        if (!isFC && hasBoth) return null
        return (
          <p key={p.dataKey} className="flex justify-between gap-3">
            <span style={{ color: isFC ? '#0f2d1a' : '#64748b' }}>{isFC ? 'Forecast' : 'Historical'}</span>
            <span className="font-bold" style={{ color: isFC ? '#0f2d1a' : '#64748b' }}>{p.value}%</span>
          </p>
        )
      })}
    </div>
  )
}

// Pick best model: highest R², but skip models whose forecast is flat
// (flat = all projected values within 1 % of each other — no useful trend)
function pickBest(metrics, projections) {
  const keys = ['lr', 'rf', 'arima']

  function isFlat(key) {
    const vals = (projections[key] || []).map(p => parseFloat(p.val)).filter(v => !isNaN(v))
    if (vals.length < 2) return false
    return Math.max(...vals) - Math.min(...vals) < 1.0
  }

  // Prefer non-flat models; fall back to all if every model is flat
  const candidates = keys.filter(k => !isFlat(k))
  const pool = candidates.length > 0 ? candidates : keys

  const r2s = pool.map(k => ({ k, v: typeof metrics[k]?.r2 === 'number' ? metrics[k].r2 : -Infinity }))
  const best = r2s.reduce((a, b) => b.v > a.v ? b : a, r2s[0])
  if (best.v > -Infinity) return best.k

  const mapes = pool.map(k => ({ k, v: typeof metrics[k]?.mape === 'number' ? metrics[k].mape : Infinity }))
  return mapes.reduce((a, b) => b.v < a.v ? b : a, mapes[0]).k
}

export default function Forecasting() {
  const [horizon, setHorizon] = useState(2)
  const [running, setRunning] = useState(false)
  const [rawData, setRawData]   = useState([])   // full chart data with lr/rf/arima keys
  const [projections, setProjections] = useState({})
  const [metrics, setMetrics]   = useState({})
  const [courseData, setCourseData] = useState([])
  const [bestKey, setBestKey]   = useState(null)

  function applyResult(r) {
    const allData = r.data.data || []
    const mets  = r.data.metrics || {}
    const projs = r.data.projections || {}
    const best  = pickBest(mets, projs)
    setRawData(allData)
    setProjections(projs)
    setMetrics(mets)
    setBestKey(best)
  }

  useEffect(() => {
    api.post('/admin/forecasting/run-all', { horizon: 3 }).then(applyResult).catch(() => {
      api.get('/admin/forecasting').then(r => setRawData(r.data.forecast_data || [])).catch(() => {})
    })
    api.get('/admin/forecasting').then(r => setCourseData(r.data.course_data || [])).catch(() => {})
  }, [])

  function runForecast(h = horizon) {
    setRunning(true)
    api.post('/admin/forecasting/run-all', { horizon: h + 1 })
      .then(applyResult).catch(() => {}).finally(() => setRunning(false))
  }

  // Build simplified chart: 'rate' (historical) + best model as 'forecast'
  const trimmed = rawData
  const lastHistIdx = trimmed.reduce((acc, d, i) => (d.rate != null ? i : acc), -1)
  const lastHistRate = lastHistIdx >= 0 ? (trimmed[lastHistIdx]?.rate ?? null) : null

  const chartData = trimmed.map((d, i) => {
    const isFirstForecast = i === lastHistIdx + 1
    return {
      year: d.year,
      // Extend solid historical line to first forecast year so lines meet at the boundary
      rate: d.rate ?? (isFirstForecast ? lastHistRate : null),
      forecast: bestKey ? (d[bestKey] ?? null) : null,
    }
  })

  const firstForecastYear = trimmed[lastHistIdx + 1]?.year || null

  // Best model projected values only
  const bestProjections = (projections[bestKey] || [])

  // Best model accuracy metrics
  const bestMetrics = metrics[bestKey] || {}
  // Detect flat data: all historical rates identical → R²=1.0 is meaningless
  const historicalRates = rawData.filter(d => !d.forecast).map(d => d.rate)
  const isFlat = historicalRates.length > 1 &&
    historicalRates.every(r => Math.abs(r - historicalRates[0]) < 0.01)
  const accuracy = (!isFlat && typeof bestMetrics.r2 === 'number')
    ? Math.round(bestMetrics.r2 * 100) : null
  const mapeVal  = typeof bestMetrics.mape === 'number' ? `±${bestMetrics.mape}%` : null

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employment Forecasting</h1>
            <p className="text-sm text-gray-400 mt-0.5">Predicted employment rate based on historical data</p>
          </div>
        </div>

        {/* Config bar */}
        <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0f2d1a' }}>Forecast Horizon</label>
              <div className="flex gap-2">
                {HORIZON_OPTIONS.map((y, i) => (
                  <button key={y} onClick={() => { setHorizon(i); runForecast(i) }}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border transition-all"
                    style={horizon === i
                      ? { background: '#0f2d1a', color: '#fff', borderColor: '#0f2d1a' }
                      : { color: '#6b7280', borderColor: '#e5e7eb' }}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={runForecast} disabled={running}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
              style={{ background: '#0f2d1a' }}>
              {running ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Running…</>
              ) : (
                <><MdShowChart className="text-base" /> Run Forecast</>
              )}
            </button>
          </div>
        </div>

        {/* Flat data warning */}
        {isFlat && historicalRates.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2 text-xs text-amber-800">
            <MdInfoOutline className="text-base flex-shrink-0 mt-0.5" />
            <span>All historical years have the same employment rate ({historicalRates[0]}%). Upload datasets with different yearly outcomes to enable meaningful trend forecasting. Forecast accuracy metric is hidden when data has no variation.</span>
          </div>
        )}

        {/* Accuracy summary pill */}
        {(accuracy !== null || mapeVal) && (
          <div className="flex gap-3 mb-5 flex-wrap">
            {accuracy !== null && (
              <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <MdCheckCircle style={{ color: '#10b981', fontSize: '18px' }} />
                <div>
                  <p className="text-xs text-gray-400">Forecast Accuracy (R²)</p>
                  <p className="text-sm font-black" style={{ color: '#0f2d1a' }}>{accuracy}%</p>
                </div>
              </div>
            )}
            {mapeVal && (
              <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <MdInfoOutline style={{ color: '#2d6a4f', fontSize: '18px' }} />
                <div>
                  <p className="text-xs text-gray-400">Margin of Error</p>
                  <p className="text-sm font-black text-gray-800">{mapeVal}</p>
                </div>
              </div>
            )}
            {bestMetrics.mae != null && (
              <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <MdInfoOutline style={{ color: '#f59e0b', fontSize: '18px' }} />
                <div>
                  <p className="text-xs text-gray-400">Mean Absolute Error</p>
                  <p className="text-sm font-black text-gray-800">{bestMetrics.mae}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main chart */}
        <div className="bg-white rounded-2xl p-6 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Employment Rate Forecast</h2>
              <p className="text-xs text-gray-400 mt-0.5">Historical data and projected trend</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#e6ede8', color: '#0f2d1a' }}>Live Data</span>
          </div>

          {/* Simple legend */}
          <div className="flex items-center gap-6 justify-center mb-3">
            <div className="flex items-center gap-1.5">
              <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="2.5" /></svg>
              <span className="text-xs font-medium text-gray-600">Historical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#0f2d1a" strokeWidth="2.5" strokeDasharray="6 3" /></svg>
              <span className="text-xs font-medium text-gray-700">Forecast</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" /></svg>
              <span className="text-xs font-medium text-gray-500">Forecast boundary</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={chartData} margin={{ top: 8, right: 24, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#64748b" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0f2d1a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0f2d1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              {firstForecastYear && (
                <ReferenceLine x={firstForecastYear} stroke="#94a3b8" strokeDasharray="5 4"
                  label={{ value: '← Historical  |  Forecast →', position: 'insideTopRight', fontSize: 10, fill: '#6b7280', fontWeight: 600, dx: -8, dy: 12 }} />
              )}
              <Area type="monotone" dataKey="rate"     stroke="#64748b" strokeWidth={2.5} fill="url(#histGrad)" dot={false} connectNulls name="Historical" legendType="none" />
              <Area type="monotone" dataKey="forecast" stroke="#0f2d1a" strokeWidth={2.5} strokeDasharray="6 3" fill="url(#fcGrad)"  dot={false} connectNulls name="Forecast"  legendType="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Projected values */}
          <div className="flex-1 bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-1.5">
              <MdTrendingUp style={{ color: '#0f2d1a' }} /> Projected Employment Rate
            </h3>
            {bestProjections.length > 0 ? (
              <div className="space-y-3">
                {bestProjections.map(row => (
                  <div key={row.year} className="flex items-center justify-between py-3 px-4 rounded-xl"
                    style={{ background: '#f8faf9' }}>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{row.year}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Projected</p>
                    </div>
                    <p className="text-2xl font-black" style={{ color: '#0f2d1a' }}>{row.val}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Run forecast to see projected values</p>
            )}
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-4 pt-3 border-t border-gray-100">
              <MdInfoOutline className="text-sm" /> Values shown as employment rate percentage
            </p>
          </div>

          {/* By Program chart */}
          <div className="w-full lg:w-96 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Employment by Program</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-bold">Latest Year Analysis</p>
              </div>
            </div>
            {/* Scrollable container for many programs */}
            <div className="flex-1 min-h-[420px] overflow-y-auto custom-scrollbar pr-2">
              <div style={{ height: `${Math.max(400, courseData.length * 45)}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseData} layout="vertical" margin={{ left: -10, right: 40, top: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                      type="category" 
                      dataKey="course" 
                      tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 700 }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={150} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 shadow-xl border border-gray-100 rounded-xl">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{payload[0].payload.course}</p>
                              <p className="text-lg font-black text-emerald-900">{payload[0].value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={20}>
                      {courseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rate > 70 ? '#0f2d1a' : entry.rate > 50 ? '#2d6a4f' : '#52b788'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-900" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">High (70%+)</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Growth</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
