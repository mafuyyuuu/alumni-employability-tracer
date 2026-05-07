import { useState } from 'react'
import Sidebar from './Sidebar'
import { MdMenu } from 'react-icons/md'

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-page-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 overflow-auto min-w-0">
        {/* Mobile topbar */}
        <div
          className="flex items-center gap-3 px-4 py-3 md:hidden border-b border-gray-200 bg-white sticky top-0 z-20"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
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
