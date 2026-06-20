import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, Toast, Modal, EmptyState, LoadingSpinner } from '@/components/ui'
import { TOPICOS_FIXOS_DEFAULT, configClimaInicial } from '@/lib/culturaDefaults'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const STOP = new Set(['a','o','e','de','da','do','em','para','com','que','na','no','se','por','uma','um','as','os','é','sua','seu','ao','mais','mas','foi','tem','não','são','muito','me','meu','minha','esse','essa','esta','isto'])

function wordCloud(texts) {
  const freq = {}
  for (const t of texts) {
    if (!t) continue
    String(t).toLowerCase().replace(/[^a-záéíóúâêîôûãõç\s]/g, '').split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
      .forEach(w => { freq[w] = (freq[w] ?? 0) + 1 })
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20)
}

function barColor(score) {
  if (score == null) return '#94a3b8'
  if (score <= 2) return '#ef4444'
  if (score <= 3) return '#eab308'
  if (score <= 4) return '#3b82f6'
  return '#22c55e'
}

function nivelClima(score) {
  if (score == null) return null
  if (score <= 2) return { label: 'Crítico',   bg: '#fee2e2', color: '#991b1b' }
  if (score <= 3) return { label: 'Regular',   bg: '#fef9c3', color: '#854d0e' }
  if (score <= 4) return { label: 'Bom',       bg: '#dbeafe', color: '#1e40af' }
  return                  { label: 'Excelente', bg: '#dcfce7', color: '#166534' }
}

function calcResultados(respostas, topicos) {
  return topicos.map(t => {
    const pergs = t.perguntas.map(p => {
      const vals = respostas.map(r => r.respostas?.[t.id]?.[p.id]).filter(v => v != null)
      let score = null
      let textos = []
      if (!p.tipo || p.tipo === 'likert') {
        const nums = vals.filter(v => typeof v === 'number')
        score = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
      } else if (p.tipo === 'sim_nao') {
        const sims = vals.filter(v => v === 'sim').length
        score = vals.length ? (sims / vals.length) * 5 : null
      } else if (p.tipo === 'texto') {
        textos = vals.filter(v => typeof v === 'string')
      }
      return { ...p, score, textos }
    })
    const scores = pergs.filter(p => p.score != null).map(p => p.score)
    return {
      ...t,
      score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      perguntas: pergs,
    }
  })
}

function formatMes(ym) {
  const [y, m] = ym.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m) - 1]}/${y}`
}

// ── Aba Configurar ────────────────────────────────────────────────────────────
function AbaConfigurar({ config, setConfig, onSalvar, saving, empresaId }) {
  const [modalLink, setModalLink] = useState(false)
  const link = `${window.location.origin}/clima-publica?empresa=${empresaId}`
  const qr   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`

  function setTextoFixo(ti, pi, texto) {
    setConfig(c => ({
      ...c,
      topicos_fixos: c.topicos_fixos.map((t, i) =>
        i === ti ? { ...t, perguntas: t.perguntas.map((p, j) => j === pi ? { ...p, texto } : p) } : t
      ),
    }))
  }

  function restaurarTopico(topicoId) {
    const orig = TOPICOS_FIXOS_DEFAULT.find(t => t.id === topicoId)
    if (!orig) return
    setConfig(c => ({
      ...c,
      topicos_fixos: c.topicos_fixos.map(t =>
        t.id === topicoId ? { ...t, perguntas: orig.perguntas.map(p => ({ ...p })) } : t
      ),
    }))
  }

  function addTopico() {
    setConfig(c => ({
      ...c,
      topicos_custom: [...(c.topicos_custom ?? []), { id: `ct_${Date.now()}`, nome: '', perguntas: [] }],
    }))
  }

  function removeTopico(id) {
    setConfig(c => ({ ...c, topicos_custom: c.topicos_custom.filter(t => t.id !== id) }))
  }

  function setNomeCustom(id, nome) {
    setConfig(c => ({ ...c, topicos_custom: c.topicos_custom.map(t => t.id === id ? { ...t, nome } : t) }))
  }

  function addPergCustom(topicoId) {
    setConfig(c => ({
      ...c,
      topicos_custom: c.topicos_custom.map(t =>
        t.id === topicoId && t.perguntas.length < 5
          ? { ...t, perguntas: [...t.perguntas, { id: `p_${Date.now()}`, texto: '', tipo: 'likert' }] }
          : t
      ),
    }))
  }

  function setPergCustom(topicoId, pergId, field, val) {
    setConfig(c => ({
      ...c,
      topicos_custom: c.topicos_custom.map(t =>
        t.id === topicoId
          ? { ...t, perguntas: t.perguntas.map(p => p.id === pergId ? { ...p, [field]: val } : p) }
          : t
      ),
    }))
  }

  function removePergCustom(topicoId, pergId) {
    setConfig(c => ({
      ...c,
      topicos_custom: c.topicos_custom.map(t =>
        t.id === topicoId ? { ...t, perguntas: t.perguntas.filter(p => p.id !== pergId) } : t
      ),
    }))
  }

  return (
    <div className="space-y-4">
      {/* Botão link */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-navy">Link público da pesquisa</p>
          <p className="text-xs text-muted">Compartilhe com os funcionários da empresa</p>
        </div>
        <button className="btn-secondary text-sm" onClick={() => setModalLink(true)}>
          🔗 Gerar link / QR Code
        </button>
      </div>

      {/* Tópicos fixos */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted px-1">Tópicos fixos</p>
        {(config.topicos_fixos ?? []).map((t, ti) => (
          <div key={t.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy">{t.nome}</h3>
              <button className="text-xs text-muted hover:text-danger transition-colors"
                onClick={() => restaurarTopico(t.id)}>
                ↺ Restaurar padrão
              </button>
            </div>
            {t.perguntas.map((p, pi) => (
              <div key={p.id}>
                <label className="label text-xs">Pergunta {pi + 1}</label>
                <input className="input text-sm" value={p.texto}
                  onChange={e => setTextoFixo(ti, pi, e.target.value)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tópicos personalizados */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted px-1">Tópicos personalizados</p>
        {(config.topicos_custom ?? []).map(t => (
          <div key={t.id} className="card space-y-3 border-dashed border-2 border-border">
            <div className="flex gap-2 items-center">
              <input className="input flex-1 text-sm" placeholder="Nome do tópico"
                value={t.nome} onChange={e => setNomeCustom(t.id, e.target.value)} />
              <button
                style={{ background: '#ef4444', color: '#fff' }}
                className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                onClick={() => removeTopico(t.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              </button>
            </div>
            {t.perguntas.map(p => (
              <div key={p.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <input className="input text-sm" placeholder="Texto da pergunta"
                    value={p.texto} onChange={e => setPergCustom(t.id, p.id, 'texto', e.target.value)} />
                  <select className="input text-xs py-1.5" value={p.tipo ?? 'likert'}
                    onChange={e => setPergCustom(t.id, p.id, 'tipo', e.target.value)}>
                    <option value="likert">Escala 1-5 (Likert)</option>
                    <option value="sim_nao">Sim / Não</option>
                    <option value="texto">Texto livre</option>
                  </select>
                </div>
                <button className="mt-1 text-muted hover:text-danger transition-colors"
                  onClick={() => removePergCustom(t.id, p.id)}>✕</button>
              </div>
            ))}
            {t.perguntas.length < 5 && (
              <button className="text-xs text-primary hover:underline" onClick={() => addPergCustom(t.id)}>
                + Adicionar pergunta
              </button>
            )}
          </div>
        ))}
        <button className="btn-secondary text-sm w-full" onClick={addTopico}>
          + Adicionar tópico personalizado
        </button>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary px-6" onClick={onSalvar} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </button>
      </div>

      {/* Modal link */}
      {modalLink && (
        <Modal title="Link da Pesquisa de Clima" onClose={() => setModalLink(false)}>
          <div className="space-y-4 text-center">
            <img src={qr} alt="QR Code" className="mx-auto rounded-xl border border-border" />
            <div className="bg-bg rounded-xl p-3">
              <p className="text-xs font-mono text-navy break-all">{link}</p>
            </div>
            <button className="btn-secondary text-sm w-full"
              onClick={() => navigator.clipboard.writeText(link)}>
              📋 Copiar link
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Aba Resultados ─────────────────────────────────────────────────────────────
function AbaResultados({ respostas, topicos, setores }) {
  const [filtroMes, setFiltroMes]       = useState('')
  const [filtroSetor, setFiltroSetor]   = useState('')
  const [expandidos, setExpandidos]     = useState(new Set())

  const meses = [...new Set(respostas.map(r => r.created_at.slice(0, 7)))].sort().reverse()

  const respostasFilt = respostas
    .filter(r => !filtroMes || r.created_at.startsWith(filtroMes))
    .filter(r => !filtroSetor || r.setor_id === filtroSetor)

  const resultados = calcResultados(respostasFilt, topicos)
  const comScore = resultados.filter(t => t.score != null)
  const mediaGeral = comScore.length ? comScore.reduce((a, t) => a + t.score, 0) / comScore.length : null
  const melhor = comScore.length ? comScore.reduce((b, t) => t.score > b.score ? t : b) : null
  const pior   = comScore.length ? comScore.reduce((b, t) => t.score < b.score ? t : b) : null

  const chartData = resultados.map(t => ({ nome: t.nome, score: t.score ? +t.score.toFixed(2) : 0 }))

  function toggleExpandido(id) {
    setExpandidos(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  if (!respostas.length) return (
    <EmptyState icon="📊" title="Nenhuma resposta ainda" description="Compartilhe o link da pesquisa para começar a coletar dados." />
  )

  return (
    <div className="space-y-4">
      {/* Filtros */}
      {(meses.length > 1 || setores.length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {meses.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="label mb-0 text-xs">Período:</label>
              <select className="input text-sm py-1.5 w-40" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
                <option value="">Todos</option>
                {meses.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
              </select>
            </div>
          )}
          {setores.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="label mb-0 text-xs">Setor:</label>
              <select className="input text-sm py-1.5 w-40" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
                <option value="">Todos</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-black text-navy">{respostasFilt.length}</p>
          <p className="text-xs text-muted mt-1">Respostas</p>
        </div>
        <div className="card text-center">
          {mediaGeral != null
            ? <><p className="text-2xl font-black" style={{ color: barColor(mediaGeral) }}>{mediaGeral.toFixed(1)}</p>
               <p className="text-xs text-muted mt-1">Média geral</p></>
            : <p className="text-xs text-muted">—</p>
          }
        </div>
        <div className="card text-center">
          {melhor
            ? <><p className="text-sm font-bold text-green-600 leading-snug">{melhor.nome}</p>
               <p className="text-xs text-muted mt-1">✅ Melhor tópico</p></>
            : <p className="text-xs text-muted">—</p>
          }
        </div>
        <div className="card text-center">
          {pior
            ? <><p className="text-sm font-bold text-red-600 leading-snug">{pior.nome}</p>
               <p className="text-xs text-muted mt-1">⚠️ Mais crítico</p></>
            : <p className="text-xs text-muted">—</p>
          }
        </div>
      </div>

      {/* Gráfico horizontal */}
      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-4">Score médio por tópico</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={chartData} margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nome" width={160} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => v.toFixed(2)} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => <Cell key={i} fill={barColor(d.score)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparativo entre Setores */}
      {setores.length > 1 && !filtroSetor && (() => {
        const setoresComResp = setores.filter(s => respostasFilt.some(r => r.setor_id === s.id))
        if (setoresComResp.length < 2) return null
        return (
          <div className="card overflow-x-auto">
            <h3 className="text-sm font-bold text-navy mb-4">Comparativo entre Setores</h3>
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 font-semibold text-muted w-40">Tópico</th>
                  {setoresComResp.map(s => (
                    <th key={s.id} className="text-center pb-2 font-semibold text-muted px-3">{s.nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {resultados.filter(t => t.score != null).map(t => {
                  const scores = setoresComResp.map(s => {
                    const respSetor = respostasFilt.filter(r => r.setor_id === s.id)
                    const [res] = calcResultados(respSetor, [t])
                    return res?.score ?? null
                  })
                  const minScore = Math.min(...scores.filter(s => s != null))
                  return (
                    <tr key={t.id}>
                      <td className="py-2 font-medium text-navy pr-4">{t.nome}</td>
                      {scores.map((sc, i) => (
                        <td key={i} className="py-2 text-center px-3">
                          {sc != null
                            ? <span className={`font-bold tabular-nums ${sc === minScore ? 'text-red-600' : ''}`}
                                style={{ color: sc === minScore ? undefined : barColor(sc) }}>
                                {sc.toFixed(2)}
                              </span>
                            : <span className="text-muted">—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-3">Valor mais baixo por tópico destacado em vermelho.</p>
          </div>
        )
      })()}

      {/* Cards por tópico */}
      {resultados.map(t => {
        const nivel = nivelClima(t.score)
        const exp = expandidos.has(t.id)
        const todosTextos = t.perguntas.flatMap(p => p.textos ?? [])
        const cloud = wordCloud(todosTextos)
        return (
          <div key={t.id} className="card p-0 overflow-hidden">
            <button
              onClick={() => toggleExpandido(t.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-navy">{t.nome}</span>
                {nivel && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: nivel.bg, color: nivel.color }}>
                    {nivel.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {t.score != null && (
                  <span className="text-sm font-bold tabular-nums" style={{ color: barColor(t.score) }}>
                    {t.score.toFixed(2)}
                  </span>
                )}
                <span className="text-muted text-xs">{exp ? '▲' : '▼'}</span>
              </div>
            </button>

            {exp && (
              <div className="border-t border-border px-5 py-4 space-y-4">
                {/* Tabela de perguntas */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted border-b border-border">
                      <th className="text-left pb-2 font-semibold">Pergunta</th>
                      <th className="text-right pb-2 font-semibold w-16">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {t.perguntas.map(p => (
                      <tr key={p.id}>
                        <td className="py-2 text-navy pr-4">{p.texto}</td>
                        <td className="py-2 text-right">
                          {p.score != null
                            ? <span className="font-bold" style={{ color: barColor(p.score) }}>{p.score.toFixed(2)}</span>
                            : <span className="text-muted italic text-[11px]">texto</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Nuvem de palavras */}
                {cloud.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted mb-2">Palavras mais frequentes</p>
                    <div className="flex flex-wrap gap-2">
                      {cloud.map(([word, count]) => (
                        <span key={word} className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: `rgba(58,123,213,${Math.min(0.15 + count * 0.05, 0.5)})`,
                            color: '#1a2e4a',
                            fontSize: `${Math.min(0.7 + count * 0.05, 1)}rem`,
                          }}>
                          {word} <span className="opacity-60">({count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ClimaPesquisaPage() {
  const { empresaAtiva } = useEmpresa()
  const empresaId = empresaAtiva?.id

  const [aba, setAba]         = useState('configurar')
  const [config, setConfig]   = useState(null)
  const [respostas, setRespostas] = useState([])
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)
  const [mostraInfo, setMostraInfo] = useState(false)

  const carregar = useCallback(async () => {
    if (!empresaId) return
    setLoading(true)
    const [{ data: pesq }, { data: resp }, { data: setsData }] = await Promise.all([
      supabase.from('clima_pesquisas').select('configuracao').eq('empresa_id', empresaId).maybeSingle(),
      supabase.from('clima_respostas').select('respostas, created_at, setor_id').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      supabase.from('setores').select('id, nome').eq('empresa_id', empresaId).order('nome'),
    ])
    setConfig(pesq?.configuracao ?? configClimaInicial())
    setRespostas(resp ?? [])
    setSetores(setsData ?? [])
    setLoading(false)
  }, [empresaId])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSaving(true)
    const { error } = await supabase.from('clima_pesquisas').upsert(
      { empresa_id: empresaId, configuracao: config, updated_at: new Date().toISOString() },
      { onConflict: 'empresa_id' }
    )
    setSaving(false)
    if (error) setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
    else setToast({ message: 'Configuração salva!', type: 'success' })
  }

  if (!empresaId) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada" description="Selecione uma empresa no topo para acessar a pesquisa de clima." />
  )

  if (loading || !config) return <LoadingSpinner />

  const todosTopicos = [...(config.topicos_fixos ?? []), ...(config.topicos_custom ?? [])]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pesquisa de Clima"
        subtitle={empresaAtiva?.nome}
        action={
          <button onClick={() => setMostraInfo(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-75 transition-opacity whitespace-nowrap">
            ℹ️ O que é Pesquisa de Clima?
            <span className="text-[10px]">{mostraInfo ? '▲' : '▼'}</span>
          </button>
        }
      />
      {mostraInfo && (
        <div className="card border-l-4 border-primary">
          <p className="text-sm text-muted leading-relaxed">
            A <strong className="text-navy">Pesquisa de Clima Organizacional</strong> mede a percepção dos colaboradores sobre aspectos-chave
            do ambiente de trabalho — comunicação, liderança, reconhecimento, condições físicas e equilíbrio de vida.
            Configure os tópicos na aba <em>Configurar</em>, compartilhe o link com a equipe e acompanhe os resultados
            em tempo real. As respostas são anônimas e podem ser filtradas por setor para uma análise mais precisa.
          </p>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b border-border">
        {[['configurar','⚙️ Configurar'], ['resultados','📊 Resultados']].map(([key, label]) => (
          <button key={key} onClick={() => setAba(key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px
              ${aba === key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-navy'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'configurar' && (
        <AbaConfigurar
          config={config}
          setConfig={setConfig}
          onSalvar={salvar}
          saving={saving}
          empresaId={empresaId}
        />
      )}
      {aba === 'resultados' && (
        <AbaResultados respostas={respostas} topicos={todosTopicos} setores={setores} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
