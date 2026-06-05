import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, Modal, EmptyState, LoadingSpinner, Toast, ConfirmModal } from '@/components/ui'

// ── Status do lead ────────────────────────────────────────────────────────────

const STATUS_LEAD = {
  lead:             { label: 'Lead',             emoji: '🟡', bg: '#fef9c3', color: '#854d0e' },
  proposta_enviada: { label: 'Proposta enviada', emoji: '🔵', bg: '#e0f2fe', color: '#075985' },
  em_negociacao:    { label: 'Em negociação',    emoji: '🟠', bg: '#ffedd5', color: '#9a3412' },
  cliente_ativo:    { label: 'Cliente ativo',    emoji: '🟢', bg: '#dcfce7', color: '#166534' },
  concluido:        { label: 'Concluído',        emoji: '✅', bg: '#f0fdf4', color: '#15803d' },
  perdido:          { label: 'Perdido',          emoji: '🔴', bg: '#fee2e2', color: '#991b1b' },
}

const FORM_VAZIO = {
  nome: '', cnpj: '', setor_ramo: '', func_total: '',
  data_inicio: '', responsavel: '', contato: '', demanda: '',
  historico: '', turnover: '', atestados: '', rh: '',
  status_lead: 'lead', canal_denuncias: false,
}

const RH_LABELS = { sim: 'RH Estruturado', parcial: 'RH Parcial', nao: 'Sem RH' }

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Campo({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_LEAD[status] ?? STATUS_LEAD.lead
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.emoji} {s.label}
    </span>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-semibold text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-navy">{value}</span>
    </div>
  )
}

// ── Modal "Ver dados" ─────────────────────────────────────────────────────────

function VerModal({ empresa, onClose, onEditar, onAtualizar }) {
  const [statusLead, setStatusLead]         = useState(empresa.status_lead ?? 'lead')
  const [canalDenuncias, setCanalDenuncias] = useState(empresa.canal_denuncias ?? false)
  const [saving, setSaving]                 = useState(false)

  async function salvarConfig(campo, valor) {
    setSaving(true)
    await supabase.from('empresas').update({ [campo]: valor }).eq('id', empresa.id)
    onAtualizar(empresa.id, { [campo]: valor })
    setSaving(false)
  }

  function handleStatus(v) {
    setStatusLead(v)
    salvarConfig('status_lead', v)
  }

  function handleCanal(v) {
    setCanalDenuncias(v)
    salvarConfig('canal_denuncias', v)
  }

  return (
    <Modal title={empresa.nome} onClose={onClose} size="lg">
      <div className="space-y-5">

        {/* Configurações rápidas */}
        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Configurações</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <label className="label">Status do lead</label>
              <select className="input" value={statusLead} onChange={e => handleStatus(e.target.value)} disabled={saving}>
                {Object.entries(STATUS_LEAD).map(([key, { emoji, label }]) => (
                  <option key={key} value={key}>{emoji} {label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-between">
              <label className="label">Canal de Denúncias</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => handleCanal(!canalDenuncias)}
                  disabled={saving}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{ background: canalDenuncias ? '#3a7bd5' : '#d1d5db', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{ transform: canalDenuncias ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
                <span className="text-sm text-navy font-medium">
                  {canalDenuncias ? 'Ativo' : 'Inativo'}
                </span>
                {saving && <span className="text-xs text-muted">Salvando...</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Dados da empresa */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="col-span-2">
            <InfoRow label="Razão Social" value={empresa.nome} />
          </div>
          <InfoRow label="CNPJ"               value={empresa.cnpj} />
          <InfoRow label="Ramo de Atividade"  value={empresa.setor_ramo} />
          <InfoRow label="Nº de Funcionários" value={empresa.func_total ? `${empresa.func_total} funcionários` : null} />
          <InfoRow label="Data de Início"     value={empresa.data_inicio ? new Date(empresa.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
          <InfoRow label="Responsável"        value={empresa.responsavel} />
          <InfoRow label="Contato"            value={empresa.contato} />
          <InfoRow label="Rotatividade"       value={empresa.turnover} />
          <InfoRow label="Atestados/mês"      value={empresa.atestados} />
          <InfoRow label="RH Estruturado"     value={RH_LABELS[empresa.rh]} />
          {empresa.demanda && (
            <div className="col-span-2"><InfoRow label="Principal Demanda" value={empresa.demanda} /></div>
          )}
          {empresa.historico && (
            <div className="col-span-2"><InfoRow label="Histórico / Contexto" value={empresa.historico} /></div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
          <button className="btn-primary" onClick={() => { onClose(); onEditar(empresa) }}>✏️ Editar dados</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function EmpresasPage() {
  const { user } = useAuth()
  const { setEmpresaAtiva } = useEmpresa()
  const navigate = useNavigate()

  const [empresas, setEmpresas]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [verModal, setVerModal]   = useState(null)
  const [editando, setEditando]   = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [toast, setToast]         = useState(null)
  const [form, setForm]           = useState(FORM_VAZIO)
  const [saving, setSaving]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setToast({ message: 'Erro ao carregar: ' + error.message, type: 'error' })
    setEmpresas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  function abrirNova() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setModal(true)
  }

  function abrirEditar(e) {
    setEditando(e)
    setForm({
      nome:            e.nome            ?? '',
      cnpj:            e.cnpj            ?? '',
      setor_ramo:      e.setor_ramo      ?? '',
      func_total:      e.func_total      ?? '',
      data_inicio:     e.data_inicio     ?? '',
      responsavel:     e.responsavel     ?? '',
      contato:         e.contato         ?? '',
      demanda:         e.demanda         ?? '',
      historico:       e.historico       ?? '',
      turnover:        e.turnover        ?? '',
      atestados:       e.atestados       ?? '',
      rh:              e.rh              ?? '',
      status_lead:     e.status_lead     ?? 'lead',
      canal_denuncias: e.canal_denuncias ?? false,
    })
    setModal(true)
  }

  function fecharModal() { setModal(false); setEditando(null); setForm(FORM_VAZIO) }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    const payload = {
      nome:            form.nome.trim(),
      cnpj:            form.cnpj,
      setor_ramo:      form.setor_ramo,
      func_total:      parseInt(form.func_total) || 0,
      data_inicio:     form.data_inicio || null,
      responsavel:     form.responsavel,
      contato:         form.contato,
      demanda:         form.demanda,
      historico:       form.historico,
      turnover:        form.turnover,
      atestados:       form.atestados,
      rh:              form.rh,
      status_lead:     form.status_lead,
      canal_denuncias: form.canal_denuncias,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('empresas').update(payload).eq('id', editando.id))
    } else {
      const { data: nova, error: errEmpresa } = await supabase
        .from('empresas').insert({ ...payload, consultor_id: user.id }).select('id').single()
      error = errEmpresa
      if (!error && nova) {
        await supabase.from('setores').insert({ empresa_id: nova.id, nome: 'Geral', func_setor: payload.func_total || 0 })
      }
    }
    setSaving(false)
    if (error) { setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' }); return }
    setToast({ message: editando ? 'Empresa atualizada!' : 'Empresa criada!', type: 'success' })
    fecharModal()
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('empresas').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro ao remover: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Empresa removida.', type: 'info' })
    load()
  }

  function handleAbrir(empresa) { setEmpresaAtiva(empresa); navigate('/setores') }

  // Atualiza empresa localmente após salvar no VerModal
  function handleAtualizarLocal(id, campos) {
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, ...campos } : e))
    if (verModal?.id === id) setVerModal(v => ({ ...v, ...campos }))
  }

  // ── Dados derivados ──────────────────────────────────────────────────────────

  const contagem = Object.fromEntries(
    Object.keys(STATUS_LEAD).map(k => [k, empresas.filter(e => (e.status_lead ?? 'lead') === k).length])
  )

  const filtradas = filtroStatus === 'todos'
    ? empresas
    : empresas.filter(e => (e.status_lead ?? 'lead') === filtroStatus)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Empresas"
        subtitle="Gerencie as empresas da sua consultoria"
        action={<button className="btn-primary" onClick={abrirNova}>+ Nova Empresa</button>}
      />

      {/* ── Cards de status ── */}
      {empresas.length > 0 && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(STATUS_LEAD).map(([key, { label, emoji, bg, color }]) => (
            <button
              key={key}
              onClick={() => setFiltroStatus(filtroStatus === key ? 'todos' : key)}
              className="card py-3 px-3 text-center transition-all"
              style={{
                outline: filtroStatus === key ? `2px solid ${color}` : 'none',
                background: filtroStatus === key ? bg : undefined,
              }}
            >
              <div className="text-xl mb-1">{emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{contagem[key]}</div>
              <div className="text-2xs text-muted font-medium leading-tight mt-0.5">{label}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── Filtro ativo ── */}
      {filtroStatus !== 'todos' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Filtrando por:</span>
          <StatusBadge status={filtroStatus} />
          <button className="text-xs text-primary font-semibold hover:underline" onClick={() => setFiltroStatus('todos')}>
            Limpar filtro ✕
          </button>
        </div>
      )}

      {/* ── Lista ── */}
      {!empresas.length ? (
        <EmptyState icon="🏢" title="Nenhuma empresa cadastrada"
          description="Crie a primeira empresa para começar."
          action={<button className="btn-primary" onClick={abrirNova}>Criar empresa</button>} />
      ) : !filtradas.length ? (
        <EmptyState icon="🔍" title="Nenhuma empresa neste status"
          description="Tente outro filtro ou limpe o filtro atual."
          action={<button className="btn-secondary" onClick={() => setFiltroStatus('todos')}>Ver todas</button>} />
      ) : (
        <div className="grid gap-3">
          {filtradas.map(e => (
            <div key={e.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-navy">{e.nome}</span>
                  <StatusBadge status={e.status_lead ?? 'lead'} />
                  {e.canal_denuncias && (
                    <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                      📢 Canal ativo
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {e.cnpj        && <span>{e.cnpj}</span>}
                  {e.setor_ramo  && <span>{e.setor_ramo}</span>}
                  {e.func_total > 0 && <span>{e.func_total} funcionários</span>}
                  {e.responsavel && <span>Resp: {e.responsavel}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setVerModal(e)}>
                  Ver
                </button>
                <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => abrirEditar(e)}>
                  Editar
                </button>
                <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleAbrir(e)}>
                  Abrir →
                </button>
                <button className="text-xs px-2 py-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => setDeleting(e)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Ver ── */}
      {verModal && (
        <VerModal
          empresa={verModal}
          onClose={() => setVerModal(null)}
          onEditar={abrirEditar}
          onAtualizar={handleAtualizarLocal}
        />
      )}

      {/* ── Modal Novo / Editar ── */}
      {modal && (
        <Modal title={editando ? `Editar — ${editando.nome}` : 'Nova Empresa'} onClose={fecharModal} size="lg">
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <Campo label="Razão Social *">
                <input className="input" placeholder="Nome da empresa" value={form.nome} onChange={f('nome')} autoFocus />
              </Campo>
            </div>

            <Campo label="CNPJ">
              <input className="input" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={f('cnpj')} />
            </Campo>

            <Campo label="Ramo de Atividade">
              <input className="input" placeholder="Ex: Varejo, Serviços..." value={form.setor_ramo} onChange={f('setor_ramo')} />
            </Campo>

            <Campo label="Nº de Funcionários">
              <input className="input" type="number" placeholder="0" value={form.func_total} onChange={f('func_total')} />
            </Campo>

            <Campo label="Data de Início">
              <input className="input" type="date" value={form.data_inicio} onChange={f('data_inicio')} />
            </Campo>

            <Campo label="Responsável">
              <input className="input" placeholder="Nome do responsável" value={form.responsavel} onChange={f('responsavel')} />
            </Campo>

            <Campo label="Contato">
              <input className="input" placeholder="E-mail ou telefone" value={form.contato} onChange={f('contato')} />
            </Campo>

            <Campo label="Taxa de Rotatividade">
              <input className="input" placeholder="Ex: 35%/ano" value={form.turnover} onChange={f('turnover')} />
            </Campo>

            <Campo label="Atestados (mês)">
              <input className="input" placeholder="Ex: 12/mês" value={form.atestados} onChange={f('atestados')} />
            </Campo>

            <Campo label="RH Estruturado?">
              <select className="input" value={form.rh} onChange={f('rh')}>
                <option value="">— Selecione —</option>
                <option value="sim">Sim</option>
                <option value="parcial">Parcialmente</option>
                <option value="nao">Não</option>
              </select>
            </Campo>

            <Campo label="Status do Lead">
              <select className="input" value={form.status_lead} onChange={f('status_lead')}>
                {Object.entries(STATUS_LEAD).map(([key, { emoji, label }]) => (
                  <option key={key} value={key}>{emoji} {label}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Canal de Denúncias">
              <select className="input" value={form.canal_denuncias ? 'true' : 'false'}
                onChange={e => setForm(p => ({ ...p, canal_denuncias: e.target.value === 'true' }))}>
                <option value="false">Inativo</option>
                <option value="true">Ativo</option>
              </select>
            </Campo>

            <div className="col-span-2">
              <Campo label="Principal Queixa / Demanda">
                <textarea className="input" rows={2} placeholder="Descreva a principal demanda..."
                  value={form.demanda} onChange={f('demanda')} />
              </Campo>
            </div>

            <div className="col-span-2">
              <Campo label="Histórico / Contexto">
                <textarea className="input" rows={3} placeholder="Contexto organizacional, histórico relevante..."
                  value={form.historico} onChange={f('historico')} />
              </Campo>
            </div>

            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !form.nome.trim()}>
                {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Empresa'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal title="Remover empresa" danger
          message={`Tem certeza que deseja remover "${deleting.nome}"? Todos os setores e dados serão apagados.`}
          confirmLabel="Remover"
          onConfirm={() => handleDelete(deleting.id)}
          onClose={() => setDeleting(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
