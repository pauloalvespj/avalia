import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError(
        err.message.includes('Invalid login')
          ? 'E-mail ou senha incorretos.'
          : 'Erro ao entrar. Tente novamente.'
      )
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#1a2e4a', letterSpacing: 3 }}>AVALIARY</span>
          <p className="text-sm text-muted mt-2">Área do Psicólogo</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="psicologo@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <div className="bg-danger/10 text-danger text-sm px-3 py-2.5 rounded-xl">{error}</div>
            )}
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-4">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-navy font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
