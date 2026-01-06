import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      navigate('/login?error=' + error)
      return
    }

    if (token) {
      localStorage.setItem('token', token)
      // Pequeno delay para o estado atualizar
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } else {
      navigate('/login?error=no_token')
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/30 animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Autenticando...</h2>
        <p className="text-text-secondary">Aguarde enquanto finalizamos seu login</p>
        <div className="mt-6">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    </div>
  )
}
