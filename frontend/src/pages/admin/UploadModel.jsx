import { useState, useRef, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  MdCloudUpload, MdInsertDriveFile, MdCheckCircle, MdInfo, MdSync,
  MdDeleteOutline, MdEmail, MdPeople, MdWarning,
} from 'react-icons/md'
import api from '../../services/api'

const TABS = ['Upload New Dataset', 'Add Data to Existing Dataset', 'View Dataset']

const guidelines = [
  'File must be in CSV or Excel format',
  'Maximum file size: 50MB',
  'Data must include all required columns',
  'Ensure data is properly formatted before upload',
]

// ── Shared upload drop-zone ──────────────────────────────────────────────────
function DropZone({ selectedFile, onFile, onClear, uploadDone, onUploadAnother, accept = '.csv,.xlsx,.pkl' }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef()
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]) }}
      onClick={() => !selectedFile && !uploadDone && ref.current?.click()}
      className="rounded-2xl flex flex-col items-center justify-center py-14 cursor-pointer transition-all border-2 border-dashed"
      style={{
        borderColor: drag ? '#0f2d1a' : selectedFile || uploadDone ? '#1a3d27' : '#d4e4d8',
        background: drag ? '#e6ede8' : selectedFile || uploadDone ? '#e6ede8' : '#fafafa',
      }}>
      {uploadDone ? (
        <>
          <MdCheckCircle className="text-5xl mb-3" style={{ color: '#0f2d1a' }} />
          <p className="text-sm font-bold text-gray-800">Upload Successful!</p>
          <p className="text-xs text-gray-400 mt-1">File has been saved to the server</p>
          <button type="button" onClick={e => { e.stopPropagation(); onUploadAnother() }}
            className="text-xs font-medium mt-3 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
            Upload Another
          </button>
        </>
      ) : selectedFile ? (
        <>
          <MdCheckCircle className="text-5xl mb-3" style={{ color: '#0f2d1a' }} />
          <p className="text-sm font-bold text-gray-800">{selectedFile.name}</p>
          <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
          <button type="button" onClick={e => { e.stopPropagation(); onClear() }}
            className="text-xs font-medium mt-3 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
            Remove
          </button>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: drag ? '#d4e4d8' : '#e6ede8' }}>
            <MdCloudUpload className="text-3xl" style={{ color: '#1a3d27' }} />
          </div>
          <p className="text-sm font-bold text-gray-700">{drag ? 'Drop your file here' : 'Drag & Drop your file here'}</p>
          <p className="text-xs text-gray-400 mt-1">or</p>
          <span className="text-xs font-semibold mt-1.5" style={{ color: '#0f2d1a' }}>Browse Files</span>
          <p className="text-xs text-gray-300 mt-4">Accepted formats: {accept.split(',').join(', ')}</p>
        </>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => onFile(e.target.files[0])} />
    </div>
  )
}

// ── Tab 0: Upload New Dataset (bulk overwrite) ───────────────────────────────
const STEPS_NEW = [
  { label: 'Upload',        done: s => ['importing','training','done'].includes(s), active: s => s === 'uploading' },
  { label: 'Replace data',  done: s => ['training','done'].includes(s),             active: s => s === 'importing' },
  { label: 'Retrain models',done: s => s === 'done',                                active: s => s === 'training'  },
]
const STEPS_ADD = [
  { label: 'Upload',       done: s => ['importing','training','done'].includes(s), active: s => s === 'uploading' },
  { label: 'Import rows',  done: s => ['training','done'].includes(s),             active: s => s === 'importing' },
  { label: 'Train models', done: s => s === 'done',                                active: s => s === 'training'  },
]

const ACTIVE_STAGES = new Set(['uploading','importing','training','done','error'])

// Re-renders only on stage change (3-4× per upload).
// Text/percent update via DOM refs — zero React re-renders between stages.
// Bar is a CSS shimmer animation (no JS width updates — cannot blink).
function ProgressSection({ stage, steps, pctRef, msgRef }) {
  if (!stage || !ACTIVE_STAGES.has(stage)) return null
  const isDone = stage === 'done'
  const isError = stage === 'error'
  const isActive = !isDone && !isError

  return (
    <div className="mt-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2.5 mb-3">
        {isDone ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
            <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 900 }}>✓</span>
          </div>
        ) : isError ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
            <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 900 }}>✕</span>
          </div>
        ) : (
          <svg className="w-4 h-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#0f2d1a' }}>
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span ref={msgRef} className="text-xs font-semibold truncate"
              style={{ color: isDone ? '#16a34a' : isError ? '#dc2626' : '#374151' }}>Processing…</span>
            <span ref={pctRef} className="text-xs font-bold tabular-nums ml-2 flex-shrink-0"
              style={{ color: isDone ? '#16a34a' : isError ? '#dc2626' : '#6b7280' }}>0%</span>
          </div>
        </div>
      </div>

      {/* Bar: CSS shimmer while active, solid when done/error — zero JS width updates */}
      <div className="w-full rounded-full h-1.5 overflow-hidden mb-3" style={{ background: '#e5e7eb' }}>
        {isActive && (
          <div style={{
            height: '100%', borderRadius: '9999px', width: '100%',
            background: 'linear-gradient(90deg, #1a3d27 0%, #2d6a4f 35%, #52b788 50%, #2d6a4f 65%, #1a3d27 100%)',
            backgroundSize: '200% 100%',
            animation: 'upload-shimmer 1.8s linear infinite',
          }} />
        )}
        {isDone && (
          <div style={{ height: '100%', borderRadius: '9999px', width: '100%', backgroundColor: '#16a34a' }} />
        )}
        {isError && (
          <div style={{ height: '100%', borderRadius: '9999px', width: '60%', backgroundColor: '#dc2626' }} />
        )}
      </div>

      {/* Step chips — purely stage-driven, no percent thresholds */}
      <div className="flex gap-1.5">
        {steps.map((step) => {
          const stepDone = step.done(stage)
          const stepActive = !stepDone && step.active(stage)
          return (
            <div key={step.label} className="flex-1 py-1 rounded-md text-center text-[10px] font-semibold"
              style={{
                background: stepDone ? '#dcfce7' : stepActive ? '#fef3c7' : '#f3f4f6',
                color:      stepDone ? '#16a34a' : stepActive ? '#d97706' : '#9ca3af',
              }}>
              {stepDone ? '✓ ' : ''}{step.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TabUploadNew({ onUploaded, onStatusRefresh, onYearsRefresh }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [progressStage, setProgressStage] = useState(null)
  const progressPollRef = useRef(null)
  const lastStageRef = useRef(null)
  const pctRef = useRef(null)
  const msgRef = useRef(null)

  function stopPolling() {
    if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null }
  }

  function _updateText(percent, message) {
    if (pctRef.current) pctRef.current.textContent = `${percent}%`
    if (msgRef.current) msgRef.current.textContent = message || 'Processing…'
  }

  function startProgressPolling() {
    if (progressPollRef.current) clearInterval(progressPollRef.current)
    progressPollRef.current = setInterval(async () => {
      try {
        const r = await api.get('/admin/upload/progress')
        const { stage, percent, message } = r.data
        if (stage === 'idle') return  // server not started yet — skip everything
        _updateText(percent, message)
        if (stage !== lastStageRef.current) {
          lastStageRef.current = stage
          setProgressStage(stage)
        }
        if (stage === 'done' || stage === 'error') {
          clearInterval(progressPollRef.current); progressPollRef.current = null
          if (stage === 'done') {
            api.get('/admin/training/status').then(tr => {
              if (tr.data.status === 'done')
                setResult(prev => ({ ...prev, forecast: tr.data.result?.forecast }))
              onStatusRefresh()
            }).catch(() => onStatusRefresh())
          } else {
            setError(`Processing failed: ${message}`)
          }
        }
      } catch { /* ignore */ }
    }, 1000)
  }

  useEffect(() => stopPolling, [])

  async function upload() {
    if (!file || !confirmed) return
    setUploading(true)
    setError('')
    lastStageRef.current = 'uploading'
    setProgressStage('uploading')
    _updateText(0, 'Uploading file…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', file.name)
      fd.append('overwrite_all', 'true')
      fd.append('apply_to_training', 'true')
      fd.append('retrain_after_import', 'true')
      fd.append('create_accounts', 'false')
      const res = await api.post('/admin/upload', fd)
      const data = res.data
      onUploaded(data.upload)
      setResult({ import: data.import || null, forecast: data.forecast || null })
      setDone(true)
      onYearsRefresh()
      if (data.training_async) {
        startProgressPolling()
      } else {
        lastStageRef.current = 'done'
        setProgressStage('done')
        _updateText(100, 'Complete!')
        onStatusRefresh()
      }
    } catch (err) {
      stopPolling()
      setProgressStage(null)
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    stopPolling()
    lastStageRef.current = null
    setFile(null); setDone(false); setConfirmed(false)
    setResult(null); setError(''); setProgressStage(null)
  }

  return (
    <div>
      {/* Warning banner */}
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex gap-3">
        <MdWarning className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-red-800 mb-0.5">This will overwrite ALL existing training data</p>
          <p className="text-[11px] text-red-700">
            Every existing training row (all years) will be permanently deleted and replaced with the data in your uploaded file.
            Use this to load a fresh bulk dataset (e.g. 2018–2024). Cannot be undone.
          </p>
        </div>
      </div>

      <DropZone
        selectedFile={file}
        onFile={f => { setFile(f); setDone(false); setError('') }}
        onClear={() => setFile(null)}
        uploadDone={done}
        onUploadAnother={reset}
        accept=".csv,.xlsx,.xls"
      />

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      <ProgressSection stage={progressStage} steps={STEPS_NEW} pctRef={pctRef} msgRef={msgRef} />

      {/* Import result */}
      {result?.import && (
        <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-600">
          <p className="font-bold text-gray-800 mb-1">Import Summary</p>
          Imported: <span className="font-semibold text-gray-900">{result.import.rows_imported ?? 0}</span> rows
          &nbsp;·&nbsp; Skipped: <span className="font-semibold">{result.import.rows_skipped ?? 0}</span>
        </div>
      )}

      {/* Forecast result */}
      {result?.forecast && (
        <div className="mt-3 rounded-xl border px-4 py-3" style={{ borderColor: '#b7e4c7', background: '#e6ede8' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#0f2d1a' }}>
            Auto-Forecast: {result.forecast.forecast_years?.[0]}–{result.forecast.forecast_years?.[2]} Employment Rate
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: '#b7e4c7' }}>
                  <th className="text-left pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>Year</th>
                  <th className="text-center pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>Linear Reg.</th>
                  <th className="text-center pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>Random Forest</th>
                  <th className="text-center pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>ARIMA</th>
                </tr>
              </thead>
              <tbody>
                {(result.forecast.forecast_years || []).map((yr, i) => (
                  <tr key={yr} className="border-b last:border-0" style={{ borderColor: '#d8ede3' }}>
                    <td className="py-1.5 font-bold" style={{ color: '#0f2d1a' }}>{yr}</td>
                    <td className="py-1.5 text-center font-semibold" style={{ color: '#2d6a4f' }}>{result.forecast.predictions?.lr?.[i]?.rate ?? '—'}%</td>
                    <td className="py-1.5 text-center font-semibold" style={{ color: '#10b981' }}>{result.forecast.predictions?.rf?.[i]?.rate ?? '—'}%</td>
                    <td className="py-1.5 text-center font-semibold" style={{ color: '#1a3d27' }}>{result.forecast.predictions?.arima?.[i]?.rate ?? '—'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-5 pt-5 border-t border-gray-100">
        {!done && (
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-4 cursor-pointer select-none">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="accent-red-600" />
            I understand this will permanently delete all existing training data and replace it with the uploaded file
          </label>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={reset}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            {done ? 'Upload Another' : 'Cancel'}
          </button>
          {!done && (
            <button onClick={upload} disabled={!file || !confirmed || uploading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              style={{ background: '#b91c1c' }}>
              {uploading
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Uploading…</>
                : 'Upload & Replace All Data'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function _yearFromFilename(filename) {
  const m = filename.match(/\b(20\d{2})\b/)
  return m ? parseInt(m[1], 10) : null
}

// ── Tab 1: Add Data to Existing Model ────────────────────────────────────────
function TabAddData({ onUploaded, onStatusRefresh, onYearsRefresh }) {
  const currentYear = new Date().getFullYear()
  const [modelName, setModelName] = useState('')
  const [file, setFile] = useState(null)
  const [datasetYear, setDatasetYear] = useState(currentYear)
  const [maxExistingYear, setMaxExistingYear] = useState(null)
  const [yearsLoading, setYearsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [applyToTraining, setApplyToTraining] = useState(true)
  const [retrainAfter, setRetrainAfter] = useState(true)
  const [createAccounts, setCreateAccounts] = useState(true)
  const [skipEmail, setSkipEmail] = useState(false)
  const [conflict, setConflict] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [progressStage, setProgressStage] = useState(null)
  const progressPollRef = useRef(null)
  const lastStageRef = useRef(null)
  const pctRef = useRef(null)
  const msgRef = useRef(null)

  function stopPolling() {
    if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null }
  }

  function _updateText(percent, message) {
    if (pctRef.current) pctRef.current.textContent = `${percent}%`
    if (msgRef.current) msgRef.current.textContent = message || 'Processing…'
  }

  function startProgressPolling() {
    if (progressPollRef.current) clearInterval(progressPollRef.current)
    progressPollRef.current = setInterval(async () => {
      try {
        const r = await api.get('/admin/upload/progress')
        const { stage, percent, message } = r.data
        if (stage === 'idle') return  // server not started yet — skip everything
        _updateText(percent, message)
        if (stage !== lastStageRef.current) {
          lastStageRef.current = stage
          setProgressStage(stage)
        }
        if (stage === 'done' || stage === 'error') {
          clearInterval(progressPollRef.current); progressPollRef.current = null
          if (stage === 'done') {
            api.get('/admin/training/status').then(tr => {
              if (tr.data.status === 'done')
                setResult(prev => ({ ...prev, training: { ...prev?.training, forecast: tr.data.result?.forecast, models: tr.data.result } }))
              onStatusRefresh()
            }).catch(() => onStatusRefresh())
          } else {
            setError(`Processing failed: ${message}`)
          }
        }
      } catch { /* ignore */ }
    }, 1000)
  }

  useEffect(() => stopPolling, [])

  // Fetch existing years and lock the year picker to the next sequential year
  useEffect(() => {
    api.get('/admin/training-data/years').then(r => {
      const yrs = (r.data.years || []).map(y => y.year)
      if (yrs.length > 0) {
        const max = Math.max(...yrs)
        setMaxExistingYear(max)
        setDatasetYear(max + 1)
      } else {
        setMaxExistingYear(null)
        setDatasetYear(currentYear)
      }
    }).catch(() => {
      setMaxExistingYear(null)
    }).finally(() => setYearsLoading(false))
  }, [])

  // nextAllowed: the next sequential year (the only valid NEW year going forward)
  const nextAllowed = maxExistingYear !== null ? maxExistingYear + 1 : null
  // Only block if the year skips ahead past the next sequential year
  const yearBlocked = applyToTraining && nextAllowed !== null && datasetYear > nextAllowed
  // Past year with existing data — will trigger overwrite/merge on upload
  const yearIsPast = applyToTraining && maxExistingYear !== null && datasetYear <= maxExistingYear

  const isCsv = !!file?.name?.toLowerCase().match(/\.(csv|xlsx|xls)$/)

  async function doUpload(conflictMode = null) {
    if (!file) return
    setUploading(true)
    setError('')
    lastStageRef.current = 'uploading'
    setProgressStage('uploading')
    _updateText(0, 'Uploading file…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', modelName || file.name)
      fd.append('apply_to_training', String(applyToTraining))
      fd.append('retrain_after_import', String(applyToTraining && retrainAfter))
      fd.append('dataset_year', String(datasetYear))
      fd.append('create_accounts', String(createAccounts && applyToTraining))
      fd.append('skip_email', String(skipEmail))
      if (conflictMode) fd.append('conflict_mode', conflictMode)

      let data1
      try {
        const res1 = await api.post('/admin/upload', fd)
        data1 = res1.data
      } catch (err) {
        if (err.response?.status === 409 && err.response?.data?.year_conflict) {
          setConflict({ year: err.response.data.year, existing_count: err.response.data.existing_count })
          setProgressStage(null)
          return
        }
        throw new Error(err.response?.data?.error || err.message || 'Upload failed')
      }
      onUploaded(data1.upload)
      setConflict(null)

      setResult({ training: data1, accounts: null })
      setDone(true)
      if (applyToTraining) onYearsRefresh()

      if (data1.training_async) {
        startProgressPolling()
      } else {
        lastStageRef.current = 'done'
        setProgressStage('done')
        _updateText(100, 'Complete!')
        onStatusRefresh()
      }
    } catch (err) {
      stopPolling()
      setProgressStage(null)
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    stopPolling()
    lastStageRef.current = null
    setFile(null); setModelName(''); setDone(false)
    setResult(null); setConflict(null); setError('')
    setProgressStage(null)
    setCreateAccounts(true); setSkipEmail(false)
    setDatasetYear(nextAllowed ?? currentYear)
  }

  return (
    <div>
      {/* Name + Year row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="col-span-2">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0f2d1a' }}>Dataset / Model Name</label>
          <input type="text" placeholder="e.g., PLP Batch 2025 Dataset"
            value={modelName} onChange={e => setModelName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 transition-all"
            style={{ '--tw-ring-color': 'rgba(15,45,26,0.25)' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#0f2d1a' }}>
            Dataset Year
          </label>
          {yearsLoading ? (
            <div className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-xs text-gray-400 text-center">Loading…</div>
          ) : (
            <div>
              <input
                type="number" min="2000" max="2100" value={datasetYear}
                onChange={e => { setDatasetYear(Number(e.target.value)); setConflict(null); setError('') }}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm font-bold text-center border-2 focus:outline-none transition-all"
                style={{
                  borderColor: yearBlocked ? '#fca5a5' : yearIsPast ? '#fcd34d' : '#b7e4c7',
                  background:  yearBlocked ? '#fef2f2' : yearIsPast ? '#fffbeb' : '#e6ede8',
                  color:       yearBlocked ? '#ef4444' : yearIsPast ? '#92400e' : '#0f2d1a',
                }}
              />
              {/* Contextual hint */}
              {yearBlocked ? (
                <p className="text-[11px] text-red-500 mt-1 text-center font-semibold">
                  Year {nextAllowed} is missing — upload that first
                </p>
              ) : yearIsPast ? (
                <p className="text-[11px] text-amber-600 mt-1 text-center font-semibold">
                  Existing year — will ask overwrite or merge
                </p>
              ) : maxExistingYear !== null ? (
                <p className="text-[11px] text-green-700 mt-1 text-center">
                  Next after {maxExistingYear} · Forecasts {datasetYear + 1}–{datasetYear + 3}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1 text-center">
                  First upload · Forecasts {datasetYear + 1}–{datasetYear + 3}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <DropZone selectedFile={file} onFile={f => {
          setFile(f); setDone(false); setResult(null); setConflict(null); setError('')
          const detected = _yearFromFilename(f.name)
          if (detected) setDatasetYear(detected)
        }}
        onClear={() => setFile(null)} uploadDone={done} onUploadAnother={reset} accept=".csv,.xlsx,.xls" />

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Year conflict banner */}
      {conflict && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-bold text-amber-900 mb-1">
            Year {conflict.year} already has {conflict.existing_count.toLocaleString()} training rows
          </p>
          <p className="text-[11px] text-amber-700 mb-3">Choose how to handle the existing data:</p>
          <div className="flex gap-2">
            <button onClick={() => doUpload('overwrite')} disabled={uploading}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
              style={{ background: '#ef4444' }}>
              Overwrite — delete {conflict.year} rows, replace with new data
            </button>
            <button onClick={() => doUpload('merge')} disabled={uploading}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
              style={{ background: '#0f2d1a' }}>
              Merge — keep existing, add new rows only
            </button>
          </div>
          <button onClick={() => setConflict(null)} className="mt-2 text-[11px] text-amber-600 hover:underline w-full text-center">
            Cancel
          </button>
        </div>
      )}

      {/* Options */}
      {file && !done && !conflict && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
            <p className="text-xs font-bold mb-1" style={{ color: '#0f2d1a' }}>Training Data Options</p>
            <label className="flex items-center gap-2 text-xs font-medium" style={{ color: '#0f2d1a' }}>
              <input type="checkbox" checked={applyToTraining} onChange={e => setApplyToTraining(e.target.checked)} />
              Import rows into ML training data
            </label>
            {applyToTraining && (
              <label className="flex items-center gap-2 text-xs ml-4" style={{ color: '#2d6a4f' }}>
                <input type="checkbox" checked={retrainAfter} onChange={e => setRetrainAfter(e.target.checked)} />
                Retrain RF + Linear Regression immediately after import
              </label>
            )}
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50 p-3 space-y-1.5">
            <p className="text-xs font-bold text-green-900 mb-1">Alumni Account Options</p>
            <label className="flex items-center gap-2 text-xs text-green-900 font-medium">
              <input type="checkbox" checked={createAccounts} onChange={e => setCreateAccounts(e.target.checked)} />
              Create alumni accounts from dataset (deleted when year is removed)
            </label>
            {createAccounts && (
              <>
                <label className="flex items-center gap-2 text-xs text-green-900 ml-4">
                  <input type="checkbox" checked={skipEmail} onChange={e => setSkipEmail(e.target.checked)} />
                  Skip email sending <span className="text-green-600 font-semibold">(testing mode)</span>
                </label>
                <p className="text-[11px] text-green-700 ml-5">
                  {skipEmail ? 'Accounts created with random password. No emails sent.' : 'Each alumni gets a random password sent to their email.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <ProgressSection stage={progressStage} steps={STEPS_ADD} pctRef={pctRef} msgRef={msgRef} />

      {/* Results */}
      {result && (
        <div className="mt-4 space-y-3">
          {/* Training rows */}
          {result.training?.import && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-600">
              <p className="font-bold text-gray-800 mb-1">Training Data — Year {datasetYear}</p>
              Imported: <span className="font-semibold text-gray-900">{result.training.import.rows_imported ?? 0}</span> rows
              &nbsp;·&nbsp; Skipped: <span className="font-semibold">{result.training.import.rows_skipped ?? 0}</span>
            </div>
          )}

          {/* 3-year forecast */}
          {result.training?.forecast && (
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: '#b7e4c7', background: '#e6ede8' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#0f2d1a' }}>
                Auto-Forecast: {result.training.forecast.forecast_years?.[0]}–{result.training.forecast.forecast_years?.[2]} Employment Rate
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#b7e4c7' }}>
                      <th className="text-left pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>Year</th>
                      <th className="text-center pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>Linear Reg.</th>
                      <th className="text-center pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>Random Forest</th>
                      <th className="text-center pb-1.5 font-semibold" style={{ color: '#0f2d1a' }}>ARIMA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.training.forecast.forecast_years || []).map((yr, i) => (
                      <tr key={yr} className="border-b last:border-0" style={{ borderColor: '#d8ede3' }}>
                        <td className="py-1.5 font-bold" style={{ color: '#0f2d1a' }}>{yr}</td>
                        <td className="py-1.5 text-center font-semibold" style={{ color: '#2d6a4f' }}>
                          {result.training.forecast.predictions?.lr?.[i]?.rate ?? '—'}%
                        </td>
                        <td className="py-1.5 text-center font-semibold" style={{ color: '#10b981' }}>
                          {result.training.forecast.predictions?.rf?.[i]?.rate ?? '—'}%
                        </td>
                        <td className="py-1.5 text-center font-semibold" style={{ color: '#1a3d27' }}>
                          {result.training.forecast.predictions?.arima?.[i]?.rate ?? '—'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] mt-2" style={{ color: '#2d6a4f' }}>
                Based on {datasetYear} upload. Forecasting page updated automatically.
              </p>
            </div>
          )}

          {/* Alumni accounts */}
          {result.accounts && (
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-xs">
              <p className="font-bold text-green-900 mb-2 flex items-center gap-1"><MdPeople /> Alumni Accounts</p>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { label: 'Created', value: result.accounts.created?.length ?? 0, color: '#10b981' },
                  { label: 'Updated', value: result.accounts.updated?.length ?? 0, color: '#0f2d1a' },
                  { label: 'Skipped', value: result.accounts.skipped?.length ?? 0, color: '#f59e0b' },
                  { label: 'Failed',  value: result.accounts.failed?.length  ?? 0, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg p-2 text-center">
                    <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[11px] font-semibold text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              {(result.accounts.created || []).slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 mb-1">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{r.name}</p>
                    <p className="text-[11px] text-gray-500">{r.email}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold"
                    style={{ color: r.email_sent ? '#10b981' : '#f59e0b' }}>
                    <MdEmail className="text-xs" />
                    {r.email_sent ? 'Sent' : 'Not sent'}
                  </span>
                </div>
              ))}
              {(result.accounts.created || []).length > 5 && (
                <p className="text-[11px] text-gray-400 text-center mt-1">+{result.accounts.created.length - 5} more</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-gray-100">
        <button onClick={reset}
          className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          {done ? 'Upload Another' : 'Cancel'}
        </button>
        {!done && !conflict && (
          <button onClick={() => doUpload()} disabled={!file || uploading || yearBlocked}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ background: yearBlocked ? '#9ca3af' : '#0f2d1a' }}
            title={yearBlocked ? `Upload year ${nextAllowed} first` : ''}>
            {uploading
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Uploading…</>
              : `Upload ${datasetYear} Data`}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: View Dataset ────────────────────────────────────────────────────────
function TabViewDataset({ refreshTick }) {
  const [years, setYears] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [confirmYear, setConfirmYear] = useState(null)
  const [deletedYear, setDeletedYear] = useState(null)

  function load() {
    setLoading(true)
    api.get('/admin/training-data/years')
      .then(r => { setYears(r.data.years || []); setTotal(r.data.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [refreshTick])

  async function deleteYear(year) {
    setDeleting(year)
    try {
      await api.delete(`/admin/training-data/by-year/${year}`)
      setYears(prev => prev.filter(y => y.year !== year))
      setTotal(prev => prev - (years.find(y => y.year === year)?.count ?? 0))
      setDeletedYear(year)
      setTimeout(() => setDeletedYear(null), 5000)
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(null)
      setConfirmYear(null)
    }
  }

  if (loading) return <p className="py-12 text-center text-sm text-gray-400">Loading dataset…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-800">Training Dataset</p>
          <p className="text-xs text-gray-400 mt-0.5">Total rows: <span className="font-semibold text-gray-700">{total.toLocaleString()}</span></p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 hover:text-green-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">
          <MdSync className="text-sm" /> Refresh
        </button>
      </div>

      {years.length === 0 ? (
        <div className="py-16 text-center">
          <MdInsertDriveFile className="text-3xl text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No training data imported yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {years.map(y => {
            const pct = y.count > 0 ? Math.round((y.employed / y.count) * 100) : 0
            return (
              <div key={y.year} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background: '#e6ede8' }}>
                  <span className="text-base font-black" style={{ color: '#0f2d1a' }}>{y.year}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700">{y.count.toLocaleString()} rows</p>
                    <p className="text-xs text-gray-400">{pct}% employed</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: '#2d6a4f' }} />
                  </div>
                </div>
                {confirmYear === y.year ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <p className="text-[11px] text-red-600 font-semibold">Delete {y.year}?</p>
                    <button onClick={() => deleteYear(y.year)} disabled={deleting === y.year}
                      className="px-2 py-1 text-[11px] font-bold text-white rounded-lg disabled:opacity-60"
                      style={{ background: '#ef4444' }}>
                      {deleting === y.year ? '…' : 'Yes'}
                    </button>
                    <button onClick={() => setConfirmYear(null)}
                      className="px-2 py-1 text-[11px] font-semibold text-gray-600 rounded-lg border border-gray-200">
                      No
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmYear(y.year)}
                    className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title={`Delete all ${y.year} training rows`}>
                    <MdDeleteOutline className="text-lg" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {deletedYear && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 flex items-center gap-2 text-xs text-green-800 font-semibold">
          <MdCheckCircle className="text-sm flex-shrink-0" />
          Year {deletedYear} deleted — forecast graph updated. Go to the Forecasting page to see the change.
        </div>
      )}

      <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 flex gap-2 text-xs text-yellow-800">
        <MdWarning className="text-base flex-shrink-0 mt-0.5" />
        <span>Deleting training data is permanent and will affect model accuracy. Retrain models after deletion.</span>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UploadModel() {
  const [activeTab, setActiveTab] = useState(0)
  const [recentUploads, setRecentUploads] = useState([])
  const [modelStatus, setModelStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState('')
  const [retraining, setRetraining] = useState(false)
  const [yearsTick, setYearsTick] = useState(0)

  async function loadModelStatus() {
    setStatusLoading(true)
    try {
      const r = await api.get('/admin/models/status')
      setModelStatus(r.data.model || null)
      setStatusError('')
    } catch (err) {
      setStatusError(err.response?.data?.error || 'Unable to load model status')
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    api.get('/admin/uploads').then(r => setRecentUploads(r.data.uploads || [])).catch(() => {})
    loadModelStatus()
  }, [])

  async function retrainModel() {
    setRetraining(true)
    setStatusError('')
    try {
      await api.post('/admin/models/sync-and-retrain', {})
      await loadModelStatus()
    } catch (err) {
      setStatusError(err.response?.data?.error || 'Model retraining failed')
    } finally {
      setRetraining(false)
    }
  }

  function onUploaded(upload) {
    if (upload) setRecentUploads(prev => [upload, ...prev])
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Upload Dataset</h1>
            <p className="text-sm text-gray-400 mt-0.5">Upload training datasets and manage prediction models</p>
          </div>
          <div className="flex items-center gap-3">
            
            
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-5 items-start">
          {/* Main Area */}
          <div className="flex-1 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-gray-50 rounded-xl w-full overflow-x-auto">
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap"
                  style={activeTab === i
                    ? { background: '#0f2d1a', color: '#fff', boxShadow: '0 2px 8px rgba(15,45,26,0.3)' }
                    : { color: '#6b7280' }}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 0 && (
              <TabUploadNew onUploaded={onUploaded} onStatusRefresh={loadModelStatus} onYearsRefresh={() => setYearsTick(t => t + 1)} />
            )}
            {activeTab === 1 && (
              <TabAddData
                onUploaded={onUploaded}
                onStatusRefresh={loadModelStatus}
                onYearsRefresh={() => setYearsTick(t => t + 1)}
              />
            )}
            {activeTab === 2 && (
              <TabViewDataset refreshTick={yearsTick} />
            )}
          </div>

          {/* Right Panel */}
          <div className="w-full md:w-60 md:flex-shrink-0 space-y-4">
            {/* Model Status */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-900">Model Status</h3>
                {!statusLoading && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={modelStatus?.loaded
                      ? { background: '#e6ede8', color: '#0f2d1a' }
                      : { background: '#fff7ed', color: '#ea580c' }}>
                    {modelStatus?.loaded ? 'Loaded' : 'Offline'}
                  </span>
                )}
              </div>
              {statusLoading ? (
                <p className="text-xs text-gray-400">Loading model info…</p>
              ) : (
                <div className="space-y-1.5 text-xs text-gray-500">
                  <p>Features: <span className="font-semibold text-gray-700">{modelStatus?.feature_count ?? 0}</span></p>
                  <p>Training rows: <span className="font-semibold text-gray-700">{modelStatus?.row_count ?? 0}</span></p>
                  <p>Source: <span className="font-semibold text-gray-700">{modelStatus?.training_source || 'N/A'}</span></p>
                  <p className="break-all">Trained: <span className="font-semibold text-gray-700">{modelStatus?.trained_at_utc || 'N/A'}</span></p>
                  {modelStatus?.models && (
                    <div className="pt-2 mt-2 border-t border-gray-100 space-y-1">
                      <p>RF: <span className="font-semibold text-gray-700">{modelStatus.models.rf?.loaded ? 'Loaded' : 'Offline'}</span></p>
                      <p>LR: <span className="font-semibold text-gray-700">{modelStatus.models.lr?.loaded ? 'Loaded' : 'Offline'}</span></p>
                    </div>
                  )}
                </div>
              )}
              {statusError && <p className="text-xs text-red-500 mt-2">{statusError}</p>}
              <button onClick={retrainModel} disabled={retraining}
                className="w-full mt-3 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#0f2d1a' }}>
                {retraining
                  ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Retraining…</>
                  : <><MdSync className="text-sm" /> Retrain from Live DB</>}
              </button>
            </div>

            {/* Guidelines */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#e6ede8' }}>
                  <MdInfo className="text-xs" style={{ color: '#0f2d1a' }} />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Upload Guidelines</h3>
              </div>
              <ul className="space-y-2.5">
                {guidelines.map(tip => (
                  <li key={tip} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#1a3d27' }} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Uploads */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-xs font-bold text-gray-900 mb-4">
                Uploaded Datasets
                <span className="ml-1.5 text-gray-400 font-normal">({recentUploads.length})</span>
              </h3>
              <div className="space-y-2.5">
                {recentUploads.map(upload => (
                  <div key={upload.id || upload.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: '#f9fafb' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#e6ede8' }}>
                      <MdInsertDriveFile className="text-sm" style={{ color: '#1a3d27' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{upload.filename || upload.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{upload.records} · {upload.date}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: upload.applied_to_training ? '#e6ede8' : '#f3f4f6', color: upload.applied_to_training ? '#0f2d1a' : '#9ca3af' }}>
                      {upload.applied_to_training ? 'Imported' : 'Archived'}
                    </span>
                  </div>
                ))}
                {recentUploads.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No datasets uploaded yet</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
