import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import { MdPerson, MdSchool, MdWork } from 'react-icons/md'
import api from '../../services/api'

export default function ProfileSettings() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', age: '',
    degree: '', graduationYear: '',
    employed: false, workPosition: '', employerName: '', employmentType: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/alumni/profile').then(r => {
      const p = r.data.profile
      setForm({
        firstName: p.firstName || '', middleName: p.middleName || '',
        lastName: p.lastName || '', email: p.email || '', age: p.age || '',
        degree: p.degree || '', graduationYear: p.graduation_year || '',
        employed: p.employed || false,
        workPosition: p.workPosition || '',
        employerName: p.employerName || '',
        employmentType: p.employmentType || '',
      })
    }).catch(() => {})
  }, [])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  async function handleSave() {
    setSaving(true)
    try {
      await api.put('/alumni/profile', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      alert('Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
  const label = 'block text-xs font-semibold mb-1.5'
  const readOnly = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 cursor-not-allowed'

  return (
    <AlumniLayout>
      <div className="px-4 sm:px-6 py-8 page-enter">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Update your personal information and employment status</p>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-2xl p-5 mb-4 flex items-center gap-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0" style={{ background: '#0f2d1a' }}>
            {form.firstName?.[0] || '?'}
          </div>
          <div>
            <p className="font-bold text-gray-900">{form.firstName} {form.lastName}</p>
            <p className="text-sm text-gray-400">{form.email}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

          {/* Personal Information */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e6ede8' }}>
              <MdPerson className="text-sm" style={{ color: '#0f2d1a' }} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {['firstName', 'middleName', 'lastName'].map(n => (
              <div key={n}>
                <label className={label} style={{ color: '#0f2d1a' }}>{n === 'firstName' ? 'First Name' : n === 'middleName' ? 'Middle Name' : 'Last Name'}</label>
                <input name={n} value={form[n]} onChange={handleChange} className={input} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div>
              <label className={label} style={{ color: '#0f2d1a' }}>Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={input} />
            </div>
            <div>
              <label className={label} style={{ color: '#0f2d1a' }}>Age</label>
              <input name="age" type="number" value={form.age} onChange={handleChange} className={input} />
            </div>
          </div>

          <div className="border-t border-gray-100 mb-6" />

          {/* Academic Information — read-only */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e6ede8' }}>
              <MdSchool className="text-sm" style={{ color: '#0f2d1a' }} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Academic Information</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold ml-1" style={{ background: '#f3f4f6', color: '#9ca3af' }}>Read-only</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div>
              <label className={label} style={{ color: '#6b7280' }}>Degree Program</label>
              <div className={readOnly}>{form.degree || <span className="text-gray-400">Not assigned</span>}</div>
            </div>
            <div>
              <label className={label} style={{ color: '#6b7280' }}>Graduation Year</label>
              <div className={readOnly}>{form.graduationYear || <span className="text-gray-400">Not assigned</span>}</div>
            </div>
          </div>

          <div className="border-t border-gray-100 mb-6" />

          {/* Employment Tracker */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e6ede8' }}>
              <MdWork className="text-sm" style={{ color: '#0f2d1a' }} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Employment Tracker</h2>
          </div>

          <div className="mb-4">
            <label className={label} style={{ color: '#0f2d1a' }}>Employment Status</label>
            <div className="flex gap-2">
              {['Employed', 'Unemployed'].map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(f => ({ ...f, employed: s === 'Employed' }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all"
                  style={
                    (s === 'Employed' && form.employed) || (s === 'Unemployed' && !form.employed)
                      ? { background: '#0f2d1a', color: '#fff', borderColor: '#0f2d1a' }
                      : { color: '#6b7280', borderColor: '#e5e7eb', background: '#fff' }
                  }>{s}</button>
              ))}
            </div>
          </div>

          {form.employed && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 p-4 rounded-xl" style={{ background: '#f9fafb' }}>
              <div>
                <label className={label} style={{ color: '#0f2d1a' }}>Job Title / Position</label>
                <input name="workPosition" value={form.workPosition} onChange={handleChange}
                  placeholder="e.g. Software Engineer" className={input} />
              </div>
              <div>
                <label className={label} style={{ color: '#0f2d1a' }}>Company / Employer</label>
                <input name="employerName" value={form.employerName} onChange={handleChange}
                  placeholder="e.g. Accenture PH" className={input} />
              </div>
              <div>
                <label className={label} style={{ color: '#0f2d1a' }}>Employment Type</label>
                <select name="employmentType" value={form.employmentType} onChange={handleChange} className={input}>
                  <option value="">Select type</option>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Freelance</option>
                  <option>Self-employed</option>
                  <option>Internship</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#0f2d1a' }}>
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </AlumniLayout>
  )
}
