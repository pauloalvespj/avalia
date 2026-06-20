import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

function LogoMarca({ dark = false }) {
  const cor = dark ? '#fff' : '#1a2e4a'
  return (
    <div className="flex flex-col items-start">
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: cor, letterSpacing: 4, lineHeight: 1 }}>
        AVALIARY
      </span>
      <div style={{ width: 72, height: 3, background: '#F5A623', borderRadius: 2, marginTop: 5 }} />
    </div>
  )
}

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [aba, setAba] = useState('senha') // 'senha' | 'codigo'

  // ── Aba Senha ──────────────────────────────────────────────
  const [email,   setEmail]   = useState(() => localStorage.getItem('psi_email_lembrado') || '')
  const [senha,   setSenha]   = useState('')
  const [lembrar, setLembrar] = useState(() => !!localStorage.getItem('psi_email_lembrado'))
  const [loadSenha, setLoadSenha] = useState(false)
  const [errSenha,  setErrSenha]  = useState('')

  // ── Esqueci senha ──────────────────────────────────────────
  const [esqueciAberto,  setEsqueciAberto]  = useState(false)
  const [esqueciEmail,   setEsqueciEmail]   = useState('')
  const [esqueciMsg,     setEsqueciMsg]     = useState('')
  const [esqueciLoad,    setEsqueciLoad]    = useState(false)

  // ── Aba Código ─────────────────────────────────────────────
  const [codEmail, setCodEmail] = useState('')
  const [codigo,   setCodigo]   = useState('')
  const [codEtapa, setCodEtapa] = useState('email') // 'email' | 'verificar'
  const [codLoad,  setCodLoad]  = useState(false)
  const [codErr,   setCodErr]   = useState('')
  const [codMsg,   setCodMsg]   = useState('')

  // ── Handlers ───────────────────────────────────────────────
  async function handleSenha(e) {
    e.preventDefault()
    setErrSenha('')
    setLoadSenha(true)
    const { error: err } = await signIn(email, senha)
    setLoadSenha(false)
    if (err) {
      setErrSenha(err.message.includes('Invalid login') ? 'E-mail ou senha incorretos.' : 'Erro ao entrar. Tente novamente.')
    } else {
      if (lembrar) localStorage.setItem('psi_email_lembrado', email)
      else localStorage.removeItem('psi_email_lembrado')
      localStorage.removeItem('psi_empresa_ativa')
      localStorage.removeItem('psi_setor_ativo')
      navigate('/dashboard')
    }
  }

  async function handleEsqueci(e) {
    e.preventDefault()
    setEsqueciLoad(true)
    const { error } = await supabase.auth.resetPasswordForEmail(esqueciEmail, {
      redirectTo: `${window.location.origin}/resetar-senha`,
    })
    setEsqueciLoad(false)
    setEsqueciMsg(error ? ('Erro: ' + error.message) : 'Link enviado! Verifique seu e-mail.')
  }

  async function handleEnviarCodigo(e) {
    e.preventDefault()
    setCodErr('')
    setCodLoad(true)
    const { error } = await supabase.auth.signInWithOtp({ email: codEmail, options: { shouldCreateUser: false } })
    setCodLoad(false)
    if (error) setCodErr(error.message.includes('not found') ? 'E-mail não cadastrado.' : error.message)
    else { setCodEtapa('verificar'); setCodMsg(`Código enviado para ${codEmail}`) }
  }

  async function handleVerificarCodigo(e) {
    e.preventDefault()
    setCodErr('')
    setCodLoad(true)
    const { error } = await supabase.auth.verifyOtp({ email: codEmail, token: codigo, type: 'email' })
    setCodLoad(false)
    if (error) setCodErr('Código inválido ou expirado.')
    else {
      localStorage.removeItem('psi_empresa_ativa')
      localStorage.removeItem('psi_setor_ativo')
      navigate('/dashboard')
    }
  }

  function trocarAba(nova) {
    setAba(nova)
    setErrSenha('')
    setCodErr('')
    setEsqueciAberto(false)
    setEsqueciMsg('')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f4f6fa' }}>

      {/* ── Painel esquerdo (desktop) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] flex-shrink-0 p-10"
        style={{ background: '#1a2e4a' }}>
        <LogoMarca dark />
        <div className="space-y-7">
          {[
            { icon: '🧠', t: 'Avaliação NR-1', d: 'Questionário COPSOQ II com 8 domínios psicossociais' },
            { icon: '🌡️', t: 'Clima & NPS',    d: 'Pesquisa de clima e satisfação por setor'           },
            { icon: '📊', t: 'Diagnóstico',     d: 'Relatório consolidado com plano de ação'            },
          ].map(f => (
            <div key={f.t} className="flex items-start gap-4">
              <span className="text-2xl mt-0.5 flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{f.t}</p>
                <p className="text-white/45 text-xs mt-0.5 leading-relaxed">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-white/20 text-xs">© 2026 Avaliary · Plataforma de Diagnóstico Psicossocial</p>
      </div>

      {/* ── Painel direito (formulário) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">

        {/* Logo mobile */}
        <div className="lg:hidden mb-8">
          <LogoMarca />
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-black text-navy">Bem-vindo(a) de volta!</h1>
          <p className="text-sm text-muted mt-1 mb-6">Acesse sua conta para continuar</p>

          {/* Abas */}
          <div className="flex mb-5 rounded-xl overflow-hidden border border-border">
            {[['senha', '🔑 Senha'], ['codigo', '📨 Código']].map(([key, label]) => (
              <button key={key} onClick={() => trocarAba(key)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors
                  ${aba === key ? 'text-white' : 'text-muted hover:text-navy bg-transparent'}`}
                style={aba === key ? { background: '#1a2e4a' } : {}}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Aba Senha ── */}
          {aba === 'senha' && !esqueciAberto && (
            <form onSubmit={handleSenha} className="card space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input type="email" className="input" placeholder="psicologo@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Senha</label>
                  <button type="button"
                    onClick={() => { setEsqueciEmail(email); setEsqueciAberto(true); setEsqueciMsg('') }}
                    className="text-xs text-primary hover:underline">
                    Esqueci a senha
                  </button>
                </div>
                <input type="password" className="input" placeholder="••••••••"
                  value={senha} onChange={e => setSenha(e.target.value)} required />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary flex-shrink-0"
                  checked={lembrar} onChange={e => setLembrar(e.target.checked)} />
                <span className="text-sm text-muted">Lembrar meus dados</span>
              </label>

              {errSenha && (
                <div className="bg-danger/10 text-danger text-sm px-3 py-2.5 rounded-xl">{errSenha}</div>
              )}
              <button type="submit" className="btn-primary w-full py-3" disabled={loadSenha}>
                {loadSenha ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {/* ── Esqueci a senha ── */}
          {aba === 'senha' && esqueciAberto && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setEsqueciAberto(false); setEsqueciMsg('') }}
                  className="text-muted hover:text-navy text-base leading-none transition-colors">←</button>
                <p className="text-sm font-semibold text-navy">Redefinir senha</p>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              {!esqueciMsg ? (
                <form onSubmit={handleEsqueci} className="space-y-3">
                  <input type="email" className="input" placeholder="psicologo@email.com"
                    value={esqueciEmail} onChange={e => setEsqueciEmail(e.target.value)} required autoFocus />
                  <button type="submit" className="btn-primary w-full py-2.5" disabled={esqueciLoad}>
                    {esqueciLoad ? 'Enviando...' : 'Enviar link de redefinição'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-3 rounded-xl text-center">
                    ✅ {esqueciMsg}
                  </div>
                  <button onClick={() => { setEsqueciAberto(false); setEsqueciMsg('') }}
                    className="btn-secondary w-full py-2.5 text-sm">
                    Voltar ao login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Aba Código ── */}
          {aba === 'codigo' && (
            <div className="card space-y-4">
              {codEtapa === 'email' ? (
                <form onSubmit={handleEnviarCodigo} className="space-y-4">
                  <div>
                    <label className="label">E-mail</label>
                    <input type="email" className="input" placeholder="psicologo@email.com"
                      value={codEmail} onChange={e => setCodEmail(e.target.value)} required autoFocus />
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Enviaremos um código de 6 dígitos para o seu e-mail. Não é necessário senha.
                  </p>
                  {codErr && (
                    <div className="bg-danger/10 text-danger text-sm px-3 py-2.5 rounded-xl">{codErr}</div>
                  )}
                  <button type="submit" className="btn-primary w-full py-3" disabled={codLoad}>
                    {codLoad ? 'Enviando...' : 'Enviar código'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerificarCodigo} className="space-y-4">
                  <div className="text-center pt-1 pb-2">
                    <div className="text-3xl mb-2">📨</div>
                    <p className="text-xs text-muted leading-relaxed">{codMsg}</p>
                  </div>
                  <div>
                    <label className="label">Código de 6 dígitos</label>
                    <input
                      type="text" inputMode="numeric" className="input text-center text-2xl tracking-[0.6em] font-mono"
                      placeholder="000000" maxLength={6} autoFocus
                      value={codigo}
                      onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                  {codErr && (
                    <div className="bg-danger/10 text-danger text-sm px-3 py-2.5 rounded-xl">{codErr}</div>
                  )}
                  <button type="submit" className="btn-primary w-full py-3"
                    disabled={codLoad || codigo.length < 6}>
                    {codLoad ? 'Verificando...' : 'Verificar e entrar'}
                  </button>
                  <button type="button"
                    onClick={() => { setCodEtapa('email'); setCodigo(''); setCodErr('') }}
                    className="w-full text-center text-xs text-muted hover:text-navy transition-colors py-1">
                    Não recebi o código — tentar novamente
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
