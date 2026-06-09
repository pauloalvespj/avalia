import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PERGUNTAS, nivelRisco } from '@/lib/perguntas'
import { PageHeader, EmptyState, LoadingSpinner, Toast } from '@/components/ui'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'

// ── Domínios (7 domínios atualizados) ────────────────────────────────────────
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

const BLOCO_PREFIXO = { 1:'EL', 2:'OT', 3:'RS', 4:'PE', 5:'IT', 6:'SB', 7:'CO' }

function codigoItem(p) {
  const num = parseInt(p.id.replace('q', ''), 10)
  return `${BLOCO_PREFIXO[p.bloco]}${String(num).padStart(2, '0')}`
}

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

// Calcula score médio por domínio a partir das respostas
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

// Calcula score por item
function calcularItens(respostasArr, perguntas) {
  return perguntas.map(p => {
    const vals = respostasArr
      .map(r => r.respostas?.[p.id])
      .filter(v => v != null)
      .map(v => p.inv ? 6 - v : v)
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { p, codigo: codigoItem(p), score }
  })
}

function NivelBadge({ score }) {
  if (score == null) return null
  const nivel = nivelRisco(score)
  const { bg, color, label } = NIVEL_STYLE[nivel]
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
      {label}
    </span>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { nomeCompleto, score, cor } = payload[0].payload
  if (score == null) return null
  const nivel = nivelRisco(score)
  const { label, bg, color } = NIVEL_STYLE[nivel]
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-navy mb-1">{nomeCompleto}</p>
      <p>Score médio: <strong>{score.toFixed(2)}</strong></p>
      <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: bg, color }}>{label}</span>
    </div>
  )
}

const CAMPOS = [
  { key: 'riscos_txt',    label: 'Principais riscos identificados', placeholder: 'Descreva os principais riscos identificados na avaliação...' },
  { key: 'protetores',    label: 'Fatores protetores',              placeholder: 'Descreva os fatores protetores identificados...' },
  { key: 'recomendacoes', label: 'Recomendações',                   placeholder: 'Liste as principais recomendações para mitigação dos riscos...' },
  { key: 'conclusao',     label: 'Conclusão',                       placeholder: 'Escreva a conclusão do diagnóstico...' },
]

export default function DiagnosticoPage() {
  const { empresaAtiva } = useEmpresa()

  const [setores, setSetores]         = useState([])
  const [setorId, setSetorId]         = useState(null)
  const [perguntas, setPerguntas]     = useState(PERGUNTAS)
  const [chartData, setChartData]     = useState([])
  const [itensCriticos, setItensCriticos] = useState([])
  const [diag, setDiag]               = useState({ riscos_txt:'', protetores:'', recomendacoes:'', conclusao:'' })
  const [savedStatus, setSavedStatus] = useState({})
  const [loading, setLoading]         = useState(false)
  const [toast, setToast]             = useState(null)
  const debounceRef                   = useRef({})

  // Carrega setores e pré-seleciona se houver apenas um
  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); setSetorId(null); return }
    supabase.from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id).eq('ativo', true).order('nome')
      .then(({ data }) => {
        const lista = data ?? []
        setSetores(lista)
        if (lista.length === 1) setSetorId(lista[0].id)
      })
  }, [empresaAtiva?.id])

  const load = useCallback(async () => {
    if (!empresaAtiva || !setorId) return
    setLoading(true)

    const [{ data: respostasData }, { data: customData }, { data: diagData }] = await Promise.all([
      supabase.from('respostas_publicas').select('respostas').eq('setor_id', setorId),
      supabase.from('perguntas_customizadas').select('perguntas')
        .eq('consultor_id', empresaAtiva.consultor_id).maybeSingle(),
      supabase.from('diagnosticos').select('riscos_txt, protetores, recomendacoes, conclusao')
        .eq('setor_id', setorId).maybeSingle(),
    ])

    const pergsAtivas = mesclarPerguntas(customData?.perguntas)
    setPerguntas(pergsAtivas)

    const resArr = respostasData ?? []

    // Gráfico por domínio
    const dominios = calcularDominios(resArr, pergsAtivas)
    setChartData(dominios.map(d => ({
      nome: d.nome,
      nomeCompleto: d.nome,
      score: d.score,
      cor: d.cor,
    })))

    // Itens com risco alto ou crítico (score ≥ 3.0)
    const itens = calcularItens(resArr, pergsAtivas)
      .filter(({ score }) => score != null && score >= 3.0)
      .sort((a, b) => b.score - a.score)
    setItensCriticos(itens)

    setDiag(diagData
      ? { riscos_txt: diagData.riscos_txt ?? '', protetores: diagData.protetores ?? '', recomendacoes: diagData.recomendacoes ?? '', conclusao: diagData.conclusao ?? '' }
      : { riscos_txt:'', protetores:'', recomendacoes:'', conclusao:'' }
    )

    setLoading(false)
  }, [empresaAtiva, setorId])

  useEffect(() => { load() }, [load])

  function handleDiagChange(campo, valor) {
    setDiag(prev => ({ ...prev, [campo]: valor }))
    setSavedStatus(prev => ({ ...prev, [campo]: 'pending' }))
    if (debounceRef.current[campo]) clearTimeout(debounceRef.current[campo])
    debounceRef.current[campo] = setTimeout(() => salvarCampo(campo, valor), 1000)
  }

  async function salvarCampo(campo, valor) {
    if (!setorId) return
    const { error } = await supabase.from('diagnosticos').upsert(
      { setor_id: setorId, [campo]: valor },
      { onConflict: 'setor_id' }
    )
    if (error) {
      setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
      setSavedStatus(prev => ({ ...prev, [campo]: 'error' }))
    } else {
      setSavedStatus(prev => ({ ...prev, [campo]: 'saved' }))
      setTimeout(() => setSavedStatus(prev => ({ ...prev, [campo]: null })), 2500)
    }
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Selecione uma empresa"
      description="Use o menu superior para selecionar uma empresa."
      action={<Link to="/empresas" className="btn-primary">Ir para Empresas</Link>} />
  )

  const setorNome = setores.find(s => s.id === setorId)?.nome

  return (
    <div className="space-y-5">
      <PageHeader
        title="Diagnóstico"
        subtitle={setorNome ? `${empresaAtiva.nome} · ${setorNome}` : empresaAtiva.nome}
      />

      {/* Seletor de setor */}
      {setores.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-navy whitespace-nowrap">Setor:</label>
          <select className="input py-2 text-sm w-auto" value={setorId ?? ''}
            onChange={e => { setSetorId(e.target.value || null) }}>
            <option value="">Selecione...</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      )}

      {!setorId && (
        <div className="card text-center py-10 text-muted text-sm">
          Selecione um setor para ver o diagnóstico.
        </div>
      )}

      {setorId && loading && <LoadingSpinner />}

      {setorId && !loading && (
        <>
          {/* ── Gráfico por Domínio ── */}
          <div className="card">
            <div className="card-title">📊 Score Médio por Domínio</div>
            {!chartData.some(d => d.score != null) ? (
              <p className="text-sm text-muted py-4 text-center">
                Nenhuma resposta coletada ainda.{' '}
                <Link to="/respostas" className="text-primary font-semibold hover:underline">Ver respostas →</Link>
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf4" />
                  <XAxis type="number" domain={[0, 5]} ticks={[0,1,2,3,4,5]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={210} tick={{ fontSize: 11, fill: '#1a2e4a' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="score" position="right"
                      formatter={v => v != null ? v.toFixed(1) : ''}
                      style={{ fontSize: 11, fontWeight: 700 }} />
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.score != null ? entry.cor : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Riscos Altos e Críticos por Item ── */}
          <div className="card p-0 overflow-hidden">
            <div className="card-title px-5 pt-5">🚨 Riscos Altos e Críticos por Item</div>
            {!itensCriticos.length ? (
              <p className="text-sm text-success font-semibold px-5 pb-5">
                ✅ Nenhum risco alto ou crítico identificado.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide w-16">Cód.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Item</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide text-center w-20">Score</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide w-40 hidden sm:table-cell">Risco %</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide text-center w-28">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {itensCriticos.map(({ p, codigo, score }, i) => {
                    const nivel = nivelRisco(score)
                    const st    = NIVEL_STYLE[nivel]
                    const pct   = Math.round((score - 1) / 4 * 100)
                    return (
                      <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 font-mono font-bold text-xs text-muted whitespace-nowrap">{codigo}</td>
                        <td className="px-4 py-3 font-semibold text-navy">{p.item}</td>
                        <td className="px-4 py-3 text-center font-black" style={{ color: st.dot }}>{score.toFixed(2)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: st.bg }}>
                              <div className="h-full rounded-full" style={{ width: pct + '%', background: st.dot }} />
                            </div>
                            <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color: st.dot }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center"><NivelBadge score={score} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Síntese do Diagnóstico ── */}
          <div className="card">
            <div className="card-title">📝 Síntese do Diagnóstico</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CAMPOS.map(({ key, label, placeholder }) => {
                const status = savedStatus[key]
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="label mb-0">{label}</label>
                      {status === 'saved'   && <span className="text-xs text-success font-semibold">Salvo ✓</span>}
                      {status === 'pending' && <span className="text-xs text-muted">Salvando…</span>}
                      {status === 'error'   && <span className="text-xs text-danger">Erro ✕</span>}
                    </div>
                    <textarea
                      className="input resize-none text-sm"
                      rows={4}
                      placeholder={placeholder}
                      value={diag[key]}
                      onChange={e => handleDiagChange(key, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
