import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/ui'
import { Link } from 'react-router-dom'
import { nivelRisco } from '@/lib/perguntas'

// Domínios COPSOQ II — mesmos da RiscosPage
const DOMINIOS = [
  { id: 'D1', nome: 'Exigências do Trabalho',    sfs: ['sf1','sf2','sf3','sf4'] },
  { id: 'D2', nome: 'Organização e Conteúdo',     sfs: ['sf5','sf6','sf7','sf8'] },
  { id: 'D3', nome: 'Relações Sociais e Liderança',sfs: ['sf9','sf10','sf11','sf12','sf13','sf14'] },
  { id: 'D4', nome: 'Valores no Trabalho',        sfs: ['sf15','sf16','sf17','sf18'] },
  { id: 'D5', nome: 'Saúde e Bem-Estar',          sfs: ['sf19','sf20','sf21','sf22','sf23','sf24','sf25'] },
  { id: 'D6', nome: 'Comportamentos Ofensivos',   sfs: ['sf26','sf27','sf28'] },
]

const NIVEL_COLOR = {
  baixo:   { bar: '#22c55e', bg: '#dcfce7', text: '#166534' },
  médio:   { bar: '#eab308', bg: '#fef9c3', text: '#854d0e' },
  alto:    { bar: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  crítico: { bar: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
}

// Calcula média de um domínio a partir do mapa { sf: score }
function mediaDominio(sfMap, sfs) {
  const vals = sfs.map(sf => sfMap[sf]).filter(v => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

function InfoCard({ icon, label, value, sub }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-2xl flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-black text-navy truncate">{value ?? '—'}</div>
        <div className="text-xs text-muted font-medium">{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
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

export default function DashboardPage() {
  const { user } = useAuth()
  const { empresaAtiva, setEmpresaAtiva } = useEmpresa()

  const [dados, setDados]               = useState(null)
  const [loading, setLoading]           = useState(false)
  const [listaEmpresas, setListaEmpresas] = useState(null)

  // Carrega lista só quando não há empresa ativa na sessão
  useEffect(() => {
    if (empresaAtiva?.id || !user?.id) return
    supabase.from('empresas').select('id, nome, setor_ramo').order('nome')
      .then(({ data, error }) => {
        if (error) console.error('Empresas:', error.message)
        setListaEmpresas(data ?? [])
      })
  }, [empresaAtiva?.id, user?.id])

  const load = useCallback(async () => {
    if (!empresaAtiva?.id) { setDados(null); return }
    setLoading(true)

    // Carrega setores da empresa
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

    // Agrega riscos: média por subfator entre todos os setores
    const sfAccum = {}
    for (const r of riscos ?? []) {
      if (!sfAccum[r.fator]) sfAccum[r.fator] = []
      sfAccum[r.fator].push(r.score)
    }
    const sfMap = Object.fromEntries(
      Object.entries(sfAccum).map(([sf, scores]) => [sf, scores.reduce((a,b) => a+b,0) / scores.length])
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

    // Comparativo entre setores (≥ 2 setores com riscos)
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

    setDados({
      totalRespostas: totalRespostas ?? 0,
      totalSetores: (setoresEmpresa ?? []).length,
      criticos, itens, concluidos, alertas, sfMap, comparativo,
    })
    setLoading(false)
  }, [empresaAtiva?.id])

  useEffect(() => { load() }, [load])

  // ── Selector de empresa (sempre ao entrar no dashboard) ──────────────────────
  if (!empresaAtiva) {
    if (listaEmpresas === null) return <LoadingSpinner />
    if (listaEmpresas.length === 0) return (
      <EmptyState icon="🏢" title="Nenhuma empresa cadastrada"
        description="Cadastre sua primeira empresa para começar a usar o sistema."
        action={<Link to="/empresas" className="btn-primary">Cadastrar empresa</Link>} />
    )
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-black text-navy">Selecione uma empresa</h1>
          <p className="text-sm text-muted mt-0.5">Clique para carregar o dashboard</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listaEmpresas.map(e => (
            <button key={e.id} onClick={() => setEmpresaAtiva(e)}
              className="card text-left hover:shadow-md transition-all w-full"
              style={{ cursor: 'pointer' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-navy truncate">{e.nome}</div>
                  {e.setor_ramo && <div className="text-xs text-muted mt-0.5 truncate">{e.setor_ramo}</div>}
                </div>
                <span className="text-lg flex-shrink-0">🏢</span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Ou gerencie todas as empresas em <Link to="/empresas" className="text-primary font-semibold hover:underline">Empresas →</Link>
        </p>
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

  const { totalRespostas, totalSetores, criticos, itens, concluidos, alertas, sfMap, comparativo } = dados ?? {}
  const totalItens = itens?.length ?? 0

  // Fases fixas do checklist (16 etapas divididas em 6 fases)
  const FASES = [
    { nome: 'Contratação',         qtd: 2 },
    { nome: 'Diagnóstico inicial', qtd: 3 },
    { nome: 'Coleta de dados',     qtd: 3 },
    { nome: 'Análise',             qtd: 3 },
    { nome: 'Relatório',           qtd: 2 },
    { nome: 'Entrega e follow-up', qtd: 3 },
  ]
  let cursor = 0
  const fases = FASES.map(f => {
    const slice = (itens ?? []).slice(cursor, cursor + f.qtd)
    cursor += f.qtd
    const ok = slice.filter(i => i.concluido).length
    return { ...f, ok, total: slice.length || f.qtd }
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle={empresaAtiva.nome}
        action={
          <button className="btn-secondary text-xs" onClick={() => setEmpresaAtiva(null)}>
            ← Trocar empresa
          </button>
        }
      />

      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon="🏢" label="Empresa"          value={empresaAtiva.nome}  sub={empresaAtiva.setor_ramo} />
        <InfoCard icon="🏬" label="Setores"          value={totalSetores}       sub="setores cadastrados" />
        <InfoCard icon="📋" label="Respostas"         value={totalRespostas}     sub="questionários recebidos" />
        <InfoCard icon="🚨" label="Riscos críticos"   value={criticos}          sub="subescalas com score 5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Fases do Projeto ── */}
        <div className="card">
          <div className="card-title">📅 Fases do Projeto</div>
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
        </div>

        {/* ── Alertas e Pendências ── */}
        <div className="card">
          <div className="card-title">🔔 Alertas e Pendências</div>
          {!alertas?.length ? (
            <div className="flex flex-col items-center py-6 text-center gap-2">
              <span className="text-3xl">✅</span>
              <p className="text-sm font-semibold text-navy">Tudo em dia!</p>
              <p className="text-xs text-muted">Nenhuma pendência encontrada para este setor.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a, i) => <Alerta key={i} tipo={a.tipo} texto={a.texto} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Mapa de Risco por Domínio ── */}
      <div className="card">
        <div className="card-title">⚠️ Mapa de Risco por Domínio</div>
        <div className="space-y-3">
          {DOMINIOS.map(d => {
            const media = mediaDominio(sfMap ?? {}, d.sfs)
            const nivel = media != null ? nivelRisco(media) : null
            const cor   = nivel ? NIVEL_COLOR[nivel].bar : '#e2e8f0'
            const pct   = media != null ? (media / 5) * 100 : 0
            return (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-navy">{d.nome}</span>
                  <span className="text-xs text-muted">
                    {media != null ? (
                      <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: NIVEL_COLOR[nivel].bg, color: NIVEL_COLOR[nivel].text }}>
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
        {!Object.keys(sfMap ?? {}).length && (
          <p className="text-xs text-muted mt-3">
            <Link to="/riscos" className="text-primary font-semibold hover:underline">Preencha os riscos para visualizar →</Link>
          </p>
        )}
      </div>

      {/* ── Comparativo entre Setores ── */}
      {comparativo && (
        <div className="card p-0 overflow-hidden">
          <div className="card-title px-5 pt-5">🔀 Comparativo entre Setores</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted">Domínio</th>
                  {comparativo.map(s => (
                    <th key={s.nome}
                      className="px-4 py-2.5 font-semibold text-navy text-center whitespace-nowrap">
                      {s.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOMINIOS.map(d => {
                  const medias = comparativo.map(s => mediaDominio(s.sfMap, d.sfs))
                  const maxVal = Math.max(...medias.filter(v => v != null))
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-navy">{d.nome}</td>
                      {medias.map((media, i) => {
                        const nivel = media != null ? nivelRisco(media) : null
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
                  {comparativo.map(s => {
                    const todas = DOMINIOS.flatMap(d => d.sfs).map(sf => s.sfMap[sf]).filter(v => v != null)
                    const mg = todas.length ? todas.reduce((a, b) => a + b, 0) / todas.length : null
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
    </div>
  )
}
