import { useState } from 'react'
import Sidebar from './Sidebar'
import { MdMenu, MdChevronLeft } from 'react-icons/md'

const SIDEBAR_W = 224 // px — must match w-56 (14rem)
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const DUR  = '320ms'

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)

  return (
    <div className="flex min-h-screen bg-page-bg">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar wrapper — sticky + full viewport height, clips animation */}
      <div
        className="hidden md:block flex-shrink-0 sticky top-0 h-screen"
        style={{
          width: collapsed ? '0' : `${SIDEBAR_W}px`,
          overflow: 'hidden',              /* clip while animating */
          transition: `width ${DUR} ${EASE}`,
        }}
      >
        {/* Inner div slides the sidebar out without reflowing the page */}
        <div
          style={{
            width: `${SIDEBAR_W}px`,
            height: '100%',
            transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
            transition: `transform ${DUR} ${EASE}`,
          }}
        >
          <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Mobile sidebar (overlay, unchanged) */}
      <div className="md:hidden">
        <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>

      <div className="flex-1 overflow-auto min-w-0">
        {/* Desktop toggle bar */}
        <div
          className="hidden md:flex items-center px-4 py-2 border-b border-gray-100 bg-white sticky top-0 z-20"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <MdChevronLeft
              className="text-xl"
              style={{
                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: `transform ${DUR} ${EASE}`,
                display: 'block',
              }}
            />
          </button>
        </div>

        {/* Mobile topbar */}
        <div
          className="flex items-center gap-3 px-4 py-3 md:hidden border-b border-gray-200 bg-white sticky top-0 z-20"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <MdMenu className="text-xl" />
          </button>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: '#0f2d1a' }}
          >
            P
          </div>
          <span className="font-bold text-gray-900 text-sm">PLP Admin Panel</span>
        </div>

        {children}
      </div>
    </div>
  )
}
