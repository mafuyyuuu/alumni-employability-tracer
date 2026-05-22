import { useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdUploadFile, MdAnalytics, MdCheckCircle, MdSchool, MdTrendingUp } from 'react-icons/md'
import api from '../../services/api'

export default function PredictUpcoming() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 100

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async (e) => {
    if (e) e.preventDefault()
    if (!file) return
    
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/admin/predict-dataset', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setReport(res.data)
      setCurrentPage(1) // Reset to first page on new upload
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process dataset')
    } finally {
      setLoading(false)
    }
  }

  // Pagination Logic
  const totalItems = report?.predictions?.length || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedPredictions = report?.predictions?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  ) || []

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Predict Upcoming Graduates</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a cohort dataset to predict employability rates for graduating students.</p>
        </div>

        {!report ? (
          <div className="max-w-xl mx-auto">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-white rounded-3xl p-10 border-2 border-dashed transition-all text-center ${
                isDragging ? 'bg-emerald-50 border-emerald-500 scale-[1.02]' : 'bg-white border-gray-300'
              }`}
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MdUploadFile className={`text-4xl transition-colors ${isDragging ? 'text-emerald-500' : 'text-emerald-600'}`} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{file ? file.name : 'Upload Graduate List'}</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                {file ? 'File ready for analysis.' : <>Drag and drop your file here, or click to browse. <br/> Supported: <span className="font-bold text-emerald-700">.xlsx, .xls, .csv</span></>}
              </p>
              
              <form onSubmit={handleUpload}>
                <input
                  id="cohort-upload"
                  type="file"
                  onChange={e => setFile(e.target.files[0])}
                  className="hidden"
                />
                {!file ? (
                  <label 
                    htmlFor="cohort-upload"
                    className="inline-block cursor-pointer px-8 py-3 bg-emerald-900 text-white rounded-xl text-xs font-black uppercase hover:bg-emerald-800 transition-colors mb-4"
                  >
                    Browse Files
                  </label>
                ) : (
                  <button
                    disabled={loading}
                    className="w-full py-4 bg-emerald-900 text-white rounded-2xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" /> Analyzing Dataset...</>
                    ) : (
                      <><MdAnalytics size={20} /> Run Bulk Prediction</>
                    )}
                  </button>
                )}
              </form>
              {error && <p className="mt-4 text-xs text-red-500 font-bold bg-red-50 py-2 rounded-lg">{error}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             {/* Report Summary */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-900 text-white rounded-2xl p-6">
                  <p className="text-xs text-emerald-300 font-bold uppercase mb-2 tracking-widest">Market Readiness</p>
                  <p className="text-4xl font-black">{report.success_rate}%</p>
                  <p className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1.5">
                    <MdCheckCircle /> {report.likely_employable} high-potential candidates
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <MdSchool />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-bold uppercase">Target Cohort</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{report.filename}</p>
                    </div>
                  </div>
                  <button onClick={() => setReport(null)} className="text-xs font-bold text-emerald-900 hover:underline text-left">Upload Different File</button>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                   <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <MdTrendingUp />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Primary Driver</p>
                      <p className="text-sm font-bold text-gray-900">Academic Performance</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Based on cohort-wide feature importance analysis.</p>
                </div>
             </div>

             {/* Candidate List */}
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900">Individual Forecasts</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Results from Random Forest Model</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-gray-400 font-bold border-b border-gray-50">
                        <th className="px-6 py-3 uppercase tracking-tighter">Candidate</th>
                        <th className="px-6 py-3 uppercase tracking-tighter">Program</th>
                        <th className="px-6 py-3 text-center uppercase tracking-tighter">Prob.</th>
                        <th className="px-6 py-3 text-center uppercase tracking-tighter">Readiness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedPredictions.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-700">{p.name}</td>
                          <td className="px-6 py-4 text-gray-500">{p.course}</td>
                          <td className="px-6 py-4 text-center font-black text-emerald-900">{p.probability}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                              p.level === 'Likely Employable' ? 'bg-emerald-100 text-emerald-800' :
                              p.level === 'Employable' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {p.level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      Page <span className="text-emerald-900">{currentPage}</span> of {totalPages} 
                      <span className="ml-2 opacity-40">({totalItems} total candidates)</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all text-gray-600"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-30 transition-all"
                      >
                        Next Batch
                      </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
