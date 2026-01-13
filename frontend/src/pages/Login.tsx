import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Sparkles, User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setError(null)

    try {
      await login({ username, password, rememberMe })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Credenciais inválidas')
      setIsLoggingIn(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <Link
        to="/welcome"
        className="absolute top-6 left-6 flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </Link>

      {/* Main container */}
      <div className="relative w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 mb-5">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">TattooTrack</h1>
          <p className="text-text-secondary text-sm mt-1">Gestão inteligente para tatuadores</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary">Entrar</h2>
            <p className="text-text-secondary text-sm mt-1">Acesse sua conta para continuar</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Usuário</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-secondary/50" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-secondary/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-[18px] h-[18px] rounded border border-border bg-surface peer-checked:bg-violet-500 peer-checked:border-violet-500 transition-all flex items-center justify-center">
                  <Check className={`w-3 h-3 text-white transition-all ${rememberMe ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </div>
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors select-none">
                Manter conectado
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-text-secondary text-sm mt-8">
            Não tem conta?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Criar agora
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-text-secondary/40 text-xs mt-8">
          &copy; {new Date().getFullYear()} TattooTrack
        </p>
      </div>
    </div>
  )
}
