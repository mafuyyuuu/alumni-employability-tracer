import { useState, useRef, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { MdCloudUpload, MdInsertDriveFile, MdCheckCircle, MdInfo } from 'react-icons/md'
import api from '../../services/api'

const tabs = ['Upload New Model', 'Add Data to Existing Model', 'View Dataset']

const guidelines = [
  'File must be in CSV or Excel format',
  'Maximum file size: 50MB',
  'Data must include all required columns',
  'Ensure data is properly formatted before upload',
]

export default function UploadModel() {
  const [activeTab, setActiveTab] = useState(0)
  const [modelName, setModelName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [recentUploads, setRecentUploads] = useState([])
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/admin/uploads').then(r => setRecentUploads(r.data.uploads || [])).catch(() => {})
  }, [])

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) { setSelectedFile(file); setUploadDone(false) }
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) { setSelectedFile(file); setUploadDone(false) }
  }

  async function uploadFile() {
    if (!selectedFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('name', modelName || selectedFile.name)
      const r = await api.post('/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (r.data.upload) setRecentUploads(prev => [r.data.upload, ...prev])
      setUploadDone(true)
      setSelectedFile(null)
      setModelName('')
    } catch {
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Upload Data Model</h1>
            <p className="text-sm text-gray-400 mt-0.5">Upload and manage ARIMA prediction models</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700">Admin</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#2d6a4f' }}>A</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-5 items-start">
          {/* Main Upload Area */}
          <div className="flex-1 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-gray-50 rounded-xl w-full sm:w-fit overflow-x-auto">
              {tabs.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg transition-all"
                  style={activeTab === i
                    ? { background: '#2d6a4f', color: '#fff', boxShadow: '0 2px 8px rgba(45,106,79,0.3)' }
                    : { color: '#6b7280' }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Model Name */}
            <div className="mb-5">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#2d6a4f' }}>Model Name</label>
              <input type="text" placeholder="e.g., Employment Forecast Model v1"
                value={modelName} onChange={e => setModelName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 transition-all"
                style={{ '--tw-ring-color': 'rgba(45,106,79,0.25)' }} />
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !selectedFile && fileRef.current?.click()}
              className="rounded-2xl flex flex-col items-center justify-center py-14 cursor-pointer transition-all border-2 border-dashed"
              style={{
                borderColor: dragOver ? '#2d6a4f' : selectedFile ? '#52b788' : '#d1fae5',
                background: dragOver ? '#f0faf5' : selectedFile ? '#f0faf5' : '#fafafa',
              }}>
              {uploadDone ? (
                <>
                  <MdCheckCircle className="text-5xl mb-3" style={{ color: '#2d6a4f' }} />
                  <p className="text-sm font-bold text-gray-800">Upload Successful!</p>
                  <p className="text-xs text-gray-400 mt-1">File has been saved to the server</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setUploadDone(false) }}
                    className="text-xs font-medium mt-3 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                    Upload Another
                  </button>
                </>
              ) : selectedFile ? (
                <>
                  <MdCheckCircle className="text-5xl mb-3" style={{ color: '#2d6a4f' }} />
                  <p className="text-sm font-bold text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null) }}
                    className="text-xs font-medium mt-3 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: dragOver ? '#d8f3dc' : '#f0faf5' }}>
                    <MdCloudUpload className="text-3xl" style={{ color: dragOver ? '#2d6a4f' : '#52b788' }} />
                  </div>
                  <p className="text-sm font-bold text-gray-700">{dragOver ? 'Drop your file here' : 'Drag & Drop your file here'}</p>
                  <p className="text-xs text-gray-400 mt-1">or</p>
                  <span className="text-xs font-semibold mt-1.5" style={{ color: '#2d6a4f' }}>Browse Files</span>
                  <p className="text-xs text-gray-300 mt-4">Accepted formats: .csv, .xlsx, .pkl</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.pkl" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-gray-100">
              <button onClick={() => { setSelectedFile(null); setModelName(''); setUploadDone(false) }}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={uploadFile} disabled={!selectedFile || uploading}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#2d6a4f' }}>
                {uploading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Uploading…</>
                ) : 'Upload Model'}
              </button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full md:w-60 md:flex-shrink-0 space-y-4">
            {/* Guidelines */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#f0faf5' }}>
                  <MdInfo className="text-xs" style={{ color: '#2d6a4f' }} />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Upload Guidelines</h3>
              </div>
              <ul className="space-y-2.5">
                {guidelines.map(tip => (
                  <li key={tip} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#52b788' }} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Uploads */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-xs font-bold text-gray-900 mb-4">Recent Uploads</h3>
              <div className="space-y-3.5">
                {recentUploads.map(upload => (
                  <div key={upload.id || upload.name} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0faf5' }}>
                      <MdInsertDriveFile className="text-sm" style={{ color: '#52b788' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700 leading-tight truncate">{upload.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{upload.size} · {upload.records}</p>
                      <p className="text-xs text-gray-300">{upload.date}</p>
                    </div>
                  </div>
                ))}
                {recentUploads.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No uploads yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
