import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdAdd, MdEdit, MdDelete, MdClose, MdSchool, MdCheck } from 'react-icons/md'
import api from '../../services/api'

function ProgramModal({ program, onClose, onSaved }) {
  const isEdit = !!program?.id
  const [form, setForm] = useState({
    name: program?.name || '',
    code: program?.code || '',
    has_board_exam: program?.has_board_exam || false,
    board_exam_name: program?.board_exam_name || '',
    description: program?.description || '',
    status: program?.status || 'Active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function submit() {
    if (!form.name.trim()) { setError('Program name is required'); return }
    setSaving(true)
    setError('')
    const req = isEdit
      ? api.put(`/admin/programs/${program.id}`, form)
      : api.post('/admin/programs', form)
    req.then(() => { onSaved(); onClose() })
       .catch(e => setError(e.response?.data?.error || 'Save failed'))
       .finally(() => setSaving(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-gray-900">{isEdit ? 'Edit Program' : 'Add Program'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose /></button>
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Program Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              placeholder="e.g. Bachelor of Science in Computer Science" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Program Code</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                placeholder="e.g. BSCS" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Board exam toggle */}
          <div className="flex items-center gap-3 py-2">
            <button onClick={() => setForm(p => ({ ...p, has_board_exam: !p.has_board_exam }))}
              className="w-10 h-6 rounded-full transition-all flex-shrink-0 relative"
              style={{ background: form.has_board_exam ? '#0f2d1a' : '#e5e7eb' }}>
              <span className="absolute top-0.5 transition-all w-5 h-5 bg-white rounded-full shadow"
                style={{ left: form.has_board_exam ? '1.25rem' : '0.125rem' }} />
            </button>
            <span className="text-sm font-semibold text-gray-700">Has Board/Licensure Exam</span>
          </div>

          {form.has_board_exam && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Board/Licensure Exam Name</label>
              <input value={form.board_exam_name} onChange={e => setForm(p => ({ ...p, board_exam_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                placeholder="e.g. Electronics Engineering Licensure Exam" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 resize-none"
              placeholder="Brief description of the program…" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#0f2d1a' }}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompanyAccountsModal({ onClose }) {
  const [accounts, setAccounts] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: 'company123', company_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/company-accounts'),
      api.get('/companies'),
    ]).then(([accRes, compRes]) => {
      setAccounts(accRes.data.accounts || [])
      setCompanies(compRes.data.companies || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function createAccount() {
    if (!form.first_name || !form.email) { setError('Name and email required'); return }
    setSaving(true)
    setError('')
    api.post('/admin/company-accounts', form).then(() => {
      api.get('/admin/company-accounts').then(r => setAccounts(r.data.accounts || []))
      setShowCreate(false)
      setForm({ first_name: '', last_name: '', email: '', password: 'company123', company_id: '' })
    }).catch(e => setError(e.response?.data?.error || 'Failed'))
    .finally(() => setSaving(false))
  }

  function deleteAccount(id) {
    if (!window.confirm('Delete this company account?')) return
    api.delete(`/admin/company-accounts/${id}`).then(() => {
      setAccounts(prev => prev.filter(a => a.id !== id))
    }).catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-900">Company Accounts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose /></button>
        </div>

        {showCreate && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 flex-shrink-0">
            <p className="text-xs font-bold text-gray-700 mb-3">New Company Account</p>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[['first_name','First Name'],['last_name','Last Name'],['email','Email'],['password','Password']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{l}</label>
                  <input value={form[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-green-400" />
                </div>
              ))}
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Link to Company</label>
              <select value={form.company_id} onChange={e => setForm(p => ({...p, company_id: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none">
                <option value="">— None —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600">Cancel</button>
              <button onClick={createAccount} disabled={saving}
                className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60" style={{ background: '#0f2d1a' }}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
          ) : accounts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No company accounts yet</p>
          ) : (
            <div className="space-y-2">
              {accounts.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: '#0f2d1a' }}>{a.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                    {a.company_name && <p className="text-xs text-gray-500">{a.company_name} · {a.industry}</p>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={a.status === 'Active' ? { background: '#e6ede8', color: '#0f2d1a' } : { background: '#f3f4f6', color: '#9ca3af' }}>
                    {a.status}
                  </span>
                  <button onClick={() => deleteAccount(a.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <MdDelete className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white"
            style={{ background: '#0f2d1a' }}>
            <MdAdd /> Add Account
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Programs() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | program object
  const [showCompanyAccounts, setShowCompanyAccounts] = useState(false)
  const [deleting, setDeleting] = useState(null)

  function fetchPrograms() {
    setLoading(true)
    api.get('/admin/programs').then(r => setPrograms(r.data.programs || []))
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPrograms() }, [])

  function deleteProgram(id) {
    if (!window.confirm('Delete this program?')) return
    setDeleting(id)
    api.delete(`/admin/programs/${id}`).then(fetchPrograms).catch(() => {}).finally(() => setDeleting(null))
  }

  const boardExamPrograms = programs.filter(p => p.has_board_exam)
  const nonBoardPrograms = programs.filter(p => !p.has_board_exam)

  return (
    <AdminLayout>
      {modal !== null && (
        <ProgramModal
          program={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={fetchPrograms}
        />
      )}
      {showCompanyAccounts && (
        <CompanyAccountsModal onClose={() => setShowCompanyAccounts(false)} />
      )}

      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Programs</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage academic programs, board exam flags, and company accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCompanyAccounts(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              Company Accounts
            </button>
            <button onClick={() => setModal('create')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: '#0f2d1a' }}>
              <MdAdd /> Add Program
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Programs', value: programs.length, color: '#0f2d1a' },
            { label: 'With Board Exam', value: boardExamPrograms.length, color: '#2d6a4f' },
            { label: 'Active Programs', value: programs.filter(p => p.status === 'Active').length, color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Board exam programs */}
        {boardExamPrograms.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <MdSchool style={{ color: '#2d6a4f' }} />
              <h2 className="text-sm font-bold text-gray-900">Programs with Board/Licensure Exams</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#e6ede8', color: '#0f2d1a' }}>
                Board Passers tracked
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {boardExamPrograms.map(p => (
                <ProgramCard key={p.id} program={p} onEdit={() => setModal(p)} onDelete={() => deleteProgram(p.id)} deleting={deleting === p.id} />
              ))}
            </div>
          </div>
        )}

        {/* Non-board programs */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Other Programs</h2>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : nonBoardPrograms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No programs yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nonBoardPrograms.map(p => (
                <ProgramCard key={p.id} program={p} onEdit={() => setModal(p)} onDelete={() => deleteProgram(p.id)} deleting={deleting === p.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function ProgramCard({ program: p, onEdit, onDelete, deleting }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {p.code && (
              <span className="text-xs font-black px-2 py-0.5 rounded-lg"
                style={{ background: '#e6ede8', color: '#0f2d1a' }}>{p.code}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={p.status === 'Active' ? { background: '#f0fdf4', color: '#16a34a' } : { background: '#f3f4f6', color: '#9ca3af' }}>
              {p.status}
            </span>
          </div>
          <p className="text-sm font-bold text-gray-900 leading-snug">{p.name}</p>
          {p.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>}
        </div>
      </div>

      {p.has_board_exam && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ background: '#e6ede8' }}>
          <MdCheck className="text-sm flex-shrink-0" style={{ color: '#2d6a4f' }} />
          <div className="min-w-0">
            <p className="text-xs font-bold" style={{ color: '#0f2d1a' }}>Board Exam Required</p>
            {p.board_exam_name && <p className="text-xs truncate" style={{ color: '#2d6a4f' }}>{p.board_exam_name}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <button onClick={onEdit}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
          <MdEdit className="text-sm" /> Edit
        </button>
        <button onClick={onDelete} disabled={deleting}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-40 flex items-center justify-center gap-1">
          <MdDelete className="text-sm" /> {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
