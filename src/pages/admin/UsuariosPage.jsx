import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, Toast, ConfirmModal } from '@/components/ui'

const ROLE_LABEL = { admin: 'Admin', consultor: 'Consultor' }
const ROLE_STYLE = {
  admin:     { bg: '#ede9fe', color: '#6d28d9' },
  consultor: { bg: '#dbeafe', color: '#1d4ed8' },
}

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.consultor
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={s}>
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

function StatusBadge({ ativo }) {
  return ativo
    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">Ativo</span>
    : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-muted">Inativo</span>
}

export default function UsuariosPage() {
  const { user: eu } = useAuth()

  const [usuarios, setUsuarios]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalAdd, setModalAdd]   = useState(false)
  const [editando, setEditando]   = useState(null)   // usuário sendo editado
  const [formEdit, setFormEdit]   = useState({})
  const [deletando, setDeletando] = useState(null)
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [roleNovo, setRoleNovo]   = useState('consultor')
  const [salvando, setSalvando]   = useState(false)
  const [toast, setToast]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('perfis').select('*').order('created_at')
    if (error) setToast({ message: 'Erro: ' + error.message, type: 'error' })
    setUsuarios(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function abrirEditar(u) {
    setEditando(u)
    setFormEdit({ nome: u.nome ?? '', cpf: u.cpf ?? '', email: u.email ?? '', role: u.role ?? 'consultor', ativo: u.ativo !== false })
  }

  async function salvarEdicao() {
    setSalvando(true)
    const emailMudou = formEdit.email.trim() !== (editando.email ?? '')

    // Se o e-mail mudou, atualiza no Auth via Edge Function
    if (emailMudou && formEdit.email.trim()) {
      const { error: errEdge } = await supabase.functions.invoke('admin-update-user', {
        body: { userId: editando.id, email: formEdit.email.trim() },
      })
      if (errEdge) {
        setSalvando(false)
        setToast({ message: 'Erro ao alterar e-mail: ' + errEdge.message, type: 'error' })
        return
      }
    }

    // Atualiza os demais campos na tabela perfis
    const { error: errPerfil } = await supabase.from('perfis')
      .update({
        nome:  formEdit.nome.trim()  || null,
        cpf:   formEdit.cpf.trim()   || null,
        email: formEdit.email.trim() || null,
        role:  formEdit.role,
        ativo: formEdit.ativo,
      })
      .eq('id', editando.id)

    setSalvando(false)
    if (errPerfil) { setToast({ message: 'Erro: ' + errPerfil.message, type: 'error' }); return }

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

  function copiarLinkCadastro() {
    navigator.clipboard.writeText(window.location.origin + '/cadastro')
    setToast({ message: 'Link de cadastro copiado!', type: 'success' })
    setModalAdd(false)
  }

  async function criarDiretamente() {
    if (!email.trim() || !senha.trim()) return
    if (senha.length < 6) { setToast({ message: 'Senha deve ter pelo menos 6 caracteres.', type: 'error' }); return }
    setSalvando(true)
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { action: 'create', email: email.trim(), password: senha, role: roleNovo },
    })
    setSalvando(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: `Usuário ${email} criado com sucesso!`, type: 'success' })
    setModalAdd(false)
    setEmail('')
    setSenha('')
    setTimeout(load, 1500)
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle={`${usuarios.length} usuário(s) cadastrado(s)`}
        action={
          <button className="btn-primary" onClick={() => setModalAdd(true)}>
            + Adicionar usuário
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted text-sm">Carregando…</div>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => {
            const sou = u.id === eu?.id
            return (
              <div key={u.id} className="card flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {u.foto_url
                    ? <img src={u.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                    : <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-black text-primary">
                        {(u.nome ?? u.email ?? '?')[0].toUpperCase()}
                      </div>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy text-sm truncate">
                      {u.nome ?? '—'}
                    </span>
                    {sou && <span className="text-xs text-muted">(você)</span>}
                    <RoleBadge role={u.role} />
                    <StatusBadge ativo={u.ativo !== false} />
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">{u.email}</div>
                  {u.created_at && (
                    <div className="text-xs text-muted">
                      Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                {/* Ações */}
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary text-xs w-8 h-8 flex items-center justify-center" title="Editar"
                    onClick={() => abrirEditar(u)}>
                    ✏️
                  </button>
                  {!sou && (
                    <button className="btn-danger text-xs w-8 h-8 flex items-center justify-center" title="Excluir"
                      onClick={() => setDeletando(u)}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal editar usuário */}
      {editando && (
        <Modal title={`Editar — ${editando.email}`} onClose={() => setEditando(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input className="input" placeholder="Nome do usuário"
                value={formEdit.nome}
                onChange={e => setFormEdit(p => ({ ...p, nome: e.target.value }))}
                autoFocus />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="usuario@email.com"
                value={formEdit.email}
                onChange={e => setFormEdit(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="input" placeholder="000.000.000-00"
                value={formEdit.cpf}
                onChange={e => setFormEdit(p => ({ ...p, cpf: e.target.value }))} />
            </div>
            <div>
              <label className="label">Papel</label>
              <select className="input"
                value={formEdit.role}
                disabled={editando.id === eu?.id}
                onChange={e => setFormEdit(p => ({ ...p, role: e.target.value }))}>
                <option value="consultor">Consultor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input"
                value={formEdit.ativo ? 'ativo' : 'inativo'}
                disabled={editando.id === eu?.id}
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

      {/* Modal adicionar usuário */}
      {modalAdd && (
        <Modal title="Novo usuário" onClose={() => { setModalAdd(false); setEmail(''); setSenha('') }} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="usuario@email.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy text-xs"
                  onClick={() => setMostrarSenha(v => !v)}
                >
                  {mostrarSenha ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Papel</label>
              <select className="input" value={roleNovo} onChange={e => setRoleNovo(e.target.value)}>
                <option value="consultor">Consultor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={() => { setModalAdd(false); setEmail(''); setSenha('') }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={criarDiretamente}
                disabled={salvando || !email.trim() || !senha.trim()}>
                {salvando ? 'Criando...' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletando && (
        <ConfirmModal title="Excluir usuário" danger
          message={`Remover "${deletando.nome ?? deletando.email}"? Para exclusão permanente do Auth, use o painel do Supabase.`}
          confirmLabel="Excluir"
          onConfirm={() => excluir(deletando)}
          onClose={() => setDeletando(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
