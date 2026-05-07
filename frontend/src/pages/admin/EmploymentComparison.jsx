import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts'
import api from '../../services/api'

const views = ['By Year', 'By Program', 'By Gender']

export default function EmploymentComparison() {
  const [view, setView] = useState(0)
  const [byYear, setByYear] = useState([])
  const [byCourse, setByCourse] = useState([])
  const [byGender, setByGender] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/employment-comparison').then(r => {
      setByYear(r.data.by_year || [])
      setByCourse(r.data.by_course || [])
      setByGender(r.data.by_gender || [])
      setSummary(r.data.summary || {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const summaryCards = [
    { label: 'Avg Rate (5yr)', value: summary.avg_rate   || '—', delta: summary.avg_delta   || '' },
    { label: 'Best Program',   value: summary.best_prog  || '—', delta: summary.best_rate   || '' },
    { label: 'Peak Year',      value: summary.peak_year  || '—', delta: summary.peak_rate   || '' },
    { label: 'Gender Gap',     value: summary.gender_gap || '—', delta: summary.gender_note || '' },
  ]

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employment Comparison</h1>
            <p className="text-sm text-gray-400 mt-0.5">Compare employment rates across dimensions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700">Admin</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#0f2d1a' }}>A</div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map(c => (
            <div key={c.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-gray-400 mb-1">{c.label}</p>
              <p className="text-2xl font-black" style={{ color: '#0f2d1a' }}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.delta}</p>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-gray-900">Employment Rate Comparison</h2>
            <div className="flex gap-1 p-1 bg-gray-50 rounded-xl">
              {views.map((v, i) => (
                <button key={v} onClick={() => setView(i)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  style={view === i
                    ? { background: '#0f2d1a', color: '#fff', boxShadow: '0 2px 8px rgba(15,45,26,0.3)' }
                    : { color: '#6b7280' }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {loading && <p className="text-center text-sm text-gray-400 py-16">Loading…</p>}

          {!loading && view === 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byYear} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => `${v}%`} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="employed" name="Employed" fill="#0f2d1a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unemployed" name="Unemployed" fill="#d4e4d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {!loading && view === 1 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCourse} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="course" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="rate" name="Employment Rate" fill="#0f2d1a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {!loading && view === 2 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={byGender} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 80]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => `${v}%`} />
                <Legend iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="male" name="Male" stroke="#0f2d1a" strokeWidth={2.5} dot={{ r: 4, fill: '#0f2d1a', stroke: '#fff', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="female" name="Female" stroke="#1a3d27" strokeWidth={2.5} dot={{ r: 4, fill: '#1a3d27', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
