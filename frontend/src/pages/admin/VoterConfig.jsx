import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MdRefresh } from 'react-icons/md'
import api from '../../services/api'

export default function VoterConfig() {
  const [factors, setFactors] = useState([])
  const [programs, setPrograms] = useState([]) // Array of {code, name}
  const [program, setProgram] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadFactors(nextProgram = program) {
    setLoading(true)
    setError('')
    // Strictly use 'lr' as per institutional requirement
    api.get('/admin/factors-configuration', { 
      params: { 
        model: 'lr', 
        program: nextProgram || undefined 
      } 
    }).then(r => {
      setFactors(r.data.factors || [])
    }).catch(err => {
      setError(err.response?.data?.error || 'Unable to load ML factor insights')
      setFactors([])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/admin/programs').then(r => {
      setPrograms(r.data.programs || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadFactors(program)
  }, [program])

  // Custom Bar Color based on weight
  const getBarColor = (weight) => {
    if (weight > 30) return '#0f2d1a'
    if (weight > 15) return '#1b4d2e'
    if (weight > 5) return '#2d6a4f'
    return '#52b788'
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Factors Configuration</h1>
            <p className="text-sm text-gray-500 mt-1">Institutional drivers influencing employability predictions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadFactors()}
              className="p-2.5 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-100 transition-colors flex items-center gap-2 font-bold text-xs"
            >
              <MdRefresh size={18} /> Refresh Analysis
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">Filter by Program</label>
                <select
                  value={program}
                  onChange={e => setProgram(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">All University Programs</option>
                  {programs.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="hidden sm:block pb-1">
                <p className="text-xs text-gray-400 italic">Showing top 10 weighted factors for the Linear Regression model</p>
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Primary Drivers (Linear Regression)
                  {program && <span className="text-emerald-600 ml-2">· {program}</span>}
                </h2>
                <p className="text-xs text-gray-500 mt-1">Weights represent the direct linear impact on employment probability</p>
              </div>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-gray-400 font-medium">Analyzing factors...</p>
              </div>
            )}
            
            {!loading && error && (
              <div className="text-center py-32">
                <p className="text-sm text-red-500 bg-red-50 inline-block px-4 py-2 rounded-lg">{error}</p>
              </div>
            )}
            
            {!loading && !error && factors.length === 0 && (
              <div className="text-center py-32">
                <p className="text-sm text-gray-400">No factor insights available for this configuration.</p>
              </div>
            )}

            {!loading && !error && factors.length > 0 && (
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={factors} 
                    layout="vertical" 
                    margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 13, fill: '#1e293b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      width={180}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-4 shadow-xl border border-gray-100 rounded-xl">
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">{data.label}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-emerald-900">{data.weight}%</span>
                                <span className="text-xs text-gray-500">Relative Weight</span>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-50">
                                <p className="text-[10px] text-gray-400 leading-relaxed max-w-[200px]">
                                  {data.weight === 0 
                                    ? "This factor has 0% impact because it has constant values in the current dataset. The model needs varied data (e.g., both passers and non-passers) to identify a pattern."
                                    : "This coefficient indicates a direct linear relationship with employment probability."}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="weight" radius={[0, 6, 6, 0]} barSize={32}>
                      {factors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.weight)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Legend/Helper Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <h4 className="text-xs font-bold text-emerald-900 uppercase mb-1">Impact Level</h4>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Darker bars indicate high-impact factors that the university should prioritize in curriculum or student support.
              </p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <h4 className="text-xs font-bold text-blue-900 uppercase mb-1">Statistical Method</h4>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Using Ordinary Least Squares (OLS) to identify clear, interpretable trends across graduate cohorts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
