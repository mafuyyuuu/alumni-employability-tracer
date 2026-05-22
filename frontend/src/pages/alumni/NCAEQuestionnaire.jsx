import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  MdCheckCircle, MdArrowForward, MdArrowBack,
  MdSchool, MdWarning, MdStar, MdStarBorder,
} from 'react-icons/md'

const SECTION_META = {
  hard:     { label: 'Hard Skills',     color: '#0f2d1a', bg: '#e6ede8', range: '1-20',  count: 20 },
  soft:     { label: 'Soft Skills',     color: '#1d4ed8', bg: '#eff6ff', range: '21-35', count: 15 },
  specific: { label: 'Specific Skills', color: '#b45309', bg: '#fffbeb', range: '36-50', count: 15 },
}

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' }
const RATING_COLORS = {
  1: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c' },
  2: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },
  3: { bg: '#fefce8', border: '#fde047', text: '#854d0e' },
  4: { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  5: { bg: '#e6ede8', border: '#6ee7b7', text: '#0f2d1a' },
}

function RatingInput({ num, statement, value, onChange, sectionColor, sectionBg }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-800 mb-4 leading-snug">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black mr-2 flex-shrink-0"
          style={{ background: sectionBg, color: sectionColor }}>
          {num}
        </span>
        {statement}
      </p>

      {/* 1-5 rating buttons */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map(score => {
          const selected = value === score
          const rc = RATING_COLORS[score]
          return (
            <button key={score} onClick={() => onChange(num, score)}
              className="flex-1 min-w-[56px] flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold border-2 transition-all"
              style={selected
                ? { background: rc.bg, borderColor: rc.border, color: rc.text }
                : { background: '#fafafa', borderColor: '#e5e7eb', color: '#9ca3af' }}>
              <span className="text-base font-black">{score}</span>
              <span className="text-[10px] leading-tight text-center">{RATING_LABELS[score]}</span>
            </button>
          )
        })}
      </div>

      {/* Selected indicator */}
      {value ? (
        <p className="text-xs mt-2 font-semibold" style={{ color: RATING_COLORS[value].text }}>
          You rated: {value} — {RATING_LABELS[value]}
        </p>
      ) : (
        <p className="text-xs mt-2 text-gray-300">Select a rating (1 = Poor, 5 = Excellent)</p>
      )}
    </div>
  )
}

function ScoreBar({ label, avg, color, bg }) {
  const pct = Math.round((avg / 5) * 100)
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="font-bold" style={{ color }}>{avg.toFixed(1)} / 5 &nbsp;({pct}%)</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ResultScreen({ scores, program, onContinue }) {
  const total = scores.total
  const level = total >= 65 ? 'Likely Employable' : total >= 35 ? 'Employable' : 'Least Employable'
  const levelColor = { 'Likely Employable': '#0f2d1a', 'Employable': '#1d4ed8', 'Least Employable': '#b91c1c' }[level]
  const levelBg   = { 'Likely Employable': '#e6ede8', 'Employable': '#eff6ff', 'Least Employable': '#fef2f2' }[level]

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f3f4f6' }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-xl text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#e6ede8' }}>
          <MdCheckCircle style={{ color: '#0f2d1a', fontSize: '44px' }} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">Assessment Complete!</h1>
        <p className="text-sm text-gray-400 mb-6">Your self-ratings have been saved to your profile.</p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-bold"
          style={{ background: levelBg, color: levelColor }}>
          <MdStar /> {level}
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left">
          <ScoreBar label="Hard Skills" avg={scores.hard_avg || (scores.hard_skills / 20)} color={SECTION_META.hard.color} bg={SECTION_META.hard.bg} />
          <ScoreBar label="Soft Skills" avg={scores.soft_avg || (scores.soft_skills / 20)} color={SECTION_META.soft.color} bg={SECTION_META.soft.bg} />
          <ScoreBar label="Specific Skills" avg={scores.specific_avg || (scores.specific_skills / 20)} color={SECTION_META.specific.color} bg={SECTION_META.specific.bg} />
          <div className="border-t border-gray-200 pt-4 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">Overall Score</span>
              <span className="text-2xl font-black" style={{ color: levelColor }}>{total.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Your hard and soft skills ratings have been applied to your employability profile for the {program} program.
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
  const [ratings, setRatings] = useState({})     // {num: 1-5}
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
    (sectionQuestions[sec] || []).filter(q => ratings[q.num] > 0).length

  const totalAnswered = questions.filter(q => ratings[q.num] > 0).length
  const totalQuestions = questions.length
  const allAnswered = totalAnswered === totalQuestions && totalQuestions > 0

  function setRating(num, value) {
    setRatings(prev => ({ ...prev, [num]: value }))
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
    api.post('/alumni/ncae/submit', { ratings }).then(r => {
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
        <p className="text-sm text-gray-500">Loading your assessment...</p>
      </div>
    </div>
  )

  if (alreadyDone) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f3f4f6' }}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-xl">
          <MdCheckCircle style={{ color: '#0f2d1a', fontSize: '48px', margin: '0 auto 12px' }} />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Assessment Already Complete</h2>
          <p className="text-sm text-gray-400 mb-6">You have already completed the Skills Self-Rating Assessment.</p>
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
                <p className="text-sm font-bold text-gray-900 leading-tight">Skills Self-Rating Assessment</p>
                <p className="text-xs text-gray-400">{course} · {totalAnswered}/{totalQuestions} rated</p>
              </div>
            </div>
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
                  {sm.label}
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
            <MdStar style={{ color: 'white', fontSize: '20px' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</p>
            <p className="text-xs" style={{ color: meta.color, opacity: 0.8 }}>
              Items {meta.range} · Rate each statement 1 (Poor) to 5 (Excellent) · {answeredInSection(currentSection)}/{meta.count} rated
            </p>
          </div>
        </div>

        {/* Rating scale legend */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ background: RATING_COLORS[s].bg, color: RATING_COLORS[s].text, border: `1px solid ${RATING_COLORS[s].border}` }}>
              {s} — {RATING_LABELS[s]}
            </div>
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {currentQs.map((q) => (
            <RatingInput
              key={q.num}
              num={q.num}
              statement={q.statement}
              value={ratings[q.num] || 0}
              onChange={setRating}
              sectionColor={meta.color}
              sectionBg={meta.bg}
            />
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
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> Submitting...</>
              ) : (
                <><MdCheckCircle /> Submit Assessment</>
              )}
            </button>
          )}
        </div>

        {currentIdx === sectionOrder.length - 1 && !allAnswered && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2 mb-6">
            <MdWarning className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Please rate all <span className="font-bold">{totalQuestions - totalAnswered}</span> remaining
              item{totalQuestions - totalAnswered !== 1 ? 's' : ''} before submitting.
              Check all 3 sections.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
