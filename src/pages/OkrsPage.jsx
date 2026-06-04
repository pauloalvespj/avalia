import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { useSetorLocal } from '@/hooks/useSetorLocal'
import { SetorSelect } from '@/components/ui/SetorSelect'
import { PageHeader, EmptyState, LoadingSpinner, Toast, ConfirmModal } from '@/components/ui'
import { Link } from 'react-router-dom'

// ── Seeds ───────────────────────────────────────────────────────────────────

const OKRS_SEED = [
  {
    objetivo: 'Reduzir os riscos psicossociais críticos identificados no diagnóstico',
    krs: [
      'Implementar 100% das ações do plano para riscos críticos',
      'Reduzir score médio dos domínios críticos em 1 ponto em 6 meses',
      'Atingir 80% de participação nas ações de intervenção',
    ],
  },
  {
    objetivo: 'Promover saúde mental e bem-estar dos colaboradores',
    krs: [
      'Reduzir absenteísmo em 20% em 12 meses',
      'Aumentar score de satisfação no trabalho (sf18) de X para Y',
      'Realizar 4 ações de promoção de saúde no período',
    ],
  },
  {
    objetivo: 'Fortalecer a cultura organizacional e liderança',
    krs: [
      'Elevar score de Qualidade da Liderança (sf12) para nível baixo (≤2)',
      'Implementar programa de desenvolvimento de liderança',
      'Reduzir conflitos reportados em 30%',
    ],
  },
]

const KPIS_SEED = [
  { nome: 'Taxa de rotatividade (%)',     baseline: '', atual: '', meta: '' },
  { nome: 'Absenteísmo (dias/mês)',        baseline: '', atual: '', meta: '' },
  { nome: 'Atestados emitidos (qtd/mês)', baseline: '', atual: '', meta: '' },
  { nome: 'Score médio de burnout (sf23)',baseline: '', atual: '', meta: '' },
  { nome: 'Score médio de stress (sf24)', baseline: '', atual: '', meta: '' },
  { nome: 'Satisfação geral (sf18)',      baseline: '', atual: '', meta: '' },
]

// ── Utilidades ──────────────────────────────────────────────────────────────

function mediaProgresso(krs) {
  if (!krs?.length) return 0
  return Math.round(krs.reduce((s, k) => s + (k.progresso ?? 0), 0) / krs.length)
}

// Determina direção do KPI (melhorar = depende do tipo, simplificamos: atual >= meta = bom para scores, atual <= meta = bom para rotatividade)
// Usamos seta simples: se atual >= meta → verde ▲, se atual < meta → vermelho ▼ (para KPIs de melhoria)
// Para os 3 primeiros KPIs (rotatividade, absenteísmo, atestados), menor = melhor.
function setaKpi(nome, atual, meta) {
  if (atual === '' || meta === '' || atual == null || meta == null) return null
  const a = parseFloat(atual)
  const m = parseFloat(meta)
  if (isNaN(a) || isNaN(m)) return null
  const menorMelhor = nome.includes('rotatividade') || nome.includes('Absenteísmo') ||
                      nome.includes('absenteísmo') || nome.includes('Atestados') || nome.includes('atestados')
  const melhorando = menorMelhor ? a <= m : a >= m
  return melhorando ? '▲' : '▼'
}

// ── Componente KR ───────────────────────────────────────────────────────────

function KRRow({ kr, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
      <input type="checkbox"
        className="w-4 h-4 flex-shrink-0 accent-primary cursor-pointer"
        checked={(kr.progresso ?? 0) === 100}
        onChange={e => onChange({ ...kr, progresso: e.target.checked ? 100 : 0 })}
      />
      <input
        className="flex-1 text-sm bg-transparent border-0 outline-none text-navy placeholder-muted
                   focus:bg-bg focus:px-2 focus:rounded-lg transition-all"
        value={kr.texto}
        placeholder="Descreva o key result..."
        onChange={e => onChange({ ...kr, texto: e.target.value })}
      />
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="range" min={0} max={100} step={5}
          value={kr.progresso ?? 0}
          onChange={e => onChange({ ...kr, progresso: Number(e.target.value) })}
          className="w-20 accent-primary"
        />
        <span className="text-xs font-bold text-navy w-8 text-right">{kr.progresso ?? 0}%</span>
      </div>
      <button className="text-muted hover:text-danger transition-colors text-xs px-1"
        onClick={onDelete} title="Remover KR">✕</button>
    </div>
  )
}

// ── Componente OKR ──────────────────────────────────────────────────────────

function OKRCard({ okr, onChangeObjetivo, onChangeKR, onAddKR, onDeleteKR, onDelete }) {
  const pct = mediaProgresso(okr.krs)
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <input
          className="flex-1 font-bold text-navy bg-transparent border-0 outline-none text-base
                     focus:bg-bg focus:px-2 focus:rounded-lg transition-all"
          value={okr.objetivo}
          placeholder="Objetivo..."
          onChange={e => onChangeObjetivo(e.target.value)}
        />
        <button className="text-muted hover:text-danger transition-colors text-sm flex-shrink-0"
          onClick={onDelete} title="Excluir OKR">🗑</button>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#3a7bd5' }} />
        </div>
        <span className="text-xs font-bold text-navy w-8 text-right">{pct}%</span>
      </div>

      {/* Key Results */}
      <div className="mb-3">
        {okr.krs.map((kr, i) => (
          <KRRow key={kr._localId ?? kr.id ?? i} kr={kr}
            onChange={updated => onChangeKR(i, updated)}
            onDelete={() => onDeleteKR(i)} />
        ))}
      </div>

      <button
        className="text-xs text-primary font-semibold hover:underline"
        onClick={onAddKR}>
        + Adicionar Key Result
      </button>
    </div>
  )
}

// ── Componente KPI Table ─────────────────────────────────────────────────────

function KPITable({ kpis, onChange, onAdd, onDelete }) {
  const [editCell, setEditCell] = useState(null) // { row, col }

  function Cell({ row, col, value }) {
    const isEditing = editCell?.row === row && editCell?.col === col
    if (isEditing) {
      return (
        <input
          autoFocus
          className="w-full text-center text-sm border border-primary rounded px-1 py-0.5 outline-none"
          value={value ?? ''}
          onChange={e => onChange(row, col, e.target.value)}
          onBlur={() => setEditCell(null)}
          onKeyDown={e => e.key === 'Enter' && setEditCell(null)}
        />
      )
    }
    return (
      <span className="cursor-pointer hover:text-primary transition-colors"
        onClick={() => setEditCell({ row, col })}>
        {value || <span className="text-muted/50">—</span>}
      </span>
    )
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">KPI</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">Baseline</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">Atual</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">Meta</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">Status</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {kpis.map((kpi, i) => {
            const seta = setaKpi(kpi.nome, kpi.atual, kpi.meta)
            return (
              <tr key={kpi._localId ?? kpi.id ?? i}
                className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors">
                <td className="px-4 py-3">
                  <Cell row={i} col="nome" value={kpi.nome} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Cell row={i} col="baseline" value={kpi.baseline} />
                </td>
                <td className="px-4 py-3 text-center font-semibold text-navy">
                  <Cell row={i} col="atual" value={kpi.atual} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Cell row={i} col="meta" value={kpi.meta} />
                </td>
                <td className="px-4 py-3 text-center">
                  {seta === '▲' && <span className="text-success font-bold text-base">▲</span>}
                  {seta === '▼' && <span className="text-danger  font-bold text-base">▼</span>}
                  {seta === null && <span className="text-muted text-xs">—</span>}
                </td>
                <td className="pr-3 text-center">
                  <button className="text-muted hover:text-danger transition-colors text-xs"
                    onClick={() => onDelete(i)}>✕</button>
                </td>
              </tr>
            )
          })}
          {/* Linha de adicionar */}
          <tr>
            <td colSpan={6} className="px-4 py-2.5">
              <button className="text-xs text-primary font-semibold hover:underline" onClick={onAdd}>
                + Adicionar KPI
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

let _localIdCounter = 1
function localId() { return `_local_${_localIdCounter++}` }

export default function OkrsPage() {
  const { empresaAtiva } = useEmpresa()
  const { setores, setorId, setSetorId, nomeSetor } = useSetorLocal(empresaAtiva)

  const [okrs, setOkrs]       = useState([])    // [{ id, _localId, objetivo, krs: [...] }]
  const [kpis, setKpis]       = useState([])
  const [loading, setLoading] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [deletingOkr, setDeletingOkr] = useState(null)
  const [toast, setToast]     = useState(null)
  const debounceOkr = useRef({})
  const debounceKpi = useRef({})

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!setorId) return
    setLoading(true)

    const [{ data: okrsData }, { data: krsData }, { data: kpisData }] = await Promise.all([
      supabase.from('okrs').select('id, objetivo, prazo').eq('setor_id', setorId).order('created_at'),
      supabase.from('key_results').select('id, okr_id, texto, progresso').order('created_at'),
      supabase.from('kpis').select('id, nome, baseline, atual, meta').eq('setor_id', setorId).order('created_at'),
    ])

    // Monta OKRs com seus KRs
    if (okrsData?.length) {
      const lista = okrsData.map(o => ({
        ...o,
        _localId: localId(),
        krs: (krsData ?? []).filter(k => k.okr_id === o.id).map(k => ({ ...k, _localId: localId() })),
      }))
      setOkrs(lista)
    } else {
      // Seed automático
      await seedOkrs(setorId)
      return
    }

    if (kpisData?.length) {
      setKpis(kpisData.map(k => ({ ...k, _localId: localId() })))
    } else {
      await seedKpis(setorId)
      return
    }

    setLoading(false)
  }, [setorId])

  useEffect(() => { load() }, [load])

  // ── Seeds ─────────────────────────────────────────────────────────────────

  async function seedOkrs(setorId) {
    for (const seed of OKRS_SEED) {
      const { data: okr, error } = await supabase
        .from('okrs').insert({ setor_id: setorId, objetivo: seed.objetivo }).select('id').single()
      if (error || !okr) continue
      await supabase.from('key_results').insert(
        seed.krs.map(texto => ({ okr_id: okr.id, texto, progresso: 0 }))
      )
    }
    load()
  }

  async function seedKpis(setorId) {
    await supabase.from('kpis').insert(
      KPIS_SEED.map(k => ({ ...k, setor_id: setorId }))
    )
    load()
  }

  // ── Auto-save OKR ─────────────────────────────────────────────────────────

  function agendarSaveOkr(okr) {
    const key = okr.id ?? okr._localId
    if (debounceOkr.current[key]) clearTimeout(debounceOkr.current[key])
    debounceOkr.current[key] = setTimeout(() => persistirOkr(okr), 1000)
  }

  async function persistirOkr(okr) {
    if (!okr.id) return
    const { error } = await supabase.from('okrs').update({ objetivo: okr.objetivo }).eq('id', okr.id)
    if (error) { setToast({ message: 'Erro ao salvar OKR: ' + error.message, type: 'error' }); return }
    for (const kr of okr.krs) {
      if (kr.id) {
        await supabase.from('key_results').update({ texto: kr.texto, progresso: kr.progresso }).eq('id', kr.id)
      } else {
        const { data } = await supabase.from('key_results')
          .insert({ okr_id: okr.id, texto: kr.texto, progresso: kr.progresso ?? 0 }).select('id').single()
        if (data) {
          setOkrs(prev => prev.map(o => o.id === okr.id
            ? { ...o, krs: o.krs.map(k => k._localId === kr._localId ? { ...k, id: data.id } : k) }
            : o))
        }
      }
    }
    flashSaved()
  }

  // ── Auto-save KPI ─────────────────────────────────────────────────────────

  function agendarSaveKpi(kpi) {
    const key = kpi.id ?? kpi._localId
    if (debounceKpi.current[key]) clearTimeout(debounceKpi.current[key])
    debounceKpi.current[key] = setTimeout(() => persistirKpi(kpi), 1000)
  }

  async function persistirKpi(kpi) {
    if (kpi.id) {
      await supabase.from('kpis')
        .update({ nome: kpi.nome, baseline: kpi.baseline, atual: kpi.atual, meta: kpi.meta })
        .eq('id', kpi.id)
    } else {
      const { data } = await supabase.from('kpis')
        .insert({ setor_id: setorId, nome: kpi.nome, baseline: kpi.baseline, atual: kpi.atual, meta: kpi.meta })
        .select('id').single()
      if (data) {
        setKpis(prev => prev.map(k => k._localId === kpi._localId ? { ...k, id: data.id } : k))
      }
    }
    flashSaved()
  }

  function flashSaved() {
    setSavedMsg('Salvo ✓')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  // ── Mutações OKR ─────────────────────────────────────────────────────────

  function handleObjetivo(idx, valor) {
    const updated = okrs.map((o, i) => i === idx ? { ...o, objetivo: valor } : o)
    setOkrs(updated)
    agendarSaveOkr(updated[idx])
  }

  function handleKR(okrIdx, krIdx, kr) {
    const updated = okrs.map((o, i) => i === okrIdx
      ? { ...o, krs: o.krs.map((k, j) => j === krIdx ? kr : k) }
      : o)
    setOkrs(updated)
    agendarSaveOkr(updated[okrIdx])
  }

  function handleAddKR(okrIdx) {
    const novoKr = { _localId: localId(), texto: '', progresso: 0 }
    const updated = okrs.map((o, i) => i === okrIdx ? { ...o, krs: [...o.krs, novoKr] } : o)
    setOkrs(updated)
    agendarSaveOkr(updated[okrIdx])
  }

  async function handleDeleteKR(okrIdx, krIdx) {
    const kr = okrs[okrIdx].krs[krIdx]
    if (kr.id) await supabase.from('key_results').delete().eq('id', kr.id)
    setOkrs(prev => prev.map((o, i) => i === okrIdx
      ? { ...o, krs: o.krs.filter((_, j) => j !== krIdx) }
      : o))
  }

  async function handleAddOkr() {
    const { data, error } = await supabase.from('okrs')
      .insert({ setor_id: setorId, objetivo: '' }).select('id').single()
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setOkrs(prev => [...prev, { id: data.id, _localId: localId(), objetivo: '', krs: [] }])
  }

  async function handleDeleteOkr(okr) {
    if (okr.id) {
      await supabase.from('key_results').delete().eq('okr_id', okr.id)
      await supabase.from('okrs').delete().eq('id', okr.id)
    }
    setOkrs(prev => prev.filter(o => (o._localId ?? o.id) !== (okr._localId ?? okr.id)))
    setDeletingOkr(null)
  }

  // ── Mutações KPI ──────────────────────────────────────────────────────────

  function handleKpiChange(idx, col, valor) {
    const updated = kpis.map((k, i) => i === idx ? { ...k, [col]: valor } : k)
    setKpis(updated)
    agendarSaveKpi(updated[idx])
  }

  function handleAddKpi() {
    setKpis(prev => [...prev, { _localId: localId(), nome: '', baseline: '', atual: '', meta: '' }])
  }

  async function handleDeleteKpi(idx) {
    const kpi = kpis[idx]
    if (kpi.id) await supabase.from('kpis').delete().eq('id', kpi.id)
    setKpis(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Selecione uma empresa"
      description="Use o menu superior para selecionar uma empresa."
      action={<Link to="/empresas" className="btn-primary">Ir para Empresas</Link>} />
  )

  if (loading) return <LoadingSpinner />

  if (!setorId) return (
    <div>
      <SetorSelect setores={setores} setorId={setorId} onChange={id => { setSetorId(id); setOkrs([]); setKpis([]) }} />
      <div className="card text-center py-10 text-muted text-sm">Selecione um setor acima para ver os OKRs e KPIs.</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <SetorSelect setores={setores} setorId={setorId} onChange={id => { setSetorId(id); setOkrs([]); setKpis([]) }} />
      <PageHeader
        title="OKRs e KPIs"
        subtitle={nomeSetor}
        action={savedMsg
          ? <span className="text-xs text-success font-semibold">{savedMsg}</span>
          : null}
      />

      {/* ── OKRs ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-navy">🎯 OKRs</h2>
          <button className="btn-primary text-xs py-1.5 px-3" onClick={handleAddOkr}>
            + Novo OKR
          </button>
        </div>

        {!okrs.length ? (
          <EmptyState icon="🎯" title="Nenhum OKR" description="Clique em '+ Novo OKR' para começar." />
        ) : (
          <div className="space-y-4">
            {okrs.map((okr, i) => (
              <OKRCard key={okr._localId ?? okr.id}
                okr={okr}
                onChangeObjetivo={v => handleObjetivo(i, v)}
                onChangeKR={(j, kr) => handleKR(i, j, kr)}
                onAddKR={() => handleAddKR(i)}
                onDeleteKR={j => handleDeleteKR(i, j)}
                onDelete={() => setDeletingOkr(okr)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div>
        <h2 className="text-base font-black text-navy mb-3">📊 KPIs</h2>
        <KPITable
          kpis={kpis}
          onChange={handleKpiChange}
          onAdd={handleAddKpi}
          onDelete={handleDeleteKpi}
        />
      </div>

      {deletingOkr && (
        <ConfirmModal title="Excluir OKR" danger
          message={`Excluir o OKR "${deletingOkr.objetivo || 'sem título'}" e todos os seus Key Results?`}
          confirmLabel="Excluir"
          onConfirm={() => handleDeleteOkr(deletingOkr)}
          onClose={() => setDeletingOkr(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
