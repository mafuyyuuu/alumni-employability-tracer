import { useState, useEffect } from 'react'
import CompanyLayout from '../../components/company/CompanyLayout'
import { MdBusiness, MdLock, MdSave } from 'react-icons/md'
import api from '../../services/api'

export default function CompanyProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    api.get('/company/profile').then(r => {
      setProfile(r.data)
      setForm({
        first_name: r.data.first_name || '',
        last_name: r.data.last_name || '',
        email: r.data.email || '',
        company_name: r.data.company_name || '',
        industry: r.data.industry || '',
        location: r.data.location || '',
        size: r.data.size || '',
        description: r.data.description || '',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function saveProfile() {
    setSaving(true)
    setError('')
    setSaved(false)
    api.put('/company/profile', form).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }).catch(e => setError(e.response?.data?.error || 'Save failed'))
    .finally(() => setSaving(false))
  }

  function changePassword() {
    if (!pwForm.current_password || !pwForm.new_password) { setPwError('All fields required'); return }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match'); return }
    if (pwForm.new_password.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setPwSaving(true)
    setPwError('')
    setPwSaved(false)
    api.put('/company/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password })
      .then(() => { setPwSaved(true); setPwForm({ current_password: '', new_password: '', confirm_password: '' }); setTimeout(() => setPwSaved(false), 2000) })
      .catch(e => setPwError(e.response?.data?.error || 'Failed to change password'))
      .finally(() => setPwSaving(false))
  }

  if (loading) return (
    <CompanyLayout>
      <div className="p-6"><p className="text-sm text-gray-400">Loading…</p></div>
    </CompanyLayout>
  )

  return (
    <CompanyLayout>
      <div className="p-4 sm:p-6 page-enter max-w-2xl">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your company information and account settings</p>
        </div>

        {/* Company info */}
        <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <MdBusiness className="text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">Company Information</h2>
          </div>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                type="email"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
            </div>

            {profile?.company_id && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name</label>
                  <input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Industry</label>
                    <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                      placeholder="e.g. IT Services" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                    <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                      placeholder="e.g. Pasig City" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Company Size</label>
                  <select value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
                    <option value="">— Select size —</option>
                    <option value="Small">Small (1–50)</option>
                    <option value="Medium">Medium (51–200)</option>
                    <option value="Large">Large (200+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">About the Company</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 resize-none"
                    placeholder="Brief description of your company…" />
                </div>
              </>
            )}
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: '#0f2d1a' }}>
            <MdSave />
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <MdLock className="text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">Change Password</h2>
          </div>
          {pwError && <p className="text-xs text-red-500 mb-3">{pwError}</p>}
          {pwSaved && <p className="text-xs text-green-600 mb-3">Password changed successfully.</p>}
          <div className="space-y-3">
            {[['current_password','Current Password'],['new_password','New Password'],['confirm_password','Confirm New Password']].map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                <input type="password" value={pwForm[k]} onChange={e => setPwForm(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
              </div>
            ))}
          </div>
          <button onClick={changePassword} disabled={pwSaving}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: '#0f2d1a' }}>
            <MdLock />
            {pwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </div>
    </CompanyLayout>
  )
}
