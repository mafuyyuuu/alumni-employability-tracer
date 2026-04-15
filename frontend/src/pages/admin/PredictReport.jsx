import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdAssessment, MdDownload, MdCheckCircle, MdPictureAsPdf, MdTableChart } from 'react-icons/md'
import api from '../../services/api'

export default function PredictReport() {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportType, setReportType] = useState('PDF')
  const [yearRange, setYearRange] = useState('2019–2024')
  const [model, setModel] = useState('Linear Regression')
  const [reports, setReports] = useState([])
  const [metrics, setMetrics] = useState({ mae: '—', rmse: '—', mape: '—', r2: '—' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/predict-report').then(r => {
      setReports(r.data.reports || [])
      if (r.data.metrics) setMetrics(r.data.metrics)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function generate() {
    setGenerating(true)
    setGenerated(false)
    try {
      const r = await api.post('/admin/predict-report/generate', { type: reportType, year_range: yearRange, model })
      if (r.data.report) setReports(prev => [r.data.report, ...prev])
      if (r.data.metrics) setMetrics(r.data.metrics)
      setGenerated(true)
      setTimeout(() => setGenerated(false), 3000)
    } catch {
      alert('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const metricsList = [
    { label: 'MAE',  value: metrics.mae,  desc: 'Mean Absolute Error' },
    { label: 'RMSE', value: metrics.rmse, desc: 'Root Mean Squared Error' },
    { label: 'MAPE', value: metrics.mape, desc: 'Mean Absolute Percentage Error' },
    { label: 'R²',   value: metrics.r2,   desc: 'Coefficient of Determination' },
  ]

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Predict & Report</h1>
            <p className="text-sm text-gray-400 mt-0.5">Generate prediction reports and model evaluations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700">Admin</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#2d6a4f' }}>A</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left — generate + model metrics */}
          <div className="flex-1 space-y-5">
            {/* Generate */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 className="text-sm font-bold text-gray-900 mb-4">Generate New Report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#2d6a4f' }}>Report Type</label>
                  <div className="flex gap-2">
                    {['PDF', 'Excel'].map(t => (
                      <button key={t} onClick={() => setReportType(t)}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5"
                        style={reportType === t
                          ? { background: '#2d6a4f', color: '#fff', borderColor: '#2d6a4f' }
                          : { color: '#6b7280', borderColor: '#e5e7eb' }}>
                        {t === 'PDF' ? <MdPictureAsPdf className="text-sm" /> : <MdTableChart className="text-sm" />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#2d6a4f' }}>Year Range</label>
                  <select value={yearRange} onChange={e => setYearRange(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none">
                    <option>2019–2024</option>
                    <option>2020–2024</option>
                    <option>2021–2024</option>
                    <option>2019–2023</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#2d6a4f' }}>Include Sections</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none">
                    <option>All Sections</option>
                    <option>Forecast Only</option>
                    <option>Model Accuracy Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#2d6a4f' }}>Model</label>
                  <select value={model} onChange={e => setModel(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 focus:outline-none">
                    <option>ARIMA (2,1,2)</option>
                    <option>ARIMA (1,1,1)</option>
                    <option>Auto ARIMA</option>
                    <option>Linear Regression</option>
                  </select>
                </div>
              </div>
              <button onClick={generate} disabled={generating}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#2d6a4f' }}>
                {generating ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Generating…</>
                ) : generated ? (
                  <><MdCheckCircle className="text-base" /> Generated Successfully</>
                ) : (
                  <><MdAssessment className="text-base" /> Generate Report</>
                )}
              </button>
            </div>

            {/* Model accuracy metrics */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 className="text-sm font-bold text-gray-900 mb-4">Model Accuracy Metrics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {metricsList.map(m => (
                  <div key={m.label} className="text-center p-4 rounded-xl" style={{ background: '#f0faf5' }}>
                    <p className="text-xl font-black" style={{ color: '#2d6a4f' }}>{m.value}</p>
                    <p className="text-xs font-bold text-gray-700 mt-1">{m.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — report history */}
          <div className="w-full lg:w-72">
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-xs font-bold text-gray-900 mb-4">Report History</h3>
              {loading && <p className="text-xs text-gray-400 text-center py-4">Loading…</p>}
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: r.type === 'PDF' ? '#fef2f2' : '#f0faf5' }}>
                      {r.type === 'PDF'
                        ? <MdPictureAsPdf className="text-sm" style={{ color: '#ef4444' }} />
                        : <MdTableChart className="text-sm" style={{ color: '#2d6a4f' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.date} · {r.type}</p>
                    </div>
                    <button className="text-gray-300 hover:text-green-600 transition-colors">
                      <MdDownload className="text-lg" />
                    </button>
                  </div>
                ))}
                {!loading && reports.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No reports yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
