import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Inactivity timeout — logout after 30 mins of no activity ─────────────
const INACTIVITY_LIMIT = 5 * 60 * 1000  // 5 minutes
let inactivityTimer = null

export const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(() => {
    localStorage.clear()
    window.location.href = '/'
  }, INACTIVITY_LIMIT)
}

// Start timer on app load
resetInactivityTimer()

  // Reset timer on any user activity
  ;['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true)
  })
// ─────────────────────────────────────────────────────────────────────────

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      try {
        const refresh = localStorage.getItem('refresh')
        const { data } = await axios.post('/api/auth/refresh/', { refresh })
        localStorage.setItem('access', data.access)
        orig.headers.Authorization = `Bearer ${data.access}`
        return api(orig)
      } catch {
        localStorage.clear()
        window.location.href = '/'
      }
    }
    return Promise.reject(err)
  }
)

export default api