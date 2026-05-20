import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdWork, MdPerson, MdLogout, MdClose, MdMenu, MdBusiness,
} from 'react-icons/md'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { label: 'Dashboard',  to: '/company/dashboard', icon: MdDashboard },
  { label: 'Job Postings', to: '/company/jobs',    icon: MdWork },
  { label: 'Profile',    to: '/company/profile',   icon: MdPerson },
]

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col border-r
        transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:z-auto
        w-56 flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ backgroundColor: '#0f2d1a', borderColor: 'rgba(255,255,255,0.06)', minHeight: '100vh' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: '#C8A217' }}>
            C
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Company</p>
            <p className="text-xs mt-0.5" style={{ color: '#C8A217' }}>Partner Portal</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white transition-colors p-1 ml-2">
          <MdClose className="text-lg" />
        </button>
      </div>

      {/* Nav + sign-out together, scrollable as one block */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <nav className="space-y-0.5 mb-4">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) => isActive ? { background: '#1a3d27', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' } : {}}>
              <Icon className="text-base flex-shrink-0" />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info + logout — directly below the last nav item */}
        <div className="px-4 py-4 border-t rounded-xl"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {(user?.first_name || 'C')[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-medium w-full px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent' }}>
            <MdLogout /> Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}

export default function CompanyLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: '#f3f4f6' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <MdMenu className="text-xl" />
          </button>
          <div className="flex items-center gap-2">
            <MdBusiness className="text-gray-600" />
            <span className="text-sm font-bold text-gray-800">Company Portal</span>
          </div>
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
