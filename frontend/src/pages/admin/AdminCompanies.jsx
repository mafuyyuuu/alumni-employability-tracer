import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdAdd, MdSearch, MdEdit, MdDelete, MdBusiness } from 'react-icons/md'
import api from '../../services/api'

const colors = ['#6366f1', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ef4444']

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', location: '' })
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)

  function fetchCompanies() {
    api.get('/companies').then(r => setCompanies(r.data.companies || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchCompanies() }, [])

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry.toLowerCase().includes(search.toLowerCase())
  )

  function addCompany(e) {
    e.preventDefault()
    api.post('/companies', { ...form, status: 'Active' }).then(r => {
      setCompanies(prev => [{ id: r.data.id, ...form, openings: 0, status: 'Active', color: colors[0] }, ...prev])
      setForm({ name: '', industry: '', location: '' })
      setShowForm(false)
    }).catch(() => alert('Failed to add company'))
  }

  function deleteCompany() {
    api.delete(`/companies/${deleteId}`).then(() => {
      setCompanies(prev => prev.filter(c => c.id !== deleteId))
      setDeleteId(null)
    }).catch(() => alert('Failed to delete company'))
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Companies</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage partner companies and job listings</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block"><p className="text-xs font-semibold text-gray-700">Admin</p><p className="text-xs text-gray-400">Administrator</p></div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#0f2d1a' }}>A</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input type="text" placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#0f2d1a' }}>
            <MdAdd className="text-lg" /> Add Company
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Company</h3>
            <form onSubmit={addCompany} className="flex flex-col sm:flex-row gap-3">
              <input required placeholder="Company name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              <input required placeholder="Industry" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              <input required placeholder="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'rgba(15,45,26,0.2)' }} />
              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#0f2d1a' }}>Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="hidden sm:grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100">
            <span className="col-span-4">Company</span><span className="col-span-2">Industry</span>
            <span className="col-span-2">Location</span><span className="col-span-2 text-center">Openings</span>
            <span className="col-span-1 text-center">Status</span><span className="col-span-1 text-right">Actions</span>
          </div>

          {loading && <p className="py-12 text-center text-sm text-gray-400">Loading…</p>}

          {filtered.map((c, i) => (
            <div key={c.id} className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: colors[i % colors.length] }}>
                  {c.name[0]}
                </div>
                <span className="text-sm font-semibold text-gray-800 truncate">{c.name}</span>
              </div>
              <span className="col-span-2 text-xs text-gray-500">{c.industry}</span>
              <span className="col-span-2 text-xs text-gray-500">{c.location}</span>
              <div className="col-span-2 text-center">
                <span className="text-xs font-bold" style={{ color: c.openings > 0 ? '#0f2d1a' : '#9ca3af' }}>{c.openings}</span>
              </div>
              <div className="col-span-1 flex justify-center">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={c.status === 'Active' ? { background: '#e6ede8', color: '#0f2d1a' } : { background: '#f3f4f6', color: '#9ca3af' }}>
                  {c.status}
                </span>
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                <button className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50"><MdEdit className="text-sm" /></button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"><MdDelete className="text-sm" /></button>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <MdBusiness className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No companies found</p>
            </div>
          )}
        </div>

        {deleteId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Remove Company?</h3>
              <p className="text-xs text-gray-500 mb-5">This will also remove all associated job listings.</p>
              <div className="flex gap-3">
                <button onClick={deleteCompany} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">Remove</button>
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
