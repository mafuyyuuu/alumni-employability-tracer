import { NavLink, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdSettings, MdShowChart, MdCompareArrows,
  MdAssessment, MdBusiness, MdWork, MdPeople,
  MdFeedback, MdCloudUpload, MdLogout, MdClose, MdSchool,
} from 'react-icons/md'

const sections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    to: '/admin/dashboard',    icon: MdDashboard },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Forecasting',           to: '/admin/forecasting',           icon: MdShowChart },
      { label: 'Predict Upcoming',      to: '/admin/predict-upcoming',      icon: MdAssessment },
      { label: 'Employment Comparison', to: '/admin/employment-comparison', icon: MdCompareArrows },
      { label: 'Predict & Report',      to: '/admin/predict-report',        icon: MdAssessment },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Factors Configuration', to: '/admin/voter-config', icon: MdSettings },
      { label: 'Programs',          to: '/admin/programs',     icon: MdSchool },
      { label: 'Companies',         to: '/admin/companies',    icon: MdBusiness },
      { label: 'Jobs',              to: '/admin/jobs',         icon: MdWork },
      { label: 'Users',             to: '/admin/users',        icon: MdPeople },
      { label: 'Feedbacks',         to: '/admin/feedbacks',    icon: MdFeedback },
      { label: 'Upload Data Model', to: '/admin/upload-model', icon: MdCloudUpload },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col border-r
        transition-transform duration-300 ease-in-out
        md:relative md:h-full md:translate-x-0 md:z-auto
        w-56 flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ backgroundColor: '#0f2d1a', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: '#C8A217' }}
          >
            P
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">PLP Admin</p>
            <p className="text-xs mt-0.5" style={{ color: '#C8A217' }}>Management Panel</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-white transition-colors p-1 ml-2"
        >
          <MdClose className="text-lg" />
        </button>
      </div>

      {/* Nav — scrollable */}
      <div className="flex-1 pl-3 pr-4 py-2">
        <nav className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p
                className="text-xs font-semibold uppercase tracking-widest px-2 mb-1.5"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {section.label}
              </p>
              {section.items.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: '#1a3d27', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
                      : {}
                  }
                >
                  <Icon className="text-base flex-shrink-0" />
                  <span className="text-xs">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Admin info + logout — always pinned to bottom */}
      <div
        className="px-3 py-3 mx-3 mb-3 rounded-xl flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            A
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">Administrator</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>admin@plp.edu.ph</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-xs font-medium w-full px-2 py-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent' }}
        >
          <MdLogout />
          Sign out
        </button>
      </div>
    </aside>
  )
}
