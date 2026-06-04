import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function CadastroPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', crp: '', email: '', senha: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState(false)

  function set(campo) {
    return e => setForm(prev => ({ ...prev, [campo]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (form.senha !== form.confirmar) {
      setErro('As senhas não conferem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: { nome: form.nome, crp: form.crp }
      }
    })
    setLoading(false)

    if (error) {
      setErro(
        error.message.includes('already registered')
          ? 'Este e-mail já está cadastrado.'
          : 'Erro ao criar conta. Tente novamente.'
      )
    } else {
      setSucesso(true)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy items-center justify-center text-2xl font-black text-white mb-4">A</div>
          <div className="card">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-navy mb-2">Cadastro realizado!</h2>
            <p className="text-sm text-muted mb-4">
              Enviamos um e-mail de confirmação para <strong>{form.email}</strong>.
              Verifique sua caixa de entrada e clique no link para ativar sua conta.
            </p>
            <Link to="/login" className="btn-primary w-full py-2.5 block text-center">
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-navy items-center justify-center text-2xl font-black text-white mb-4">A</div>
          <h1 className="text-2xl font-black text-navy">Sistema Avalia</h1>
          <p className="text-sm text-muted mt-1">Cadastro de Psicólogo</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input type="text" className="input" placeholder="Dr. João Silva"
                value={form.nome} onChange={set('nome')} required autoFocus />
            </div>
            <div>
              <label className="label">CRP</label>
              <input type="text" className="input" placeholder="06/123456"
                value={form.crp} onChange={set('crp')} required />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="psicologo@email.com"
                value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" placeholder="Mínimo 6 caracteres"
                value={form.senha} onChange={set('senha')} required />
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input type="password" className="input" placeholder="Repita a senha"
                value={form.confirmar} onChange={set('confirmar')} required />
            </div>

            {erro && (
              <div className="bg-danger/10 text-danger text-sm px-3 py-2.5 rounded-xl">{erro}</div>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-4">
          Já tem conta?{' '}
          <Link to="/login" className="text-navy font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
