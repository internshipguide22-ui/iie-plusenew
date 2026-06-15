import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (username, password, user_type) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', { username, password, user_type })
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      const userData = { ...data }
      delete userData.access
      delete userData.refresh
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return { success: true, data: userData }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try { await api.post('/auth/logout/', { refresh: localStorage.getItem('refresh') }) } catch {}
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
