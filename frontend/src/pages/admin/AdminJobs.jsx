import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdAdd, MdSearch, MdEdit, MdDelete, MdWork } from 'react-icons/md'
import api from '../../services/api'

const typeStyle = {
  'Full-time':  { background: '#e6ede8', color: '#0f2d1a' },
  'Part-time':  { background: '#d8ede3', color: '#1a3d27' },
  'Contract':   { background: '#fff7ed', color: '#ea580c' },
  'Internship': { background: '#f0fdf4', color: '#2d6a4f' },
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState([])
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ title: '', company: '', type: 'Full-time', location: '', salary: '' })
  const [loading, setLoading] = useState(true)

  function fetchJobs() {
    api.get('/jobs').then(r => setJobs(r.data.jobs || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchJobs()
    api.get('/companies').then(r => setCompanies(r.data.companies || [])).catch(() => {})
  }, [])

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase())
  )

  function addJob(e) {
    e.preventDefault()
    api.post('/jobs', form).then(r => {
      setJobs(prev => [{ id: r.data.id, ...form, status: 'Open', posted: 'Today', color: '#0f2d1a' }, ...prev])
      setForm({ title: '', company: '', type: 'Full-time', location: '', salary: '' })
      setShowForm(false)
    }).catch(() => alert('Failed to add job'))
  }

  function deleteJob() {
    api.delete(`/jobs/${deleteId}`).then(() => {
      setJobs(prev => prev.filter(j => j.id !== deleteId))
      setDeleteId(null)
    }).catch(() => alert('Failed to delete job'))
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage all job listings on the platform</p>
          </div>
          <div className="flex items-center gap-3">
            
            
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input type="text" placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#0f2d1a' }}>
            <MdAdd className="text-lg" /> Add Job
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Job</h3>
            <form onSubmit={addJob} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input required placeholder="Job title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              <select required value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }}>
                <option value="">Select Company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none">
                {['Full-time', 'Part-time', 'Contract', 'Internship'].map(t => <option key={t}>{t}</option>)}
              </select>
              <input required placeholder="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              <input placeholder="Salary range (e.g. ₱20k–35k)" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#0f2d1a' }}>Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="hidden lg:grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100">
            <span className="col-span-3">Job Title</span><span className="col-span-2">Company</span>
            <span className="col-span-2">Type</span><span className="col-span-2">Location</span>
            <span className="col-span-1">Salary</span><span className="col-span-1 text-center">Status</span>
            <span className="col-span-1 text-right">Actions</span>
          </div>

          {loading && <p className="py-12 text-center text-sm text-gray-400">Loading…</p>}

          {filtered.map(j => (
            <div key={j.id} className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="col-span-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#e6ede8' }}>
                  <MdWork className="text-xs" style={{ color: '#0f2d1a' }} />
                </div>
                <span className="text-sm font-semibold text-gray-800 truncate">{j.title}</span>
              </div>
              <span className="col-span-2 text-xs text-gray-500">{j.company}</span>
              <div className="col-span-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={typeStyle[j.type] || typeStyle['Full-time']}>{j.type}</span>
              </div>
              <span className="col-span-2 text-xs text-gray-500">{j.location}</span>
              <span className="col-span-1 text-xs text-gray-500">{j.salary || 'N/A'}</span>
              <div className="col-span-1 flex justify-center">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={j.status === 'Open' ? { background: '#e6ede8', color: '#0f2d1a' } : { background: '#f3f4f6', color: '#9ca3af' }}>
                  {j.status}
                </span>
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <button className="p-1.5 text-gray-400 hover:text-green-700 transition-colors rounded-lg hover:bg-green-50"><MdEdit className="text-sm" /></button>
                <button onClick={() => setDeleteId(j.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"><MdDelete className="text-sm" /></button>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <MdWork className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No jobs found</p>
            </div>
          )}
        </div>

        {deleteId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Remove Job?</h3>
              <p className="text-xs text-gray-500 mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={deleteJob} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">Remove</button>
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
