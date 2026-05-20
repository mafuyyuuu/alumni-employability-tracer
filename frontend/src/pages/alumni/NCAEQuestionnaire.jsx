import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  MdCheckCircle, MdRadioButtonUnchecked, MdArrowForward, MdArrowBack,
  MdSchool, MdWarning, MdStar,
} from 'react-icons/md'

const SECTION_META = {
  hard:     { label: 'Hard Skills Aptitude',              color: '#0f2d1a', bg: '#e6ede8', range: '1–20',  count: 20 },
  soft:     { label: 'Soft Skills Situational Judgment',  color: '#6366f1', bg: '#eef2ff', range: '21–35', count: 15 },
  specific: { label: 'Specific Skills Assessment',        color: '#f59e0b', bg: '#fffbeb', range: '36–50', count: 15 },
}

function ScoreBar({ label, correct, total, color }) {
  const pct = total > 0 ? Math.round(correct / total * 100) : 0
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="font-bold" style={{ color }}>{correct}/{total} &nbsp;({pct}%)</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ResultScreen({ scores, program, onContinue }) {
  const total = scores.total
  const level = total >= 75 ? 'High' : total >= 50 ? 'Medium' : 'Low'
  const levelColor = { High: '#0f2d1a', Medium: '#b45309', Low: '#b91c1c' }[level]
  const levelBg   = { High: '#e6ede8', Medium: '#fffbeb', Low: '#fef2f2' }[level]

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f3f4f6' }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-xl text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#e6ede8' }}>
          <MdCheckCircle style={{ color: '#0f2d1a', fontSize: '44px' }} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">Assessment Complete!</h1>
        <p className="text-sm text-gray-400 mb-6">Your results have been saved to your profile.</p>

        {/* Employability level */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-bold"
          style={{ background: levelBg, color: levelColor }}>
          <MdStar /> {level} Employability Potential
        </div>

        {/* Score breakdown */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left">
          <ScoreBar label="Hard Skills Aptitude" correct={scores.hard_correct} total={scores.hard_total} color={SECTION_META.hard.color} />
          <ScoreBar label="Soft Skills" correct={scores.soft_correct} total={scores.soft_total} color={SECTION_META.soft.color} />
          <ScoreBar label="Specific Skills" correct={scores.specific_correct} total={scores.specific_total} color={SECTION_META.specific.color} />
          <div className="border-t border-gray-200 pt-4 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">Overall Score</span>
              <span className="text-2xl font-black" style={{ color: levelColor }}>{scores.total}%</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Your hard skills and soft skills scores have been applied to your employability profile for {program} program.
        </p>

        <button onClick={onContinue}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: '#0f2d1a' }}>
          Continue to Dashboard <MdArrowForward />
        </button>
      </div>
    </div>
  )
}

export default function NCAEQuestionnaire() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState([])
  const [program, setProgram] = useState('')
  const [course, setCourse] = useState('')
  const [answers, setAnswers] = useState({})
  const [currentSection, setCurrentSection] = useState('hard')
  const [submitting, setSubmitting] = useState(false)
  const [scores, setScores] = useState(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const topRef = useRef(null)

  useEffect(() => {
    api.get('/alumni/ncae').then(r => {
      if (r.data.already_completed) {
        setAlreadyDone(true)
      } else {
        setQuestions(r.data.questions || [])
        setProgram(r.data.program || '')
        setCourse(r.data.course || '')
      }
    }).catch(e => {
      setError(e.response?.data?.error || 'Failed to load assessment.')
    }).finally(() => setLoading(false))
  }, [])

  const sectionQuestions = {
    hard:     questions.filter(q => q.category === 'hard'),
    soft:     questions.filter(q => q.category === 'soft'),
    specific: questions.filter(q => q.category === 'specific'),
  }

  const sectionOrder = ['hard', 'soft', 'specific']
  const currentIdx = sectionOrder.indexOf(currentSection)
  const currentQs = sectionQuestions[currentSection] || []

  const answeredInSection = (sec) =>
    (sectionQuestions[sec] || []).filter(q => answers[q.num]).length

  const totalAnswered = Object.keys(answers).length
  const totalQuestions = questions.length
  const allAnswered = totalAnswered === totalQuestions && totalQuestions > 0

  function selectAnswer(num, choice) {
    setAnswers(prev => ({ ...prev, [num]: choice }))
  }

  function goNext() {
    if (currentIdx < sectionOrder.length - 1) {
      setCurrentSection(sectionOrder[currentIdx + 1])
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function goPrev() {
    if (currentIdx > 0) {
      setCurrentSection(sectionOrder[currentIdx - 1])
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function submit() {
    if (!allAnswered) return
    setSubmitting(true)
    api.post('/alumni/ncae/submit', { answers }).then(r => {
      setScores(r.data.scores)
      if (refreshUser) refreshUser()
    }).catch(e => {
      setError(e.response?.data?.error || 'Submission failed. Please try again.')
    }).finally(() => setSubmitting(false))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f3f4f6' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#0f2d1a' }}>
          <MdSchool style={{ color: 'white', fontSize: '24px' }} />
        </div>
        <p className="text-sm text-gray-500">Loading your assessment…</p>
      </div>
    </div>
  )

  if (alreadyDone) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f3f4f6' }}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-xl">
          <MdCheckCircle style={{ color: '#0f2d1a', fontSize: '48px', margin: '0 auto 12px' }} />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Assessment Already Complete</h2>
          <p className="text-sm text-gray-400 mb-6">You have already completed the NCAE Skills Assessment.</p>
          <button onClick={() => navigate('/alumni/dashboard')}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: '#0f2d1a' }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (scores) {
    return <ResultScreen scores={scores} program={course} onContinue={() => navigate('/alumni/dashboard')} />
  }

  const meta = SECTION_META[currentSection]

  return (
    <div className="min-h-screen" style={{ background: '#f3f4f6' }}>
      {/* Fixed header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: '#0f2d1a' }}>
                <MdSchool className="text-lg" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">NCAE Skills Assessment</p>
                <p className="text-xs text-gray-400">{course} · {totalAnswered}/{totalQuestions} answered</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex-1 max-w-xs">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${totalQuestions > 0 ? (totalAnswered / totalQuestions * 100) : 0}%`, background: '#0f2d1a' }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5 text-right">
                {totalQuestions > 0 ? Math.round(totalAnswered / totalQuestions * 100) : 0}% complete
              </p>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 mt-3">
            {sectionOrder.map(sec => {
              const sm = SECTION_META[sec]
              const answered = answeredInSection(sec)
              const total = (sectionQuestions[sec] || []).length
              const done = answered === total && total > 0
              const active = sec === currentSection
              return (
                <button key={sec}
                  onClick={() => { setCurrentSection(sec); topRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1"
                  style={active
                    ? { background: sm.color, color: 'white' }
                    : done
                    ? { background: sm.bg, color: sm.color }
                    : { background: '#f3f4f6', color: '#6b7280' }}>
                  {done && <MdCheckCircle className="text-xs" />}
                  {sec === 'hard' ? 'Hard Skills' : sec === 'soft' ? 'Soft Skills' : 'Specific'}
                  <span className="opacity-70">({answered}/{total})</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
            <MdWarning className="text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-2" ref={topRef}>
        <div className="rounded-2xl px-5 py-4 mb-4 flex items-center gap-3"
          style={{ background: meta.bg }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: meta.color }}>
            <MdSchool style={{ color: 'white', fontSize: '20px' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</p>
            <p className="text-xs" style={{ color: meta.color, opacity: 0.7 }}>
              Items {meta.range} · {answeredInSection(currentSection)}/{meta.count} answered
            </p>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {currentQs.map((q, qi) => (
            <div key={q.num} className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-900 mb-4 leading-snug">
                <span className="text-xs font-black mr-2 px-2 py-0.5 rounded-lg"
                  style={{ background: meta.bg, color: meta.color }}>
                  {q.num}
                </span>
                {q.question}
              </p>
              <div className="space-y-2">
                {Object.entries(q.options).map(([letter, text]) => {
                  const selected = answers[q.num] === letter
                  return (
                    <button key={letter}
                      onClick={() => selectAnswer(q.num, letter)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border"
                      style={selected
                        ? { background: meta.bg, borderColor: meta.color, color: meta.color }
                        : { background: '#fafafa', borderColor: '#e5e7eb', color: '#374151' }}>
                      <div className="flex-shrink-0">
                        {selected
                          ? <MdCheckCircle style={{ color: meta.color, fontSize: '18px' }} />
                          : <MdRadioButtonUnchecked style={{ color: '#d1d5db', fontSize: '18px' }} />}
                      </div>
                      <span className="text-xs font-bold mr-1" style={{ color: selected ? meta.color : '#9ca3af' }}>
                        {letter}.
                      </span>
                      <span className="text-sm flex-1">{text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 mb-8">
          <button onClick={goPrev} disabled={currentIdx === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
            <MdArrowBack /> Previous
          </button>

          {currentIdx < sectionOrder.length - 1 ? (
            <button onClick={goNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: meta.color }}>
              Next Section <MdArrowForward />
            </button>
          ) : (
            <button onClick={submit}
              disabled={!allAnswered || submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: '#0f2d1a' }}>
              {submitting ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Submitting…</>
              ) : (
                <><MdCheckCircle /> Submit Assessment</>
              )}
            </button>
          )}
        </div>

        {/* Warning if not all answered */}
        {currentIdx === sectionOrder.length - 1 && !allAnswered && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2 mb-6">
            <MdWarning className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Please answer all <span className="font-bold">{totalQuestions - totalAnswered}</span> remaining
              question{totalQuestions - totalAnswered !== 1 ? 's' : ''} before submitting.
              Check all 3 sections.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
