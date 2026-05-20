import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  MdSearch, MdPeople, MdBlock, MdCheckCircle, MdInsights, MdSchool, MdEdit,
} from 'react-icons/md'
import api from '../../services/api'

const avatarColors = ['#2d6a4f', '#0f2d1a', '#1a3d27', '#f59e0b', '#163d22', '#10b981', '#ef4444']

const LEVEL_STYLES = {
  'Likely Employable':   { background: '#e6ede8', color: '#0f2d1a', dot: '#10b981' },
  'Least Employable':    { background: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
  'Pending Assessment':  { background: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
}

function EmployabilityBadge({ level }) {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES['Least Employable']
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: style.background, color: style.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
      {level}
    </span>
  )
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, employed: 0, unemployed: 0 })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [predictionByUser, setPredictionByUser] = useState({})
  const [predictingId, setPredictingId] = useState(null)
  const [predictError, setPredictError] = useState('')

  function fetchUsers(next = {}) {
    const nextSearch = next.search ?? search
    const nextFilter = next.filter ?? filter
    setLoading(true)
    api.get('/admin/users', { params: { search: nextSearch, filter: nextFilter } }).then(r => {
      setUsers(r.data.users || [])
      setStats(r.data.stats || {})
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/admin/users', { params: { search: '', filter: 'All' } }).then(r => {
      setUsers(r.data.users || [])
      setStats(r.data.stats || {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers({ search }), 300)
    return () => clearTimeout(timer)
  }, [search])

  function toggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    api.put(`/admin/users/${user.id}`, { status: newStatus }).then(() => {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
    }).catch(() => {})
  }

  function predictForUser(userId) {
    setPredictError('')
    setPredictingId(userId)
    api.post('/admin/predict-employability', { user_id: userId, model: 'rf' }).then(r => {
      if (r.data?.prediction) {
        setPredictionByUser(prev => ({ ...prev, [userId]: r.data.prediction }))
      }
    }).catch((err) => {
      setPredictError(err.response?.data?.error || 'Prediction failed. Try retraining model first.')
    }).finally(() => setPredictingId(null))
  }

  const likelyCount   = users.filter(u => u.employability_level === 'Likely Employable').length
  const leastCount    = users.filter(u => u.employability_level === 'Least Employable').length
  const pendingCount  = users.filter(u => u.employability_level === 'Pending Assessment').length

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage alumni accounts, predict employability, and view readiness levels</p>
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

        {/* Employability breakdown — 3 tiers */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Likely Employable',  value: likelyCount,  ...LEVEL_STYLES['Likely Employable'] },
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
        {predictError && <p className="text-xs text-red-500 mb-4">{predictError}</p>}

        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="hidden lg:grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100">
            <span className="col-span-3">User</span>
            <span className="col-span-2 text-center">Course</span>
            <span className="col-span-1 text-center">Year</span>
            <span className="col-span-2 text-center">Employability</span>
            <span className="col-span-2 text-center">Employment</span>
            <span className="col-span-2 text-center">Actions</span>
          </div>

          {loading && <p className="py-12 text-center text-sm text-gray-400">Loading…</p>}

          {users.map((u, i) => (
            <div key={u.id} className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              {/* User */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: avatarColors[i % avatarColors.length] }}>
                  {u.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
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
              <span className="col-span-2 text-xs text-gray-500 text-center">{u.course}</span>

              {/* Year */}
              <span className="col-span-1 text-xs text-gray-500 text-center">{u.year}</span>

              {/* Employability level badge */}
              <div className="col-span-2 flex flex-col items-center gap-1">
                <EmployabilityBadge level={u.employability_level} />
                {(() => {
                  const pred = predictionByUser[u.id]
                  if (!pred) return null
                  const confidence = pred.probability_employed != null
                    ? ` (${Math.round(pred.probability_employed * 100)}%)`
                    : ''
                  return (
                    <p className="text-[11px]" style={{ color: pred.label === 'Employed' ? '#0f2d1a' : '#ea580c' }}>
                      {pred.mode === 'voter_weighted'
                        ? 'Voter'
                        : pred.mode === 'voter_fallback'
                          ? 'Fallback'
                          : 'RF'}: {pred.label}{confidence}
                    </p>
                  )
                })()}
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
                <button className="p-1.5 text-gray-400 hover:text-green-700 transition-colors rounded-lg hover:bg-green-50">
                  <MdEdit className="text-sm" />
                </button>
                <button onClick={() => predictForUser(u.id)} disabled={predictingId === u.id}
                  className="p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
                  title="Run employability prediction">
                  {predictingId === u.id
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    : <MdInsights className="text-sm" />}
                </button>
                <button onClick={() => toggleStatus(u)} title={u.status === 'Active' ? 'Deactivate' : 'Activate'}
                  className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50">
                  <MdBlock className="text-sm" />
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
      </div>
    </AdminLayout>
  )
}
