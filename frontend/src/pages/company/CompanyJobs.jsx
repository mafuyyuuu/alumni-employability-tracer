import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import CompanyLayout from '../../components/company/CompanyLayout'
import {
  MdAdd, MdEdit, MdDelete, MdClose, MdWork, MdSearch,
  MdPeople, MdCheckCircle, MdCancel, MdHourglassEmpty, MdArrowBack,
} from 'react-icons/md'
import api from '../../services/api'

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship']
const CATEGORIES = ['IT & Software', 'Business', 'Healthcare', 'Education', 'Engineering', 'Hospitality', 'Finance', 'Other']

const statusStyle = {
  Pending:  { bg: '#fffbeb', color: '#b45309', Icon: MdHourglassEmpty },
  Accepted: { bg: '#f0fdf4', color: '#15803d', Icon: MdCheckCircle },
  Rejected: { bg: '#fef2f2', color: '#dc2626', Icon: MdCancel },
}

function JobModal({ job, onClose, onSaved }) {
  const isEdit = !!job?.id
  const [form, setForm] = useState({
    title: job?.title || '',
    type: job?.type || 'Full-time',
    location: job?.location || '',
    salary: job?.salary || '',
    category: job?.category || '',
    description: job?.description || '',
    status: job?.status || 'Open',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function submit() {
    if (!form.title.trim()) { setError('Job title is required'); return }
    setSaving(true)
    setError('')
    const req = isEdit
      ? api.put(`/company/jobs/${job.id}`, form)
      : api.post('/company/jobs', form)
    req.then(() => { onSaved(); onClose() })
       .catch(e => setError(e.response?.data?.error || 'Save failed'))
       .finally(() => setSaving(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-gray-900">{isEdit ? 'Edit Job' : 'Post New Job'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose /></button>
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Job Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              placeholder="e.g. Software Engineer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                placeholder="e.g. Pasig City" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Salary Range</label>
              <input value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                placeholder="e.g. ₱20,000–₱35,000" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
              <option value="">— Select category —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 resize-none"
              placeholder="Describe the role, requirements, and benefits…" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#0f2d1a' }}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Post Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplicantsPanel({ job, onClose }) {
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    api.get(`/company/jobs/${job.id}/applicants`)
      .then(r => setApplicants(r.data.applicants || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [job.id])

  function updateStatus(appId, status) {
    setUpdating(appId)
    api.put(`/company/applications/${appId}/status`, { status })
      .then(() => {
        setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
      })
      .catch(() => {})
      .finally(() => setUpdating(null))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <MdArrowBack className="text-lg" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{job.title}</p>
            <p className="text-xs text-gray-400">{applicants.length} applicant{applicants.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <MdClose />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && <p className="text-sm text-gray-400 text-center py-10">Loading…</p>}

          {!loading && applicants.length === 0 && (
            <div className="text-center py-14">
              <MdPeople className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No applicants yet</p>
            </div>
          )}

          {applicants.map(a => {
            const s = statusStyle[a.status] || statusStyle.Pending
            const Icon = s.Icon
            const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Unknown'
            return (
              <div key={a.id} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: '#0f2d1a' }}>
                      {name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-500">{a.email}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: s.bg, color: s.color }}>
                    <Icon className="text-xs" />{a.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: '#e6ede8', color: '#0f2d1a' }}>{a.course}</span>
                  {a.graduation_year && (
                    <span className="text-xs text-gray-400">Class of {a.graduation_year}</span>
                  )}
                  {a.avg_grade > 0 && (
                    <span className="text-xs text-gray-400">GWA {a.avg_grade?.toFixed(1)}</span>
                  )}
                </div>

                <p className="text-[10px] text-gray-400 mt-2">
                  Applied {a.applied_at?.slice(0, 10)}
                </p>

                {a.cover_letter && (
                  <p className="text-xs text-gray-500 mt-2 bg-white rounded-xl p-3 border border-gray-100 leading-relaxed">
                    {a.cover_letter}
                  </p>
                )}

                {a.status === 'Pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateStatus(a.id, 'Accepted')}
                      disabled={updating === a.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 hover:opacity-90"
                      style={{ background: '#0f2d1a' }}>
                      <MdCheckCircle className="text-sm" />
                      {updating === a.id ? 'Saving…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => updateStatus(a.id, 'Rejected')}
                      disabled={updating === a.id}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 hover:bg-red-50"
                      style={{ color: '#dc2626', border: '1.5px solid #fecaca' }}>
                      <MdCancel className="text-sm" />
                      {updating === a.id ? 'Saving…' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CompanyJobs() {
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [applicantsJob, setApplicantsJob] = useState(null)

  function fetchJobs() {
    setLoading(true)
    api.get('/company/jobs', { params: { search, status: statusFilter } })
      .then(r => setJobs(r.data.jobs || []))
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchJobs() }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (searchParams.get('new') === '1') setModal('new')
  }, [searchParams])

  function deleteJob(id) {
    if (!window.confirm('Delete this job posting?')) return
    setDeleting(id)
    api.delete(`/company/jobs/${id}`).then(() => {
      setJobs(prev => prev.filter(j => j.id !== id))
    }).catch(() => {}).finally(() => setDeleting(null))
  }

  return (
    <CompanyLayout>
      {modal !== null && (
        <JobModal
          job={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={fetchJobs}
        />
      )}

      {applicantsJob && (
        <ApplicantsPanel job={applicantsJob} onClose={() => setApplicantsJob(null)} />
      )}

      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Job Postings</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your company's job listings visible to PLP alumni</p>
          </div>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#0f2d1a' }}>
            <MdAdd /> Post Job
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input type="text" placeholder="Search jobs…" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchJobs()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none" />
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {['', 'Open', 'Closed'].map(s => (
              <button key={s}
                onClick={() => { setStatusFilter(s); setLoading(true); api.get('/company/jobs', { params: { search, status: s } }).then(r => setJobs(r.data.jobs || [])).finally(() => setLoading(false)) }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={statusFilter === s ? { background: '#0f2d1a', color: '#fff' } : { color: '#6b7280' }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Job list */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="hidden md:grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100">
            <span className="col-span-4">Title</span>
            <span className="col-span-2">Type</span>
            <span className="col-span-2">Location</span>
            <span className="col-span-2 text-center">Status</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {loading && <p className="py-12 text-center text-sm text-gray-400">Loading…</p>}

          {!loading && jobs.length === 0 && (
            <div className="py-16 text-center">
              <MdWork className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No job postings found</p>
              <button onClick={() => setModal('new')}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: '#0f2d1a' }}>
                Post your first job
              </button>
            </div>
          )}

          {jobs.map(job => (
            <div key={job.id} className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#0f2d1a' }}>{(job.title || 'J')[0]}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{job.title}</p>
                  {job.salary && <p className="text-xs text-gray-400">{job.salary}</p>}
                </div>
              </div>
              <span className="col-span-2 text-xs text-gray-500">{job.type}</span>
              <span className="col-span-2 text-xs text-gray-500">{job.location || 'N/A'}</span>
              <div className="col-span-2 flex justify-center">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={job.status === 'Open' ? { background: '#e6ede8', color: '#0f2d1a' } : { background: '#f3f4f6', color: '#9ca3af' }}>
                  {job.status}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                <button onClick={() => setApplicantsJob(job)}
                  className="p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
                  title="View applicants">
                  <MdPeople className="text-sm" />
                </button>
                <button onClick={() => setModal(job)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                  <MdEdit className="text-sm" />
                </button>
                <button onClick={() => deleteJob(job.id)} disabled={deleting === job.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40">
                  <MdDelete className="text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CompanyLayout>
  )
}
