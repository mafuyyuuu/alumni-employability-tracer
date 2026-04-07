import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdSave, MdRefresh, MdToggleOn, MdToggleOff } from 'react-icons/md'
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
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/voter-config').then(r => {
      if (r.data.config && r.data.config.length) setFields(r.data.config)
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
    api.put('/admin/voter-config', { config: fields }).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }).catch(() => alert('Failed to save configuration')).finally(() => setSaving(false))
  }

  function reset() {
    setFields(defaultFields)
    setSaved(false)
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#2d6a4f' }}>A</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Fields config table */}
          <div className="flex-1 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-gray-900">Prediction Factors</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: totalWeight === 100 ? '#f0faf5' : '#fff7ed', color: totalWeight === 100 ? '#2d6a4f' : '#ea580c' }}>
                Total: {totalWeight}%{totalWeight !== 100 ? ' (should be 100%)' : ''}
              </span>
            </div>

            <div className="grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
              <span className="col-span-1">On</span>
              <span className="col-span-5">Factor</span>
              <span className="col-span-3">Variable Key</span>
              <span className="col-span-3 text-right">Weight (%)</span>
            </div>

            <div className="space-y-2">
              {fields.map(f => (
                <div key={f.id} className="grid grid-cols-12 items-center p-3 rounded-xl transition-all"
                  style={{ background: f.enabled ? '#f9fafb' : '#fafafa', opacity: f.enabled ? 1 : 0.55 }}>
                  <div className="col-span-1">
                    <button onClick={() => toggle(f.id)} className="text-2xl transition-colors" style={{ color: f.enabled ? '#2d6a4f' : '#d1d5db' }}>
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
                      style={{ '--tw-ring-color': '#2d6a4f' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-gray-100">
              <button onClick={reset}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <MdRefresh /> Reset
              </button>
              <button onClick={save} disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                style={{ background: '#2d6a4f' }}>
                {saved ? <><span>✓</span> Saved!</> : <><MdSave /> Save Configuration</>}
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div className="w-full lg:w-64 space-y-4">
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-xs font-bold text-gray-900 mb-3">Active Factors</h3>
              <div className="space-y-2">
                {fields.filter(f => f.enabled).map(f => (
                  <div key={f.id} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{f.name}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${f.weight * 1.2}px`, background: '#2d6a4f', minWidth: 4 }} />
                      <span className="text-xs font-bold" style={{ color: '#2d6a4f' }}>{f.weight}%</span>
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
                <li className="flex gap-2"><span className="text-green-500 flex-shrink-0">•</span> Changes take effect on the next forecast run</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
