import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  MdSearch, MdPeople, MdCheckCircle, MdSchool, MdEdit,
  MdUnfoldMore, MdExpandLess, MdExpandMore, MdClose, MdVisibility,
} from 'react-icons/md'
import api from '../../services/api'

const avatarColors = ['#2d6a4f', '#0f2d1a', '#1a3d27', '#f59e0b', '#163d22', '#10b981', '#ef4444']

const LEVEL_ORDER = { 'Likely Employable': 1, 'Employable': 2, 'Least Employable': 3, 'Pending Assessment': 4 }

const LEVEL_STYLES = {
  'Likely Employable':  { background: '#e6ede8', color: '#0f2d1a', dot: '#10b981' },
  'Employable':         { background: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  'Least Employable':   { background: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
  'Pending Assessment': { background: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
}

function EmployabilityBadge({ level }) {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES['Employable']
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: style.background, color: style.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
      {level}
    </span>
  )
}

function ScoreBar({ label, value, peerValue, color = '#2d6a4f' }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const peerPct = Math.min(100, Math.max(0, peerValue ?? 0))
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider mb-1">
        <span className="text-gray-400">{label}</span>
        <div className="flex gap-3">
          <span className="text-gray-700">You: {value != null ? value.toFixed(1) : '—'}</span>
          {peerValue != null && <span className="text-emerald-600">Peer Avg: {peerValue.toFixed(1)}</span>}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        {peerValue != null && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10" 
            style={{ left: `${peerPct}%` }}
            title={`Peer Average: ${peerValue.toFixed(1)}`}
          />
        )}
      </div>
    </div>
  )
}

function ViewInsightsModal({ userId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/admin/user-insights/${userId}`)
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load insights.'))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-900 text-white">
          <div>
            <h2 className="text-base font-bold">Employability Insights</h2>
            <p className="text-[10px] text-emerald-300 uppercase tracking-widest mt-0.5">Individual Driver Analysis</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-emerald-800 transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 flex-1 bg-white text-left">
          {loading && (
             <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-gray-400">Computing insights...</p>
             </div>
          )}
          {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}
          
          {data && (
            <div className="space-y-6">
              {/* Overall score */}
              <div className="flex items-end justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Employability Score</p>
                  <p className="text-xs text-gray-500 mt-1">Weighted composite of all features</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-emerald-900">{data.score?.toFixed(1) ?? '—'}</span>
                  <span className="text-sm font-bold text-gray-300 ml-1">/ 100</span>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <h4 className="text-[10px] font-bold text-emerald-900 uppercase mb-3 tracking-wider">Key Strengths</h4>
                  {data.strengths?.length > 0 ? (
                    <div className="space-y-2">
                      {data.strengths.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <p className="text-xs font-bold text-emerald-800">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-emerald-600 italic">Maintaining steady performance.</p>
                  )}
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <h4 className="text-[10px] font-bold text-orange-900 uppercase mb-3 tracking-wider">Growth Areas</h4>
                  {data.improvements?.length > 0 ? (
                    <div className="space-y-2">
                      {data.improvements.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          <p className="text-xs font-bold text-orange-800">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-orange-600 italic">No major gaps identified.</p>
                  )}
                </div>
              </div>

              {/* Score breakdown */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-wider">Feature Breakdown vs. Peers</h4>
                <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                  <ScoreBar label="Academic GWA" value={data.score_breakdown.avg_grade} peerValue={data.peer_comparison?.avg_grade} />
                  <ScoreBar label="Soft Skills" value={data.score_breakdown.soft_skills} peerValue={data.peer_comparison?.soft_skills} color="#3b82f6" />
                  <ScoreBar label="Hard Skills" value={data.score_breakdown.hard_skills} peerValue={data.peer_comparison?.hard_skills} color="#8b5cf6" />
                  <ScoreBar label="OJT Performance" value={data.score_breakdown.ojt_grade} peerValue={data.peer_comparison?.ojt_grade} color="#f59e0b" />
                  <ScoreBar label="Professional Subjects" value={data.score_breakdown.avg_prof_grade} peerValue={data.peer_comparison?.avg_prof_grade} color="#10b981" />
                </div>
              </div>

              {/* Prediction stats for graduating students */}
              {data.is_graduating && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">AI Forecast (Market Readiness)</h4>
                  <div className="bg-emerald-900 rounded-2xl p-5 grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Time to Hire</p>
                      <p className="text-2xl font-black text-white">
                        {data.predicted_months != null ? `${data.predicted_months} Months` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Market Probability</p>
                      <p className="text-2xl font-black text-white">
                        {data.rf_probability != null ? `${(data.rf_probability * 100).toFixed(0)}%` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Similar alumni */}
              {data.similar_alumni?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">Peer Path Mapping</h4>
                  <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-tighter">Path</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-tighter">Year</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-tighter">Outcome</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-tighter">Timeline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.similar_alumni.map((s, i) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-700">{s.course}</p>
                              <p className="text-[10px] text-gray-400 font-mono">ID: {s.alumni_id}</p>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500 font-medium">{s.year}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide"
                                style={s.employed ? { background: '#dcfce7', color: '#166534' } : { background: '#fee2e2', color: '#991b1b' }}>
                                {s.employed ? 'Hired' : 'Seeking'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700 font-bold">{s.months != null ? `${s.months}m` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-3 italic text-center">
                    Paths are identified by analyzing 10+ behavioral and academic features using k-Nearest Neighbors.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditUserModal({ userId, onClose, onSaved }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [programs, setPrograms] = useState([])

  useEffect(() => {
    api.get(`/admin/users/${userId}`).then(r => setForm(r.data.user)).catch(() => setError('Failed to load user.'))
    api.get('/admin/programs').then(r => setPrograms(r.data.programs || [])).catch(() => {})
  }, [userId])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await api.put(`/admin/users/${userId}`, form)
      onSaved()
      onClose()
    } catch {
      setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:bg-white transition-all'
  const lbl = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit Alumni</h2>
            {form && <p className="text-xs text-gray-400 mt-0.5">{form.firstName} {form.lastName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1 text-left">
          {!form && !error && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}
          {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}

          {form && <>
            {/* Personal */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Personal</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className={lbl}>First Name</label>
                <input className={inp} value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
              <div>
                <label className={lbl}>Middle Name</label>
                <input className={inp} value={form.middleName || ''} onChange={e => set('middleName', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
              <div>
                <label className={lbl}>Last Name</label>
                <input className={inp} value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className={lbl}>Email</label>
                <input className={inp} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
              <div>
                <label className={lbl}>Age</label>
                <input className={inp} type="number" value={form.age || ''} onChange={e => set('age', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
            </div>

            <div className="border-t border-gray-100 mb-4" />

            {/* Academic */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Academic</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>Course</label>
                <select className={inp} value={form.course || ''} onChange={e => set('course', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }}>
                  <option value="">Select course</option>
                  {programs.map(p => (
                    <option key={p.code} value={p.code}>{p.code} – {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Graduation Year</label>
                <input className={inp} type="number" value={form.graduationYear || ''} onChange={e => set('graduationYear', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className={lbl}>Avg Grade</label>
                <input className={inp} type="number" step="0.01" value={form.avgGrade || ''} onChange={e => set('avgGrade', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
              <div>
                <label className={lbl}>Prof Grade</label>
                <input className={inp} type="number" step="0.01" value={form.avgProfGrade || ''} onChange={e => set('avgProfGrade', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
              <div>
                <label className={lbl}>Elec Grade</label>
                <input className={inp} type="number" step="0.01" value={form.avgElecGrade || ''} onChange={e => set('avgElecGrade', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
              <div>
                <label className={lbl}>OJT Grade</label>
                <input className={inp} type="number" step="0.01" value={form.ojtGrade || ''} onChange={e => set('ojtGrade', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className={lbl}>Soft Skills (0–100)</label>
                <input className={inp} type="number" step="0.01" value={form.softSkills || ''} onChange={e => set('softSkills', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
              <div>
                <label className={lbl}>Hard Skills (0–100)</label>
                <input className={inp} type="number" step="0.01" value={form.hardSkills || ''} onChange={e => set('hardSkills', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
            </div>

            <div className="border-t border-gray-100 mb-4" />

            {/* Employment */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Employment</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className={lbl}>Employment Status</label>
                <select className={inp} value={form.employed ? '1' : '0'} onChange={e => set('employed', e.target.value === '1')} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }}>
                  <option value="1">Employed</option>
                  <option value="0">Seeking</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Months to First Job</label>
                <input className={inp} type="number" min="0" max="120" placeholder="e.g. 3"
                  value={form.monthsToEmployment ?? ''} onChange={e => set('monthsToEmployment', e.target.value)}
                  style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              </div>
            </div>

            <div className="border-t border-gray-100 mb-4" />

            {/* Account */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Account</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Account Status</label>
                <select className={inp} value={form.status || 'Active'} onChange={e => set('status', e.target.value)} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Board Passer</label>
                <select className={inp} value={form.boardPasser ? '1' : '0'} onChange={e => set('boardPasser', e.target.value === '1')} style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>
          </>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          {error && <p className="text-xs text-red-500 self-center mr-auto">{error}</p>}
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving || !form}
            className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#0f2d1a' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, employed: 0, unemployed: 0 })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [editingId, setEditingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })

  function applyUsersResponse(data) {
    setUsers(data.users || [])
    setStats(data.stats || {})
    if (data.pagination) setPagination(data.pagination)
  }

  function fetchUsers(next = {}) {
    const nextSearch = next.search ?? search
    const nextFilter = next.filter ?? filter
    const nextPage   = next.page ?? page
    setLoading(true)
    api.get('/admin/users', { params: { search: nextSearch, filter: nextFilter, page: nextPage } })
      .then(r => applyUsersResponse(r.data))
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers({ page: 1 })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsers({ search, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function handlePageChange(next) {
    if (next < 1 || next > pagination.pages) return
    setPage(next)
    fetchUsers({ page: next })
  }

  function toggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    api.put(`/admin/users/${user.id}`, { status: newStatus }).then(() => {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
    }).catch(() => {})
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedUsers = useMemo(() => {
    if (!sortKey) return users
    return [...users].sort((a, b) => {
      let av, bv
      if (sortKey === 'year') {
        av = a.year ?? 0; bv = b.year ?? 0
      } else if (sortKey === 'course') {
        av = (a.course || '').toLowerCase(); bv = (b.course || '').toLowerCase()
      } else if (sortKey === 'employability') {
        av = LEVEL_ORDER[a.employability_level] ?? 99
        bv = LEVEL_ORDER[b.employability_level] ?? 99
      } else if (sortKey === 'employment') {
        av = a.employed ? 0 : 1; bv = b.employed ? 0 : 1
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [users, sortKey, sortDir])

  function SortableHeader({ label, colKey }) {
    const active = sortKey === colKey
    return (
      <button onClick={() => handleSort(colKey)}
        className={`relative inline-flex items-center justify-center hover:text-gray-700 transition-colors ${active ? 'text-gray-700' : ''}`}>
        {label}
        <span className="absolute -right-4 flex items-center">
          {active
            ? sortDir === 'asc'
              ? <MdExpandLess className="text-sm" />
              : <MdExpandMore className="text-sm" />
            : <MdUnfoldMore className="text-xs opacity-50" />}
        </span>
      </button>
    )
  }

  const likelyCount  = users.filter(u => u.employability_level === 'Likely Employable').length
  const emploCount   = users.filter(u => u.employability_level === 'Employable').length
  const leastCount   = users.filter(u => u.employability_level === 'Least Employable').length
  const pendingCount = users.filter(u => u.employability_level === 'Pending Assessment').length

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage alumni accounts and view readiness levels</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total Alumni', value: stats.total,      color: '#0f2d1a' },
            { label: 'Active',       value: stats.active,     color: '#10b981' },
            { label: 'Employed',     value: stats.employed,   color: '#2d6a4f' },
            { label: 'Unemployed',   value: stats.unemployed, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Employability breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Likely Employable',  value: likelyCount,  ...LEVEL_STYLES['Likely Employable'] },
            { label: 'Employable',         value: emploCount,   ...LEVEL_STYLES['Employable'] },
            { label: 'Least Employable',   value: leastCount,   ...LEVEL_STYLES['Least Employable'] },
            { label: 'Pending Assessment', value: pendingCount, ...LEVEL_STYLES['Pending Assessment'] },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-3"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.dot }} />
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-2xl font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input type="text" placeholder="Search users…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {['All', 'Active', 'Employed', 'Unemployed'].map(f => (
              <button key={f} onClick={() => { setFilter(f); fetchUsers({ filter: f }) }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={filter === f ? { background: '#0f2d1a', color: '#fff' } : { color: '#6b7280' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="hidden lg:grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100 text-left">
            <span className="col-span-3">User</span>
            <span className="col-span-2 flex justify-center">
              <SortableHeader label="Course" colKey="course" />
            </span>
            <span className="col-span-1 flex justify-center">
              <SortableHeader label="Year" colKey="year" />
            </span>
            <span className="col-span-2 flex justify-center">
              <SortableHeader label="Employability" colKey="employability" />
            </span>
            <span className="col-span-2 flex justify-center">
              <SortableHeader label="Employment" colKey="employment" />
            </span>
            <span className="col-span-2 text-center">Actions</span>
          </div>

          {loading && <p className="py-12 text-center text-sm text-gray-400">Loading…</p>}

          {sortedUsers.map((u, i) => (
            <div key={u.id} className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left">
              {/* User */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: avatarColors[i % avatarColors.length] }}>
                  {u.name ? u.name[0] : '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-2">
                    {u.name}
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                      u.type === 'Registered' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {u.type || 'Registered'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  {u.board_passer && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5"
                      style={{ background: '#e6ede8', color: '#0f2d1a' }}>
                      <MdSchool className="text-xs" /> Board Passer
                    </span>
                  )}
                </div>
              </div>

              {/* Course */}
              <div className="col-span-2 flex justify-center">
                <span className="text-xs text-gray-500">{u.course}</span>
              </div>

              {/* Year */}
              <div className="col-span-1 flex justify-center">
                <span className="text-xs text-gray-500">{u.year}</span>
              </div>

              {/* Employability level badge */}
              <div className="col-span-2 flex flex-col items-center gap-1">
                <EmployabilityBadge level={u.employability_level} />
                {u.is_graduating && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#fef9c3', color: '#854d0e' }}>Graduating</span>
                )}
                {!u.is_graduating && u.months_to_employment != null && (
                  <span className="text-[10px] text-gray-400">{u.months_to_employment} mo. to hire</span>
                )}
              </div>

              {/* Employment status */}
              <div className="col-span-2 flex justify-center">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={u.employed ? { background: '#e6ede8', color: '#0f2d1a' } : { background: '#fff7ed', color: '#ea580c' }}>
                  {u.employed ? <MdCheckCircle className="text-xs" /> : null}
                  {u.employed ? 'Employed' : 'Seeking'}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-2 flex justify-center gap-1">
                <button onClick={() => setEditingId(u.id)} title="Edit user"
                  className="p-1.5 text-gray-400 hover:text-green-700 transition-colors rounded-lg hover:bg-green-50">
                  <MdEdit className="text-sm" />
                </button>
                <button onClick={() => setViewingId(u.id)} title="View insights"
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50">
                  <MdVisibility className="text-sm" />
                </button>
              </div>
            </div>
          ))}

          {!loading && users.length === 0 && (
            <div className="py-12 text-center">
              <MdPeople className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No users found</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">
              Showing page <span className="font-bold text-gray-900">{pagination.page}</span> of <span className="font-bold text-gray-900">{pagination.pages}</span> 
              <span className="ml-2 opacity-50">({pagination.total} total students)</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-4 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-900 rounded-xl hover:opacity-90 disabled:opacity-30 transition-all"
              >
                Next Student Batch
              </button>
            </div>
          </div>
        )}
      </div>

      {editingId && (
        <EditUserModal
          userId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => fetchUsers()}
        />
      )}

      {viewingId && (
        <ViewInsightsModal
          userId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </AdminLayout>
  )
}
