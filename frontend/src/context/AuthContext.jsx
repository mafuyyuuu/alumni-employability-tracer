import { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    localStorage.setItem('token', token)

    // For alumni, fetch ncae_completed status from profile
    let enriched = userData
    if (userData.role === 'alumni') {
      try {
        const profileRes = await api.get('/alumni/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        enriched = {
          ...userData,
          ncae_completed: profileRes.data.profile?.ncaeCompleted ?? false,
        }
      } catch {
        enriched = { ...userData, ncae_completed: false }
      }
    }

    localStorage.setItem('user', JSON.stringify(enriched))
    setUser(enriched)
    return enriched
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/login'
  }

  const refreshUser = async () => {
    if (!user || user.role !== 'alumni') return
    try {
      const profileRes = await api.get('/alumni/profile')
      const updated = {
        ...user,
        ncae_completed: profileRes.data.profile?.ncaeCompleted ?? false,
      }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
