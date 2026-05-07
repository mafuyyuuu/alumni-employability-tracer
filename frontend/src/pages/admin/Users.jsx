import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdSearch, MdPeople, MdEdit, MdBlock, MdCheckCircle, MdInsights } from 'react-icons/md'
import api from '../../services/api'

const avatarColors = ['#6366f1', '#0f2d1a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444']

export default function Users() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, employed: 0, unemployed: 0 })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [predictionByUser, setPredictionByUser] = useState({})
  const [predictingId, setPredictingId] = useState(null)
  const [predictError, setPredictError] = useState('')
  const [selectedModel, setSelectedModel] = useState('rf')

  function modelLabel(code) {
    const key = String(code || '').toLowerCase()
    if (key === 'rf') return 'RF'
    if (key === 'lr') return 'Linear Regression'
    if (key === 'arima') return 'ARIMA'
    return key ? key.toUpperCase() : 'RF'
  }

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

  function handleSearchKey(e) {
    if (e.key === 'Enter') fetchUsers({ search })
  }

  function toggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    api.put(`/admin/users/${user.id}`, { status: newStatus }).then(() => {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
    }).catch(() => {})
  }

  function predictForUser(userId) {
    setPredictError('')
    setPredictingId(userId)
    api.post('/admin/predict-employability', { user_id: userId, model: selectedModel }).then(r => {
      if (r.data?.prediction) {
        setPredictionByUser(prev => ({ ...prev, [userId]: r.data.prediction }))
      }
    }).catch((err) => {
      setPredictError(err.response?.data?.error || 'Prediction failed. Try retraining model first.')
    }).finally(() => setPredictingId(null))
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage alumni accounts and access</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block"><p className="text-xs font-semibold text-gray-700">Admin</p><p className="text-xs text-gray-400">Administrator</p></div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#0f2d1a' }}>A</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Alumni', value: stats.total,     color: '#0f2d1a' },
            { label: 'Active',       value: stats.active,    color: '#10b981' },
            { label: 'Employed',     value: stats.employed,  color: '#6366f1' },
            { label: 'Unemployed',   value: stats.unemployed,color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input type="text" placeholder="Search users… (press Enter)" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey}
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
          <div className="mt-2 sm:w-52">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none"
            >
              <option value="rf">Random Forest</option>
              <option value="lr">Linear Regression</option>
              <option value="arima">ARIMA</option>
            </select>
          </div>
        </div>
        {predictError && (
          <p className="text-xs text-red-500 mb-4">{predictError}</p>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="hidden lg:grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100">
            <span className="col-span-4">User</span><span className="col-span-2">Course</span>
            <span className="col-span-1 text-center">Year</span><span className="col-span-2 text-center">Employment</span>
            <span className="col-span-2 text-center">Status</span><span className="col-span-1 text-right">Actions</span>
          </div>

          {loading && <p className="py-12 text-center text-sm text-gray-400">Loading…</p>}

          {users.map((u, i) => (
            <div key={u.id} className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: avatarColors[i % avatarColors.length] }}>
                  {u.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
              <span className="col-span-2 text-xs text-gray-500">{u.course}</span>
              <span className="col-span-1 text-xs text-gray-500 text-center">{u.year}</span>
              <div className="col-span-2 flex justify-center">
                {(() => {
                  const pred = predictionByUser[u.id]
                  const confidence = pred?.probability_employed != null
                    ? ` (${Math.round(pred.probability_employed * 100)}%)`
                    : ''
                  return (
                    <div className="text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        style={u.employed ? { background: '#e6ede8', color: '#0f2d1a' } : { background: '#fff7ed', color: '#ea580c' }}>
                        {u.employed ? <MdCheckCircle className="text-xs" /> : null}
                        {u.employed ? 'Employed' : 'Seeking'}
                      </span>
                      {pred && (
                        <p className="text-[11px] mt-1" style={{ color: pred.label === 'Employed' ? '#0f2d1a' : '#ea580c' }}>
                          {pred.mode === 'voter_weighted'
                            ? 'Voter'
                            : pred.mode === 'voter_fallback'
                              ? `Voter Fallback${pred.requested_model ? ` (${modelLabel(pred.requested_model)})` : ''}`
                              : `ML ${modelLabel(pred.model_used)}`}: {pred.label}{confidence}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div className="col-span-2 flex justify-center">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={u.status === 'Active' ? { background: '#e6ede8', color: '#0f2d1a' } : { background: '#f3f4f6', color: '#9ca3af' }}>
                  {u.status}
                </span>
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <button className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50"><MdEdit className="text-sm" /></button>
                <button
                  onClick={() => predictForUser(u.id)}
                  className="p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
                  title="Run employability prediction"
                  disabled={predictingId === u.id}
                >
                  {predictingId === u.id
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    : <MdInsights className="text-sm" />}
                </button>
                <button onClick={() => toggleStatus(u)} className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50"
                  title={u.status === 'Active' ? 'Deactivate' : 'Activate'}><MdBlock className="text-sm" /></button>
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
