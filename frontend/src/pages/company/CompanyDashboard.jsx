import { useState, useEffect } from 'react'
import CompanyLayout from '../../components/company/CompanyLayout'
import { MdWork, MdCheckCircle, MdPauseCircle, MdTrendingUp, MdAdd } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function CompanyDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/company/dashboard').then(r => setData(r.data))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const stats = data?.stats || {}
  const recentJobs = data?.recent_jobs || []

  return (
    <CompanyLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-xl font-bold text-gray-900">
            {data?.company_name ? `Welcome, ${data.company_name}` : 'Company Dashboard'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.industry && <span className="mr-2">{data.industry}</span>}
            {data?.location && <span>{data.location}</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Job Posts', value: stats.total_jobs ?? 0, icon: MdWork, color: '#0f2d1a' },
            { label: 'Open Positions', value: stats.open_jobs ?? 0, icon: MdTrendingUp, color: '#10b981' },
            { label: 'Closed / Filled', value: stats.closed_jobs ?? 0, icon: MdPauseCircle, color: '#9ca3af' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 flex items-center gap-4"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}15` }}>
                <s.icon style={{ color: s.color, fontSize: '20px' }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-2xl font-black mt-0.5" style={{ color: s.color }}>{loading ? '...' : s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-5 mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/company/jobs')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">
              <MdWork className="text-base text-gray-500" /> Manage Jobs
            </button>
            <button onClick={() => navigate('/company/jobs?new=1')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: '#0f2d1a' }}>
              <MdAdd className="text-base" /> Post New Job
            </button>
            <button onClick={() => navigate('/company/profile')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">
              <MdCheckCircle className="text-base text-gray-500" /> Update Profile
            </button>
          </div>
        </div>

        {/* Recent jobs */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Recent Job Postings</h2>
            <button onClick={() => navigate('/company/jobs')}
              className="text-xs font-semibold" style={{ color: '#0f2d1a' }}>View all</button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-10">
              <MdWork className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No job postings yet</p>
              <button onClick={() => navigate('/company/jobs?new=1')}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: '#0f2d1a' }}>
                Post your first job
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map(job => (
                <div key={job.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: '#0f2d1a' }}>{(job.title || 'J')[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{job.title}</p>
                    <p className="text-xs text-gray-400">{job.type} · {job.location}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={job.status === 'Open'
                      ? { background: '#e6ede8', color: '#0f2d1a' }
                      : { background: '#f3f4f6', color: '#9ca3af' }}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CompanyLayout>
  )
}
