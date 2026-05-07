import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import { MdBookmarkBorder, MdArrowForward, MdLocationOn, MdWork, MdDelete } from 'react-icons/md'
import api from '../../services/api'

const typeStyle = {
  'Full-time': { background: '#e6ede8', color: '#0f2d1a' },
  'Part-time': { background: '#eff6ff', color: '#2563eb' },
  'Contract':  { background: '#fff7ed', color: '#ea580c' },
}

export default function SavedJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/jobs/saved').then(r => setJobs(r.data.jobs || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function unsave(jobId) {
    api.delete(`/jobs/${jobId}/save`).then(() => {
      setJobs(prev => prev.filter(j => j.id !== jobId))
    }).catch(() => {})
  }

  return (
    <AlumniLayout>
      <div className="px-4 sm:px-6 py-8 page-enter flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Saved Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {jobs.length > 0 ? `${jobs.length} saved job${jobs.length > 1 ? 's' : ''}` : "Jobs you've bookmarked for later"}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl py-16 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="flex-1 bg-white rounded-2xl flex flex-col items-center justify-center py-20 border border-dashed border-gray-200"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#e6ede8' }}>
              <MdBookmarkBorder className="text-3xl" style={{ color: '#d4e4d8' }} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No saved jobs yet</h3>
            <p className="text-sm text-gray-400 mt-1 mb-5">Start bookmarking jobs you're interested in</p>
            <button
              onClick={() => navigate('/alumni/browse-jobs')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: '#0f2d1a' }}
            >
              Browse Jobs <MdArrowForward />
            </button>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map(job => (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-4 flex items-start gap-4 border border-transparent hover:border-primary-lighter transition-all"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: job.color }}
                >
                  {job.company[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900">{job.title}</h3>
                  <p className="text-xs font-medium mt-0.5" style={{ color: '#0f2d1a' }}>{job.company}</p>
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={typeStyle[job.type] || typeStyle['Full-time']}>
                      {job.type}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-0.5">
                      <MdLocationOn className="text-xs" />{job.location}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MdWork className="text-xs" />{job.salary}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => unsave(job.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 flex-shrink-0"
                  title="Remove from saved"
                >
                  <MdDelete className="text-lg" />
                </button>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-10 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">About Us</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Connecting talented PLP alumni with great career opportunities across the Philippines.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Quick Links</h4>
              <ul className="space-y-1.5">
                {['Find Jobs', 'Companies', 'About Us', 'Contact'].map(link => (
                  <li key={link}><button className="text-xs text-gray-400 hover:text-primary transition-colors">{link}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Contact Us</h4>
              <p className="text-xs text-gray-400">plp@plp.edu.ph</p>
              <p className="text-xs text-gray-400 mt-1">(02) 123-4567</p>
              <p className="text-xs text-gray-400 mt-1">Pasig City, Metro Manila</p>
            </div>
          </div>
          <p className="text-xs text-gray-300 text-center mt-8">© 2024 PLP Job Placement Office. All rights reserved.</p>
        </footer>
      </div>
    </AlumniLayout>
  )
}
