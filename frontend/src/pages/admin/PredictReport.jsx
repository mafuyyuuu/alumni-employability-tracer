import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdPictureAsPdf, MdTableChart, MdDownload, MdFilterList } from 'react-icons/md'
import api from '../../services/api'

const ALL_FACTORS = [
  { key: 'name',          label: 'Name' },
  { key: 'email',         label: 'Email' },
  { key: 'course',        label: 'Program' },
  { key: 'graduation_year', label: 'Year' },
  { key: 'avg_grade',     label: 'GWA' },
  { key: 'avg_prof_grade',label: 'Prof Grade' },
  { key: 'avg_elec_grade',label: 'Elec Grade' },
  { key: 'ojt_grade',     label: 'OJT Grade' },
  { key: 'soft_skills',   label: 'Soft Skills' },
  { key: 'hard_skills',   label: 'Hard Skills' },
  { key: 'board_passer',  label: 'Board Passer' },
  { key: 'employed',      label: 'Employment Status' },
]

function CheckPill({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
      style={checked
        ? { background: '#0f2d1a', color: '#fff', borderColor: '#0f2d1a' }
        : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}>
      <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0"
        style={{ borderColor: checked ? '#fff' : '#d1d5db', background: checked ? '#fff' : 'transparent' }}>
        {checked && <span className="block w-2 h-2 rounded-full" style={{ background: '#0f2d1a' }} />}
      </span>
      {label}
    </button>
  )
}

export default function PredictReport() {
  const [format, setFormat] = useState('excel')
  const [availableYears, setAvailableYears] = useState([])
  const [availablePrograms, setAvailablePrograms] = useState([])
  const [selectedYears, setSelectedYears] = useState([])
  const [selectedPrograms, setSelectedPrograms] = useState([])
  const [selectedFactors, setSelectedFactors] = useState(ALL_FACTORS.map(f => f.key))
  const [downloading, setDownloading] = useState(false)
  const [rowCount, setRowCount] = useState(null)

  useEffect(() => {
    // Load available years from training data
    api.get('/admin/training-data/years').then(r => {
      const yrs = (r.data.years || []).map(y => y.year).sort((a, b) => b - a)
      setAvailableYears(yrs)
      setSelectedYears(yrs) // default: all selected
    }).catch(() => {})

    // Load available programs
    api.get('/admin/programs').then(r => {
      const progs = (r.data.programs || []).map(p => p.code).filter(Boolean)
      setAvailablePrograms(progs)
      setSelectedPrograms(progs)
    }).catch(() => {})
  }, [])

  // Count matching rows
  useEffect(() => {
    if (selectedYears.length === 0) { setRowCount(0); return }
    const params = new URLSearchParams()
    selectedYears.forEach(y => params.append('years', y))
    selectedPrograms.forEach(p => params.append('programs', p))
    api.get(`/admin/reports/count?${params}`)
      .then(r => setRowCount(r.data.count))
      .catch(() => setRowCount(null))
  }, [selectedYears, selectedPrograms])

  function toggleYear(yr) {
    setSelectedYears(prev => prev.includes(yr) ? prev.filter(y => y !== yr) : [...prev, yr])
  }
  function toggleProgram(p) {
    setSelectedPrograms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }
  function toggleFactor(k) {
    setSelectedFactors(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])
  }

  async function download() {
    if (selectedYears.length === 0) { alert('Select at least one year.'); return }
    setDownloading(true)
    try {
      const params = new URLSearchParams()
      params.append('format', format)
      selectedYears.forEach(y => params.append('years', y))
      selectedPrograms.forEach(p => params.append('programs', p))
      selectedFactors.forEach(f => params.append('factors', f))

      const token = localStorage.getItem('token')
      const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
      const res = await fetch(`${base}/admin/reports/download?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      if (format === 'excel') {
        a.download = `PLP_Report_${selectedYears.join('-')}.xlsx`
        a.click()
      } else {
        // PDF: open HTML in new tab for print
        window.open(url, '_blank')
      }
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to generate report. Try again.')
    } finally {
      setDownloading(false)
    }
  }

  const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-gray-900">Generate Report</h1>
          <p className="text-sm text-gray-400 mt-0.5">Export alumni employment data as PDF or Excel</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: filters */}
          <div className="lg:col-span-2 space-y-4">

            {/* Format */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-xs font-bold mb-3" style={{ color: '#0f2d1a' }}>Report Format</p>
              <div className="flex gap-3">
                {[
                  { key: 'excel', label: 'Excel (.xlsx)', icon: MdTableChart },
                  { key: 'pdf',   label: 'PDF (Print)',   icon: MdPictureAsPdf },
                ].map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setFormat(key)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all"
                    style={format === key
                      ? { background: '#0f2d1a', color: '#fff', borderColor: '#0f2d1a' }
                      : { color: '#6b7280', borderColor: '#e5e7eb' }}>
                    <Icon className="text-base" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Year selection */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: '#0f2d1a' }}>
                  Years <span className="text-gray-400 font-normal">({selectedYears.length} selected)</span>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedYears(availableYears)}
                    className="text-[11px] font-semibold" style={{ color: '#0f2d1a' }}>All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedYears([])}
                    className="text-[11px] font-semibold text-gray-400">None</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableYears.map(yr => (
                  <CheckPill key={yr} label={String(yr)}
                    checked={selectedYears.includes(yr)}
                    onChange={() => toggleYear(yr)} />
                ))}
                {availableYears.length === 0 && <p className="text-xs text-gray-400">No datasets uploaded yet</p>}
              </div>
            </div>

            {/* Program selection */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: '#0f2d1a' }}>
                  Programs <span className="text-gray-400 font-normal">({selectedPrograms.length} selected)</span>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedPrograms(availablePrograms)}
                    className="text-[11px] font-semibold" style={{ color: '#0f2d1a' }}>All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedPrograms([])}
                    className="text-[11px] font-semibold text-gray-400">None</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availablePrograms.map(p => (
                  <CheckPill key={p} label={p}
                    checked={selectedPrograms.includes(p)}
                    onChange={() => toggleProgram(p)} />
                ))}
              </div>
            </div>

            {/* Factors/columns */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: '#0f2d1a' }}>
                  <MdFilterList className="inline mr-1" />
                  Columns to Include <span className="text-gray-400 font-normal">({selectedFactors.length} selected)</span>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedFactors(ALL_FACTORS.map(f => f.key))}
                    className="text-[11px] font-semibold" style={{ color: '#0f2d1a' }}>All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedFactors(['name', 'course', 'graduation_year', 'employed'])}
                    className="text-[11px] font-semibold text-gray-400">Basic</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_FACTORS.map(f => (
                  <CheckPill key={f.key} label={f.label}
                    checked={selectedFactors.includes(f.key)}
                    onChange={() => toggleFactor(f.key)} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: summary + download */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 sticky top-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p className="text-xs font-bold mb-4" style={{ color: '#0f2d1a' }}>Report Summary</p>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Format</span>
                  <span className="font-semibold text-gray-800">{format === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Years</span>
                  <span className="font-semibold text-gray-800">
                    {selectedYears.length === 0 ? 'None' :
                     selectedYears.length === availableYears.length ? 'All' :
                     selectedYears.sort().join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Programs</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPrograms.length === 0 ? 'None' :
                     selectedPrograms.length === availablePrograms.length ? 'All' :
                     `${selectedPrograms.length} selected`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Columns</span>
                  <span className="font-semibold text-gray-800">{selectedFactors.length} of {ALL_FACTORS.length}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Est. Rows</span>
                  <span className="font-black" style={{ color: '#0f2d1a' }}>
                    {rowCount !== null ? rowCount.toLocaleString() : '…'}
                  </span>
                </div>
              </div>

              <button onClick={download} disabled={downloading || selectedYears.length === 0}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#0f2d1a' }}>
                {downloading
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/></svg> Generating…</>
                  : <><MdDownload className="text-base" /> Download {format === 'excel' ? 'Excel' : 'PDF'}</>
                }
              </button>

              {format === 'pdf' && (
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Opens in new tab — use browser Print to save as PDF
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
