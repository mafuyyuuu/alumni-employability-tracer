import { useState, useEffect } from 'react'
import AlumniLayout from '../../components/alumni/AlumniLayout'
import { MdNotificationsNone, MdCheckCircle, MdDoneAll } from 'react-icons/md'
import api from '../../services/api'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications').then(r => {
      setNotifications(r.data.notifications || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function markRead(id) {
    api.put(`/notifications/${id}/read`).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }).catch(() => {})
  }

  function markAllRead() {
    api.put('/notifications/read-all').then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }).catch(() => {})
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <AlumniLayout>
      <div className="px-4 sm:px-6 py-8 page-enter">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <MdDoneAll className="text-sm" /> Mark all read
            </button>
          )}
        </div>

        {loading && (
          <div className="bg-white rounded-2xl py-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div
            className="bg-white rounded-2xl flex flex-col items-center justify-center py-20"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: '#e6ede8' }}
            >
              <MdNotificationsNone className="text-3xl" style={{ color: '#1a3d27' }} />
            </div>
            <h3 className="text-base font-bold text-gray-800">All caught up!</h3>
            <p className="text-sm text-gray-400 mt-1.5 text-center max-w-xs">
              No notifications right now. Check back later for job alerts and updates.
            </p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className="bg-white rounded-2xl px-5 py-4 flex items-start gap-4 cursor-pointer hover:shadow-sm transition-all"
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: n.is_read ? '3px solid transparent' : '3px solid #0f2d1a',
                }}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: n.is_read ? '#f3f4f6' : '#e6ede8' }}
                >
                  <MdCheckCircle className="text-lg" style={{ color: n.is_read ? '#d1d5db' : '#0f2d1a' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${n.is_read ? 'text-gray-500' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-300 mt-1">{n.created_at?.slice(0, 10)}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#0f2d1a' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AlumniLayout>
  )
}
