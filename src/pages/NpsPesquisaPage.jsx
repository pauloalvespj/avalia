import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, Toast, Modal, EmptyState, LoadingSpinner } from '@/components/ui'
import { CATEGORIAS_NPS_DEFAULT, configNpsInicial } from '@/lib/culturaDefaults'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'

function scoreColor(score) {
  if (score == null) return '#94a3b8'
  if (score <= 2) return '#ef4444'
  if (score <= 3) return '#eab308'
  if (score <= 4) return '#3b82f6'
  return '#22c55e'
}

function npsColor(score) {
  if (score < 0)   return '#ef4444'
  if (score <= 50) return '#eab308'
  if (score <= 75) return '#22c55e'
  return '#3b82f6'
}

function npsLabel(score) {
  if (score < 0)   return 'Crítico'
  if (score <= 50) return 'Bom'
  if (score <= 75) return 'Ótimo'
  return 'Excelente'
}

function calcNps(respostas) {
  if (!respostas.length) return null
  const promotores  = respostas.filter(r => r.nota_nps >= 9).length
  const detratores  = respostas.filter(r => r.nota_nps <= 6).length
  return Math.round((promotores / respostas.length - detratores / respostas.length) * 100)
}

function formatMes(ym) {
  const [y, m] = ym.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m) - 1]}/${y}`
}

function ScoreNPS({ score }) {
  const cor   = npsColor(score)
  const label = npsLabel(score)
  const pct   = ((score + 100) / 200) * 100
  return (
    <div className="text-center py-4 space-y-3">
      <div className="text-7xl font-black" style={{ color: cor }}>{score > 0 ? '+' : ''}{score}</div>
      <div className="text-sm font-bold" style={{ color: cor }}>{label}</div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden max-w-xs mx-auto">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct + '%', background: cor }} />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/60" />
      </div>
      <div className="flex justify-between text-xs text-muted max-w-xs mx-auto">
        <span>-100</span>
        <span>0</span>
        <span>+100</span>
      </div>
    </div>
  )
}

// ── Aba Configurar ────────────────────────────────────────────────────────────
function AbaConfigurar({ config, setConfig, onSalvar, saving, empresaId }) {
  const [modalLink, setModalLink] = useState(false)
  const link = `${window.location.origin}/nps-publica?empresa=${empresaId}`
  const qr   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`

  function setTextoCategoria(ci, pi, texto) {
    setConfig(c => ({
      ...c,
      categorias: c.categorias.map((cat, i) =>
        i === ci ? { ...cat, perguntas: cat.perguntas.map((p, j) => j === pi ? { ...p, texto } : p) } : cat
      ),
    }))
  }

  function addPergCategoria(catId) {
    const cat = config.categorias.find(c => c.id === catId)
    const baseCat = CATEGORIAS_NPS_DEFAULT.find(c => c.id === catId)
    if (!cat || cat.perguntas.length >= (baseCat?.perguntas.length ?? 0) + 2) return
    setConfig(c => ({
      ...c,
      categorias: c.categorias.map(cat =>
        cat.id === catId
          ? { ...cat, perguntas: [...cat.perguntas, { id: `ep_${Date.now()}`, texto: '' }] }
          : cat
      ),
    }))
  }

  function removePergCategoria(catId, pergId) {
    const baseCat = CATEGORIAS_NPS_DEFAULT.find(c => c.id === catId)
    if (!baseCat) return
    const baseIds = new Set(baseCat.perguntas.map(p => p.id))
    if (baseIds.has(pergId)) return // não remover perguntas originais
    setConfig(c => ({
      ...c,
      categorias: c.categorias.map(cat =>
        cat.id === catId ? { ...cat, perguntas: cat.perguntas.filter(p => p.id !== pergId) } : cat
      ),
    }))
  }

  function setPergTextoCategoria(catId, pergId, texto) {
    setConfig(c => ({
      ...c,
      categorias: c.categorias.map(cat =>
        cat.id === catId
          ? { ...cat, perguntas: cat.perguntas.map(p => p.id === pergId ? { ...p, texto } : p) }
          : cat
      ),
    }))
  }

  function restaurarCategoria(catId) {
    const orig = CATEGORIAS_NPS_DEFAULT.find(c => c.id === catId)
    if (!orig) return
    setConfig(c => ({
      ...c,
      categorias: c.categorias.map(cat =>
        cat.id === catId ? { ...cat, perguntas: orig.perguntas.map(p => ({ ...p })) } : cat
      ),
    }))
  }

  return (
    <div className="space-y-4">
      {/* Link */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-navy">Link público da pesquisa</p>
          <p className="text-xs text-muted">Compartilhe com os funcionários da empresa</p>
        </div>
        <button className="btn-secondary text-sm" onClick={() => setModalLink(true)}>
          🔗 Gerar link / QR Code
        </button>
      </div>

      {/* Pergunta NPS fixa */}
      <div className="card border-l-4 border-primary space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Pergunta principal (fixa)</p>
        <p className="text-sm text-navy font-medium">
          "Em uma escala de 0 a 10, o quanto você recomendaria esta empresa como um bom lugar para trabalhar?"
        </p>
      </div>

      {/* Categorias */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted px-1">Categorias complementares</p>
        {(config.categorias ?? []).map((cat, ci) => {
          const base = CATEGORIAS_NPS_DEFAULT.find(c => c.id === cat.id)
          const baseIds = new Set(base?.perguntas.map(p => p.id) ?? [])
          const maxExtra = (base?.perguntas.length ?? 0) + 2
          return (
            <div key={cat.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy">{cat.nome}</h3>
                <button className="text-xs text-muted hover:text-danger transition-colors"
                  onClick={() => restaurarCategoria(cat.id)}>
                  ↺ Restaurar padrão
                </button>
              </div>
              {cat.perguntas.map((p, pi) => (
                <div key={p.id} className="flex gap-2 items-center">
                  <input className="input flex-1 text-sm" value={p.texto}
                    onChange={e => baseIds.has(p.id)
                      ? setTextoCategoria(ci, pi, e.target.value)
                      : setPergTextoCategoria(cat.id, p.id, e.target.value)
                    }
                    placeholder="Texto da pergunta"
                  />
                  {!baseIds.has(p.id) && (
                    <button className="text-muted hover:text-danger"
                      onClick={() => removePergCategoria(cat.id, p.id)}>✕</button>
                  )}
                </div>
              ))}
              {cat.perguntas.length < maxExtra && (
                <button className="text-xs text-primary hover:underline"
                  onClick={() => addPergCategoria(cat.id)}>
                  + Adicionar pergunta
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button className="btn-primary px-6" onClick={onSalvar} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </button>
      </div>

      {modalLink && (
        <Modal title="Link da Pesquisa NPS" onClose={() => setModalLink(false)}>
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
function AbaResultados({ respostas, categorias, setores }) {
  const [filtroMes, setFiltroMes]     = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')

  const meses = [...new Set(respostas.map(r => r.created_at.slice(0, 7)))].sort().reverse()

  const respostasFilt = respostas
    .filter(r => !filtroMes || r.created_at.startsWith(filtroMes))
    .filter(r => !filtroSetor || r.setor_id === filtroSetor)

  const scoreNps    = respostasFilt.length ? calcNps(respostasFilt) : null
  const promotores  = respostasFilt.filter(r => r.nota_nps >= 9).length
  const neutros     = respostasFilt.filter(r => r.nota_nps >= 7 && r.nota_nps <= 8).length
  const detratores  = respostasFilt.filter(r => r.nota_nps <= 6).length
  const total       = respostasFilt.length

  // Distribuição de notas
  const distData = Array.from({ length: 11 }, (_, i) => ({
    nota: String(i),
    qtd: respostasFilt.filter(r => r.nota_nps === i).length,
    cor: i <= 6 ? '#ef4444' : i <= 8 ? '#eab308' : '#22c55e',
  }))

  // Scores por categoria
  const catData = categorias.map(cat => {
    const scores = respostasFilt.flatMap(r =>
      cat.perguntas.map(p => r.respostas?.[cat.id]?.[p.id]).filter(v => typeof v === 'number')
    )
    const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return { nome: cat.nome, score: score ? +score.toFixed(2) : 0 }
  })

  // Evolução mensal
  const evolucaoData = [...new Set(respostas.map(r => r.created_at.slice(0, 7)))]
    .sort()
    .map(mes => ({
      mes: formatMes(mes),
      nps: calcNps(respostas.filter(r => r.created_at.startsWith(mes))),
    }))

  // Comentários recentes
  const comentarios = respostasFilt
    .filter(r => r.comentario)
    .slice(0, 10)
    .map(r => ({ texto: r.comentario, data: r.created_at.slice(0, 10) }))

  if (!respostas.length) return (
    <EmptyState icon="⭐" title="Nenhuma resposta ainda" description="Compartilhe o link da pesquisa NPS para coletar dados." />
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

      {/* Score NPS principal */}
      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-2 text-center">Score NPS</h3>
        {scoreNps != null ? <ScoreNPS score={scoreNps} /> : <p className="text-center text-muted text-sm">—</p>}
      </div>

      {/* 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-black text-navy">{total}</p>
          <p className="text-xs text-muted mt-1">Respondentes</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-green-600">{total ? Math.round(promotores / total * 100) : 0}%</p>
          <p className="text-xs text-muted mt-1">Promotores (9-10)</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-yellow-500">{total ? Math.round(neutros / total * 100) : 0}%</p>
          <p className="text-xs text-muted mt-1">Neutros (7-8)</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-red-600">{total ? Math.round(detratores / total * 100) : 0}%</p>
          <p className="text-xs text-muted mt-1">Detratores (0-6)</p>
        </div>
      </div>

      {/* Distribuição de notas */}
      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-4">Distribuição das notas (0-10)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={distData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="nota" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="qtd" radius={[4, 4, 0, 0]}>
              {distData.map((d, i) => <Cell key={i} fill={d.cor} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Score por categoria */}
      {catData.some(d => d.score > 0) && (
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-4">Score médio por categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={catData} margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => v.toFixed(2)} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {catData.map((d, i) => <Cell key={i} fill={scoreColor(d.score)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Evolução do NPS */}
      {evolucaoData.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-4">Evolução do NPS</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={evolucaoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[-100, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="nps" stroke="#3a7bd5" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comentários recentes */}
      {comentarios.length > 0 && (
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-navy">Comentários recentes</h3>
          {comentarios.map((c, i) => (
            <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
              <p className="text-sm text-navy">{c.texto}</p>
              <p className="text-xs text-muted mt-0.5">{c.data}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comparativo de NPS entre Setores */}
      {setores.length > 1 && !filtroSetor && (() => {
        const setoresComResp = setores
          .map(s => {
            const resp = respostasFilt.filter(r => r.setor_id === s.id)
            if (!resp.length) return null
            const nps = calcNps(resp)
            const prom = resp.filter(r => r.nota_nps >= 9).length
            const neut = resp.filter(r => r.nota_nps >= 7 && r.nota_nps <= 8).length
            const detr = resp.filter(r => r.nota_nps <= 6).length
            return { setor: s, total: resp.length, nps, prom, neut, detr }
          })
          .filter(Boolean)
          .sort((a, b) => (b.nps ?? -200) - (a.nps ?? -200))
        if (setoresComResp.length < 2) return null
        return (
          <div className="card space-y-3">
            <h3 className="text-sm font-bold text-navy">Comparativo de NPS entre Setores</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {setoresComResp.map(({ setor, total, nps, prom, neut, detr }) => (
                <div key={setor.id} className="border border-border rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-navy truncate">{setor.nome}</p>
                  <div className="text-3xl font-black" style={{ color: npsColor(nps ?? 0) }}>
                    {nps != null ? (nps > 0 ? '+' : '') + nps : '—'}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: npsColor(nps ?? 0) }}>{nps != null ? npsLabel(nps) : ''}</p>
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/60">
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-600">{total ? Math.round(prom / total * 100) : 0}%</p>
                      <p className="text-[10px] text-muted">Promo.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-yellow-500">{total ? Math.round(neut / total * 100) : 0}%</p>
                      <p className="text-[10px] text-muted">Neutros</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-red-600">{total ? Math.round(detr / total * 100) : 0}%</p>
                      <p className="text-[10px] text-muted">Detra.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted text-center">{total} respondentes</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function NpsPesquisaPage() {
  const { empresaAtiva } = useEmpresa()
  const empresaId = empresaAtiva?.id

  const [aba, setAba]         = useState('configurar')
  const [config, setConfig]   = useState(null)
  const [respostas, setRespostas] = useState([])
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)

  const carregar = useCallback(async () => {
    if (!empresaId) return
    setLoading(true)
    const [{ data: pesq }, { data: resp }, { data: setsData }] = await Promise.all([
      supabase.from('nps_pesquisas').select('configuracao').eq('empresa_id', empresaId).maybeSingle(),
      supabase.from('nps_respostas').select('nota_nps, respostas, comentario, created_at, setor_id').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      supabase.from('setores').select('id, nome').eq('empresa_id', empresaId).order('nome'),
    ])
    setConfig(pesq?.configuracao ?? configNpsInicial())
    setRespostas(resp ?? [])
    setSetores(setsData ?? [])
    setLoading(false)
  }, [empresaId])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSaving(true)
    const { error } = await supabase.from('nps_pesquisas').upsert(
      { empresa_id: empresaId, configuracao: config, updated_at: new Date().toISOString() },
      { onConflict: 'empresa_id' }
    )
    setSaving(false)
    if (error) setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
    else setToast({ message: 'Configuração salva!', type: 'success' })
  }

  if (!empresaId) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada" description="Selecione uma empresa no topo para acessar a pesquisa NPS." />
  )

  if (loading || !config) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <PageHeader title="Pesquisa de NPS" subtitle={empresaAtiva?.nome} />

      <div className="card border-l-4 border-primary">
        <p className="text-sm text-muted leading-relaxed">
          O <strong className="text-navy">eNPS (Employee Net Promoter Score)</strong> mede lealdade e satisfação dos colaboradores com uma
          pergunta central: "O quanto você recomendaria esta empresa como um bom lugar para trabalhar?" O score varia de
          -100 a +100 e é complementado por perguntas de aprofundamento por categorias. Acompanhe a evolução mensal e
          compare resultados entre setores para identificar tendências e oportunidades de melhoria.
        </p>
      </div>

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
        <AbaResultados respostas={respostas} categorias={config.categorias ?? []} setores={setores} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
