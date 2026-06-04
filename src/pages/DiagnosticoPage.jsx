import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { nivelRisco } from '@/lib/perguntas'
import { PageHeader, EmptyState, LoadingSpinner, Toast } from '@/components/ui'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'

// ── Estrutura de domínios e subescalas ──────────────────────────────────────
const DOMINIOS = [
  { id: 'D1', nome: 'Exigências do Trabalho',     cor: '#c94040', sfs: [
    { sf: 'sf1',  nome: 'Exigências quantitativas' },
    { sf: 'sf2',  nome: 'Ritmo de trabalho' },
    { sf: 'sf3',  nome: 'Exigências cognitivas' },
    { sf: 'sf4',  nome: 'Exigências emocionais' },
  ]},
  { id: 'D2', nome: 'Organização e Conteúdo',      cor: '#d08030', sfs: [
    { sf: 'sf5',  nome: 'Influência no trabalho' },
    { sf: 'sf6',  nome: 'Possibilidades de desenvolvimento' },
    { sf: 'sf7',  nome: 'Previsibilidade' },
    { sf: 'sf8',  nome: 'Transparência do papel laboral' },
  ]},
  { id: 'D3', nome: 'Relações Sociais e Liderança', cor: '#2d8a5e', sfs: [
    { sf: 'sf9',  nome: 'Recompensas' },
    { sf: 'sf10', nome: 'Apoio social de superiores' },
    { sf: 'sf11', nome: 'Comunidade social no trabalho' },
    { sf: 'sf12', nome: 'Qualidade da liderança' },
    { sf: 'sf13', nome: 'Confiança vertical' },
    { sf: 'sf14', nome: 'Justiça e respeito' },
  ]},
  { id: 'D4', nome: 'Valores no Trabalho',          cor: '#3a7bd5', sfs: [
    { sf: 'sf15', nome: 'Auto-eficácia' },
    { sf: 'sf16', nome: 'Significado do trabalho' },
    { sf: 'sf17', nome: 'Compromisso' },
    { sf: 'sf18', nome: 'Satisfação no trabalho' },
  ]},
  { id: 'D5', nome: 'Saúde e Bem-Estar',            cor: '#7a4db0', sfs: [
    { sf: 'sf19', nome: 'Insegurança laboral' },
    { sf: 'sf20', nome: 'Saúde geral' },
    { sf: 'sf21', nome: 'Conflito trabalho/família' },
    { sf: 'sf22', nome: 'Problemas em dormir' },
    { sf: 'sf23', nome: 'Burnout' },
    { sf: 'sf24', nome: 'Stress' },
    { sf: 'sf25', nome: 'Sintomas depressivos' },
  ]},
  { id: 'D6', nome: 'Comportamentos Ofensivos',     cor: '#8a1a1a', sfs: [
    { sf: 'sf26', nome: 'Insultos e provocações verbais' },
    { sf: 'sf27', nome: 'Assédio sexual' },
    { sf: 'sf28', nome: 'Ameaças e violência física' },
  ]},
]

// Mapa sf → { dominio, nomeSubescala }
const SF_META = {}
for (const d of DOMINIOS)
  for (const s of d.sfs)
    SF_META[s.sf] = { dominio: d.nome, dominioId: d.id, cor: d.cor, nome: s.nome }

const NIVEL_STYLE = {
  baixo:   { bg: '#dcfce7', color: '#166534', label: 'Baixo' },
  médio:   { bg: '#fef9c3', color: '#854d0e', label: 'Médio' },
  alto:    { bg: '#ffedd5', color: '#9a3412', label: 'Alto' },
  crítico: { bg: '#fee2e2', color: '#991b1b', label: 'Crítico' },
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

function mediaDominio(sfMap, sfs) {
  const vals = sfs.map(s => sfMap[s.sf]).filter(v => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

// Tooltip personalizado do gráfico
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { nome, valor, cor } = payload[0].payload
  if (valor == null) return null
  const nivel = nivelRisco(valor)
  const { label, bg, color } = NIVEL_STYLE[nivel]
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-navy mb-1">{nome}</p>
      <p>Score médio: <strong>{valor.toFixed(2)}</strong></p>
      <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: bg, color }}>{label}</span>
    </div>
  )
}

export default function DiagnosticoPage() {
  const { empresaAtiva } = useEmpresa()

  const [sfMap, setSfMap]             = useState({})
  const [diag, setDiag]               = useState({ riscos_txt: '', protetores: '', recomendacoes: '', conclusao: '' })
  const [savedStatus, setSavedStatus] = useState({})
  const [loading, setLoading]         = useState(false)
  const [consolidado, setConsolidado] = useState(null)
  const [gerando, setGerando]         = useState(false)
  const [multiSetor, setMultiSetor]   = useState(false)
  const [toast, setToast]             = useState(null)
  const debounceRef                   = useRef({})

  const load = useCallback(async () => {
    if (!empresaAtiva) return
    setLoading(true)

    // Busca setores da empresa para agregar riscos
    const { data: setoresEmp } = await supabase
      .from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id)
    const setorIds = setoresEmp?.map(s => s.id) ?? []

    const [{ data: todosRiscos }, { data: diagData }] = await Promise.all([
      setorIds.length
        ? supabase.from('riscos').select('fator, score, evidencias, setor_id').in('setor_id', setorIds)
        : Promise.resolve({ data: [] }),
      supabase.from('diagnosticos').select('riscos_txt, protetores, recomendacoes, conclusao')
        .eq('empresa_id', empresaAtiva.id).maybeSingle(),
    ])

    // Agrega scores por fator (média entre setores)
    const sfAgg = {}
    const sfEv  = {}
    for (const r of todosRiscos ?? []) {
      if (!sfAgg[r.fator]) sfAgg[r.fator] = []
      sfAgg[r.fator].push(r.score)
      if (r.evidencias) sfEv[r.fator] = r.evidencias
    }
    const mapa = {}
    for (const [fator, scores] of Object.entries(sfAgg)) {
      mapa[fator] = parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
    }
    setSfMap(mapa)

    if (diagData) {
      setDiag({
        riscos_txt:    diagData.riscos_txt    ?? '',
        protetores:    diagData.protetores    ?? '',
        recomendacoes: diagData.recomendacoes ?? '',
        conclusao:     diagData.conclusao     ?? '',
      })
    }

    setMultiSetor((setoresEmp?.length ?? 0) >= 2)
    setLoading(false)
  }, [empresaAtiva])

  useEffect(() => { load() }, [load])

  function handleDiagChange(campo, valor) {
    setDiag(prev => ({ ...prev, [campo]: valor }))
    setSavedStatus(prev => ({ ...prev, [campo]: 'pending' }))
    if (debounceRef.current[campo]) clearTimeout(debounceRef.current[campo])
    debounceRef.current[campo] = setTimeout(() => salvarCampo(campo, valor), 1000)
  }

  async function salvarCampo(campo, valor) {
    if (!empresaAtiva) return
    const { error } = await supabase.from('diagnosticos').upsert(
      { empresa_id: empresaAtiva.id, [campo]: valor },
      { onConflict: 'empresa_id' }
    )
    if (error) {
      setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
      setSavedStatus(prev => ({ ...prev, [campo]: 'error' }))
    } else {
      setSavedStatus(prev => ({ ...prev, [campo]: 'saved' }))
      setTimeout(() => setSavedStatus(prev => ({ ...prev, [campo]: null })), 2500)
    }
  }

  async function gerarConsolidado() {
    if (!empresaAtiva) return
    setGerando(true)

    const { data: setores } = await supabase.from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id)
    if (!setores?.length) { setGerando(false); return }

    const { data: todosRiscos } = await supabase
      .from('riscos').select('setor_id, fator, score').in('setor_id', setores.map(s => s.id))

    // Agrupa por sf → lista de { setor, score }
    const porSf = {}
    for (const r of todosRiscos ?? []) {
      if (!porSf[r.fator]) porSf[r.fator] = []
      const nomeSetor = setores.find(s => s.id === r.setor_id)?.nome ?? r.setor_id
      porSf[r.fator].push({ setor: nomeSetor, score: r.score })
    }

    const transversais = []
    const exclusivos   = []

    for (const [sf, entradas] of Object.entries(porSf)) {
      const altos = entradas.filter(e => e.score >= 4)
      if (altos.length >= 2) {
        transversais.push({ sf, nome: SF_META[sf]?.nome ?? sf, setores: altos.map(e => e.setor) })
      } else if (altos.length === 1) {
        exclusivos.push({ sf, nome: SF_META[sf]?.nome ?? sf, setor: altos[0].setor, score: altos[0].score })
      }
    }

    // Setor com maior média geral
    const mediasSetores = setores.map(s => {
      const vals = (todosRiscos ?? []).filter(r => r.setor_id === s.id).map(r => r.score)
      const media = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      return { nome: s.nome, media }
    }).filter(s => s.media != null)

    mediasSetores.sort((a, b) => b.media - a.media)
    const maisCritico = mediasSetores[0] ?? null

    setConsolidado({ transversais, exclusivos, maisCritico, mediasSetores })
    setGerando(false)
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Selecione uma empresa"
      description="Use o menu superior para selecionar uma empresa."
      action={<Link to="/empresas" className="btn-primary">Ir para Empresas</Link>} />
  )

  if (loading) return <LoadingSpinner />

  // Dados para o gráfico
  const chartData = DOMINIOS.map(d => ({
    nome:  d.nome.split(' ').slice(0, 2).join(' '), // nome curto
    nomeCompleto: d.nome,
    valor: mediaDominio(sfMap, d.sfs),
    cor:   d.cor,
  }))

  // Riscos altos e críticos (score ≥ 4)
  const riscosAltos = Object.entries(sfMap)
    .filter(([, score]) => score >= 4)
    .map(([sf, score]) => ({ sf, score, ...SF_META[sf] }))
    .sort((a, b) => b.score - a.score)

  const CAMPOS = [
    { key: 'riscos_txt',    label: 'Principais riscos identificados',     placeholder: 'Descreva os principais riscos identificados na avaliação...' },
    { key: 'protetores',    label: 'Fatores protetores',                   placeholder: 'Descreva os fatores protetores identificados...' },
    { key: 'recomendacoes', label: 'Recomendações',                        placeholder: 'Liste as principais recomendações para mitigação dos riscos...' },
    { key: 'conclusao',     label: 'Conclusão',                            placeholder: 'Escreva a conclusão do diagnóstico...' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Diagnóstico" subtitle={empresaAtiva.nome} />

      {/* ── Visão Geral dos Riscos ── */}
      <div className="card">
        <div className="card-title">📊 Visão Geral dos Riscos por Domínio</div>
        {!Object.keys(sfMap).length ? (
          <p className="text-sm text-muted py-4 text-center">
            Nenhum risco calculado ainda.{' '}
            <Link to="/riscos" className="text-primary font-semibold hover:underline">Preencher riscos →</Link>
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf4" />
              <XAxis type="number" domain={[0, 5]} ticks={[0,1,2,3,4,5]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 11, fill: '#1a2e4a' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList dataKey="valor" position="right" formatter={v => v != null ? v.toFixed(1) : ''} style={{ fontSize: 11, fontWeight: 700 }} />
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.valor != null ? entry.cor : '#e2e8f0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Riscos Altos e Críticos ── */}
      <div className="card p-0 overflow-hidden">
        <div className="card-title px-5 pt-5">🚨 Riscos Altos e Críticos</div>
        {!riscosAltos.length ? (
          <p className="text-sm text-success font-semibold px-5 pb-5">
            ✅ Nenhum risco alto ou crítico identificado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Subescala</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Domínio</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide text-center">Score</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide text-center">Nível</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Evidências</th>
              </tr>
            </thead>
            <tbody>
              {riscosAltos.map(r => (
                <tr key={r.sf} className="border-b border-border last:border-0 hover:bg-bg/50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-navy">{r.nome}</span>
                    <span className="text-xs text-muted ml-1.5">{r.sf}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ background: r.cor }}>
                      {r.dominioId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-black text-navy">{r.score.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center"><NivelBadge score={r.score} /></td>
                  <td className="px-4 py-3 text-xs text-muted hidden md:table-cell">
                    {sfMap[r.sf + '_ev'] || '—'}
                  </td>
                </tr>
              ))}
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

      {/* ── Diagnóstico Consolidado ── */}
      {multiSetor && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="card-title mb-0">🔀 Diagnóstico Consolidado entre Setores</div>
              <p className="text-xs text-muted mt-0.5">Comparativo de riscos em todos os setores da empresa</p>
            </div>
            <button className="btn-secondary text-sm" onClick={gerarConsolidado} disabled={gerando}>
              {gerando ? 'Gerando…' : 'Gerar síntese'}
            </button>
          </div>

          {consolidado && (
            <div className="space-y-4 border-t border-border pt-4">

              {/* Riscos transversais */}
              <div>
                <h4 className="text-sm font-bold text-navy mb-2">
                  Riscos transversais{' '}
                  <span className="text-muted font-normal">(score ≥ 4 em 2+ setores)</span>
                </h4>
                {!consolidado.transversais.length ? (
                  <p className="text-xs text-muted">Nenhum risco transversal identificado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {consolidado.transversais.map(r => (
                      <div key={r.sf} className="flex items-start gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                        <span>
                          <strong className="text-navy">{r.nome}</strong>
                          <span className="text-muted ml-1.5">({r.sf})</span>
                          {' — '}
                          <span className="text-muted">{r.setores.join(', ')}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Riscos exclusivos */}
              <div>
                <h4 className="text-sm font-bold text-navy mb-2">
                  Riscos exclusivos{' '}
                  <span className="text-muted font-normal">(score ≥ 4 em apenas um setor)</span>
                </h4>
                {!consolidado.exclusivos.length ? (
                  <p className="text-xs text-muted">Nenhum risco exclusivo identificado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {consolidado.exclusivos.map(r => (
                      <div key={r.sf} className="flex items-start gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-warning mt-1.5 flex-shrink-0" />
                        <span>
                          <strong className="text-navy">{r.nome}</strong>
                          <span className="text-muted ml-1.5">({r.sf})</span>
                          {' — '}
                          <span className="text-muted">{r.setor} · score {r.score.toFixed(1)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Setor mais crítico */}
              {consolidado.maisCritico && (
                <div className="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
                  <p className="text-sm">
                    <span className="font-bold text-danger">Setor com perfil mais crítico: </span>
                    <span className="font-semibold text-navy">{consolidado.maisCritico.nome}</span>
                    <span className="text-muted ml-1.5">(média geral {consolidado.maisCritico.media.toFixed(2)})</span>
                  </p>
                  {consolidado.mediasSetores.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {consolidado.mediasSetores.map(s => (
                        <span key={s.nome} className="text-xs px-2 py-0.5 rounded-full bg-white border border-border">
                          {s.nome}: <strong>{s.media.toFixed(2)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
