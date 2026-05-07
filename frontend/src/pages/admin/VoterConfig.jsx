import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdSave, MdRefresh, MdToggleOn, MdToggleOff, MdAutoFixHigh } from 'react-icons/md'
import api from '../../services/api'

const defaultFields = [
  { id: 1, name: 'GPA / Average Grade',  key: 'gpa',         enabled: true,  weight: 25 },
  { id: 2, name: 'Professional Grade',   key: 'prof_grade',  enabled: true,  weight: 20 },
  { id: 3, name: 'Elective Grade',       key: 'elec_grade',  enabled: true,  weight: 15 },
  { id: 4, name: 'OJT Grade',            key: 'ojt_grade',   enabled: true,  weight: 15 },
  { id: 5, name: 'Soft Skills Average',  key: 'soft_skills', enabled: true,  weight: 10 },
  { id: 6, name: 'Hard Skills Average',  key: 'hard_skills', enabled: true,  weight: 10 },
  { id: 7, name: 'Age',                  key: 'age',         enabled: false, weight: 5  },
  { id: 8, name: 'Gender',               key: 'gender',      enabled: false, weight: 0  },
]

export default function VoterConfig() {
  const [fields, setFields] = useState(defaultFields)
  const [useVoterWeights, setUseVoterWeights] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState('')

  useEffect(() => {
    api.get('/admin/voter-config').then(r => {
      if (r.data.config && r.data.config.length) setFields(r.data.config)
      setUseVoterWeights(Boolean(r.data.use_voter_weights))
    }).catch(() => {})
  }, [])

  function toggle(id) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
    setSaved(false)
  }

  function setWeight(id, val) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, weight: Number(val) } : f))
    setSaved(false)
  }

  function save() {
    setSaving(true)
    api.put('/admin/voter-config', { config: fields, use_voter_weights: useVoterWeights }).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }).catch(() => alert('Failed to save configuration')).finally(() => setSaving(false))
  }

  function reset() {
    setFields(defaultFields)
    setUseVoterWeights(false)
    setSaved(false)
  }

  async function applySuggestedWeights() {
    setSuggesting(true)
    setSuggestError('')
    setSaved(false)
    try {
      const r = await api.post('/admin/voter-config/suggest', {})
      if (r.data?.config?.length) {
        setFields(r.data.config)
      }
    } catch (err) {
      setSuggestError(err.response?.data?.error || 'Unable to load ML suggested weights')
    } finally {
      setSuggesting(false)
    }
  }

  const totalWeight = fields.filter(f => f.enabled).reduce((s, f) => s + f.weight, 0)

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Voter Configuration</h1>
            <p className="text-sm text-gray-400 mt-0.5">Configure which factors influence employment predictions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700">Admin</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#0f2d1a' }}>A</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Fields config table */}
          <div className="flex-1 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="mb-5 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Prediction Decision Mode</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {useVoterWeights
                      ? 'Voter weights are the active decision maker for employability prediction.'
                      : 'ML model is the default decision maker. Voter weights are saved but inactive.'}
                  </p>
                </div>
                <button
                  onClick={() => { setUseVoterWeights(prev => !prev); setSaved(false) }}
                  className="text-3xl transition-colors"
                  style={{ color: useVoterWeights ? '#0f2d1a' : '#d1d5db' }}
                  title="Toggle prediction mode"
                >
                  {useVoterWeights ? <MdToggleOn /> : <MdToggleOff />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-gray-900">Prediction Factors</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: totalWeight === 100 || !useVoterWeights ? '#e6ede8' : '#fff7ed',
                  color: totalWeight === 100 || !useVoterWeights ? '#0f2d1a' : '#ea580c',
                }}>
                Total: {totalWeight}%{totalWeight !== 100 && useVoterWeights ? ' (should be 100%)' : ''}
              </span>
            </div>

            {!useVoterWeights && (
              <p className="text-xs text-gray-400 mb-2">
                Voter weighting is currently inactive. These factors are saved as standby configuration.
              </p>
            )}

            <div
              className="grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1"
              style={!useVoterWeights ? { filter: 'grayscale(100%) blur(0.2px)', opacity: 0.65 } : {}}
            >
              <span className="col-span-1">On</span>
              <span className="col-span-5">Factor</span>
              <span className="col-span-3">Variable Key</span>
              <span className="col-span-3 text-right">Weight (%)</span>
            </div>

            <div
              className="space-y-2"
              style={!useVoterWeights ? { filter: 'grayscale(100%) blur(0.2px)', opacity: 0.65 } : {}}
            >
              {fields.map(f => (
                <div key={f.id} className="grid grid-cols-12 items-center p-3 rounded-xl transition-all"
                  style={{ background: f.enabled ? '#f9fafb' : '#fafafa', opacity: f.enabled ? 1 : 0.55 }}>
                  <div className="col-span-1">
                    <button onClick={() => toggle(f.id)} className="text-2xl transition-colors" style={{ color: f.enabled ? '#0f2d1a' : '#d1d5db' }}>
                      {f.enabled ? <MdToggleOn /> : <MdToggleOff />}
                    </button>
                  </div>
                  <div className="col-span-5">
                    <p className="text-sm font-semibold text-gray-700">{f.name}</p>
                  </div>
                  <div className="col-span-3">
                    <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{f.key}</code>
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <input type="number" min={0} max={100} value={f.weight} disabled={!f.enabled}
                      onChange={e => setWeight(f.id, e.target.value)}
                      className="w-16 text-right border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-40 focus:outline-none focus:ring-1"
                      style={{ '--tw-ring-color': '#0f2d1a' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between flex-wrap gap-3 mt-5 pt-5 border-t border-gray-100">
              <button
                onClick={applySuggestedWeights}
                disabled={suggesting}
                className="px-5 py-2.5 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {suggesting ? 'Applying…' : <><MdAutoFixHigh /> Use ML Suggested Weights</>}
              </button>
              <div className="flex gap-3">
              <button onClick={reset}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <MdRefresh /> Reset
              </button>
              <button onClick={save} disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                style={{ background: '#0f2d1a' }}>
                {saved ? <><span>✓</span> Saved!</> : <><MdSave /> Save Configuration</>}
              </button>
              </div>
            </div>
            {suggestError && <p className="text-xs text-red-500 mt-3">{suggestError}</p>}
          </div>

          {/* Info panel */}
            <div className="w-full lg:w-64 space-y-4">
            <div
              className="bg-white rounded-2xl p-5"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                ...(useVoterWeights ? {} : { filter: 'grayscale(100%) blur(0.2px)', opacity: 0.65 }),
              }}
            >
              <h3 className="text-xs font-bold text-gray-900 mb-3">Active Factors</h3>
              <div className="space-y-2">
                {fields.filter(f => f.enabled).map(f => (
                  <div key={f.id} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{f.name}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${f.weight * 1.2}px`, background: '#0f2d1a', minWidth: 4 }} />
                      <span className="text-xs font-bold" style={{ color: '#0f2d1a' }}>{f.weight}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-xs font-bold text-gray-900 mb-2">Notes</h3>
              <ul className="space-y-2 text-xs text-gray-500">
                <li className="flex gap-2"><span className="text-green-500 flex-shrink-0">•</span> Weights must sum to 100%</li>
                <li className="flex gap-2"><span className="text-green-500 flex-shrink-0">•</span> Disabled factors are excluded from the model</li>
                <li className="flex gap-2"><span className="text-green-500 flex-shrink-0">•</span> ML mode is default; voter mode is optional via toggle above</li>
                <li className="flex gap-2"><span className="text-green-500 flex-shrink-0">•</span> Voter settings apply to employability prediction, not ARIMA trend forecasting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
