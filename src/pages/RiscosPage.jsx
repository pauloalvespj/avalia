import { useEffect, useState, useCallback, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PERGUNTAS, nivelRisco } from '@/lib/perguntas'
import { PageHeader, EmptyState, LoadingSpinner } from '@/components/ui'

// ── Domínios ──────────────────────────────────────────────────────────────────
const DOMINIOS = [
  { id:'D1', nome:'Exigência Laboral',            cor:'#c94040', sfs:['sf1','sf2','sf3','sf4'] },
  { id:'D2', nome:'Organização do Trabalho',      cor:'#d08030', sfs:['sf5','sf6','sf7','sf8'] },
  { id:'D3', nome:'Relações Sociais e Liderança', cor:'#2d8a5e', sfs:['sf9','sf10','sf11','sf12'] },
  { id:'D4', nome:'Personalidade / Valores',      cor:'#3a7bd5', sfs:['sf13','sf14','sf15'] },
  { id:'D5', nome:'Interface Indivíduo-Trabalho', cor:'#0891b2', sfs:['sf16','sf17','sf18','sf19'] },
  { id:'D6', nome:'Saúde e Bem-Estar',            cor:'#7a4db0', sfs:['sf20','sf21','sf22','sf23','sf24','sf25'] },
  { id:'D7', nome:'Comportamentos Ofensivos',     cor:'#8a1a1a', sfs:['sf26','sf27','sf28'] },
]

const NIVEL_STYLE = {
  baixo:    { bg:'#dcfce7', color:'#166534', dot:'#22c55e', label:'Baixo'    },
  moderado: { bg:'#fef9c3', color:'#854d0e', dot:'#eab308', label:'Moderado' },
  alto:     { bg:'#ffedd5', color:'#9a3412', dot:'#f97316', label:'Alto'     },
  crítico:  { bg:'#fee2e2', color:'#991b1b', dot:'#ef4444', label:'Crítico'  },
}

const DOMINIO_PREFIXO = {
  D1:'EL', D2:'OT', D3:'RS', D4:'PE', D5:'IT', D6:'SB', D7:'CO',
}

function codigoPergunta(dominioId, p) {
  const num = parseInt(p.id.replace('q', ''), 10)
  return `${DOMINIO_PREFIXO[dominioId]}${String(num).padStart(2, '0')}`
}

// Mescla PERGUNTAS base com customizações salvas pelo consultor
function mesclarPerguntas(customArr) {
  if (!customArr?.length) return PERGUNTAS
  const mapa = {}
  for (const p of customArr) mapa[p.id] = p
  return PERGUNTAS.map(p =>
    mapa[p.id]
      ? { ...p, texto: mapa[p.id].texto ?? p.texto, opts: mapa[p.id].opts ?? p.opts, inv: mapa[p.id].inv ?? p.inv }
      : p
  )
}

// ── Cálculo por questão ───────────────────────────────────────────────────────
function calcularQuestoes(dominioId, respostasArr, perguntas) {
  const pergsdominio = perguntas.filter(p => DOMINIOS.find(d => d.id === dominioId)?.sfs.includes(p.sf))
  return pergsdominio.map(p => {
    const vals = respostasArr
      .map(r => r.respostas?.[p.id])
      .filter(v => v != null)
      .map(v => p.inv ? 6 - v : v)
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { p, codigo: codigoPergunta(dominioId, p), score }
  })
}

// ── Cálculo por domínio ───────────────────────────────────────────────────────
function calcularDominios(respostasArr, perguntas) {
  const sfPergs = {}
  for (const p of perguntas) {
    if (!sfPergs[p.sf]) sfPergs[p.sf] = []
    sfPergs[p.sf].push(p)
  }
  const sfAcum = {}
  for (const resp of respostasArr) {
    const r = resp.respostas ?? {}
    for (const [sf, pergs] of Object.entries(sfPergs)) {
      const vals = pergs
        .map(p => { const v = r[p.id]; return v != null ? (p.inv ? 6 - v : v) : null })
        .filter(v => v != null)
      if (vals.length) {
        if (!sfAcum[sf]) sfAcum[sf] = []
        sfAcum[sf].push(vals.reduce((a, b) => a + b, 0) / vals.length)
      }
    }
  }
  const sfMedio = {}
  for (const [sf, vals] of Object.entries(sfAcum))
    sfMedio[sf] = vals.reduce((a, b) => a + b, 0) / vals.length

  return DOMINIOS.map(d => {
    const vals = d.sfs.map(sf => sfMedio[sf]).filter(v => v != null)
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { ...d, score }
  })
}

// ── Badge de nível ────────────────────────────────────────────────────────────
function NivelBadge({ score, small }) {
  if (score == null) return <span className="text-xs text-muted">—</span>
  const nivel = nivelRisco(score)
  const { bg, color, label } = NIVEL_STYLE[nivel]
  return (
    <span className={`inline-flex items-center font-bold rounded-full ${small ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ background: bg, color }}>
      {label}
    </span>
  )
}

// ── Barra de risco ────────────────────────────────────────────────────────────
function BarraRisco({ score, small }) {
  if (score == null) return <span className="text-muted text-xs">—</span>
  const pct = Math.round((score - 1) / 4 * 100)
  const nivel = nivelRisco(score)
  const barColor = NIVEL_STYLE[nivel].dot
  const barBg    = NIVEL_STYLE[nivel].bg
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 rounded-full overflow-hidden ${small ? 'h-1.5' : 'h-2'}`}
        style={{ background: barBg }}>
        <div className={`h-full rounded-full ${small ? '' : 'transition-all'}`}
          style={{ width: pct + '%', background: barColor }} />
      </div>
      <span className={`font-bold tabular-nums text-right ${small ? 'text-[11px] w-7' : 'text-xs w-8'}`}
        style={{ color: barColor }}>{pct}%</span>
    </div>
  )
}

// ── Sub-tabela de questões (drill-down) ───────────────────────────────────────
function DetalheQuestoes({ dominioId, respostas, perguntas }) {
  const questoes = calcularQuestoes(dominioId, respostas, perguntas)
  return (
    <div className="border-t border-dashed border-border bg-slate-50/70">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[11px] text-muted border-b border-border/60 bg-slate-100/60">
            <th className="text-left pl-12 pr-3 py-2 font-semibold w-20">Cód.</th>
            <th className="text-left px-3 py-2 font-semibold">Item</th>
            <th className="text-center px-3 py-2 font-semibold w-20">Score</th>
            <th className="text-left px-3 py-2 font-semibold w-44">Risco %</th>
            <th className="text-center px-3 py-2 font-semibold w-28">Classificação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {questoes.map(({ p, codigo, score }, i) => {
            const nivel = score != null ? nivelRisco(score) : null
            const dotColor = nivel ? NIVEL_STYLE[nivel].dot : '#94a3b8'
            return (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white/70' : 'bg-slate-50/80'}>
                <td className="pl-12 pr-3 py-2.5 font-mono font-bold text-[11px] text-muted whitespace-nowrap">
                  {codigo}
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-semibold text-navy block leading-snug">{p.item}</span>
                  <span className="text-muted text-[11px] leading-snug block mt-0.5">{p.texto}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {score != null
                    ? <span className="font-bold tabular-nums" style={{ color: dotColor }}>{score.toFixed(2)}</span>
                    : <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <BarraRisco score={score} small />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <NivelBadge score={score} small />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Tabela de riscos por setor ────────────────────────────────────────────────
function TabelaRiscos({ setor, respostas, perguntas }) {
  const [expandidos, setExpandidos] = useState(new Set())

  function toggleDominio(id) {
    setExpandidos(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const dados        = calcularDominios(respostas, perguntas)
  const respondentes = respostas.length
  const scoreGeral   = dados.filter(d => d.score != null).reduce((a, d, _, arr) => a + d.score / arr.length, 0) || null

  return (
    <div className="card p-0 overflow-hidden">
      {/* Cabeçalho do setor */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-gray-50/60">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏬</span>
          <span className="font-bold text-navy text-sm">{setor.nome}</span>
          {scoreGeral > 0 && <NivelBadge score={scoreGeral} />}
        </div>
        <span className="text-xs text-muted font-medium">
          {respondentes} respondente{respondentes !== 1 ? 's' : ''}
        </span>
      </div>

      {respondentes === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted">
          Nenhuma resposta coletada para este setor ainda.
          <br />
          <span className="text-xs">Compartilhe o link do questionário em <strong>Respostas</strong> para coletar dados.</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="text-left px-5 py-2.5 font-semibold">Domínio</th>
                  <th className="text-center px-4 py-2.5 font-semibold w-24">Respondentes</th>
                  <th className="text-center px-4 py-2.5 font-semibold w-24">Score Médio</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-48">Risco %</th>
                  <th className="text-center px-4 py-2.5 font-semibold w-32">Classificação</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((d, i) => {
                  const expandido = expandidos.has(d.id)
                  const nivel = d.score != null ? nivelRisco(d.score) : null
                  const dotColor = nivel ? NIVEL_STYLE[nivel].dot : '#94a3b8'
                  return (
                    <Fragment key={d.id}>
                      {/* Linha do domínio — clicável */}
                      <tr
                        className={`cursor-pointer transition-colors hover:brightness-95 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        onClick={() => toggleDominio(d.id)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-muted text-[10px] w-3 flex-shrink-0 select-none">
                              {expandido ? '▼' : '▶'}
                            </span>
                            <span className="font-medium text-navy">{d.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-muted">{respondentes}</td>
                        <td className="px-4 py-3 text-center">
                          {d.score != null
                            ? <span className="font-bold tabular-nums" style={{ color: dotColor }}>{d.score.toFixed(2)}</span>
                            : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <BarraRisco score={d.score} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <NivelBadge score={d.score} />
                        </td>
                      </tr>

                      {/* Detalhe expandido */}
                      {expandido && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <DetalheQuestoes dominioId={d.id} respostas={respostas} perguntas={perguntas} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda dos níveis */}
          <div className="px-5 py-3 border-t border-border bg-gray-50/60 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide mr-1">Legenda:</span>
            {Object.entries(NIVEL_STYLE).map(([key, s]) => {
              const faixa = key === 'baixo' ? '0–24%' : key === 'moderado' ? '25–49%' : key === 'alto' ? '50–74%' : '75–100%'
              return (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-[11px] text-muted">{faixa}</span>
                </span>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function RiscosPage() {
  const { empresaAtiva }                = useEmpresa()
  const [setores, setSetores]           = useState([])
  const [setorId, setSetorId]           = useState('todos')
  const [respostasMap, setRespostasMap] = useState({})
  const [perguntas, setPerguntas]       = useState(PERGUNTAS)
  const [loading, setLoading]           = useState(false)

  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); return }
    supabase.from('setores')
      .select('id, nome')
      .eq('empresa_id', empresaAtiva.id)
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setSetores(data ?? []))
  }, [empresaAtiva])

  const load = useCallback(async () => {
    if (!empresaAtiva || !setores.length) return
    setLoading(true)

    const ids = setores.map(s => s.id)

    // Busca respostas e customizações do consultor em paralelo
    const [{ data: respostasData }, { data: customData }] = await Promise.all([
      supabase.from('respostas_publicas').select('setor_id, respostas').in('setor_id', ids),
      supabase.from('perguntas_customizadas')
        .select('perguntas')
        .eq('consultor_id', empresaAtiva.consultor_id)
        .maybeSingle(),
    ])

    // Aplica customizações (inv, texto, opts) às perguntas base
    setPerguntas(mesclarPerguntas(customData?.perguntas))

    const mapa = {}
    for (const s of setores) mapa[s.id] = []
    for (const r of respostasData ?? []) {
      if (mapa[r.setor_id]) mapa[r.setor_id].push(r)
    }
    setRespostasMap(mapa)
    setLoading(false)
  }, [empresaAtiva, setores])

  useEffect(() => { load() }, [load])

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior." />
  )
  if (loading) return <LoadingSpinner />

  const totalResp        = Object.values(respostasMap).reduce((a, v) => a + v.length, 0)
  const setorAtual       = setores.find(s => s.id === setorId)
  const setoresFiltrados = setorId === 'todos' ? setores : setores.filter(s => s.id === setorId)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Riscos Psicossociais"
        eyebrow={empresaAtiva.nome}
        subtitle={`${totalResp} resposta${totalResp !== 1 ? 's' : ''} coletada${totalResp !== 1 ? 's' : ''}`}
      />

      {/* Seletor de setor */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-navy flex-shrink-0">Setor:</label>
        <select className="input max-w-xs" value={setorId} onChange={e => setSetorId(e.target.value)}>
          <option value="todos">Todos os setores</option>
          {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        {setorId !== 'todos' && setorAtual && (
          <span className="text-xs text-muted">
            {respostasMap[setorId]?.length ?? 0} resposta(s) neste setor
          </span>
        )}
      </div>

      {!setores.length ? (
        <EmptyState icon="🏬" title="Nenhum setor cadastrado"
          description="Cadastre setores em 'Sobre a Empresa' para ver os riscos." />
      ) : (
        <div className="space-y-4">
          {setoresFiltrados.map(s => (
            <TabelaRiscos key={s.id} setor={s} respostas={respostasMap[s.id] ?? []} perguntas={perguntas} />
          ))}
        </div>
      )}
    </div>
  )
}
