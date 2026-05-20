import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import { MdArrowForward, MdBusiness } from 'react-icons/md'
import api from '../../services/api'

const COLORS = ['#6366f1', '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#ef4444']

export default function Companies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    api.get('/companies').then(r => setCompanies(r.data.companies || [])).catch(() => {})
  }, [])

  return (
    <AlumniLayout>
      <div className="px-4 sm:px-6 py-8 page-enter">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Partner Companies</h1>
          <p className="text-sm text-gray-500 mt-1">Explore companies actively hiring PLP alumni</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {companies.map((company, i) => (
            <div
              key={company.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-primary-lighter hover:shadow-md transition-all group"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black"
                  style={{ background: COLORS[i % COLORS.length] }}
                >
                  {company.name[0]}
                </div>
                {company.openings > 0 && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: '#e6ede8', color: '#0f2d1a' }}
                  >
                    {company.openings} open
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-900">{company.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <MdBusiness className="text-xs" />{company.industry}
              </p>
              <button
                onClick={() => navigate(`/alumni/browse-jobs?company=${encodeURIComponent(company.name)}`)}
                className="flex items-center gap-1.5 text-xs font-semibold mt-4 transition-all group-hover:gap-2"
                style={{ color: '#0f2d1a' }}
              >
                View Jobs <MdArrowForward className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AlumniLayout>
  )
}
