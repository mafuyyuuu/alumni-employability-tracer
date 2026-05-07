import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import {
  MdSearch, MdLocationOn, MdBookmarkBorder, MdBookmark, MdWork,
  MdOpenInNew, MdStar, MdExpandMore, MdExpandLess, MdBusiness, MdClose,
} from 'react-icons/md'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const typeStyle = {
  'Full-time':  { background: '#f0faf5', color: '#2d6a4f' },
  'Part-time':  { background: '#eff6ff', color: '#2563eb' },
  'Contract':   { background: '#fff7ed', color: '#ea580c' },
  'Internship': { background: '#fdf4ff', color: '#9333ea' },
}

const TABS = ['For You', 'All Jobs', 'External Jobs']
const PAGE_SIZE = 50

function normalizeQuery(value = '') {
  return String(value).toLowerCase().trim()
}

function queryTokens(query = '') {
  const normalized = normalizeQuery(query)
  return normalized ? normalized.split(/\s+/).filter(Boolean) : []
}

function parsePostedDate(value) {
  const ts = Date.parse(value || '')
  return Number.isNaN(ts) ? 0 : ts
}

function scoreField(text, phrase, tokens, exactWeight, includeWeight, tokenWeight) {
  const value = normalizeQuery(text)
  if (!value) return 0

  let score = 0
  if (phrase && value === phrase) score += exactWeight
  if (phrase && value.includes(phrase)) score += includeWeight

  for (const token of tokens) {
    if (value.includes(token)) score += tokenWeight
  }
  return score
}

function relevanceScore(job, query) {
  const phrase = normalizeQuery(query)
  const tokens = queryTokens(phrase)
  if (!phrase || tokens.length === 0) return 0

  let score = 0
  score += scoreField(job.title, phrase, tokens, 500, 220, 70)
  score += scoreField(job.company, phrase, tokens, 260, 120, 45)
  score += scoreField(job.category, phrase, tokens, 180, 90, 35)
  score += scoreField(job.location, phrase, tokens, 150, 80, 30)
  score += scoreField(job.description, phrase, tokens, 0, 40, 12)
  score += scoreField(job.source, phrase, tokens, 0, 35, 10)
  return score
}

function compareByPostedNewest(a, b) {
  return parsePostedDate(b.posted) - parsePostedDate(a.posted)
}

function compareExternalSort(a, b, sortBy) {
  if (sortBy === 'newest') return compareByPostedNewest(a, b)
  if (sortBy === 'oldest') return parsePostedDate(a.posted) - parsePostedDate(b.posted)
  if (sortBy === 'source') return (a.source || '').localeCompare(b.source || '')
  if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
  return 0
}

function dedupeJobs(jobs) {
  const seen = new Set()
  const unique = []
  for (const job of jobs) {
    const key = [
      normalizeQuery(job.title),
      normalizeQuery(job.company),
      normalizeQuery(job.source),
      normalizeQuery(job.url),
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(job)
  }
  return unique
}

function pageItems(items, page, perPage) {
  const start = (page - 1) * perPage
  return items.slice(start, start + perPage)
}

function getPageRange(current, total, width = 5) {
  if (total <= width) return Array.from({ length: total }, (_, i) => i + 1)
  const half = Math.floor(width / 2)
  let start = Math.max(1, current - half)
  let end = start + width - 1
  if (end > total) {
    end = total
    start = end - width + 1
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function SourceBadge({ source, color }) {
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
      style={{ background: color || '#6b7280', fontSize: '10px' }}>
      {source}
    </span>
  )
}

function JobCard({ job, isSaved, onSave, showSource = false, external = false }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: job.recommended ? '1.5px solid #b7e4c7' : '1.5px solid transparent' }}>
      <div className="p-4 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: job.color || job.source_color || '#2d6a4f' }}>
          {job.company[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900 leading-tight">{job.title}</h3>
                {job.recommended && (
                  <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: '#f0faf5', color: '#2d6a4f', fontSize: '10px' }}>
                    <MdStar className="text-xs" /> Match
                  </span>
                )}
              </div>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#2d6a4f' }}>{job.company}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!external && (
                <button onClick={() => onSave(job)} className="transition-colors"
                  style={{ color: isSaved ? '#2d6a4f' : '#d1d5db' }}>
                  {isSaved ? <MdBookmark className="text-lg" /> : <MdBookmarkBorder className="text-lg" />}
                </button>
              )}
              {/* Apply Now always visible for external jobs */}
              {external && job.url && (
                <button
                  onClick={e => { e.stopPropagation(); window.open(job.url, '_blank', 'noopener,noreferrer'); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 flex-shrink-0"
                  style={{ background: '#2d6a4f' }}>
                  Apply Now <MdOpenInNew style={{ fontSize: '11px' }} />
                </button>
              )}
            </div>
          </div>

          {/* Tags row */}
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={typeStyle[job.type] || typeStyle['Full-time']}>
              {job.type}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              <MdLocationOn className="text-xs" />{job.location}
            </span>
            {job.salary && (
              <span className="text-xs text-gray-500">{job.salary}</span>
            )}
            {showSource && job.source && job.source !== 'Platform' && (
              <SourceBadge source={job.source} color={job.source_color} />
            )}
            <span className="text-xs text-gray-300 ml-auto">{job.posted}</span>
          </div>

          {/* Description toggle */}
          {job.description && (
            <button onClick={() => setExpanded(p => !p)}
              className="mt-2 flex items-center gap-0.5 text-xs font-semibold transition-colors"
              style={{ color: '#2d6a4f' }}>
              {expanded ? <><MdExpandLess /> Hide details</> : <><MdExpandMore /> View details</>}
            </button>
          )}
          {expanded && (
            <p className="mt-2 text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-2">
              {job.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BrowseJobs() {
  const { user } = useAuth()
  const course = user?.course || ''
  const [searchParams, setSearchParams] = useSearchParams()
  const companyParam = searchParams.get('company') || ''

  const [tab, setTab] = useState(companyParam ? 1 : 0)
  const [search, setSearch] = useState(companyParam)
  const [location, setLocation] = useState('')
  const [jobTypes, setJobTypes] = useState([])
  const [allJobs, setAllJobs] = useState([])
  const [jobs, setJobs] = useState([])
  const [externalJobs, setExternalJobs] = useState([])
  const [savedIds, setSavedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [extLoading, setExtLoading] = useState(true)
  const [extSearch, setExtSearch] = useState('')
  const [extSort, setExtSort] = useState('newest')
  const [extKeyword, setExtKeyword] = useState('') // last keyword used for API fetch
  const [forYouPage, setForYouPage] = useState(1)
  const [allJobsPage, setAllJobsPage] = useState(1)
  const [extPage, setExtPage] = useState(1)
  const [extPerPage, setExtPerPage] = useState(PAGE_SIZE)
  const [extTotal, setExtTotal] = useState(0)
  const [extProvidersConfigured, setExtProvidersConfigured] = useState(true)
  const [extError, setExtError] = useState('')
  const [jobKeyword, setJobKeyword] = useState(normalizeQuery(companyParam))
  const bannerSearchValue = tab === 2 ? extSearch : search
  const firstInternalSearchRun = useRef(true)

  function toggleJobType(type) {
    setJobTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  // Filter internal jobs client-side by job types
  useEffect(() => {
    const base = jobTypes.length === 0 ? allJobs : allJobs.filter(j => jobTypes.includes(j.type))
    setJobs(base)
  }, [allJobs, jobTypes])

  const fetchJobs = useCallback(() => {
    setLoading(true)
    const normalizedKeyword = normalizeQuery(search)
    const params = { status: 'Open' }
    if (normalizedKeyword) params.search = normalizedKeyword
    if (location) params.location = location
    api.get('/jobs', { params }).then(r => {
      setAllJobs(r.data.jobs || [])
      setJobKeyword(normalizedKeyword)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [search, location])

  useEffect(() => { fetchJobs() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (firstInternalSearchRun.current) {
      firstInternalSearchRun.current = false
      return
    }
    const timer = setTimeout(() => {
      fetchJobs()
    }, 350)
    return () => clearTimeout(timer)
  }, [search, location, fetchJobs])

  function clearCompanyFilter() {
    setSearch('')
    setJobKeyword('')
    setSearchParams({})
  }

  function handleBannerSearchChange(value) {
    if (tab === 2) {
      setExtSearch(value)
      return
    }
    setSearch(value)
  }

  function runBannerSearch() {
    if (tab === 2) {
      fetchExternalJobs(extSearch.trim(), 1)
      return
    }
    fetchJobs()
  }

  // Fetch external jobs — accepts optional keyword for backend re-search
  const fetchExternalJobs = useCallback((kw = '', page = 1) => {
    setExtLoading(true)
    setExtError('')
    const params = { page, per_page: PAGE_SIZE, real_only: 1 }
    if (kw) params.keyword = kw
    api.get('/jobs/external', { params }).then(r => {
      const jobs = r.data.jobs || []
      setExternalJobs(jobs)
      setExtKeyword(kw)
      setExtPage(r.data.page || page)
      setExtPerPage(r.data.per_page || PAGE_SIZE)
      setExtTotal(r.data.total || 0)
      setExtProvidersConfigured(r.data.providers_configured !== false)
    }).catch((err) => {
      if (err?.response?.status === 429) {
        setExtError('External job API rate limit reached. Please wait a bit before searching again.')
      } else {
        setExtError('Failed to fetch live external jobs. Please try again.')
      }
    }).finally(() => setExtLoading(false))
  }, [])

  useEffect(() => { fetchExternalJobs('', 1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setForYouPage(1)
  }, [search, jobs, externalJobs])

  useEffect(() => {
    setAllJobsPage(1)
  }, [search, location, jobTypes, jobs, externalJobs])

  // Fetch saved job IDs
  useEffect(() => {
    api.get('/jobs/saved').then(r => {
      setSavedIds(new Set((r.data.jobs || []).map(j => j.id)))
    }).catch(() => {})
  }, [])

  function toggleSave(job) {
    if (savedIds.has(job.id)) {
      api.delete(`/jobs/${job.id}/save`).then(() => {
        setSavedIds(prev => { const s = new Set(prev); s.delete(job.id); return s })
      }).catch(() => {})
    } else {
      api.post(`/jobs/${job.id}/save`).then(() => {
        setSavedIds(prev => new Set([...prev, job.id]))
      }).catch(() => {})
    }
  }

  const forYouQuery = normalizeQuery(search)

  // For You = course-matched jobs from internal + external, deduped and relevance-sorted
  const recommendedJobs = dedupeJobs([
    ...jobs.filter(j => j.recommended),
    ...externalJobs.filter(j => j.recommended),
  ])
    .filter(j => !forYouQuery || relevanceScore(j, forYouQuery) > 0)
    .sort((a, b) => {
      if (forYouQuery) {
        const diff = relevanceScore(b, forYouQuery) - relevanceScore(a, forYouQuery)
        if (diff !== 0) return diff
      }
      const byDate = compareByPostedNewest(a, b)
      if (byDate !== 0) return byDate
      return (a.title || '').localeCompare(b.title || '')
    })

  // External jobs with search + sort applied (client-side over loaded results)
  const filteredExternal = externalJobs
    .filter(j => {
      if (!extSearch) return true
      const q = extSearch.toLowerCase()
      return j.title.toLowerCase().includes(q) ||
             j.company.toLowerCase().includes(q) ||
             j.location.toLowerCase().includes(q) ||
             (j.source || '').toLowerCase().includes(q) ||
             (j.category || '').toLowerCase().includes(q) ||
             (j.description || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const activeExternalQuery = normalizeQuery(extSearch || extKeyword)
      if (activeExternalQuery) {
        const diff = relevanceScore(b, activeExternalQuery) - relevanceScore(a, activeExternalQuery)
        if (diff !== 0) return diff
      }
      const bySelectedSort = compareExternalSort(a, b, extSort)
      if (bySelectedSort !== 0) return bySelectedSort
      return (a.title || '').localeCompare(b.title || '')
    })

  // All Jobs: merged internal + external jobs, deduped and relevance-sorted
  const sortedAllJobs = dedupeJobs([...jobs, ...externalJobs])
    .filter(j => !jobKeyword || relevanceScore(j, jobKeyword) > 0)
    .filter(j => jobTypes.length === 0 || jobTypes.includes(j.type))
    .sort((a, b) => {
      const diff = relevanceScore(b, jobKeyword) - relevanceScore(a, jobKeyword)
      if (diff !== 0) return diff
      const byRecommended = (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)
      if (byRecommended !== 0) return byRecommended
      const byDate = compareByPostedNewest(a, b)
      if (byDate !== 0) return byDate
      return (a.title || '').localeCompare(b.title || '')
    })

  const forYouTotalPages = Math.max(1, Math.ceil(recommendedJobs.length / PAGE_SIZE))
  const allJobsTotalPages = Math.max(1, Math.ceil(sortedAllJobs.length / PAGE_SIZE))
  const externalTotalPages = Math.max(1, Math.ceil(extTotal / Math.max(1, extPerPage)))

  const pagedForYouJobs = pageItems(recommendedJobs, forYouPage, PAGE_SIZE)
  const pagedAllJobs = pageItems(sortedAllJobs, allJobsPage, PAGE_SIZE)

  const displayJobs = tab === 0 ? pagedForYouJobs : tab === 1 ? pagedAllJobs : filteredExternal
  const isExternal = tab === 2
  const isLoading = tab === 2 ? extLoading : loading
  const currentPage = tab === 0 ? forYouPage : tab === 1 ? allJobsPage : extPage
  const totalPages = tab === 0 ? forYouTotalPages : tab === 1 ? allJobsTotalPages : externalTotalPages
  const pageRange = getPageRange(currentPage, totalPages)

  return (
    <AlumniLayout>
      {/* Search banner */}
      <div className="py-8 px-4 sm:px-6 relative overflow-hidden" style={{ background: '#2d6a4f' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(82,183,136,0.15) 0%, transparent 60%)' }} />
        <div className="relative px-6">
          <h1 className="text-white text-xl font-bold mb-0.5">Find Your Dream Job</h1>
          {course && (
            <p className="text-xs mb-3 font-semibold px-2 py-0.5 rounded-full inline-block"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
              Showing recommendations for {course}
            </p>
          )}
          {companyParam && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <MdBusiness className="text-white text-sm flex-shrink-0" />
              <span className="text-xs font-semibold text-white flex-1">
                Showing jobs at <span className="font-black">{companyParam}</span>
              </span>
              <button onClick={clearCompanyFilter} className="text-white opacity-70 hover:opacity-100 transition-opacity">
                <MdClose className="text-sm" />
              </button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="flex-1 relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input type="text" placeholder="Job title, keyword, or company"
                value={bannerSearchValue} onChange={e => handleBannerSearchChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runBannerSearch()}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm bg-white focus:outline-none" />
            </div>
            <div className="relative sm:w-[200px]">
              <MdLocationOn className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input type="text" placeholder="Location"
                value={location} onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJobs()}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm bg-white focus:outline-none" />
            </div>
            <button
              onClick={runBannerSearch}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: '#52b788', color: '#fff' }}>
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-10 pt-5 pb-0">
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className="px-4 py-2 text-sm font-semibold transition-all relative"
              style={{ color: tab === i ? '#2d6a4f' : '#9ca3af' }}>
              {t}
              {i === 0 && recommendedJobs.length > 0 && (
                <span className="ml-1.5 text-xs font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: '#f0faf5', color: '#2d6a4f' }}>{recommendedJobs.length}</span>
              )}
              {tab === i && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#2d6a4f' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-5 flex flex-col md:flex-row gap-5 page-enter">
        {/* Filters (only for All Jobs) */}
        {tab === 1 && (
          <div className="w-full md:w-52 md:flex-shrink-0">
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Filters</h3>
              <div className="mb-4">
                <p className="text-xs font-semibold mb-2.5 uppercase tracking-wider" style={{ color: '#2d6a4f' }}>Job Type</p>
                {['Full-time', 'Part-time', 'Contract', 'Internship'].map(type => (
                  <label key={type} className="flex items-center gap-2.5 mb-2.5 cursor-pointer">
                    <div className="w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0"
                      style={{ background: jobTypes.includes(type) ? '#2d6a4f' : 'white', borderColor: jobTypes.includes(type) ? '#2d6a4f' : '#d1d5db' }}
                      onClick={() => toggleJobType(type)}>
                      {jobTypes.includes(type) && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">{type}</span>
                  </label>
                ))}
              </div>
              {jobTypes.length > 0 && (
                <button onClick={() => setJobTypes([])}
                  className="w-full py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                  Clear ({jobTypes.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Job list */}
        <div className="flex-1 space-y-3">
          {/* Section header */}
          <div className="flex items-center justify-between mb-1">
            {tab === 0 && (
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{recommendedJobs.length}</span> jobs matched to <span className="font-semibold" style={{ color: '#2d6a4f' }}>{course || 'your profile'}</span>
              </p>
            )}
            {tab === 1 && (
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{sortedAllJobs.length}</span> open jobs available
              </p>
            )}
            {tab === 2 && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-gray-900">{filteredExternal.length}</span>
                      {extTotal > 0 ? ` of ${extTotal}` : ''} live listings
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {extKeyword ? `Results for "${extKeyword}"` : `Recommended for ${course || 'your profile'}`}
                      {' · '}powered by Google Jobs
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      placeholder="Search jobs"
                      value={extSearch}
                      onChange={e => setExtSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchExternalJobs(extSearch.trim(), 1)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none focus:border-green-400 bg-white"
                    />
                  </div>
                  <button
                    onClick={() => fetchExternalJobs(extSearch.trim(), 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 flex-shrink-0"
                    style={{ background: '#2d6a4f' }}
                  >
                    Search
                  </button>
                  <select
                    value={extSort}
                    onChange={e => setExtSort(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 focus:outline-none focus:border-green-400 bg-white text-gray-600 cursor-pointer"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title">A–Z title</option>
                    <option value="source">By source</option>
                  </select>
                </div>
                {extError && (
                  <p className="text-xs text-amber-700 mt-2">{extError}</p>
                )}
              </div>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
          )}

          {/* Empty state */}
          {!isLoading && displayJobs.length === 0 && (
            <div className="bg-white rounded-2xl py-16 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <MdWork className="text-3xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {tab === 0
                  ? 'No program-matched jobs found'
                  : tab === 2
                    ? (extProvidersConfigured
                      ? 'No live jobs found for this search'
                      : 'No live providers configured. Add API keys in backend/.env to fetch direct listing links.')
                    : 'No jobs found'}
              </p>
            </div>
          )}

          {/* Job cards */}
          {!isLoading && displayJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedIds.has(job.id)}
              onSave={toggleSave}
              showSource={tab === 0 || tab === 1 || tab === 2}
              external={isExternal || job.id?.toString().startsWith('ext-')}
            />
          ))}

          {!isLoading && totalPages > 1 && (
            <div className="pt-2 flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  if (currentPage <= 1) return
                  if (tab === 0) setForYouPage(currentPage - 1)
                  if (tab === 1) setAllJobsPage(currentPage - 1)
                  if (tab === 2) fetchExternalJobs(extKeyword, currentPage - 1)
                }}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 disabled:opacity-40"
              >
                Prev
              </button>
              {pageRange.map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => {
                    if (tab === 0) setForYouPage(pageNum)
                    if (tab === 1) setAllJobsPage(pageNum)
                    if (tab === 2) fetchExternalJobs(extKeyword, pageNum)
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  style={pageNum === currentPage
                    ? { background: '#2d6a4f', color: '#fff', borderColor: '#2d6a4f' }
                    : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}
                >
                  {pageNum}
                </button>
              ))}
              <button
                onClick={() => {
                  if (currentPage >= totalPages) return
                  if (tab === 0) setForYouPage(currentPage + 1)
                  if (tab === 1) setAllJobsPage(currentPage + 1)
                  if (tab === 2) fetchExternalJobs(extKeyword, currentPage + 1)
                }}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AlumniLayout>
  )
}
