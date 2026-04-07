import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import { MdBookmark, MdNotifications, MdArrowForward, MdLocationOn, MdWork, MdTrendingUp, MdStar } from 'react-icons/md'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const typeStyle = {
  'Full-time': { background: '#f0faf5', color: '#2d6a4f' },
  'Part-time': { background: '#eff6ff', color: '#2563eb' },
  'Contract':  { background: '#fff7ed', color: '#ea580c' },
  'Internship':{ background: '#fdf4ff', color: '#9333ea' },
}

export default function AlumniDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState({ saved_jobs_count: 0, notifications_count: 0 })
  const [latestJobs, setLatestJobs] = useState([])
  const [recommendedJobs, setRecommendedJobs] = useState([])

  useEffect(() => {
    api.get('/alumni/dashboard').then(r => {
      setStats(r.data)
      setLatestJobs(r.data.latest_jobs || [])
      setRecommendedJobs(r.data.recommended_jobs || [])
    }).catch(() => {})
  }, [])

  const firstName = user?.first_name || 'Alumni'

  return (
    <AlumniLayout>
      <div className="px-4 sm:px-6 py-7 page-enter">

        {/* Welcome banner */}
        <div
          className="rounded-2xl p-6 mb-6 relative overflow-hidden"
          style={{ background: '#2d6a4f' }}
        >
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(183,228,199,0.15),transparent 70%)', transform: 'translate(25%,-25%)' }}
          />
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#b7e4c7' }}>
            Welcome back
          </p>
          <h2 className="text-white text-2xl font-bold tracking-tight">Hello, {firstName}!</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Here's what's happening with your job search today.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { icon: MdBookmark,      label: 'Saved Jobs',    value: stats.saved_jobs_count,    route: '/alumni/saved-jobs' },
              { icon: MdNotifications, label: 'Notifications', value: stats.notifications_count, route: '/alumni/notifications' },
              { icon: MdTrendingUp,    label: 'Profile Match', value: '—',                       route: '/alumni/profile-settings' },
            ].map(({ icon: Icon, label, value, route }) => (
              <button
                key={label}
                onClick={() => navigate(route)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <Icon className="text-white text-base" />
                </div>
                <div className="text-left">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</p>
                  <p className="text-white font-bold text-lg leading-none">{value}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-5">
          {/* Recommended Jobs */}
          <div className="flex-1 bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Recommended Jobs</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {user?.course ? `Matched to your ${user.course} program` : 'Based on your profile'}
                </p>
              </div>
              <button
                onClick={() => navigate('/alumni/browse-jobs')}
                className="text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                style={{ color: '#2d6a4f' }}
              >
                See all <MdArrowForward className="text-sm" />
              </button>
            </div>

            {recommendedJobs.length === 0 ? (
              <div
                className="rounded-xl flex flex-col items-center justify-center py-14"
                style={{ background: '#f9fbfa', border: '1.5px dashed #b7e4c7' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#f0faf5' }}>
                  <MdWork className="text-2xl" style={{ color: '#b7e4c7' }} />
                </div>
                <p className="text-sm font-semibold text-gray-500">No recommendations yet</p>
                <p className="text-xs text-gray-400 mt-1">Complete your profile to get matched</p>
                <button
                  onClick={() => navigate('/alumni/profile-settings')}
                  className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ background: '#f0faf5', color: '#2d6a4f' }}
                >
                  Update Profile
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recommendedJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => navigate('/alumni/browse-jobs')}
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:shadow-sm"
                    style={{ border: '1.5px solid #b7e4c7', background: '#f9fbfa' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: job.color }}
                    >
                      {job.company[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-900 truncate flex-1">{job.title}</p>
                        <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: '#f0faf5', color: '#2d6a4f', fontSize: '9px' }}>
                          <MdStar style={{ fontSize: '9px' }} /> Match
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{job.company}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={typeStyle[job.type] || typeStyle['Full-time']}>
                          {job.type}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <MdLocationOn className="text-xs" />{job.location}
                        </span>
                        {job.salary && <span className="text-xs text-gray-400">{job.salary}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/alumni/browse-jobs')}
                  className="w-full mt-2 py-2 rounded-xl text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ background: '#f0faf5', color: '#2d6a4f' }}
                >
                  View all matching jobs →
                </button>
              </div>
            )}
          </div>

          {/* Latest Jobs */}
          <div className="w-full md:w-72 bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Latest Jobs</h3>
                <p className="text-xs text-gray-400 mt-0.5">Course matches shown first</p>
              </div>
              <button
                onClick={() => navigate('/alumni/browse-jobs?tab=1')}
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: '#2d6a4f' }}
              >
                View all <MdArrowForward className="text-sm" />
              </button>
            </div>
            <div className="space-y-2">
              {latestJobs.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No jobs available</p>
              )}
              {latestJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => navigate('/alumni/browse-jobs')}
                  className="flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm"
                  style={{ borderColor: job.recommended ? '#b7e4c7' : '#f3f4f6' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: job.color }}
                  >
                    {job.company[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-gray-900 truncate flex-1">{job.title}</p>
                      {job.recommended && (
                        <MdStar className="flex-shrink-0 text-xs" style={{ color: '#2d6a4f' }} />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{job.company}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={typeStyle[job.type] || typeStyle['Full-time']}>
                        {job.type}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <MdLocationOn className="text-xs" />{job.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AlumniLayout>
  )
}
