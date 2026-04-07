import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdArrowBack, MdCheckCircle } from 'react-icons/md'
import LiquidEther from '../components/LiquidEther'
import { useAuth } from '../context/AuthContext'

const ETHER_COLORS = ['#00ff41', '#39ff14', '#57ff2e', '#b4ff6e']

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  // 'login' | 'forgot' | 'sent'
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setLoginError('')
    try {
      const user = await login(email, password)
      if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/alumni/dashboard')
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function handleForgot(e) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setView('sent')
    }, 1200)
  }

  const inputBase =
    'w-full bg-gray-50 border border-gray-200 rounded-xl px-11 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all duration-200'
  const inputFocus =
    'focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]'

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative" style={{ background: '#060f06' }}>

      {/* ── Liquid Ether WebGL background ───────────── */}
      <LiquidEther
        colors={ETHER_COLORS}
        autoSpeed={0.4}
        autoIntensity={3.0}
        mouseForce={30}
        cursorSize={120}
        resolution={0.4}
        iterationsPoisson={16}
        iterationsViscous={16}
      />

      {/* Card */}
      <div
        className="animate-fade-up relative w-full mx-4 rounded-3xl overflow-hidden"
        style={{
          maxWidth: 480,
          background: '#ffffff',
          boxShadow: '0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07)',
          zIndex: 10,
        }}
      >
        {/* ── Logo section ──────────────────────────── */}
        <div className="px-10 pt-9 pb-8 flex flex-col items-center">
          <div className="flex items-center justify-center gap-10">
            <img src="/plp.png" alt="PLP Logo" className="h-20 w-auto object-contain" />
            <div className="w-px h-14 rounded-full bg-gray-200" />
            <img src="/pasig.png" alt="Pasig City Logo" className="h-20 w-auto object-contain" />
          </div>
        </div>

        {/* ── Divider ───────────────────────────────── */}
        <div className="h-px bg-gray-100 mx-10" />

        {/* ── Form area ─────────────────────────────── */}
        <div className="px-10 py-8">

          {/* ── LOGIN VIEW ──────────────────────────── */}
          {view === 'login' && (
            <div className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Email address</label>
                  <div className="relative">
                    <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input
                      type="email"
                      placeholder="you@plp.edu.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`${inputBase} ${inputFocus}`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Password</label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setResetEmail(email) }}
                      className="text-xs font-semibold transition-colors hover:underline"
                      style={{ color: '#2d6a4f' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`${inputBase} ${inputFocus} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPass ? <MdVisibilityOff className="text-lg" /> : <MdVisibility className="text-lg" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <p className="text-xs text-red-500 text-center -mt-1 mb-1">{loginError}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-wide disabled:opacity-60 transition-all duration-200 active:scale-[0.98] hover:opacity-90 mt-2"
                  style={{ background: '#2d6a4f' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Signing in…
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Admin demo:{' '}
                  <span
                    className="font-semibold cursor-pointer hover:underline"
                    style={{ color: '#2d6a4f' }}
                    onClick={() => setEmail('admin@plp.edu.ph')}
                  >
                    admin@plp.edu.ph
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD VIEW ──────────────────── */}
          {view === 'forgot' && (
            <div className="animate-slide-left">
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Email address</label>
                  <div className="relative">
                    <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input
                      type="email"
                      placeholder="you@plp.edu.ph"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className={`${inputBase} ${inputFocus}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-wide disabled:opacity-60 active:scale-[0.98] transition-all hover:opacity-90"
                  style={{ background: '#2d6a4f' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Sending…
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>

              <button
                onClick={() => setView('login')}
                className="flex items-center justify-center gap-1.5 w-full mt-5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors group"
              >
                <MdArrowBack className="group-hover:-translate-x-0.5 transition-transform" />
                Back to sign in
              </button>
            </div>
          )}

          {/* ── EMAIL SENT CONFIRMATION ────────────────── */}
          {view === 'sent' && (
            <div className="animate-fade-up text-center">
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: '#f0faf5' }}
                >
                  <MdCheckCircle className="text-4xl" style={{ color: '#2d6a4f' }} />
                </div>
              </div>

              <button
                onClick={() => { setView('login'); setResetEmail('') }}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-wide active:scale-[0.98] transition-all hover:opacity-90"
                style={{ background: '#2d6a4f' }}
              >
                Back to Sign In
              </button>

              <button
                onClick={() => setView('forgot')}
                className="mt-4 text-xs font-semibold w-full text-center transition-colors hover:underline"
                style={{ color: '#2d6a4f' }}
              >
                Didn't receive it? Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
