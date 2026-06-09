import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { useSetorLocal } from '@/hooks/useSetorLocal'
import { SetorSelect } from '@/components/ui/SetorSelect'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, EmptyState, LoadingSpinner, Toast, Modal, ConfirmModal } from '@/components/ui'
import { Link } from 'react-router-dom'

const DOMINIOS_OPTS = [
  { value: 'D1', label: 'D1 — Exigências do Trabalho',      cor: '#c94040' },
  { value: 'D2', label: 'D2 — Organização e Conteúdo',       cor: '#d08030' },
  { value: 'D3', label: 'D3 — Relações Sociais e Liderança', cor: '#2d8a5e' },
  { value: 'D4', label: 'D4 — Valores no Trabalho',          cor: '#3a7bd5' },
  { value: 'D5', label: 'D5 — Saúde e Bem-Estar',            cor: '#7a4db0' },
  { value: 'D6', label: 'D6 — Comportamentos Ofensivos',     cor: '#8a1a1a' },
]

const STATUS_OPTS = [
  { value: 'pendente',      label: 'Pendente',      bg: '#f1f5f9', color: '#64748b' },
  { value: 'em_andamento',  label: 'Em andamento',  bg: '#fef9c3', color: '#854d0e' },
  { value: 'concluida',     label: 'Concluída',     bg: '#dcfce7', color: '#166534' },
]

const FORM_VAZIO = {
  dominio: '', descricao: '', responsavel: '', prazo: '',
  status: 'pendente', indicador: '', transversal: false,
}

function DominioBadge({ dominio }) {
  const d = DOMINIOS_OPTS.find(o => o.value === dominio)
  if (!d) return null
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: d.cor }}>
      {d.value}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_OPTS.find(o => o.value === status)
  if (!s) return null
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function Contador({ acoes }) {
  const concluidas   = acoes.filter(a => a.status === 'concluida').length
  const em_andamento = acoes.filter(a => a.status === 'em_andamento').length
  const pendentes    = acoes.filter(a => a.status === 'pendente').length
  return (
    <p className="text-sm text-muted">
      <strong className="text-navy">{acoes.length}</strong> ação(ões) —{' '}
      <span style={{ color: '#166534' }}>{concluidas} concluída(s)</span>,{' '}
      <span style={{ color: '#854d0e' }}>{em_andamento} em andamento</span>,{' '}
      <span style={{ color: '#64748b' }}>{pendentes} pendente(s)</span>
    </p>
  )
}

function Filtros({ filtroStatus, filtrodominio, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <select className="input py-1.5 text-xs w-auto"
        value={filtroStatus} onChange={e => onChange('status', e.target.value)}>
        <option value="">Todos os status</option>
        {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select className="input py-1.5 text-xs w-auto"
        value={filtrodominio} onChange={e => onChange('dominio', e.target.value)}>
        <option value="">Todos os domínios</option>
        {DOMINIOS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function CardAcao({ acao, numero, onEditar, onDeletar }) {
  const prazoStr = acao.prazo
    ? new Date(acao.prazo + 'T00:00:00').toLocaleDateString('pt-BR')
    : null
  const atrasada = acao.prazo && acao.status !== 'concluida' && new Date(acao.prazo) < new Date()

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted font-mono">#{numero}</span>
          {acao.dominio  && <DominioBadge dominio={acao.dominio} />}
          <StatusBadge status={acao.status} />
          {acao.transversal && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              Transversal
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onEditar(acao)} title="Editar" className="btn-edit">✎</button>
          <button onClick={() => onDeletar(acao)} title="Excluir" className="btn-delete">✕</button>
        </div>
      </div>

      <p className="text-sm text-navy font-semibold mt-2">{acao.descricao}</p>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
        {acao.responsavel && (
          <span className="text-xs text-muted">👤 {acao.responsavel}</span>
        )}
        {prazoStr && (
          <span className={`text-xs font-medium ${atrasada ? 'text-danger' : 'text-muted'}`}>
            📅 {prazoStr}{atrasada ? ' (atrasado)' : ''}
          </span>
        )}
        {acao.indicador && (
          <span className="text-xs text-muted">🎯 {acao.indicador}</span>
        )}
      </div>
    </div>
  )
}

function ModalAcao({ editando, forcaTransversal, onSave, onClose, saving }) {
  const [form, setForm] = useState(
    editando
      ? { ...editando, transversal: editando.transversal ?? false }
      : { ...FORM_VAZIO, transversal: forcaTransversal ?? false }
  )
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <Modal title={editando ? 'Editar Ação' : 'Nova Ação'} onClose={onClose} size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Domínio</label>
          <select className="input" value={form.dominio} onChange={f('dominio')}>
            <option value="">— Selecione —</option>
            {DOMINIOS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Descrição da ação *</label>
          <textarea className="input resize-none" rows={3}
            placeholder="Descreva a ação a ser tomada..."
            value={form.descricao} onChange={f('descricao')} autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Responsável</label>
            <input className="input" placeholder="Nome do responsável"
              value={form.responsavel} onChange={f('responsavel')} />
          </div>
          <div>
            <label className="label">Prazo</label>
            <input className="input" type="date" value={form.prazo} onChange={f('prazo')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={f('status')}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Indicador de sucesso</label>
            <input className="input" placeholder="Ex: 0 ocorrências em 6 meses"
              value={form.indicador} onChange={f('indicador')} />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-primary"
            checked={form.transversal}
            disabled={forcaTransversal}
            onChange={e => setForm(p => ({ ...p, transversal: e.target.checked }))} />
          <span className="text-sm text-navy">Ação transversal — vale para todos os setores</span>
        </label>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving || !form.descricao.trim()}
            onClick={() => onSave(form)}>
            {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar ação'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ListaAcoes({ acoes, onEditar, onDeletar, emptyText }) {
  const [filtroStatus,  setFiltroStatus]  = useState('')
  const [filtrodominio, setFiltrodominio] = useState('')

  const filtradas = acoes.filter(a =>
    (!filtroStatus  || a.status  === filtroStatus) &&
    (!filtrodominio || a.dominio === filtrodominio)
  )

  function handleFiltro(key, val) {
    if (key === 'status')  setFiltroStatus(val)
    if (key === 'dominio') setFiltrodominio(val)
  }

  return (
    <div className="space-y-4">
      {acoes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Contador acoes={acoes} />
          <Filtros filtroStatus={filtroStatus} filtrodominio={filtrodominio} onChange={handleFiltro} />
        </div>
      )}

      {!acoes.length ? (
        <EmptyState icon="🎯" title="Nenhuma ação cadastrada" description={emptyText} />
      ) : !filtradas.length ? (
        <EmptyState icon="🔍" title="Nenhuma ação com esses filtros"
          description="Tente remover um ou mais filtros." />
      ) : (
        <div className="space-y-3">
          {filtradas.map((a, i) => (
            <CardAcao key={a.id} acao={a} numero={i + 1}
              onEditar={onEditar} onDeletar={onDeletar} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlanoAcaoPage() {
  const { empresaAtiva } = useEmpresa()
  const { setores, setorId, setSetorId, nomeSetor } = useSetorLocal(empresaAtiva)
  const { user }       = useAuth()

  const [acoes, setAcoes]             = useState([])
  const [loading, setLoading]         = useState(false)
  const [abaAtiva, setAbaAtiva]       = useState('setor')
  const [modal, setModal]             = useState(false)
  const [forcaTransversal, setForcaT] = useState(false)
  const [editando, setEditando]       = useState(null)
  const [deleting, setDeleting]       = useState(null)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState(null)

  const load = useCallback(async () => {
    if (!setorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('acoes')
      .select('*')
      .eq('setor_id', setorId)
      .order('created_at', { ascending: false })
    if (error) setToast({ message: 'Erro ao carregar: ' + error.message, type: 'error' })
    setAcoes(data ?? [])
    setLoading(false)
  }, [setorId])

  useEffect(() => { load() }, [load])

  function abrirNova(transversal = false) {
    setEditando(null)
    setForcaT(transversal)
    setModal(true)
  }

  function abrirEditar(acao) {
    setEditando(acao)
    setForcaT(false)
    setModal(true)
  }

  async function handleSave(form) {
    setSaving(true)
    const payload = {
      setor_id:    setorId,
      consultor_id: user.id,
      dominio:     form.dominio     || null,
      descricao:   form.descricao.trim(),
      responsavel: form.responsavel || null,
      prazo:       form.prazo       || null,
      status:      form.status,
      indicador:   form.indicador   || null,
      transversal: form.transversal ?? false,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('acoes').update(payload).eq('id', editando.id))
    } else {
      ;({ error } = await supabase.from('acoes').insert(payload))
    }
    setSaving(false)
    if (error) { setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' }); return }
    setToast({ message: editando ? 'Ação atualizada!' : 'Ação criada!', type: 'success' })
    setModal(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('acoes').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro ao remover: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Ação removida.', type: 'info' })
    load()
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Selecione uma empresa"
      description="Use o menu superior para selecionar uma empresa."
      action={<Link to="/empresas" className="btn-primary">Ir para Empresas</Link>} />
  )

  if (loading) return <LoadingSpinner />

  if (!setorId) return (
    <div>
      <SetorSelect setores={setores} setorId={setorId} onChange={setSetorId} />
      <div className="card text-center py-10 text-muted text-sm">Selecione um setor acima para ver o plano de ação.</div>
    </div>
  )

  const acoesSetor       = acoes
  const acoesTransversal = acoes.filter(a => a.transversal)

  return (
    <div>
      <SetorSelect setores={setores} setorId={setorId} onChange={setSetorId} />
      <PageHeader
        title="Plano de Ação"
        subtitle={nomeSetor}
        action={
          <button className="btn-primary"
            onClick={() => abrirNova(abaAtiva === 'transversal')}>
            + Nova {abaAtiva === 'transversal' ? 'Ação Transversal' : 'Ação'}
          </button>
        }
      />

      {/* Abas */}
      <div className="flex gap-1 border-b border-border mb-5">
        {[
          { id: 'setor',       label: `Setor Ativo (${acoesSetor.length})` },
          { id: 'transversal', label: `Ações Transversais (${acoesTransversal.length})` },
        ].map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              abaAtiva === aba.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-navy'
            }`}>
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'setor' ? (
        <ListaAcoes acoes={acoesSetor} onEditar={abrirEditar} onDeletar={setDeleting}
          emptyText="Nenhuma ação cadastrada para este setor. Clique em '+ Nova Ação' para começar." />
      ) : (
        <ListaAcoes acoes={acoesTransversal} onEditar={abrirEditar} onDeletar={setDeleting}
          emptyText="Nenhuma ação transversal cadastrada. Marque 'Ação transversal' ao criar uma ação." />
      )}

      {modal && (
        <ModalAcao
          editando={editando}
          forcaTransversal={abaAtiva === 'transversal' && !editando ? true : undefined}
          onSave={handleSave}
          onClose={() => setModal(false)}
          saving={saving}
        />
      )}

      {deleting && (
        <ConfirmModal title="Remover ação" danger
          message={`Remover a ação "${deleting.descricao.slice(0, 60)}${deleting.descricao.length > 60 ? '…' : ''}"?`}
          confirmLabel="Remover"
          onConfirm={() => handleDelete(deleting.id)}
          onClose={() => setDeleting(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
