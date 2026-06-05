import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { MdPeople, MdTrendingUp, MdSchool, MdErrorOutline,
         MdUploadFile, MdInsights, MdAssessment, MdHistory,
         MdWorkOutline } from 'react-icons/md'
import api from '../../services/api'

const quickActions = [
  { label: 'Upload Data Model', icon: MdUploadFile, to: '/admin/upload-model',          grad: '#1a3d27' },
  { label: 'Forecasting',       icon: MdInsights,   to: '/admin/forecasting',            grad: '#1a3d27' },
  { label: 'Generate Reports',  icon: MdAssessment, to: '/admin/predict-report',         grad: '#1a3d27' },
  { label: 'View History',      icon: MdHistory,    to: '/admin/employment-comparison',  grad: '#1a3d27' },
]

const CustomDot = ({ cx, cy, payload }) =>
  payload.forecast
    ? <circle key={cx} cx={cx} cy={cy} r={6} fill="#1a3d27" stroke="#fff" strokeWidth={2} />
    : <circle key={cx} cx={cx} cy={cy} r={4} fill="#0f2d1a" stroke="#fff" strokeWidth={2} />

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const isForecast = payload[0]?.payload?.forecast
  return (
    <div className="bg-white rounded-xl px-4 py-3 text-xs" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb' }}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      <p style={{ color: isForecast ? '#1a3d27' : '#0f2d1a' }}>
        {isForecast ? '📈 Forecast: ' : 'Rate: '}
        <span className="font-bold">{payload[0].value}%</span>
      </p>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({ total_alumni: 0, employment_rate: 0, employment_rate_change: 0, graduate_success: 0, margin_of_error: 0 })
  const [employmentData, setEmploymentData] = useState([])
  const [health, setHealth] = useState(null)
  const [model, setModel] = useState('Linear Regression')
  const [predictSummary, setPredictSummary] = useState(null)
  const [predictYear, setPredictYear] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard', { params: { model } }).then(r => {
      setMetrics(r.data.metrics)
      setEmploymentData(r.data.employment_data || [])
    }).catch(() => {})

    api.get('/admin/data-health').then(r => setHealth(r.data)).catch(() => {})

    api.get('/admin/predict').then(r => {
      setPredictSummary(r.data.summary || null)
      setPredictYear(r.data.graduation_year || null)
    }).catch(() => {})
  }, [model])

  const metricCards = [
    { label: 'Total Alumni',    value: metrics.total_alumni ?? 0,     sub: 'Alumni in dataset',                  icon: MdPeople,       color: '#0f2d1a', bg: '#e6ede8' },
    { label: 'Employment Rate', value: `${metrics.employment_rate}%`, sub: `↑ ${metrics.employment_rate_change}% vs last year`, icon: MdTrendingUp, color: '#10b981', bg: '#f0fdf4' },
  ]

  const forecastYear = employmentData.find(d => d.forecast)?.year

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Overview of alumni employment data and forecasts</p>
          </div>
          <div className="flex items-center gap-3">
            
            
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metricCards.map((m) => {
            const Icon = m.icon
            return (
              <div key={m.label} className="bg-white rounded-2xl flex items-center gap-3 h-full" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '0 20px' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
                  <Icon className="text-lg" style={{ color: m.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5 truncate">{m.label}</p>
                  <p className="text-2xl font-black leading-none" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{m.sub}</p>
                </div>
              </div>
            )
          })}

          {/* Employability Prediction card — spans 2 cols to fill the gap left by removed card */}
          <div className="bg-white rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all col-span-2"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            onClick={() => navigate('/admin/predict')}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e6ede8' }}>
                  <MdWorkOutline className="text-base" style={{ color: '#0f2d1a' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Employability Prediction</p>
                  <p className="text-xs font-semibold" style={{ color: '#0f2d1a' }}>
                    {predictYear ? `Batch ${predictYear} · Latest` : 'Latest Batch'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 hidden sm:block">Click to view →</span>
            </div>
            {predictSummary ? (
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="rounded-xl p-2.5 text-center" style={{ background: '#dcfce7' }}>
                  <p className="text-2xl font-black" style={{ color: '#15803d' }}>{predictSummary.high ?? 0}</p>
                  <p className="text-[10px] font-bold text-green-700">Likely Employable</p>
                </div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: '#dbeafe' }}>
                  <p className="text-2xl font-black" style={{ color: '#1d4ed8' }}>{predictSummary.employable ?? 0}</p>
                  <p className="text-[10px] font-bold text-blue-700">Employable</p>
                </div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: '#fee2e2' }}>
                  <p className="text-2xl font-black" style={{ color: '#b91c1c' }}>{predictSummary.least ?? 0}</p>
                  <p className="text-[10px] font-bold text-red-700">Least Employable</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">No prediction data yet</p>
            )}
          </div>
        </div>

        {/* Chart + Quick Actions */}
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Employment Rate Forecast</h2>
                <p className="text-xs text-gray-400 mt-0.5">Historical trend with 1-year model projection</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Model</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none"
                >
                  <option>Linear Regression</option>
                  <option>Random Forest</option>
                  <option>Auto ARIMA (AIC search)</option>
                  <option>ARIMA (p=2, d=1, q=2)</option>
                  <option>ARIMA (p=1, d=1, q=1)</option>
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={employmentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f2d1a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f2d1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 80]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                {forecastYear && (
                  <ReferenceLine x={forecastYear} stroke="#d4e4d8" strokeDasharray="5 4"
                    label={{ value: 'Forecast', position: 'top', fontSize: 10, fill: '#1a3d27' }} />
                )}
                <Area type="monotone" dataKey="rate" stroke="#0f2d1a" strokeWidth={2.5}
                  fill="url(#rateGrad)" dot={<CustomDot />} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions */}
          <div className="w-full lg:w-56 lg:flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2.5">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button key={action.label} onClick={() => navigate(action.to)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-xs font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
                      style={{ background: action.grad }}>
                      <Icon className="text-base flex-shrink-0" />{action.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Data Health Mini Widget */}
            {health && (
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MdAssessment className="text-emerald-600" /> Data Health
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Balance</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${health.balance?.status === 'Balanced' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                      {health.balance?.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {health.metrics?.slice(0, 3).map((m, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-500">{m.field}</span>
                        <span className={m.status === 'Good' ? 'text-emerald-600' : 'text-orange-500 font-bold'}>
                          {m.missing_pct}% missing
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-gray-50">
                    <p className="text-[10px] text-gray-400 italic">Total Training Rows: <span className="font-bold text-gray-600">{health.total_rows}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
