import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, Modal, EmptyState, LoadingSpinner, Toast, ConfirmModal } from '@/components/ui'
import { useNavigate, Link } from 'react-router-dom'
import { nivelRisco } from '@/lib/perguntas'

const RH_LABEL = { sim: 'Sim', parcial: 'Parcialmente', nao: 'Não' }

const STATUS_LEAD = {
  lead:             { label: 'Lead',             emoji: '🟡', bg: '#fef9c3', color: '#854d0e' },
  proposta_enviada: { label: 'Proposta enviada', emoji: '🔵', bg: '#e0f2fe', color: '#075985' },
  em_negociacao:    { label: 'Em negociação',    emoji: '🟠', bg: '#ffedd5', color: '#9a3412' },
  cliente_ativo:    { label: 'Cliente ativo',    emoji: '🟢', bg: '#dcfce7', color: '#166534' },
  concluido:        { label: 'Concluído',        emoji: '✅', bg: '#f0fdf4', color: '#15803d' },
  perdido:          { label: 'Perdido',          emoji: '🔴', bg: '#fee2e2', color: '#991b1b' },
}

const DOMINIOS = [
  { id: 'D1', nome: 'Exigências do Trabalho',     sfs: ['sf1','sf2','sf3','sf4'] },
  { id: 'D2', nome: 'Organização e Conteúdo',      sfs: ['sf5','sf6','sf7','sf8'] },
  { id: 'D3', nome: 'Relações Sociais e Liderança', sfs: ['sf9','sf10','sf11','sf12','sf13','sf14'] },
  { id: 'D4', nome: 'Valores no Trabalho',         sfs: ['sf15','sf16','sf17','sf18'] },
  { id: 'D5', nome: 'Saúde e Bem-Estar',           sfs: ['sf19','sf20','sf21','sf22','sf23','sf24','sf25'] },
  { id: 'D6', nome: 'Comportamentos Ofensivos',    sfs: ['sf26','sf27','sf28'] },
]

const NIVEL_COLOR = {
  baixo:   { bar: '#22c55e', bg: '#dcfce7', text: '#166534' },
  médio:   { bar: '#eab308', bg: '#fef9c3', text: '#854d0e' },
  alto:    { bar: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  crítico: { bar: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
}

const FASES_DEF = [
  { nome: 'Contratação',         qtd: 2 },
  { nome: 'Diagnóstico inicial', qtd: 3 },
  { nome: 'Coleta de dados',     qtd: 3 },
  { nome: 'Análise',             qtd: 3 },
  { nome: 'Relatório',           qtd: 2 },
  { nome: 'Entrega e follow-up', qtd: 3 },
]

function mediaDominio(sfMap, sfs) {
  const vals = sfs.map(sf => sfMap[sf]).filter(v => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

function Alerta({ tipo, texto }) {
  const estilos = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: 'ℹ️', text: '#1d4ed8' },
    aviso:   { bg: '#fefce8', border: '#fde68a', icon: '⚠️', text: '#92400e' },
    critico: { bg: '#fef2f2', border: '#fecaca', icon: '🚨', text: '#991b1b' },
  }
  const e = estilos[tipo]
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm"
      style={{ background: e.bg, border: `1px solid ${e.border}`, color: e.text }}>
      <span className="flex-shrink-0">{e.icon}</span>
      <span>{texto}</span>
    </div>
  )
}

const FUNC_FORM_VAZIO = {
  nome: '', cargo: '', email: '', cpf: '',
  setor_id: '', data_admissao: '', ativo: true,
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

function Campo({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function SetoresPage() {
  const { empresaAtiva, setorAtivo, setSetorAtivo } = useEmpresa()
  const navigate = useNavigate()

  // ── Setores ──────────────────────────────────────────────────────────────────
  const [setores, setSetores]     = useState([])
  const [loadingSet, setLoadingSet] = useState(false)
  const [modalSet, setModalSet]   = useState(false)
  const [editandoSet, setEditandoSet] = useState(null)
  const [deletingSet, setDeletingSet] = useState(null)
  const [formSet, setFormSet]     = useState({ nome: '', func_setor: '' })
  const [buscaSet, setBuscaSet]   = useState('')
  const [savingSet, setSavingSet] = useState(false)

  // ── Funcionários ──────────────────────────────────────────────────────────────
  const [funcs, setFuncs]           = useState([])
  const [loadingFunc, setLoadingFunc] = useState(false)
  const [modalFunc, setModalFunc]   = useState(false)
  const [editandoFunc, setEditandoFunc] = useState(null)
  const [deletingFunc, setDeletingFunc] = useState(null)
  const [formFunc, setFormFunc]     = useState(FUNC_FORM_VAZIO)
  const [savingFunc, setSavingFunc] = useState(false)
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [busca, setBusca]           = useState('')

  const [toast, setToast] = useState(null)

  // ── Dashboard da empresa ──────────────────────────────────────────────────────
  const [dadosDash, setDadosDash] = useState(null)

  // ── Load ─────────────────────────────────────────────────────────────────────

  async function loadDashboard() {
    if (!empresaAtiva) return
    const { data: setoresEmpresa } = await supabase
      .from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id)
    const setorIds = (setoresEmpresa ?? []).map(s => s.id)

    const [
      { count: totalRespostas },
      { data: riscos },
      { data: checklist },
      { count: totalDiag },
    ] = await Promise.all([
      setorIds.length
        ? supabase.from('respostas_publicas').select('id', { count: 'exact', head: true }).in('setor_id', setorIds)
        : { count: 0 },
      setorIds.length
        ? supabase.from('riscos').select('fator, score, setor_id').in('setor_id', setorIds)
        : { data: [] },
      supabase.from('checklist_itens').select('id, texto, concluido, ordem').eq('empresa_id', empresaAtiva.id).order('ordem'),
      setorIds.length
        ? supabase.from('diagnosticos').select('id', { count: 'exact', head: true }).in('setor_id', setorIds)
        : { count: 0 },
    ])

    const sfAccum = {}
    for (const r of riscos ?? []) {
      if (!sfAccum[r.fator]) sfAccum[r.fator] = []
      sfAccum[r.fator].push(r.score)
    }
    const sfMap = Object.fromEntries(
      Object.entries(sfAccum).map(([sf, scores]) => [sf, scores.reduce((a, b) => a + b, 0) / scores.length])
    )
    const criticos  = Object.values(sfMap).filter(v => v === 5).length
    const itens     = checklist ?? []
    const concluidos = itens.filter(i => i.concluido).length

    const alertas = []
    if ((totalRespostas ?? 0) > 0 && (totalRespostas ?? 0) < 5)
      alertas.push({ tipo: 'info',    texto: `Apenas ${totalRespostas} resposta(s) registrada(s). Recomenda-se mínimo de 5.` })
    if (itens.length > 0 && !itens.find(i => i.ordem === 1)?.concluido)
      alertas.push({ tipo: 'aviso',   texto: 'Contrato não marcado como assinado.' })
    if ((totalRespostas ?? 0) === 0)
      alertas.push({ tipo: 'aviso',   texto: 'Questionário ainda não aplicado.' })
    if (!Object.keys(sfMap).length)
      alertas.push({ tipo: 'aviso',   texto: 'Avaliação de riscos não preenchida.' })
    if (criticos > 0)
      alertas.push({ tipo: 'critico', texto: `${criticos} risco(s) crítico(s) identificado(s).` })
    if ((totalDiag ?? 0) === 0)
      alertas.push({ tipo: 'critico', texto: 'Diagnóstico não preenchido.' })

    // Comparativo entre setores
    let comparativo = null
    if ((setoresEmpresa ?? []).length >= 2 && (riscos ?? []).length) {
      const porSetor = {}
      for (const s of setoresEmpresa) porSetor[s.id] = { nome: s.nome, sfMap: {} }
      for (const r of riscos ?? []) {
        if (porSetor[r.setor_id]) porSetor[r.setor_id].sfMap[r.fator] = r.score
      }
      const comDados = Object.values(porSetor).filter(s => Object.keys(s.sfMap).length > 0)
      if (comDados.length >= 2) comparativo = comDados
    }

    setDadosDash({ totalRespostas: totalRespostas ?? 0, criticos, itens, concluidos, alertas, sfMap, comparativo })
  }

  async function loadSetores() {
    if (!empresaAtiva) return
    setLoadingSet(true)
    const { data, error } = await supabase
      .from('setores').select('*').eq('empresa_id', empresaAtiva.id).order('nome')
    if (error) setToast({ message: 'Erro ao carregar setores: ' + error.message, type: 'error' })
    setSetores(data ?? [])
    setLoadingSet(false)
  }

  async function loadFuncs() {
    if (!empresaAtiva) return
    setLoadingFunc(true)
    const { data, error } = await supabase
      .from('funcionarios').select('*').eq('empresa_id', empresaAtiva.id).order('nome')
    if (error) setToast({ message: 'Erro ao carregar funcionários: ' + error.message, type: 'error' })
    setFuncs(data ?? [])
    setLoadingFunc(false)
  }

  useEffect(() => { loadSetores(); loadFuncs(); loadDashboard() }, [empresaAtiva])

  // ── CRUD Setores ──────────────────────────────────────────────────────────────

  function abrirNovoSet() {
    setEditandoSet(null)
    setFormSet({ nome: '', func_setor: '', ativo: true })
    setModalSet(true)
  }

  function abrirEditarSet(s) {
    setEditandoSet(s)
    setFormSet({ nome: s.nome, func_setor: s.func_setor ?? '', ativo: s.ativo !== false })
    setModalSet(true)
  }

  async function handleSaveSet() {
    if (!formSet.nome.trim()) return
    setSavingSet(true)
    const payload = { nome: formSet.nome.trim(), func_setor: parseInt(formSet.func_setor) || 0, ativo: formSet.ativo }
    let error
    if (editandoSet) {
      ;({ error } = await supabase.from('setores').update(payload).eq('id', editandoSet.id))
    } else {
      ;({ error } = await supabase.from('setores').insert({ ...payload, empresa_id: empresaAtiva.id }))
    }
    setSavingSet(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: editandoSet ? 'Setor atualizado!' : 'Setor criado!', type: 'success' })
    setModalSet(false)
    loadSetores()
  }

  async function handleDeleteSet(id) {
    const { error } = await supabase.from('setores').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    if (setorAtivo?.id === id) setSetorAtivo(null)
    setToast({ message: 'Setor removido.', type: 'info' })
    loadSetores()
  }

  function selecionarSetor(s) {
    setSetorAtivo(s)
    setToast({ message: `Setor ativo: ${s.nome}`, type: 'success' })
  }

  // ── CRUD Funcionários ─────────────────────────────────────────────────────────

  function abrirNovoFunc() {
    setEditandoFunc(null)
    setFormFunc(FUNC_FORM_VAZIO)
    setModalFunc(true)
  }

  function abrirEditarFunc(f) {
    setEditandoFunc(f)
    setFormFunc({
      nome:          f.nome          ?? '',
      cargo:         f.cargo         ?? '',
      email:         f.email         ?? '',
      cpf:           f.cpf           ?? '',
      setor_id:      f.setor_id      ?? '',
      data_admissao: f.data_admissao ?? '',
      ativo:         f.ativo !== false,
    })
    setModalFunc(true)
  }

  async function handleSaveFunc() {
    if (!formFunc.nome.trim()) return
    setSavingFunc(true)
    const payload = {
      nome:          formFunc.nome.trim(),
      cargo:         formFunc.cargo.trim() || null,
      email:         formFunc.email.trim() || null,
      cpf:           formFunc.cpf.trim() || null,
      setor_id:      formFunc.setor_id || null,
      data_admissao: formFunc.data_admissao || null,
      ativo:         formFunc.ativo,
    }
    let error
    if (editandoFunc) {
      ;({ error } = await supabase.from('funcionarios').update(payload).eq('id', editandoFunc.id))
    } else {
      ;({ error } = await supabase.from('funcionarios').insert({ ...payload, empresa_id: empresaAtiva.id }))
    }
    setSavingFunc(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: editandoFunc ? 'Funcionário atualizado!' : 'Funcionário cadastrado!', type: 'success' })
    setModalFunc(false)
    loadFuncs()
  }

  async function handleDeleteFunc(id) {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Funcionário removido.', type: 'info' })
    loadFuncs()
  }

  // ── Derivados ─────────────────────────────────────────────────────────────────

  const ff = k => e => setFormFunc(p => ({ ...p, [k]: e.target.value }))

  const funcsFiltradas = funcs.filter(f => {
    const porSetor = filtroSetor === 'todos' || f.setor_id === filtroSetor
    const porBusca = busca.trim() === '' ||
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (f.cargo ?? '').toLowerCase().includes(busca.toLowerCase())
    return porSetor && porBusca
  })

  const nomeSetor = id => setores.find(s => s.id === id)?.nome ?? '—'

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior para ver seus dados e setores." />
  )

  const e = empresaAtiva

  return (
    <div className="space-y-5">
      <PageHeader
        title={e.nome}
        subtitle="Dados da empresa, setores e funcionários"
        action={<button className="btn-secondary" onClick={() => navigate('/empresas')}>← Empresas</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Dados da empresa ── */}
        <div className="card">
          <div className="card-title">📝 Dados da Empresa</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="col-span-2 flex items-start justify-between gap-3">
              <InfoRow label="Razão Social" value={e.nome} />
              {(() => {
                const s = STATUS_LEAD[e.status_lead ?? 'lead']
                return (
                  <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {s.emoji} {s.label}
                  </span>
                )
              })()}
            </div>
            <InfoRow label="CNPJ"               value={e.cnpj} />
            <InfoRow label="Ramo de Atividade"  value={e.setor_ramo} />
            <InfoRow label="Nº de Funcionários" value={e.func_total ? `${e.func_total} funcionários` : null} />
            <InfoRow label="Data de Início"     value={e.data_inicio ? new Date(e.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
            <InfoRow label="Responsável"        value={e.responsavel} />
            <InfoRow label="Contato"            value={e.contato} />
            <InfoRow label="Rotatividade"       value={e.turnover} />
            <InfoRow label="Atestados/mês"      value={e.atestados} />
            <InfoRow label="RH Estruturado"     value={RH_LABEL[e.rh]} />
            {e.demanda && <div className="col-span-2"><InfoRow label="Principal Demanda" value={e.demanda} /></div>}
            {e.historico && <div className="col-span-2"><InfoRow label="Histórico / Contexto" value={e.historico} /></div>}
          </div>
          <div className="mt-5 pt-4 border-t border-border-light flex flex-wrap gap-2">
            <button className="btn-secondary text-xs" onClick={() => navigate('/empresas')}>
              ✏️ Editar dados da empresa
            </button>
          </div>
        </div>

        {/* ── Setores ── */}
        <div className="card">
          <div className="card-title justify-between">
            <span>🏬 Setores</span>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={abrirNovoSet}>+ Novo Setor</button>
          </div>
          <div className="mb-3">
            <input className="input py-1.5 text-xs w-full" placeholder="Buscar setor..."
              value={buscaSet} onChange={e => setBuscaSet(e.target.value)} />
          </div>

          {loadingSet ? <LoadingSpinner /> : !setores.length ? (
            <EmptyState icon="🏬" title="Nenhum setor cadastrado"
              description="Crie o primeiro setor para gerar o link do questionário."
              action={<button className="btn-primary" onClick={abrirNovoSet}>+ Novo Setor</button>} />
          ) : (
            <div className="space-y-2">
              {setores.filter(s => !buscaSet.trim() || s.nome.toLowerCase().includes(buscaSet.toLowerCase())).map(s => {
                const isAtivo = setorAtivo?.id === s.id
                return (
                  <div key={s.id} onClick={() => selecionarSetor(s)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all"
                    style={{ borderColor: isAtivo ? '#3a7bd5' : '#e8ecf4', background: isAtivo ? '#ddeeff' : '#ffffff' }}>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-sm" style={{ color: s.ativo !== false ? '#1a2e4a' : '#9ca3af' }}>{s.nome}</span>
                        {isAtivo && <span className="text-2xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#3a7bd5' }}>Ativo</span>}
                        {s.ativo === false && <span className="italic text-2xs text-muted">(inativo)</span>}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {s.func_setor ? `${s.func_setor} funcionários` : 'Funcionários não informados'}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={ev => ev.stopPropagation()}>
                      <button
                        onClick={() => abrirEditarSet(s)}
                        title="Editar"
                        className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:opacity-80"
                        style={{ background: '#f1f5f9', color: '#16a34a', fontSize: 12 }}
                      >✎</button>
                      <button
                        onClick={() => setDeletingSet(s)}
                        title="Excluir"
                        className="w-6 h-6 flex items-center justify-center rounded font-bold transition-colors hover:opacity-80"
                        style={{ background: '#dc2626', color: '#fff', fontSize: 12 }}
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Funcionários ── */}
        <div className="card overflow-hidden">
          <div className="card-title justify-between">
            <span>👤 Funcionários</span>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={abrirNovoFunc}>+ Novo</button>
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <input className="input py-1.5 text-xs flex-1 min-w-0" placeholder="Buscar nome ou cargo..."
              value={busca} onChange={e => setBusca(e.target.value)} />
            <select className="input py-1.5 text-xs w-auto flex-shrink-0" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
              <option value="todos">Todos os setores</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

        {loadingFunc ? <LoadingSpinner /> : !funcsFiltradas.length ? (
          <EmptyState icon="👤"
            title={funcs.length ? 'Nenhum resultado' : 'Nenhum funcionário cadastrado'}
            description={funcs.length ? 'Tente outro filtro ou busca.' : 'Cadastre os funcionários da empresa.'}
            action={!funcs.length ? <button className="btn-primary" onClick={abrirNovoFunc}>+ Novo Funcionário</button> : null}
          />
        ) : (
          <div className="space-y-2">
            {funcsFiltradas.map(f => (
              <div key={f.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                style={{ borderColor: '#e8ecf4', background: '#ffffff' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-sm"
                      style={{ color: f.ativo !== false ? '#1a2e4a' : '#9ca3af' }}>
                      {f.nome}
                    </span>
                    {f.ativo === false && <span className="italic text-2xs text-muted">(inativo)</span>}
                  </div>
                </div>
                <div className="text-xs text-muted truncate flex-1 text-center hidden sm:block">
                  {[f.cargo, f.setor_id ? nomeSetor(f.setor_id) : null].filter(Boolean).join(' · ')}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => abrirEditarFunc(f)}
                    title="Editar"
                    className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:opacity-80"
                    style={{ background: '#f1f5f9', color: '#16a34a', fontSize: 12 }}
                  >✎</button>
                  <button
                    onClick={() => setDeletingFunc(f)}
                    title="Excluir"
                    className="w-6 h-6 flex items-center justify-center rounded font-bold transition-colors hover:opacity-80"
                    style={{ background: '#dc2626', color: '#fff', fontSize: 12 }}
                  >✕</button>
                </div>
              </div>
            ))}
            <div className="pt-1 text-xs text-muted">
              {funcsFiltradas.length} funcionário{funcsFiltradas.length !== 1 ? 's' : ''}
              {filtroSetor !== 'todos' && ` · ${nomeSetor(filtroSetor)}`}
              {busca && ` · busca: "${busca}"`}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── Modal Setor ── */}
      {modalSet && (
        <Modal title={editandoSet ? 'Editar Setor' : 'Novo Setor'} onClose={() => setModalSet(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Nome do Setor *</label>
              <input className="input" placeholder="Ex: Produção, Vendas, RH..."
                value={formSet.nome} onChange={e => setFormSet(f => ({ ...f, nome: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Nº de Funcionários no Setor</label>
              <input className="input" type="number" placeholder="0"
                value={formSet.func_setor} onChange={e => setFormSet(f => ({ ...f, func_setor: e.target.value }))} />
            </div>
            {editandoSet && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={formSet.ativo ? 'ativo' : 'inativo'}
                  onChange={e => setFormSet(f => ({ ...f, ativo: e.target.value === 'ativo' }))}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button className="btn-secondary" onClick={() => setModalSet(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveSet} disabled={savingSet || !formSet.nome.trim()}>
                {savingSet ? 'Salvando...' : editandoSet ? 'Salvar' : 'Criar Setor'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Funcionário ── */}
      {modalFunc && (
        <Modal title={editandoFunc ? `Editar — ${editandoFunc.nome}` : 'Novo Funcionário'} onClose={() => setModalFunc(false)} size="md">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Campo label="Nome completo *">
                <input className="input" placeholder="Nome do funcionário"
                  value={formFunc.nome} onChange={ff('nome')} autoFocus />
              </Campo>
            </div>
            <Campo label="Cargo / Função">
              <input className="input" placeholder="Ex: Operador, Analista..."
                value={formFunc.cargo} onChange={ff('cargo')} />
            </Campo>
            <Campo label="Setor">
              <select className="input" value={formFunc.setor_id} onChange={ff('setor_id')}>
                <option value="">— Sem setor —</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </Campo>
            <Campo label="E-mail">
              <input className="input" type="email" placeholder="email@empresa.com"
                value={formFunc.email} onChange={ff('email')} />
            </Campo>
            <Campo label="CPF">
              <input className="input" placeholder="000.000.000-00"
                value={formFunc.cpf} onChange={ff('cpf')} />
            </Campo>
            <Campo label="Data de Admissão">
              <input className="input" type="date"
                value={formFunc.data_admissao} onChange={ff('data_admissao')} />
            </Campo>
            <Campo label="Status">
              <select className="input" value={formFunc.ativo ? 'ativo' : 'inativo'}
                onChange={e => setFormFunc(p => ({ ...p, ativo: e.target.value === 'ativo' }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </Campo>
            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={() => setModalFunc(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveFunc} disabled={savingFunc || !formFunc.nome.trim()}>
                {savingFunc ? 'Salvando...' : editandoFunc ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Fases do Projeto + Alertas ── */}
      {dadosDash && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card">
            <div className="card-title">📅 Fases do Projeto</div>
            {(() => {
              const { itens, concluidos } = dadosDash
              const totalItens = itens.length
              let cursor = 0
              const fases = FASES_DEF.map(f => {
                const slice = itens.slice(cursor, cursor + f.qtd)
                cursor += f.qtd
                const ok = slice.filter(i => i.concluido).length
                return { ...f, ok, total: slice.length || f.qtd }
              })
              return (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted">{concluidos}/{totalItens} etapas concluídas</span>
                    <span className="text-xs font-bold text-navy">
                      {totalItens ? Math.round((concluidos / totalItens) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-primary rounded-full transition-all"
                      style={{ width: totalItens ? `${(concluidos / totalItens) * 100}%` : '0%' }} />
                  </div>
                  <div className="space-y-2.5">
                    {fases.map(f => (
                      <div key={f.nome}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-navy font-medium">{f.nome}</span>
                          <span className="text-xs text-muted">{f.ok}/{f.total}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: f.total ? `${(f.ok / f.total) * 100}%` : '0%',
                              background: f.ok === f.total ? '#22c55e' : '#3a7bd5',
                            }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalItens === 0 && (
                    <p className="text-xs text-muted mt-3">
                      <Link to="/checklist" className="text-primary font-semibold hover:underline">Configure o checklist →</Link>
                    </p>
                  )}
                </>
              )
            })()}
          </div>

          <div className="card">
            <div className="card-title">🔔 Alertas e Pendências</div>
            {!dadosDash.alertas.length ? (
              <div className="flex flex-col items-center py-6 text-center gap-2">
                <span className="text-3xl">✅</span>
                <p className="text-sm font-semibold text-navy">Tudo em dia!</p>
                <p className="text-xs text-muted">Nenhuma pendência encontrada para esta empresa.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dadosDash.alertas.map((a, i) => <Alerta key={i} tipo={a.tipo} texto={a.texto} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mapa de Risco por Domínio ── */}
      {dadosDash && (
        <div className="card">
          <div className="card-title">⚠️ Mapa de Risco por Domínio</div>
          <div className="space-y-3">
            {DOMINIOS.map(d => {
              const media = mediaDominio(dadosDash.sfMap, d.sfs)
              const nivel = media != null ? nivelRisco(media) : null
              const cor   = nivel ? NIVEL_COLOR[nivel].bar : '#e2e8f0'
              const pct   = media != null ? (media / 5) * 100 : 0
              return (
                <div key={d.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-navy">{d.nome}</span>
                    <span className="text-xs text-muted">
                      {media != null ? (
                        <span className="font-bold px-1.5 py-0.5 rounded"
                          style={{ background: NIVEL_COLOR[nivel].bg, color: NIVEL_COLOR[nivel].text }}>
                          {media.toFixed(1)}
                        </span>
                      ) : '—'}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cor }} />
                  </div>
                </div>
              )
            })}
          </div>
          {!Object.keys(dadosDash.sfMap).length && (
            <p className="text-xs text-muted mt-3">
              <Link to="/riscos" className="text-primary font-semibold hover:underline">Preencha os riscos para visualizar →</Link>
            </p>
          )}
        </div>
      )}

      {/* ── Comparativo entre Setores ── */}
      {dadosDash?.comparativo && (
        <div className="card p-0 overflow-hidden">
          <div className="card-title px-5 pt-5">🔀 Comparativo entre Setores</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted">Domínio</th>
                  {dadosDash.comparativo.map(s => (
                    <th key={s.nome} className="px-4 py-2.5 font-semibold text-navy text-center whitespace-nowrap">{s.nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOMINIOS.map(d => {
                  const medias = dadosDash.comparativo.map(s => mediaDominio(s.sfMap, d.sfs))
                  const maxVal = Math.max(...medias.filter(v => v != null))
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-navy">{d.nome}</td>
                      {medias.map((media, i) => {
                        const nivel   = media != null ? nivelRisco(media) : null
                        const isMaior = media === maxVal && maxVal >= 3
                        return (
                          <td key={i} className="px-4 py-2.5 text-center"
                            style={isMaior ? { border: '2px solid #ef4444', borderRadius: 4 } : undefined}>
                            {media != null ? (
                              <span className="font-bold px-1.5 py-0.5 rounded"
                                style={{ background: NIVEL_COLOR[nivel].bg, color: NIVEL_COLOR[nivel].text }}>
                                {media.toFixed(1)}
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-bg border-t border-border">
                  <td className="px-4 py-2.5 font-bold text-muted">Média geral</td>
                  {dadosDash.comparativo.map(s => {
                    const todas = DOMINIOS.flatMap(d => d.sfs).map(sf => s.sfMap[sf]).filter(v => v != null)
                    const mg    = todas.length ? todas.reduce((a, b) => a + b, 0) / todas.length : null
                    const nivel = mg != null ? nivelRisco(mg) : null
                    return (
                      <td key={s.nome} className="px-4 py-2.5 text-center font-bold">
                        {mg != null ? (
                          <span className="px-1.5 py-0.5 rounded"
                            style={{ background: NIVEL_COLOR[nivel].bg, color: NIVEL_COLOR[nivel].text }}>
                            {mg.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {deletingSet && (
        <ConfirmModal title="Remover setor" danger
          message={`Remover "${deletingSet.nome}"? Todas as respostas e dados do setor serão apagados.`}
          confirmLabel="Remover"
          onConfirm={() => handleDeleteSet(deletingSet.id)}
          onClose={() => setDeletingSet(null)} />
      )}

      {deletingFunc && (
        <ConfirmModal title="Remover funcionário" danger
          message={`Remover "${deletingFunc.nome}" do cadastro?`}
          confirmLabel="Remover"
          onConfirm={() => handleDeleteFunc(deletingFunc.id)}
          onClose={() => setDeletingFunc(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
