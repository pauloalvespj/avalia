import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, Modal, Toast, ConfirmModal } from '@/components/ui'

const MODULOS = [
  { key: 'empresas',     label: 'Empresas' },
  { key: 'setores',      label: 'Setores' },
  { key: 'respostas',    label: 'Respostas' },
  { key: 'riscos',       label: 'Riscos' },
  { key: 'diagnostico',  label: 'Diagnóstico' },
  { key: 'plano_acao',   label: 'Plano de Ação' },
  { key: 'okrs',         label: 'OKRs / KPIs' },
  { key: 'checklist',    label: 'Checklist' },
  { key: 'relatorio',    label: 'Relatório',      semEditar: true },
  { key: 'denuncias',    label: 'Denúncias',      semEditar: true },
  { key: 'agendamentos', label: 'Agendamentos' },
  { key: 'escuta',       label: 'Escuta / Clima', semEditar: true },
]

const NIVEL_LABEL = { oculto: 'Oculto', ver: 'Somente ver', editar: 'Editar' }
const NIVEL_COLOR = { oculto: '#6b7280', ver: '#0369a1', editar: '#166534' }
const NIVEL_BG    = { oculto: '#f3f4f6', ver: '#e0f2fe', editar: '#dcfce7' }

const PERM_PADRAO = Object.fromEntries(MODULOS.map(m => [m.key, 'editar']))

function nivelModulos(perm) {
  return MODULOS.map(m => {
    const nivel = perm?.modulos?.[m.key] ?? 'editar'
    return (
      <span key={m.key} className="text-2xs font-semibold px-1.5 py-0.5 rounded"
        style={{ background: NIVEL_BG[nivel], color: NIVEL_COLOR[nivel] }}>
        {m.label}
      </span>
    )
  })
}

export default function PerfisAcessoPage() {
  const [perfis, setPerfis]     = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editando, setEditando] = useState(null)
  const [deletando, setDeletando] = useState(null)
  const [toast, setToast]       = useState(null)
  const [saving, setSaving]     = useState(false)

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    escopo: 'proprias',
    modulos: { ...PERM_PADRAO },
  })

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: u }] = await Promise.all([
      supabase.from('perfis_acesso').select('*').order('criado_em'),
      supabase.from('perfis').select('id, nome, perfil_acesso_id'),
    ])
    setPerfis(p ?? [])
    setUsuarios(u ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', descricao: '', escopo: 'proprias', modulos: { ...PERM_PADRAO } })
    setModal(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({
      nome:      p.nome ?? '',
      descricao: p.descricao ?? '',
      escopo:    p.permissoes?.escopo ?? 'proprias',
      modulos:   { ...PERM_PADRAO, ...(p.permissoes?.modulos ?? {}) },
    })
    setModal(true)
  }

  function fechar() { setModal(false); setEditando(null) }

  function setModulo(key, nivel) {
    setForm(prev => ({ ...prev, modulos: { ...prev.modulos, [key]: nivel } }))
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    const payload = {
      nome:       form.nome.trim(),
      descricao:  form.descricao.trim() || null,
      permissoes: { escopo: form.escopo, modulos: form.modulos },
    }
    const { error } = editando
      ? await supabase.from('perfis_acesso').update(payload).eq('id', editando.id)
      : await supabase.from('perfis_acesso').insert(payload)
    setSaving(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: editando ? 'Perfil atualizado!' : 'Perfil criado!', type: 'success' })
    fechar()
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('perfis_acesso').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Perfil removido.', type: 'info' })
    setDeletando(null)
    load()
  }

  function contarUsuarios(id) {
    return usuarios.filter(u => u.perfil_acesso_id === id).length
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Perfis de Acesso"
        subtitle="Defina o que cada perfil pode ver e fazer"
        action={<button className="btn-primary" onClick={abrirNovo}>+ Novo Perfil</button>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted text-sm">Carregando…</div>
      ) : !perfis.length ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔐</div>
          <div className="font-semibold text-navy mb-1">Nenhum perfil criado</div>
          <div className="text-sm text-muted mb-4">Crie perfis para controlar o acesso dos consultores.</div>
          <button className="btn-primary" onClick={abrirNovo}>Criar primeiro perfil</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {perfis.map(p => {
            const qtd = contarUsuarios(p.id)
            return (
              <div key={p.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-navy">{p.nome}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#ede9fe', color: '#6d28d9' }}>
                        {qtd} {qtd === 1 ? 'usuário' : 'usuários'}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: p.permissoes?.escopo === 'todas' ? '#dcfce7' : '#fef9c3', color: p.permissoes?.escopo === 'todas' ? '#166534' : '#854d0e' }}>
                        {p.permissoes?.escopo === 'todas' ? 'Todas as empresas' : 'Só as próprias'}
                      </span>
                    </div>
                    {p.descricao && <p className="text-xs text-muted mb-2">{p.descricao}</p>}
                    <div className="flex flex-wrap gap-1">
                      {nivelModulos(p.permissoes)}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="btn-secondary text-xs w-8 h-8 flex items-center justify-center"
                      title="Editar" onClick={() => abrirEditar(p)}>✏️</button>
                    <button className="text-xs w-8 h-8 flex items-center justify-center text-danger hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover" onClick={() => setDeletando(p)}>🗑</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal criar / editar ── */}
      {modal && (
        <Modal title={editando ? `Editar — ${editando.nome}` : 'Novo Perfil de Acesso'} onClose={fechar} size="lg">
          <div className="space-y-5">

            {/* Nome e descrição */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome do perfil *</label>
                <input className="input" placeholder="Ex: Consultor Padrão, Visualizador..."
                  value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} autoFocus />
              </div>
              <div className="col-span-2">
                <label className="label">Descrição</label>
                <input className="input" placeholder="Descreva brevemente este perfil..."
                  value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
              </div>
            </div>

            {/* Escopo */}
            <div>
              <div className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Escopo de empresas</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'proprias', label: 'Só as próprias', desc: 'Vê apenas as empresas atribuídas a ele', emoji: '👤' },
                  { value: 'todas',    label: 'Todas',          desc: 'Vê todas as empresas do sistema',       emoji: '🌐' },
                ].map(op => (
                  <button key={op.value} type="button"
                    onClick={() => setForm(p => ({ ...p, escopo: op.value }))}
                    className="text-left p-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: form.escopo === op.value ? '#3a7bd5' : '#e2e8f0',
                      background:  form.escopo === op.value ? '#eff6ff' : '#fff',
                    }}>
                    <div className="text-lg mb-1">{op.emoji}</div>
                    <div className="text-sm font-bold text-navy">{op.label}</div>
                    <div className="text-xs text-muted">{op.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Matriz de permissões */}
            <div>
              <div className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Permissões por módulo</div>
              <div className="rounded-xl overflow-hidden border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th className="text-left px-4 py-2 text-xs font-bold text-muted uppercase tracking-wide">Módulo</th>
                      {['oculto', 'ver', 'editar'].map(n => (
                        <th key={n} className="px-4 py-2 text-xs font-bold uppercase tracking-wide"
                          style={{ color: NIVEL_COLOR[n] }}>{NIVEL_LABEL[n]}</th>
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
                                <input type="radio"
                                  name={`mod-${m.key}`}
                                  checked={form.modulos[m.key] === n}
                                  onChange={() => setModulo(m.key, n)}
                                  className="w-4 h-4 cursor-pointer"
                                  style={{ accentColor: NIVEL_COLOR[n] }}
                                />
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
              <div className="flex gap-4 mt-2">
                {['oculto', 'ver', 'editar'].map(n => (
                  <span key={n} className="text-xs text-muted flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: NIVEL_COLOR[n] }} />
                    <strong style={{ color: NIVEL_COLOR[n] }}>{NIVEL_LABEL[n]}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={fechar}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !form.nome.trim()}>
                {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Perfil'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletando && (
        <ConfirmModal title="Remover perfil" danger
          message={`Remover "${deletando.nome}"? Os usuários vinculados ficarão sem perfil de acesso.`}
          confirmLabel="Remover"
          onConfirm={() => handleDelete(deletando.id)}
          onClose={() => setDeletando(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
