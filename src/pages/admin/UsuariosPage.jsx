import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, Toast, ConfirmModal } from '@/components/ui'

// ── Constantes de usuários ────────────────────────────────────────────────────

const ROLE_LABEL = { admin: 'Admin', consultor: 'Consultor' }
const ROLE_STYLE = {
  admin:     { bg: '#ede9fe', color: '#6d28d9' },
  consultor: { bg: '#dbeafe', color: '#1d4ed8' },
}

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.consultor
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={s}>{ROLE_LABEL[role] ?? role}</span>
}

function StatusBadge({ ativo }) {
  return ativo
    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">Ativo</span>
    : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-muted">Inativo</span>
}

// ── Constantes de perfis de acesso ────────────────────────────────────────────

const MODULOS = [
  { key: 'empresas',     label: 'Empresas' },
  { key: 'setores',      label: 'Setores' },
  { key: 'respostas',    label: 'Respostas' },
  { key: 'riscos',       label: 'Riscos' },
  { key: 'diagnostico',  label: 'Diagnóstico' },
  { key: 'plano_acao',   label: 'Plano de Ação' },
  { key: 'okrs',         label: 'OKRs / KPIs' },
  { key: 'checklist',    label: 'Checklist' },
  { key: 'relatorio',    label: 'Relatório' },
  { key: 'denuncias',    label: 'Denúncias' },
  { key: 'agendamentos',    label: 'Agendamentos' },
  { key: 'escuta_equipe',  label: 'Escuta da Equipe' },
  { key: 'escuta_gestores', label: 'Escuta Gestores/RH' },
]

const NIVEL_LABEL = { oculto: 'Oculto', ver: 'Somente ver', editar: 'Editar' }
const NIVEL_COLOR = { oculto: '#6b7280', ver: '#0369a1', editar: '#166534' }
const NIVEL_BG    = { oculto: '#f3f4f6', ver: '#e0f2fe', editar: '#dcfce7' }
const PERM_PADRAO = Object.fromEntries(MODULOS.map(m => [m.key, 'editar']))

// ── Página principal ──────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { user: eu } = useAuth()

  const [aba, setAba] = useState('usuarios')

  // ── Estado: usuários
  const [usuarios, setUsuarios]         = useState([])
  const [perfisAcesso, setPerfisAcesso] = useState([])
  const [loading, setLoading]           = useState(true)
  const [modalAdd, setModalAdd]         = useState(false)
  const [editando, setEditando]         = useState(null)
  const [formEdit, setFormEdit]         = useState({})
  const [deletando, setDeletando]       = useState(null)
  const [email, setEmail]               = useState('')
  const [nomeNovo, setNomeNovo]         = useState('')
  const [cpfNovo, setCpfNovo]           = useState('')
  const [senha, setSenha]               = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [acessoNovo, setAcessoNovo]     = useState('admin')
  const [salvando, setSalvando]         = useState(false)
  const [toast, setToast]               = useState(null)

  // ── Estado: perfis de acesso
  const [modalPerfil, setModalPerfil]     = useState(false)
  const [editandoPerfil, setEditandoPerfil] = useState(null)
  const [deletandoPerfil, setDeletandoPerfil] = useState(null)
  const [formPerfil, setFormPerfil] = useState({ nome: '', descricao: '', escopo: 'proprias', modulos: { ...PERM_PADRAO } })

  // ── Carregamento
  const load = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: pa }] = await Promise.all([
      supabase.from('perfis').select('*').order('created_at'),
      supabase.from('perfis_acesso').select('*').order('nome'),
    ])
    if (error) setToast({ message: 'Erro: ' + error.message, type: 'error' })
    setUsuarios(data ?? [])
    setPerfisAcesso(pa ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Ações: usuários
  function abrirEditar(u) {
    setEditando(u)
    setFormEdit({ nome: u.nome ?? '', cpf: u.cpf ?? '', email: u.email ?? '', role: u.role ?? 'consultor', ativo: u.ativo !== false, perfil_acesso_id: u.perfil_acesso_id ?? '' })
  }

  async function salvarEdicao() {
    setSalvando(true)
    const emailMudou = formEdit.email.trim() !== (editando.email ?? '')
    if (emailMudou && formEdit.email.trim()) {
      const { error: errEdge } = await supabase.functions.invoke('admin-update-user', {
        body: { userId: editando.id, email: formEdit.email.trim() },
      })
      if (errEdge) { setSalvando(false); setToast({ message: 'Erro ao alterar e-mail: ' + errEdge.message, type: 'error' }); return }
    }
    const { error } = await supabase.from('perfis').update({
      nome:             formEdit.nome.trim()  || null,
      cpf:              formEdit.cpf.trim()   || null,
      email:            formEdit.email.trim() || null,
      role:             formEdit.role,
      ativo:            formEdit.ativo,
      perfil_acesso_id: formEdit.perfil_acesso_id || null,
    }).eq('id', editando.id)
    setSalvando(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setUsuarios(prev => prev.map(x => x.id === editando.id ? { ...x, ...formEdit } : x))
    setToast({ message: 'Usuário atualizado!', type: 'success' })
    setEditando(null)
  }

  async function excluir(u) {
    const { error } = await supabase.from('perfis').delete().eq('id', u.id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setUsuarios(prev => prev.filter(x => x.id !== u.id))
    setToast({ message: `${u.nome ?? u.email} removido.`, type: 'info' })
    setDeletando(null)
  }

  async function criarDiretamente() {
    if (!email.trim() || !senha.trim()) return
    if (senha.length < 6) { setToast({ message: 'Senha deve ter pelo menos 6 caracteres.', type: 'error' }); return }
    const roleReal     = acessoNovo === 'admin' ? 'admin' : 'consultor'
    const perfilIdNovo = acessoNovo === 'admin' ? null : acessoNovo
    setSalvando(true)
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { action: 'create', email: email.trim(), password: senha, role: roleReal, nome: nomeNovo.trim() || null },
    })
    setSalvando(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    const emailCriado = email.trim()
    const nomeCriado  = nomeNovo.trim() || null
    const cpfCriado   = cpfNovo.trim()  || null
    setTimeout(async () => {
      const { data: novo } = await supabase.from('perfis').select('id').eq('email', emailCriado).maybeSingle()
      if (novo) await supabase.from('perfis').update({ senha_provisoria: true, nome: nomeCriado, cpf: cpfCriado, perfil_acesso_id: perfilIdNovo }).eq('id', novo.id)
      load()
    }, 1500)
    setToast({ message: `Usuário ${email} criado!`, type: 'success' })
    setModalAdd(false)
    setEmail(''); setNomeNovo(''); setCpfNovo(''); setSenha('')
  }

  // ── Ações: perfis de acesso
  function abrirNovoPerfil() {
    setEditandoPerfil(null)
    setFormPerfil({ nome: '', descricao: '', escopo: 'proprias', modulos: { ...PERM_PADRAO } })
    setModalPerfil(true)
  }

  function abrirEditarPerfil(p) {
    setEditandoPerfil(p)
    setFormPerfil({
      nome:      p.nome ?? '',
      descricao: p.descricao ?? '',
      escopo:    p.permissoes?.escopo ?? 'proprias',
      modulos:   { ...PERM_PADRAO, ...(p.permissoes?.modulos ?? {}) },
    })
    setModalPerfil(true)
  }

  async function salvarPerfil() {
    if (!formPerfil.nome.trim()) return
    setSalvando(true)
    const payload = {
      nome:       formPerfil.nome.trim(),
      descricao:  formPerfil.descricao.trim() || null,
      permissoes: { escopo: formPerfil.escopo, modulos: formPerfil.modulos },
    }
    const { error } = editandoPerfil
      ? await supabase.from('perfis_acesso').update(payload).eq('id', editandoPerfil.id)
      : await supabase.from('perfis_acesso').insert(payload)
    setSalvando(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: editandoPerfil ? 'Perfil atualizado!' : 'Perfil criado!', type: 'success' })
    setModalPerfil(false)
    load()
  }

  async function excluirPerfil(id) {
    const { error } = await supabase.from('perfis_acesso').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Perfil removido.', type: 'info' })
    setDeletandoPerfil(null)
    load()
  }

  function contarUsuarios(id) { return usuarios.filter(u => u.perfil_acesso_id === id).length }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuários"
        subtitle="Gerencie usuários e permissões de acesso"
        action={
          aba === 'usuarios'
            ? <button className="btn-primary" onClick={() => setModalAdd(true)}>+ Adicionar usuário</button>
            : <button className="btn-primary" onClick={abrirNovoPerfil}>+ Novo Perfil</button>
        }
      />

      {/* ── Abas ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f1f5f9', width: 'fit-content' }}>
        {[
          { key: 'usuarios', label: `Usuários (${usuarios.length})` },
          { key: 'perfis',   label: `Perfis de Acesso (${perfisAcesso.length})` },
        ].map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: aba === a.key ? '#fff' : 'transparent',
              color:      aba === a.key ? '#1e2a4a' : '#64748b',
              boxShadow:  aba === a.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}>
            {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted text-sm">Carregando…</div>
      ) : aba === 'usuarios' ? (

        // ── Lista de usuários ──────────────────────────────────────────────────
        <div className="space-y-2">
          {usuarios.map(u => {
            const sou = u.id === eu?.id
            const perfilNome = perfisAcesso.find(p => p.id === u.perfil_acesso_id)?.nome
            return (
              <div key={u.id} className="card flex items-center gap-3">
                <div className="flex-shrink-0">
                  {u.foto_url
                    ? <img src={u.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                    : <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-black text-primary">
                        {(u.nome ?? u.email ?? '?')[0].toUpperCase()}
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy text-sm truncate">{u.nome ?? '—'}</span>
                    {sou && <span className="text-xs text-muted">(você)</span>}
                    <RoleBadge role={u.role} />
                    <StatusBadge ativo={u.ativo !== false} />
                    {u.senha_provisoria && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
                        🔑 Senha provisória
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">{u.email}</div>
                  <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-3">
                    {u.created_at && <span>Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}</span>}
                    {perfilNome && (
                      <span className="font-semibold" style={{ color: '#6d28d9' }}>🔐 {perfilNome}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary text-xs w-8 h-8 flex items-center justify-center" title="Editar" onClick={() => abrirEditar(u)}>✏️</button>
                  {!sou && (
                    <button
                      title="Excluir usuário"
                      onClick={() => setDeletando(u)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                      style={{ background: '#ef4444', color: '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      ) : (

        // ── Lista de perfis de acesso ──────────────────────────────────────────
        !perfisAcesso.length ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🔐</div>
            <div className="font-semibold text-navy mb-1">Nenhum perfil criado</div>
            <div className="text-sm text-muted mb-4">Crie perfis para controlar o acesso dos consultores.</div>
            <button className="btn-primary" onClick={abrirNovoPerfil}>Criar primeiro perfil</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {perfisAcesso.map(p => {
              const qtd = contarUsuarios(p.id)
              return (
                <div key={p.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-navy">{p.nome}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                          {qtd} {qtd === 1 ? 'usuário' : 'usuários'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: p.permissoes?.escopo === 'todas' ? '#dcfce7' : '#fef9c3', color: p.permissoes?.escopo === 'todas' ? '#166534' : '#854d0e' }}>
                          {p.permissoes?.escopo === 'todas' ? 'Todas as empresas' : 'Só as próprias'}
                        </span>
                      </div>
                      {p.descricao && <p className="text-xs text-muted mb-2">{p.descricao}</p>}
                      <div className="flex flex-wrap gap-1">
                        {MODULOS.map(m => {
                          const nivel = p.permissoes?.modulos?.[m.key] ?? 'editar'
                          return (
                            <span key={m.key} className="text-2xs font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: NIVEL_BG[nivel], color: NIVEL_COLOR[nivel] }}>
                              {m.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-secondary text-xs w-8 h-8 flex items-center justify-center" title="Editar" onClick={() => abrirEditarPerfil(p)}>✏️</button>
                      <button
                        title="Excluir perfil"
                        onClick={() => setDeletandoPerfil(p)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ background: '#ef4444', color: '#fff' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Modal editar usuário ── */}
      {editando && (
        <Modal title={`Editar — ${editando.email}`} onClose={() => setEditando(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input className="input" placeholder="Nome do usuário" value={formEdit.nome} autoFocus
                onChange={e => setFormEdit(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={formEdit.email}
                onChange={e => setFormEdit(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="input" placeholder="000.000.000-00" value={formEdit.cpf}
                onChange={e => setFormEdit(p => ({ ...p, cpf: e.target.value }))} />
            </div>
            <div>
              <label className="label">Perfil de Acesso</label>
              <select
                className="input"
                disabled={editando.id === eu?.id}
                value={formEdit.role === 'admin' ? 'admin' : (formEdit.perfil_acesso_id ?? '')}
                onChange={e => {
                  const v = e.target.value
                  if (v === 'admin') setFormEdit(p => ({ ...p, role: 'admin', perfil_acesso_id: '' }))
                  else setFormEdit(p => ({ ...p, role: 'consultor', perfil_acesso_id: v }))
                }}>
                <option value="admin">Admin</option>
                {perfisAcesso.map(pa => <option key={pa.id} value={pa.id}>{pa.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={formEdit.ativo ? 'ativo' : 'inativo'} disabled={editando.id === eu?.id}
                onChange={e => setFormEdit(p => ({ ...p, ativo: e.target.value === 'ativo' }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarEdicao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal novo usuário ── */}
      {modalAdd && (
        <Modal title="Novo usuário" onClose={() => { setModalAdd(false); setEmail(''); setNomeNovo(''); setCpfNovo(''); setSenha(''); setAcessoNovo('admin') }} size="sm">
          <input type="text" name="fake-user" style={{ display: 'none' }} readOnly />
          <input type="password" name="fake-pass" style={{ display: 'none' }} readOnly />
          <div className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input className="input" autoComplete="off" placeholder="Dr. João Silva" value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input className="input" type="email" autoComplete="off" placeholder="usuario@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="input" autoComplete="off" placeholder="000.000.000-00" value={cpfNovo} onChange={e => setCpfNovo(e.target.value)} />
            </div>
            <div>
              <label className="label">Senha provisória *</label>
              <div className="relative">
                <input className="input pr-10" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy text-xs"
                  onClick={() => setMostrarSenha(v => !v)}>{mostrarSenha ? '🙈' : '👁'}</button>
              </div>
              <p className="text-2xs text-muted mt-1">O usuário verá um aviso para trocar na primeira sessão.</p>
            </div>
            <div>
              <label className="label">Perfil de Acesso</label>
              <select className="input" value={acessoNovo} onChange={e => setAcessoNovo(e.target.value)}>
                <option value="admin">Admin</option>
                {perfisAcesso.map(pa => <option key={pa.id} value={pa.id}>{pa.nome}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={() => { setModalAdd(false); setEmail(''); setNomeNovo(''); setCpfNovo(''); setSenha(''); setAcessoNovo('admin') }}>Cancelar</button>
              <button className="btn-primary" onClick={criarDiretamente} disabled={salvando || !email.trim() || !senha.trim()}>
                {salvando ? 'Criando...' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal criar / editar perfil de acesso ── */}
      {modalPerfil && (
        <Modal title={editandoPerfil ? `Editar — ${editandoPerfil.nome}` : 'Novo Perfil de Acesso'} onClose={() => setModalPerfil(false)} size="lg">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome do perfil *</label>
                <input className="input" placeholder="Ex: Consultor Padrão, Visualizador..." autoFocus
                  value={formPerfil.nome} onChange={e => setFormPerfil(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Descrição</label>
                <input className="input" placeholder="Descreva brevemente este perfil..."
                  value={formPerfil.descricao} onChange={e => setFormPerfil(p => ({ ...p, descricao: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Escopo de empresas</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'proprias', label: 'Só as próprias', desc: 'Vê apenas as empresas atribuídas a ele', emoji: '👤' },
                  { value: 'todas',    label: 'Todas',          desc: 'Vê todas as empresas do sistema',       emoji: '🌐' },
                ].map(op => (
                  <button key={op.value} type="button" onClick={() => setFormPerfil(p => ({ ...p, escopo: op.value }))}
                    className="text-left p-3 rounded-xl border-2 transition-all"
                    style={{ borderColor: formPerfil.escopo === op.value ? '#3a7bd5' : '#e2e8f0', background: formPerfil.escopo === op.value ? '#eff6ff' : '#fff' }}>
                    <div className="text-lg mb-1">{op.emoji}</div>
                    <div className="text-sm font-bold text-navy">{op.label}</div>
                    <div className="text-xs text-muted">{op.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Permissões por módulo</div>
              <div className="rounded-xl overflow-hidden border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th className="text-left px-4 py-2 text-xs font-bold text-muted uppercase tracking-wide">Módulo</th>
                      {['oculto', 'ver', 'editar'].map(n => (
                        <th key={n} className="px-4 py-2 text-xs font-bold uppercase tracking-wide">
                          <button type="button" title={`Marcar todos como "${NIVEL_LABEL[n]}"`}
                            onClick={() => setFormPerfil(p => ({
                              ...p,
                              modulos: Object.fromEntries(
                                MODULOS.map(m => [m.key, m.semEditar && n === 'editar' ? 'ver' : n])
                              )
                            }))}
                            className="flex items-center gap-1 mx-auto hover:opacity-70 transition-opacity"
                            style={{ color: NIVEL_COLOR[n] }}>
                            {NIVEL_LABEL[n]}
                            <span title="Marcar todos" style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULOS.map((m, i) => {
                      const niveis = m.semEditar ? ['oculto', 'ver'] : ['oculto', 'ver', 'editar']
                      return (
                        <tr key={m.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td className="px-4 py-2.5 font-medium text-navy">{m.label}</td>
                          {['oculto', 'ver', 'editar'].map(n => (
                            <td key={n} className="px-4 py-2.5 text-center">
                              {niveis.includes(n) ? (
                                <input type="radio" name={`mod-${m.key}`}
                                  checked={formPerfil.modulos[m.key] === n}
                                  onChange={() => setFormPerfil(p => ({ ...p, modulos: { ...p.modulos, [m.key]: n } }))}
                                  className="w-4 h-4 cursor-pointer" style={{ accentColor: NIVEL_COLOR[n] }} />
                              ) : (
                                <span className="text-muted text-xs">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={() => setModalPerfil(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarPerfil} disabled={salvando || !formPerfil.nome.trim()}>
                {salvando ? 'Salvando...' : editandoPerfil ? 'Salvar Alterações' : 'Criar Perfil'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletando && (
        <ConfirmModal title="Excluir usuário" danger
          message={`Remover "${deletando.nome ?? deletando.email}"? Para exclusão permanente do Auth, use o painel do Supabase.`}
          confirmLabel="Excluir" onConfirm={() => excluir(deletando)} onClose={() => setDeletando(null)} />
      )}

      {deletandoPerfil && (
        <ConfirmModal title="Remover perfil" danger
          message={`Remover "${deletandoPerfil.nome}"? Os usuários vinculados ficarão sem perfil de acesso.`}
          confirmLabel="Remover" onConfirm={() => excluirPerfil(deletandoPerfil.id)} onClose={() => setDeletandoPerfil(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
