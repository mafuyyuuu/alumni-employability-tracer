import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import { MdPerson, MdSchool } from 'react-icons/md'
import api from '../../services/api'

export default function ProfileSettings() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', age: '',
    degree: '', avgGrade: '', avgProfGrade: '',
    avgElecGrade: '', ojtGrade: '', softSkills: '', hardSkills: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/alumni/profile').then(r => {
      const p = r.data.profile
      setForm({
        firstName: p.firstName || '', middleName: p.middleName || '',
        lastName: p.lastName || '', email: p.email || '', age: p.age || '',
        degree: p.degree || '', avgGrade: p.avgGrade || '',
        avgProfGrade: p.avgProfGrade || '', avgElecGrade: p.avgElecGrade || '',
        ojtGrade: p.ojtGrade || '', softSkills: p.softSkills || '', hardSkills: p.hardSkills || '',
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
    } catch (err) {
      alert('Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
  const label = 'block text-xs font-semibold mb-1.5'

  const Field = ({ name, label: lbl, type = 'text', step }) => (
    <div>
      <label className={label} style={{ color: '#2d6a4f' }}>{lbl}</label>
      <input name={name} type={type} step={step} value={form[name]} onChange={handleChange} className={input} />
    </div>
  )

  return (
    <AlumniLayout>
      <div className="px-4 sm:px-6 py-8 page-enter">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Update your personal and academic information</p>
        </div>

        {/* Avatar section */}
        <div className="bg-white rounded-2xl p-5 mb-4 flex items-center gap-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0" style={{ background: '#2d6a4f' }}>
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
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f0faf5' }}>
              <MdPerson className="text-sm" style={{ color: '#2d6a4f' }} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Field name="firstName" label="First Name" />
            <Field name="middleName" label="Middle Name" />
            <Field name="lastName" label="Last Name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Field name="email" label="Email Address" type="email" />
            <Field name="age" label="Age" type="number" />
          </div>

          <div className="border-t border-gray-100 mb-6" />

          {/* Academic Information */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f0faf5' }}>
              <MdSchool className="text-sm" style={{ color: '#2d6a4f' }} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Academic Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={label} style={{ color: '#2d6a4f' }}>Degree Program</label>
              <select name="degree" value={form.degree} onChange={handleChange} className={input}>
                <option value="">Select your program</option>
                <option value="BSCS">BSCS – Bachelor of Science in Computer Science</option>
                <option value="BSIT">BSIT – Bachelor of Science in Information Technology</option>
                <option value="BSBA">BSBA – Bachelor of Science in Business Administration</option>
                <option value="BSA">BSA – Bachelor of Science in Accountancy</option>
                <option value="BSEd">BSEd – Bachelor of Science in Education</option>
                <option value="BSHM">BSHM – Bachelor of Science in Hospitality Management</option>
                <option value="BSN">BSN – Bachelor of Science in Nursing</option>
              </select>
            </div>
            <Field name="avgGrade" label="Average Grade" type="number" step="0.01" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Field name="avgProfGrade" label="Professional Grade Avg" type="number" step="0.01" />
            <Field name="avgElecGrade" label="Elective Grade Avg" type="number" step="0.01" />
            <Field name="ojtGrade" label="OJT Grade" type="number" step="0.01" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Field name="softSkills" label="Soft Skills Average" type="number" step="0.01" />
            <Field name="hardSkills" label="Hard Skills Average" type="number" step="0.01" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-60"
              style={{ background: '#2d6a4f' }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </AlumniLayout>
  )
}
