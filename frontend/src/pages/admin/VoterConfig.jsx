import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdInfo } from 'react-icons/md'
import api from '../../services/api'

const FACTOR_DESC = {
  gpa:          'General Weighted Average converted to a 0–100 scale.',
  prof_grade:   'Capstone / thesis / professional subject grade.',
  elec_grade:   'Elective or specialization subject average.',
  ojt_grade:    'On-the-job training / internship performance grade.',
  soft_skills:  'Communication, teamwork, and interpersonal skills score.',
  hard_skills:  'Technical and domain-specific skills score.',
  age:          'Age at graduation (minor influence).',
  board_passer: 'Board / licensure exam result. Applies only to board-exam programs.',
}

export default function VoterConfig() {
  const [factors, setFactors]               = useState([])
  const [programs, setPrograms]             = useState([])
  const [program, setProgram]               = useState('')
  const [isBoardProgram, setIsBoardProgram] = useState(true)
  const [boardPrograms, setBoardPrograms]   = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')

  useEffect(() => {
    api.get('/admin/programs').then(r => setPrograms(r.data.programs || [])).catch(() => {})
  }, [])

  function load(prog = program) {
    setLoading(true)
    setError('')
    api.get('/admin/factors-config', { params: { program: prog || undefined } })
      .then(r => {
        setFactors(r.data.factors || [])
        setIsBoardProgram(r.data.is_board_program)
        setBoardPrograms(r.data.board_programs || [])
      })
      .catch(() => setError('Failed to load factors.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(program) }, [program])

  const totalPct = factors.filter(f => f.enabled).reduce((s, f) => s + (f.pct || 0), 0)

  const getBarColor = (pct) => {
    if (pct >= 25) return '#0f2d1a'
    if (pct >= 15) return '#2d6a4f'
    return '#52b788'
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Factors Configuration</h1>
          <p className="text-sm text-gray-400 mt-0.5">Prediction factor weights used to compute employability scores</p>
        </div>

        {/* Program selector */}
        <div className="bg-white rounded-2xl p-5 mb-5 border border-gray-100 shadow-sm">
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Filter by Program</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setProgram('')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={!program ? { background: '#0f2d1a', color: '#fff' } : { background: '#f3f4f6', color: '#374151' }}>
              All Programs
            </button>
            {programs.map(p => (
              <button key={p.code} onClick={() => setProgram(p.code)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={program === p.code ? { background: '#0f2d1a', color: '#fff' } : { background: '#f3f4f6', color: '#374151' }}>
                {p.code}
              </button>
            ))}
          </div>
          {program && (
            <p className="mt-2 text-[11px]" style={{ color: isBoardProgram ? '#0f2d1a' : '#6b7280' }}>
              {isBoardProgram
                ? `${program} is a board exam program — Board/Licensure Passer factor is included.`
                : `${program} does not include the Board/Licensure Passer factor.`}
            </p>
          )}
        </div>

        {/* Factors view */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Prediction Factors</h2>
            <span className="text-xs text-gray-400">Total: <span className="font-bold text-gray-700">{Math.round(totalPct)}%</span></span>
          </div>

          {loading && <p className="py-12 text-center text-sm text-gray-400">Loading…</p>}
          {error   && <p className="py-12 text-center text-sm text-red-500">{error}</p>}

          {!loading && !error && (
            <div className="divide-y divide-gray-50">
              {factors.filter(f => f.enabled).map(f => (
                <div key={f.key} className="px-5 py-4 flex items-center gap-4">
                  {/* Factor info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-800">{f.name}</p>
                      {f.is_board_factor && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          Board programs only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{FACTOR_DESC[f.key] || ''}</p>
                  </div>

                  {/* Weight bar */}
                  <div className="w-48 hidden sm:flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(f.pct, 100)}%`, background: getBarColor(f.pct) }} />
                    </div>
                  </div>

                  {/* Weight badge */}
                  <span className="text-sm font-black w-12 text-right flex-shrink-0" style={{ color: getBarColor(f.pct) }}>
                    {f.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100 flex gap-3">
            <MdInfo className="text-green-700 text-lg flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-green-900 mb-0.5">Board/Licensure Programs</p>
              <p className="text-[11px] text-green-700">
                Board/Licensure Passer factor applies to: {boardPrograms.join(', ')}.
              </p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex gap-3">
            <MdInfo className="text-blue-700 text-lg flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-900 mb-0.5">Score Formula</p>
              <p className="text-[11px] text-blue-700">
                Employability score = sum of (factor value × weight). Board bonus adds 15 points for licensure passers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
