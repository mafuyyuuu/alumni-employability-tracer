import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from 'recharts'
import { MdShowChart, MdTrendingUp, MdInfoOutline } from 'react-icons/md'
import api from '../../services/api'

const years = ['1 Year (2024)', '2 Years (2024–2025)', '3 Years (2024–2026)']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const isForecast = payload[0]?.payload?.forecast
  return (
    <div className="bg-white rounded-xl px-4 py-3 text-xs shadow-lg border border-gray-100">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      <p style={{ color: isForecast ? '#52b788' : '#2d6a4f' }}>
        {isForecast ? 'Forecast: ' : 'Actual: '}
        <span className="font-bold">{payload[0].value}%</span>
      </p>
    </div>
  )
}

export default function Forecasting() {
  const [horizon, setHorizon] = useState(2)
  const [model, setModel] = useState('Linear Regression')
  const [modelUsed, setModelUsed] = useState('—')
  const [running, setRunning] = useState(false)
  const [chartData, setChartData] = useState([])
  const [courseData, setCourseData] = useState([])
  const [projected, setProjected] = useState([])
  const [metrics, setMetrics] = useState({ mae: '—', rmse: '—', mape: '—', r2: '—' })

  useEffect(() => {
    api.get('/admin/forecasting').then(r => {
      setChartData(r.data.forecast_data || [])
      setCourseData(r.data.course_data || [])
      setProjected(r.data.projected_values || [])
      setMetrics(r.data.model_metrics || {})
      setModelUsed(r.data.model_used || '—')
    }).catch(() => {})
  }, [])

  function runForecast() {
    setRunning(true)
    api.post('/admin/forecasting/run', { horizon: horizon + 1, model }).then(r => {
      setChartData(r.data.data || [])
      setProjected(r.data.forecast_values || [])
      setModelUsed(r.data.model_used || model)
      if (r.data.metrics) {
        setMetrics({
          mae: r.data.metrics.mae, rmse: r.data.metrics.rmse,
          mape: `${r.data.metrics.mape}%`, r2: r.data.metrics.r2,
        })
      }
    }).catch(() => {}).finally(() => setRunning(false))
  }

  const displayData = horizon === 0
    ? chartData.slice(0, 7) : horizon === 1
    ? chartData.slice(0, 8) : chartData

  const firstForecastYear = chartData.find(d => d.forecast)?.year

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Forecasting</h1>
            <p className="text-sm text-gray-400 mt-0.5">Linear Regression-based employment rate predictions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><p className="text-xs font-semibold text-gray-700">Admin</p><p className="text-xs text-gray-400">Administrator</p></div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#2d6a4f' }}>A</div>
          </div>
        </div>

        {/* Config + Run */}
        <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-bold text-gray-900 mb-4">Forecast Configuration</h2>
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Model scope:</span> This page forecasts <span className="font-semibold">employment rate over time</span>,
              so it uses ARIMA time-series variants. Random Forest and Logistic Regression are used in
              employability classification for individual alumni, not trend forecasting.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#2d6a4f' }}>Forecast Horizon</label>
              <div className="flex gap-2">
                {years.map((y, i) => (
                  <button key={y} onClick={() => setHorizon(i)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border transition-all"
                    style={horizon === i ? { background: '#2d6a4f', color: '#fff', borderColor: '#2d6a4f' } : { color: '#6b7280', borderColor: '#e5e7eb' }}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#2d6a4f' }}>Model</label>
              <select value={model} onChange={e => setModel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none">
                <option>Linear Regression</option>
                <option>Auto ARIMA (AIC search)</option>
                <option>ARIMA (p=2, d=1, q=2)</option>
                <option>ARIMA (p=1, d=1, q=1)</option>
                <option>ARIMA (p=3, d=1, q=1)</option>
              </select>
            </div>
            <button onClick={runForecast} disabled={running}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
              style={{ background: '#2d6a4f' }}>
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

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Main chart */}
          <div className="flex-1 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Employment Rate Forecast</h2>
                <p className="text-xs text-gray-400 mt-0.5">Historical + projected trend</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#f0faf5', color: '#2d6a4f' }}>Live Data</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#eef2ff', color: '#4338ca' }}>
                  {modelUsed}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 90]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                {firstForecastYear && (
                  <ReferenceLine x={firstForecastYear} stroke="#d1fae5" strokeDasharray="5 4"
                    label={{ value: 'Forecast →', position: 'top', fontSize: 10, fill: '#52b788' }} />
                )}
                <Area type="monotone" dataKey="rate" stroke="#2d6a4f" strokeWidth={2.5} fill="url(#fg)"
                  dot={({ cx, cy, payload }) => payload.forecast
                    ? <circle key={cx} cx={cx} cy={cy} r={5} fill="#52b788" stroke="#fff" strokeWidth={2} />
                    : <circle key={cx} cx={cx} cy={cy} r={4} fill="#2d6a4f" stroke="#fff" strokeWidth={2} />}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-64 space-y-4">
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                <MdTrendingUp style={{ color: '#2d6a4f' }} /> Projected Values
              </h3>
              <div className="space-y-2.5">
                {projected.map(r => (
                  <div key={r.year} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{r.year} Forecast</span>
                    <span className="text-xs font-bold" style={{ color: '#2d6a4f' }}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MdInfoOutline className="text-sm" /> Confidence: ±{metrics.mape || '1.1%'}
                </p>
              </div>
            </div>

            {/* By course chart */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-xs font-bold text-gray-900 mb-3">By Program (Latest Year)</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={courseData} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="course" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Bar dataKey="rate" fill="#2d6a4f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
