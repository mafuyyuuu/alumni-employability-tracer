import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdSearch, MdPeople, MdTrendingUp, MdTrendingDown, MdSchool, MdClose, MdVisibility } from 'react-icons/md'
import api from '../../services/api'

const TIER_STYLES = {
  'Likely Employable': { bg: '#dcfce7', color: '#15803d', dot: '#16a34a', card: '#166534' },
  'Employable':        { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6', card: '#1e40af' },
  'Least Employable':  { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444', card: '#991b1b' },
}

function TierBadge({ tier }) {
  const s = TIER_STYLES[tier] || TIER_STYLES['Employable']
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {tier}
    </span>
  )
}

function SummaryCard({ label, count, total, colorClass, icon: Icon }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="text-sm" />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900">{count}</p>
      <p className="text-xs text-gray-400 mt-1">{pct}% of total graduating</p>
      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: (TIER_STYLES[label] || TIER_STYLES['Employable']).dot }} />
      </div>
    </div>
  )
}

const TIERS = ['All', 'Likely Employable', 'Employable', 'Least Employable']
const PAGE_SIZE = 50

export default function Predict() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  function openInsights(studentId) {
    setInsights(null)
    setInsightsLoading(true)
    api.get(`/admin/predict/insights/${studentId}`)
      .then(r => setInsights(r.data))
      .catch(() => setInsights({ error: 'Failed to load insights.' }))
      .finally(() => setInsightsLoading(false))
  }

  const [allStudents, setAllStudents] = useState([])

  // Load from cache on mount — instant. Falls back to full compute if cache empty.
  useEffect(() => {
    setLoading(true)
    setError('')
    api.get('/admin/predict/cached')
      .then(r => {
        if (r.data.students?.length) {
          setAllStudents(r.data.students)
          setData(r.data)
        } else {
          // Cache empty — run full prediction (slow, but only once)
          return api.get('/admin/predict').then(r2 => {
            setAllStudents(r2.data.students || [])
            setData(r2.data)
          })
        }
      })
      .catch(e => setError(e.response?.data?.error || 'Failed to load predictions.'))
      .finally(() => setLoading(false))
  }, [])

  // Filter client-side — instant, no server round-trip
  useEffect(() => {
    if (!allStudents.length) return
    let filtered = allStudents
    if (tierFilter !== 'All') filtered = filtered.filter(s => s.tier === tierFilter)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(s => s.name?.toLowerCase().includes(q) || s.course?.toLowerCase().includes(q))
    }
    setData(prev => prev ? { ...prev, students: filtered } : prev)
    setPage(1)
  }, [search, tierFilter, allStudents])

  const students = data?.students || []
  const summary = data?.summary || { high: 0, employable: 0, least: 0, total: 0 }
  const gradYear = data?.graduation_year

  const totalPages = Math.ceil(students.length / PAGE_SIZE)
  const paged = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employability Prediction</h1>
            <p className="text-sm text-gray-500 mt-1">
              Latest batch — {gradYear ? `Students of ${gradYear}` : '—'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Likely Employable" count={summary.high} total={summary.total}
            colorClass="bg-emerald-50 text-emerald-600" icon={MdTrendingUp} />
          <SummaryCard label="Employable" count={summary.employable} total={summary.total}
            colorClass="bg-blue-50 text-blue-600" icon={MdPeople} />
          <SummaryCard label="Least Employable" count={summary.least} total={summary.total}
            colorClass="bg-red-50 text-red-600" icon={MdTrendingDown} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <MdSchool className="text-emerald-700" />
              <span className="text-sm font-bold text-gray-900">
                {students.length} Students
                {tierFilter !== 'All' && <span className="font-normal text-gray-400"> — filtered</span>}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Tier filter */}
              <div className="flex gap-1">
                {TIERS.map(t => (
                  <button key={t} onClick={() => setTierFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      tierFilter === t
                        ? 'bg-emerald-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {t === 'All' ? 'All' : t === 'Likely Employable' ? 'Likely' : t === 'Employable' ? 'Mid' : 'Least'}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or course..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-44 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-400">Running predictions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-sm text-red-500 font-medium">{error}</div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">No graduating students found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-400 font-bold border-b border-gray-50 bg-gray-50/50">
                      <th className="px-5 py-3 uppercase tracking-tighter">#</th>
                      <th className="px-5 py-3 uppercase tracking-tighter">Name</th>
                      <th className="px-5 py-3 uppercase tracking-tighter">Course</th>
                      <th className="px-5 py-3 text-center uppercase tracking-tighter">Score</th>
                      <th className="px-5 py-3 text-center uppercase tracking-tighter">Est. Months</th>
                      <th className="px-5 py-3 text-center uppercase tracking-tighter">Tier</th>
                      <th className="px-5 py-3 text-center uppercase tracking-tighter">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.map((s, i) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 text-gray-400 font-bold">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-gray-800">{s.name}</p>
                          {s.board_passer && (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              Board Passer
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{s.course}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-black text-gray-800">{s.score}</span>
                          <span className="text-gray-400">/100</span>
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-600 font-medium">
                          {s.predicted_months != null ? `~${s.predicted_months} mo.` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <TierBadge tier={s.tier} />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button onClick={() => openInsights(s.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
                            <MdVisibility className="text-base" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3.5 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Page <span className="text-emerald-900">{page}</span> of {totalPages}
                    <span className="ml-2 opacity-50">({students.length} total)</span>
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-4 py-1.5 text-[10px] font-black uppercase border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all text-gray-600">
                      Prev
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="px-4 py-1.5 text-[10px] font-black uppercase bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-30 transition-all">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Insights Modal */}
      {(insightsLoading || insights) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setInsights(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Employability Insights</h2>
                {insights?.student && <p className="text-xs text-gray-400 mt-0.5">{insights.student.name} · {insights.student.course} · {insights.student.year}</p>}
              </div>
              <button onClick={() => setInsights(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><MdClose /></button>
            </div>

            {insightsLoading && <div className="py-16 text-center text-sm text-gray-400">Loading insights…</div>}
            {insights?.error && <div className="py-16 text-center text-sm text-red-500">{insights.error}</div>}

            {insights && !insights.error && (
              <div className="p-6 space-y-6">
                {/* Score Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800">Score Breakdown</h3>
                    <span className="text-2xl font-black" style={{ color: '#0f2d1a' }}>{insights.student.score}<span className="text-sm font-normal text-gray-400">/100</span></span>
                  </div>
                  <div className="space-y-2">
                    {(insights.score_breakdown || []).map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-36 flex-shrink-0">{item.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(item.value, 100)}%`, background: '#2d6a4f' }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-10 text-right">{item.value}</span>
                        <span className="text-[10px] text-gray-400 w-16 text-right">×{item.weight} = {item.weighted}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* k-NN Historical Matches */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-800">10 Most Similar Historical Alumni</h3>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#e6ede8', color: '#0f2d1a' }}>
                      {insights.knn_emp_rate}% employment rate
                    </span>
                  </div>
                  {insights.using_same_year && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 mb-3">
                      No previous year data available — showing matches from the same batch.
                    </p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="pb-2 text-left font-semibold">Name</th>
                          <th className="pb-2 text-left font-semibold">Course</th>
                          <th className="pb-2 text-center font-semibold">Year</th>
                          <th className="pb-2 text-center font-semibold">Grade</th>
                          <th className="pb-2 text-center font-semibold">Soft</th>
                          <th className="pb-2 text-center font-semibold">Hard</th>
                          <th className="pb-2 text-center font-semibold">Match</th>
                          <th className="pb-2 text-center font-semibold">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(insights.knn_matches || []).map((m, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-2 font-medium text-gray-800 max-w-[100px] truncate">{m.name}</td>
                            <td className="py-2 text-gray-500">{m.course}</td>
                            <td className="py-2 text-center text-gray-500">{m.year}</td>
                            <td className="py-2 text-center font-semibold">{m.avg_grade}</td>
                            <td className="py-2 text-center">{m.soft_skills}</td>
                            <td className="py-2 text-center">{m.hard_skills}</td>
                            <td className="py-2 text-center">
                              <span className="font-bold text-emerald-700">{m.similarity}%</span>
                            </td>
                            <td className="py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${m.employed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                {m.employed ? 'Employed' : 'Unemployed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
