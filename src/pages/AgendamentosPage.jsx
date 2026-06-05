import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, EmptyState, LoadingSpinner, Toast, Modal, ConfirmModal } from '@/components/ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'

const TIPOS = [
  'Entrevista individual',
  'Entrevista coletiva',
  'Devolutiva para gestão',
  'Apresentação de resultados',
  'Reunião de alinhamento',
  'Sessão de escuta',
  'Check-in de acompanhamento',
  'Outro',
]

const STATUS_CFG = {
  pendente:   { label: 'Pendente',   bg: '#f1f5f9', color: '#475569' },
  confirmado: { label: 'Confirmado', bg: '#dbeafe', color: '#1d4ed8' },
  realizado:  { label: 'Realizado',  bg: '#dcfce7', color: '#166534' },
  cancelado:  { label: 'Cancelado',  bg: '#fee2e2', color: '#991b1b' },
}

const TIPO_COLOR = {
  'Entrevista individual':       { bg: '#dbeafe', color: '#1d4ed8' },
  'Entrevista coletiva':         { bg: '#e0f2fe', color: '#075985' },
  'Devolutiva para gestão':      { bg: '#f3e8ff', color: '#6b21a8' },
  'Apresentação de resultados':  { bg: '#fef3c7', color: '#92400e' },
  'Reunião de alinhamento':      { bg: '#dcfce7', color: '#166534' },
  'Sessão de escuta':            { bg: '#fce7f3', color: '#9d174d' },
  'Check-in de acompanhamento':  { bg: '#ffedd5', color: '#9a3412' },
  'Outro':                       { bg: '#f1f5f9', color: '#475569' },
}

const FORM_VAZIO = {
  titulo: '', tipo: '', empresa_id: '', setor_id: '', funcionario_id: '',
  data_hora: '', duracao: 60, modalidade: 'presencial',
  local_texto: '', link_reuniao: '', observacoes: '', status: 'pendente',
}

function formatDataHora(iso) {
  const d = new Date(iso)
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()} às ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
}

function mesAno(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isoWeek(iso) {
  const d = new Date(iso)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
}

function exportCSV(items) {
  const header = ['Data', 'Título', 'Tipo', 'Empresa', 'Setor', 'Funcionário', 'Modalidade', 'Status']
  const rows = items.map(a => [
    new Date(a.data_hora).toLocaleString('pt-BR'),
    a.titulo, a.tipo,
    a.empresas?.nome ?? '',
    a.setores?.nome ?? '',
    a.funcionarios?.nome ?? '',
    a.modalidade, a.status,
  ])
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'agendamentos.csv'; a.click()
  URL.revokeObjectURL(url)
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pendente
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function TipoBadge({ tipo }) {
  const cfg = TIPO_COLOR[tipo] ?? TIPO_COLOR['Outro']
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      {tipo}
    </span>
  )
}

function ModalAgendamento({ editando, empresas, onSave, onClose, saving }) {
  const [form, setForm] = useState(editando
    ? {
        titulo: editando.titulo ?? '',
        tipo: editando.tipo ?? '',
        empresa_id: editando.empresa_id ?? '',
        setor_id: editando.setor_id ?? '',
        funcionario_id: editando.funcionario_id ?? '',
        data_hora: editando.data_hora ? editando.data_hora.slice(0, 16) : '',
        duracao: editando.duracao ?? 60,
        modalidade: editando.modalidade ?? 'presencial',
        local_texto: editando.local_texto ?? '',
        link_reuniao: editando.link_reuniao ?? '',
        observacoes: editando.observacoes ?? '',
        status: editando.status ?? 'pendente',
      }
    : { ...FORM_VAZIO }
  )
  const [setoresModal, setSetoresModal] = useState([])
  const [funcsModal, setFuncsModal] = useState([])

  useEffect(() => {
    if (!form.empresa_id) { setSetoresModal([]); setFuncsModal([]); return }
    supabase.from('setores').select('id, nome').eq('empresa_id', form.empresa_id).order('nome')
      .then(({ data }) => setSetoresModal(data ?? []))
  }, [form.empresa_id])

  useEffect(() => {
    if (!form.setor_id) { setFuncsModal([]); return }
    supabase.from('funcionarios').select('id, nome').eq('setor_id', form.setor_id).order('nome')
      .then(({ data }) => setFuncsModal(data ?? []))
  }, [form.setor_id])

  function f(k) {
    return e => setForm(p => ({ ...p, [k]: e.target.value }))
  }

  function setEmpresa(e) {
    setForm(p => ({ ...p, empresa_id: e.target.value, setor_id: '', funcionario_id: '' }))
  }

  function setSetor(e) {
    setForm(p => ({ ...p, setor_id: e.target.value, funcionario_id: '' }))
  }

  const mostraLocal = form.modalidade === 'presencial' || form.modalidade === 'hibrido'
  const mostraLink  = form.modalidade === 'online'     || form.modalidade === 'hibrido'

  return (
    <Modal title={editando ? 'Editar Agendamento' : 'Novo Agendamento'} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div>
          <label className="label">Título *</label>
          <input className="input" placeholder="Ex: Entrevista com equipe de vendas"
            value={form.titulo} onChange={f('titulo')} autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo *</label>
            <select className="input" value={form.tipo} onChange={f('tipo')}>
              <option value="">— Selecione —</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={f('status')}>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data e hora *</label>
            <input className="input" type="datetime-local" value={form.data_hora} onChange={f('data_hora')} />
          </div>
          <div>
            <label className="label">Duração (min)</label>
            <input className="input" type="number" min={5} step={5}
              value={form.duracao} onChange={f('duracao')} />
          </div>
        </div>

        <div>
          <label className="label">Modalidade</label>
          <div className="flex gap-3">
            {['presencial', 'online', 'hibrido'].map(m => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer text-sm text-navy capitalize">
                <input type="radio" name="modalidade" value={m}
                  checked={form.modalidade === m}
                  onChange={f('modalidade')}
                  className="accent-primary" />
                {m}
              </label>
            ))}
          </div>
        </div>

        {mostraLocal && (
          <div>
            <label className="label">Local</label>
            <input className="input" placeholder="Ex: Sala de reunião B"
              value={form.local_texto} onChange={f('local_texto')} />
          </div>
        )}

        {mostraLink && (
          <div>
            <label className="label">Link da reunião</label>
            <input className="input" placeholder="https://meet.google.com/..."
              value={form.link_reuniao} onChange={f('link_reuniao')} />
          </div>
        )}

        <div>
          <label className="label">Empresa</label>
          <select className="input" value={form.empresa_id} onChange={setEmpresa}>
            <option value="">— Selecione —</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>

        {form.empresa_id && (
          <div>
            <label className="label">Setor</label>
            <select className="input" value={form.setor_id} onChange={setSetor}>
              <option value="">— Todos / Nenhum —</option>
              {setoresModal.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        )}

        {form.setor_id && (
          <div>
            <label className="label">Funcionário</label>
            <select className="input" value={form.funcionario_id} onChange={f('funcionario_id')}>
              <option value="">Nenhum / Coletivo</option>
              {funcsModal.map(fn => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label">Observações</label>
          <textarea className="input resize-none" rows={3}
            placeholder="Anotações, pauta, informações adicionais..."
            value={form.observacoes} onChange={f('observacoes')} />
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary"
            disabled={saving || !form.titulo.trim() || !form.tipo || !form.data_hora}
            onClick={() => onSave(form)}>
            {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar agendamento'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CardAgendamento({ ag, onEditar, onDeletar, onStatusChange }) {
  const statusCfg  = STATUS_CFG[ag.status] ?? STATUS_CFG.pendente
  const [laudo, setLaudo]             = useState(ag.laudo ?? '')
  const [laudoModal, setLaudoModal]   = useState(false)
  const [savedLaudo, setSavedLaudo]   = useState(false)
  const debounceRef = useRef(null)

  function handleStatusChange(e) {
    onStatusChange(ag.id, e.target.value)
  }

  function handleLaudo(e) {
    const val = e.target.value
    setLaudo(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      await supabase.from('agendamentos').update({ laudo: val || null }).eq('id', ag.id)
      setSavedLaudo(true)
      setTimeout(() => setSavedLaudo(false), 2000)
    }, 1000)
  }

  const localInfo = ag.modalidade === 'presencial' || ag.modalidade === 'hibrido'
    ? ag.local_texto
    : null
  const linkInfo = ag.modalidade === 'online' || ag.modalidade === 'hibrido'
    ? ag.link_reuniao
    : null

  const modalidadeIcon = ag.modalidade === 'presencial' ? '🏢' : ag.modalidade === 'online' ? '💻' : '🔀'

  const empresaNome = ag.empresas?.nome ?? '—'
  const setorNome   = ag.setores?.nome ?? null
  const funcNome    = ag.funcionarios?.nome ?? null

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-sm text-muted">
          <span className="font-mono text-xs">📅 {formatDataHora(ag.data_hora)}</span>
          {ag.duracao && (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
              {ag.duracao} min
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {ag.status === 'realizado' && (
            <button
              onClick={() => setLaudoModal(true)}
              className="text-xs font-semibold px-2 py-0.5 rounded-full transition-colors"
              style={laudo.trim()
                ? { background: '#dcfce7', color: '#166534' }
                : { background: '#f1f5f9', color: '#6b7280' }}
            >
              {laudo.trim() ? '✓ Laudo' : '📋 Laudo'}
            </button>
          )}
          <select
            value={ag.status}
            onChange={handleStatusChange}
            className="text-xs font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer outline-none"
            style={{ background: statusCfg.bg, color: statusCfg.color }}>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="font-bold text-navy text-sm">{ag.titulo}</span>
        {ag.tipo && <TipoBadge tipo={ag.tipo} />}
      </div>

      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted flex-wrap">
        <span>{empresaNome}</span>
        {setorNome && <><span>›</span><span>{setorNome}</span></>}
        {funcNome  && <><span>›</span><span>{funcNome}</span></>}
        {!funcNome && setorNome && <><span>›</span><span className="italic">Coletivo</span></>}
      </div>

      {(localInfo || linkInfo || ag.modalidade) && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted flex-wrap">
          <span>{modalidadeIcon} {ag.modalidade}</span>
          {localInfo && <span>· 📍 {localInfo}</span>}
          {linkInfo  && (
            <a href={linkInfo} target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline">· 🔗 Entrar na reunião</a>
          )}
        </div>
      )}

      {laudoModal && (
        <Modal title={`📋 Laudo — ${ag.titulo}`} onClose={() => setLaudoModal(false)} size="md">
          <div className="space-y-3">
            <p className="text-xs text-muted">
              {ag.empresas?.nome}{ag.setores?.nome ? ` › ${ag.setores.nome}` : ''}{ag.funcionarios?.nome ? ` › ${ag.funcionarios.nome}` : ''}<br/>
              {formatDataHora(ag.data_hora)}
            </p>
            <textarea
              className="input resize-none text-sm"
              rows={10}
              placeholder="Registre o laudo, observações clínicas ou avaliação da sessão realizada..."
              value={laudo}
              onChange={handleLaudo}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-success font-semibold">{savedLaudo ? 'Salvo ✓' : ''}</span>
              <button className="btn-secondary" onClick={() => setLaudoModal(false)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex gap-1 justify-end mt-3 border-t border-border pt-2">
        <button className="btn-ghost text-xs py-1 px-2" onClick={() => onEditar(ag)}>✏️ Editar</button>
        <button className="btn-ghost text-xs py-1 px-2 text-danger" onClick={() => onDeletar(ag)}>🗑 Excluir</button>
      </div>
    </div>
  )
}

function RelatorioSection({ agendamentos, onClose }) {
  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  const [inicio, setInicio] = useState(firstDay)
  const [fim, setFim]       = useState(lastDayStr)

  const filtered = agendamentos.filter(a => {
    const d = a.data_hora.slice(0, 10)
    return d >= inicio && d <= fim
  })

  const total      = filtered.length
  const realizados = filtered.filter(a => a.status === 'realizado').length
  const cancelados = filtered.filter(a => a.status === 'cancelado').length
  const taxa       = total > 0 ? Math.round((realizados / total) * 100) : 0

  const porTipo = TIPOS.map(t => ({
    name: t.length > 20 ? t.slice(0, 18) + '…' : t,
    fullName: t,
    count: filtered.filter(a => a.tipo === t).length,
  })).filter(x => x.count > 0)

  const empresasUnicas = [...new Set(filtered.map(a => a.empresa_id))]
  const porEmpresa = empresasUnicas.map(eid => {
    const items = filtered.filter(a => a.empresa_id === eid)
    return {
      name: (items[0]?.empresas?.nome ?? 'Sem empresa').slice(0, 18),
      count: items.length,
    }
  }).sort((a, b) => b.count - a.count)

  const semanas = {}
  filtered.forEach(a => {
    const w = `Sem ${isoWeek(a.data_hora)}`
    semanas[w] = (semanas[w] ?? 0) + 1
  })
  const porSemana = Object.entries(semanas).map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const na = parseInt(a.name.replace('Sem ', ''))
      const nb = parseInt(b.name.replace('Sem ', ''))
      return na - nb
    })

  const funcsCount = {}
  filtered.forEach(a => {
    if (!a.funcionario_id || !a.funcionarios?.nome) return
    const n = a.funcionarios.nome
    funcsCount[n] = (funcsCount[n] ?? 0) + 1
  })
  const topFuncs = Object.entries(funcsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, count]) => ({ nome, count }))

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-black text-navy text-lg">Relatório de Agendamentos</h2>
        <button className="btn-secondary text-sm" onClick={onClose}>← Voltar para lista</button>
      </div>

      <div className="card mb-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Período — início</label>
            <input className="input" type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
          </div>
          <div>
            <label className="label">Período — fim</label>
            <input className="input" type="date" value={fim} onChange={e => setFim(e.target.value)} />
          </div>
          <button className="btn-secondary text-sm" onClick={() => exportCSV(filtered)}>
            ⬇ Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total no período', value: total, color: '#3a7bd5' },
          { label: 'Realizados', value: realizados, color: '#166534' },
          { label: 'Cancelados', value: cancelados, color: '#991b1b' },
          { label: 'Taxa de conclusão', value: `${taxa}%`, color: '#6b21a8' },
        ].map(m => (
          <div key={m.label} className="card text-center">
            <div className="text-3xl font-black" style={{ color: m.color }}>{m.value}</div>
            <div className="text-xs text-muted mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card">
          <div className="card-title mb-4">Agendamentos por Tipo</div>
          {porTipo.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porTipo} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v, n, p) => [v, p.payload.fullName]} />
                <Bar dataKey="count" name="Qtd" fill="#3a7bd5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-title mb-4">Agendamentos por Empresa</div>
          {porEmpresa.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porEmpresa} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" name="Qtd" fill="#5a96e8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card">
          <div className="card-title mb-4">Evolução por Semana</div>
          {porSemana.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={porSemana} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Agendamentos"
                  stroke="#3a7bd5" strokeWidth={2} dot={{ r: 4, fill: '#3a7bd5' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {topFuncs.length > 0 && (
          <div className="card">
            <div className="card-title mb-4">Top 5 Funcionários</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 font-semibold text-muted text-xs">Funcionário</th>
                  <th className="text-right py-1.5 font-semibold text-muted text-xs">Agendamentos</th>
                </tr>
              </thead>
              <tbody>
                {topFuncs.map((fn, i) => (
                  <tr key={fn.nome} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-navy">
                      <span className="text-xs text-muted mr-2">{i + 1}º</span>{fn.nome}
                    </td>
                    <td className="py-2 text-right font-bold text-primary">{fn.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgendamentosPage() {
  const { user } = useAuth()

  const [empresas, setEmpresas]         = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading]           = useState(false)

  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroTipo, setFiltroTipo]       = useState('')
  const [filtroStatus, setFiltroStatus]   = useState('')
  const [filtroMes, setFiltroMes]         = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [modal, setModal]     = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [toast, setToast]     = useState(null)

  const loadEmpresas = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('empresas').select('id, nome').eq('consultor_id', user.id).order('nome')
    if (error) { setToast({ message: 'Erro ao carregar empresas: ' + error.message, type: 'error' }); return }
    setEmpresas(data ?? [])
  }, [user])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, empresas(nome), setores(nome), funcionarios(nome)')
      .eq('consultor_id', user.id)
      .order('data_hora', { ascending: true })
    if (error) { setToast({ message: 'Erro ao carregar agendamentos: ' + error.message, type: 'error' }) }
    setAgendamentos(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadEmpresas() }, [loadEmpresas])
  useEffect(() => { load() }, [load])

  function abrirNovo() {
    setEditando(null)
    setModal(true)
  }

  function abrirEditar(ag) {
    setEditando(ag)
    setModal(true)
  }

  async function handleSave(form) {
    setSaving(true)
    const payload = {
      consultor_id:   user.id,
      empresa_id:     form.empresa_id     || null,
      setor_id:       form.setor_id       || null,
      funcionario_id: form.funcionario_id || null,
      titulo:         form.titulo.trim(),
      tipo:           form.tipo           || null,
      data_hora:      form.data_hora      || null,
      duracao:        form.duracao        ? parseInt(form.duracao) : null,
      modalidade:     form.modalidade,
      local_texto:    form.local_texto    || null,
      link_reuniao:   form.link_reuniao   || null,
      observacoes:    form.observacoes    || null,
      status:         form.status,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('agendamentos').update(payload).eq('id', editando.id))
    } else {
      ;({ error } = await supabase.from('agendamentos').insert(payload))
    }
    setSaving(false)
    if (error) { setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' }); return }
    setToast({ message: editando ? 'Agendamento atualizado!' : 'Agendamento criado!', type: 'success' })
    setModal(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro ao excluir: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Agendamento excluído.', type: 'info' })
    load()
  }

  async function handleStatusChange(id, newStatus) {
    const { error } = await supabase.from('agendamentos').update({ status: newStatus }).eq('id', id)
    if (error) { setToast({ message: 'Erro ao atualizar status: ' + error.message, type: 'error' }); return }
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
  }

  const filtered = agendamentos
    .filter(a => !filtroEmpresa || a.empresa_id === filtroEmpresa)
    .filter(a => !filtroTipo   || a.tipo === filtroTipo)
    .filter(a => !filtroMes    || mesAno(a.data_hora) === filtroMes)
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))

  const doMes = agendamentos.filter(a => mesAno(a.data_hora) === filtroMes)
  const metricas = {
    total:      doMes.length,
    pendentes:  doMes.filter(a => a.status === 'pendente').length,
    confirmados: doMes.filter(a => a.status === 'confirmado').length,
    realizados: doMes.filter(a => a.status === 'realizado').length,
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        subtitle="Gerencie entrevistas, devolutivas e reuniões"
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            <button className="btn-secondary text-xs"
              onClick={() => setShowRelatorio(v => !v)}>
              {showRelatorio ? '← Lista' : '📊 Relatório'}
            </button>
            <button className="btn-primary text-xs" onClick={abrirNovo}>+ Novo</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total do mês',  value: metricas.total,       color: '#3a7bd5', icon: '📅' },
          { label: 'Pendentes',     value: metricas.pendentes,   color: '#475569', icon: '⏳' },
          { label: 'Confirmados',   value: metricas.confirmados, color: '#1d4ed8', icon: '✅' },
          { label: 'Realizados',    value: metricas.realizados,  color: '#166534', icon: '🏆' },
        ].map(m => (
          <div key={m.label} className="card flex items-center gap-2 py-3">
            <span className="text-xl flex-shrink-0">{m.icon}</span>
            <div className="min-w-0">
              <div className="text-xl font-black leading-none" style={{ color: m.color }}>{m.value}</div>
              <div className="text-xs text-muted truncate">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showRelatorio ? (
        <RelatorioSection
          agendamentos={agendamentos}
          onClose={() => setShowRelatorio(false)}
        />
      ) : (
        <>
          <div className="card mb-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">Mês</label>
                <input className="input" type="month" value={filtroMes}
                  onChange={e => setFiltroMes(e.target.value)} />
              </div>
              <div>
                <label className="label">Empresa</label>
                <select className="input" value={filtroEmpresa}
                  onChange={e => setFiltroEmpresa(e.target.value)}>
                  <option value="">Todas</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {(filtroEmpresa || filtroTipo) && (
                <button className="btn-secondary text-sm" onClick={() => {
                  setFiltroEmpresa(''); setFiltroTipo('')
                }}>
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {agendamentos.length === 0 ? (
            <EmptyState
              icon="📅"
              title="Nenhum agendamento cadastrado"
              description="Agende entrevistas, devolutivas e reuniões para acompanhar sua agenda de consultoria."
              action={<button className="btn-primary" onClick={abrirNovo}>+ Criar primeiro agendamento</button>}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { key: 'pendente',   label: 'Agendadas',  icon: '⏳', headerBg: '#f8fafc', headerColor: '#475569', borderColor: '#e2e8f0' },
                { key: 'confirmado', label: 'Confirmadas', icon: '📌', headerBg: '#eff6ff', headerColor: '#1d4ed8', borderColor: '#bfdbfe' },
                { key: 'realizado',  label: 'Realizadas',  icon: '✅', headerBg: '#f0fdf4', headerColor: '#166534', borderColor: '#bbf7d0' },
              ].map(col => {
                const colItems = filtered.filter(a => a.status === col.key)
                return (
                  <div key={col.key} className="flex flex-col rounded-xl overflow-hidden border"
                    style={{ borderColor: col.borderColor }}>
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{ background: col.headerBg }}>
                      <span className="font-bold text-sm" style={{ color: col.headerColor }}>
                        {col.icon} {col.label}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: col.borderColor, color: col.headerColor }}>
                        {colItems.length}
                      </span>
                    </div>
                    <div className="flex-1 p-3 space-y-3" style={{ background: '#f8fafc', minHeight: 180 }}>
                      {colItems.length === 0 ? (
                        <p className="text-xs text-muted text-center py-10">Nenhum</p>
                      ) : (
                        colItems.map(ag => (
                          <CardAgendamento
                            key={ag.id} ag={ag}
                            onEditar={abrirEditar}
                            onDeletar={setDeleting}
                            onStatusChange={handleStatusChange}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <ModalAgendamento
          editando={editando}
          empresas={empresas}
          onSave={handleSave}
          onClose={() => setModal(false)}
          saving={saving}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Excluir agendamento"
          danger
          message={`Excluir "${deleting.titulo}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={() => handleDelete(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
