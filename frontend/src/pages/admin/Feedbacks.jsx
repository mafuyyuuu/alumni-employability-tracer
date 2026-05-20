import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdFeedback, MdSearch, MdCheckCircle, MdWork, MdPending } from 'react-icons/md'
import api from '../../services/api'

const statusStyle = {
  'Hired via platform':  { background: '#e6ede8', color: '#0f2d1a', icon: MdCheckCircle },
  'Found employment':    { background: '#d8ede3', color: '#1a3d27', icon: MdWork },
  'Still looking':       { background: '#fff7ed', color: '#ea580c', icon: MdPending },
}

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/feedback').then(r => setFeedbacks(r.data.feedbacks || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = feedbacks.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.course.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || f.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    'Hired via platform': feedbacks.filter(f => f.status === 'Hired via platform').length,
    'Found employment':   feedbacks.filter(f => f.status === 'Found employment').length,
    'Still looking':      feedbacks.filter(f => f.status === 'Still looking').length,
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Feedbacks</h1>
            <p className="text-sm text-gray-400 mt-0.5">Alumni employment feedback submissions</p>
          </div>
          <div className="flex items-center gap-3">
            
            
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Object.entries(counts).map(([label, val]) => {
            const s = statusStyle[label]
            const Icon = s.icon
            return (
              <div key={label} className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.background }}>
                  <Icon className="text-lg" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{val}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input type="text" placeholder="Search by name or course…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {['All', 'Hired via platform', 'Found employment', 'Still looking'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all"
                style={filter === f ? { background: '#0f2d1a', color: '#fff' } : { color: '#6b7280' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback cards */}
        <div className="space-y-3">
          {loading && <p className="text-center text-sm text-gray-400 py-8">Loading…</p>}
          {filtered.map(f => {
            const s = statusStyle[f.status] || statusStyle['Still looking']
            const Icon = s.icon
            const isOpen = expanded === f.id
            return (
              <div key={f.id} className="bg-white rounded-2xl overflow-hidden transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <button onClick={() => setExpanded(isOpen ? null : f.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: '#0f2d1a' }}>
                    {f.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{f.name}</p>
                      <span className="text-xs text-gray-400">{f.course} · {f.year}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{f.date}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: s.background, color: s.color }}>
                    <Icon className="text-xs" />{f.status}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && f.company && (
                  <div className="px-5 pb-4 border-t border-gray-50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                      {[
                        { label: 'Company', val: f.company }, { label: 'Position', val: f.position },
                        { label: 'Work Setup', val: f.setup }, { label: 'Type', val: f.type },
                        { label: 'Duration', val: f.duration },
                      ].map(d => (
                        <div key={d.label}>
                          <p className="text-xs text-gray-400">{d.label}</p>
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">{d.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isOpen && !f.company && (
                  <div className="px-5 pb-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400 mt-3 italic">No employment details provided — alumni is still seeking opportunities.</p>
                  </div>
                )}
              </div>
            )
          })}
          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-2xl py-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <MdFeedback className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No feedbacks found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
