import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { MdLogout, MdWork, MdMenu, MdClose } from 'react-icons/md'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/alumni/dashboard', label: 'Dashboard' },
  { to: '/alumni/browse-jobs', label: 'Browse Jobs' },
  { to: '/alumni/companies', label: 'Companies' },
  { to: '/alumni/saved-jobs', label: 'Saved Jobs' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''
  const initial = (user?.first_name?.[0] || 'U').toUpperCase()

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-0 border-b border-gray-200/80"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', height: 56 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#2d6a4f' }}
          >
            <MdWork className="text-white text-base" />
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">Job Placement</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full ml-0.5 hidden sm:inline"
            style={{ background: '#f0faf5', color: '#2d6a4f' }}
          >
            PLP
          </span>
        </div>

        {/* Nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/alumni/dashboard'}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-primary bg-primary-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NavLink
            to="/alumni/profile-settings"
            className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#2d6a4f' }}
            >
              {initial}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden lg:block">{fullName}</span>
          </NavLink>
          <div className="hidden sm:block w-px h-5 bg-gray-200" />
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <MdLogout className="text-base" />
            <span className="hidden md:inline">Logout</span>
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {menuOpen ? <MdClose className="text-xl" /> : <MdMenu className="text-xl" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="md:hidden sticky top-14 z-40 bg-white border-b border-gray-200 px-4 py-3 flex flex-col gap-0.5"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/alumni/dashboard'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'text-primary bg-primary-50' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2 flex items-center justify-between">
            <NavLink
              to="/alumni/profile-settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: '#2d6a4f' }}
              >
                {initial}
              </div>
              <span className="text-sm font-medium text-gray-700">{fullName}</span>
            </NavLink>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-500 transition-colors"
            >
              <MdLogout className="text-base" /> Logout
            </button>
          </div>
        </div>
      )}
    </>
  )
}
