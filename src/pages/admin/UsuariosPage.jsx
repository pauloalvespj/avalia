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
    if (!email.trim()) return
    setSalvando(true)
    const tempSenha = Math.random().toString(36).slice(-10) + 'A1!'
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: tempSenha,
      options: { data: { role: roleNovo } },
    })
    setSalvando(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: `Usuário ${email} criado.`, type: 'success' })
    setModalAdd(false)
    setEmail('')
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
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Usuário</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">Papel</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Cadastro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const sou = u.id === eu?.id
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.foto_url
                          ? <img src={u.foto_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                          : <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-xs font-bold text-primary">
                              {(u.nome ?? u.email ?? '?')[0].toUpperCase()}
                            </div>
                        }
                        <div>
                          <div className="font-semibold text-navy leading-tight">
                            {u.nome ?? '—'}
                            {sou && <span className="text-xs text-muted ml-1.5">(você)</span>}
                          </div>
                          <div className="text-xs text-muted">{u.email}</div>
                          {u.cpf && <div className="text-xs text-muted">CPF: {u.cpf}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-center"><StatusBadge ativo={u.ativo !== false} /></td>
                    <td className="px-4 py-3 text-xs text-muted hidden sm:table-cell">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="btn-primary text-xs px-3 py-1.5"
                          onClick={() => abrirEditar(u)}>
                          Editar
                        </button>
                        {!sou && (
                          <button className="btn-danger text-xs px-3 py-1.5"
                            onClick={() => setDeletando(u)}>
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
        <Modal title="Adicionar usuário" onClose={() => setModalAdd(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="usuario@email.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Papel inicial</label>
              <select className="input" value={roleNovo} onChange={e => setRoleNovo(e.target.value)}>
                <option value="consultor">Consultor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <button className="btn-primary w-full" onClick={criarDiretamente} disabled={salvando || !email.trim()}>
                {salvando ? 'Adicionando...' : 'Adicionar usuário'}
              </button>
              <button className="btn-secondary w-full" onClick={copiarLinkCadastro}>
                📋 Copiar link de acesso
              </button>
              <p className="text-xs text-muted text-center">
                O link leva para a tela de cadastro onde o usuário cria a própria senha.
              </p>
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
