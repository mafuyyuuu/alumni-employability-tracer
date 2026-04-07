import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import { MdCheckCircle } from 'react-icons/md'
import api from '../../services/api'

const statusOptions = [
  { value: 'hired',     label: 'Hired via Platform',    desc: 'I found and got a job through this platform',   icon: '🎉' },
  { value: 'looking',   label: 'Still Looking',          desc: 'I am actively searching for opportunities',     icon: '🔍' },
  { value: 'elsewhere', label: 'Hired Elsewhere',        desc: 'I found employment through another channel',    icon: '💼' },
]

export default function FeedbackForm() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ company: '', position: '', duration: '', workSetup: '', employmentType: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!status) { setError('Please select your employment status.'); return }
    setSubmitting(true)
    setError('')
    try {
      await api.post('/feedback', { status, ...form })
      setSubmitted(true)
    } catch {
      setError('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const input = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
  const select = `${input} cursor-pointer`
  const labelCls = 'block text-xs font-semibold mb-1.5'

  if (submitted) {
    return (
      <AlumniLayout>
        <div className="px-4 sm:px-6 py-16 flex flex-col items-center page-enter">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#f0faf5' }}>
            <MdCheckCircle className="text-5xl" style={{ color: '#2d6a4f' }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Feedback Submitted!</h2>
          <p className="text-sm text-gray-400 mb-8 text-center max-w-sm">
            Thank you for sharing your experience. Your feedback helps future PLP alumni.
          </p>
          <button
            onClick={() => navigate('/alumni/dashboard')}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#2d6a4f' }}
          >
            Back to Dashboard
          </button>
        </div>
      </AlumniLayout>
    )
  }

  return (
    <AlumniLayout>
      <div className="px-4 sm:px-6 py-8 page-enter">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Share Your Experience</h1>
          <p className="text-sm text-gray-500 mt-1">Your feedback helps future PLP alumni find better opportunities</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {/* Status */}
            <div className="mb-7">
              <h2 className="text-sm font-bold text-gray-900 mb-1">
                Employment Status <span className="text-red-400">*</span>
              </h2>
              <p className="text-xs text-gray-400 mb-4">Select the option that best describes your current status</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {statusOptions.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex flex-col gap-1.5 border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                      status === opt.value
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-100 hover:border-primary-lighter bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <input type="radio" name="status" value={opt.value} checked={status === opt.value}
                      onChange={() => setStatus(opt.value)} className="hidden" />
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs font-bold" style={{ color: status === opt.value ? '#2d6a4f' : '#374151' }}>{opt.label}</span>
                    <span className="text-xs text-gray-400 leading-relaxed">{opt.desc}</span>
                    {status === opt.value && <MdCheckCircle className="text-base mt-1 self-end" style={{ color: '#2d6a4f' }} />}
                  </label>
                ))}
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>

            <div className="border-t border-gray-100 mb-7" />

            {/* Details */}
            <div className="mb-8">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Employment Details</h2>
              <p className="text-xs text-gray-400 mb-5">Fill in your employment information if applicable</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls} style={{ color: '#2d6a4f' }}>Company Name</label>
                  <input name="company" placeholder="e.g. Jollibee Foods Corp." value={form.company} onChange={handleChange} className={input} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#2d6a4f' }}>Job Position</label>
                  <input name="position" placeholder="e.g. Software Engineer" value={form.position} onChange={handleChange} className={input} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls} style={{ color: '#2d6a4f' }}>Duration</label>
                  <select name="duration" value={form.duration} onChange={handleChange} className={select}>
                    <option value="">Select duration</option>
                    <option>Less than 1 year</option><option>1–2 years</option>
                    <option>2–5 years</option><option>5+ years</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#2d6a4f' }}>Work Setup</label>
                  <select name="workSetup" value={form.workSetup} onChange={handleChange} className={select}>
                    <option value="">Select setup</option>
                    <option>On-site</option><option>Remote</option><option>Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#2d6a4f' }}>Employment Type</label>
                  <select name="employmentType" value={form.employmentType} onChange={handleChange} className={select}>
                    <option value="">Select type</option>
                    <option>Full-time</option><option>Part-time</option>
                    <option>Contract</option><option>Internship</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => navigate(-1)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-60"
                style={{ background: '#2d6a4f' }}>
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AlumniLayout>
  )
}
