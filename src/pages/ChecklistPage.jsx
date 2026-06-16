import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { EmptyState, LoadingSpinner, Toast } from '@/components/ui'
import { Link } from 'react-router-dom'

// ── Definição das fases e itens padrão ───────────────────────────────────────
const FASES = [
  {
    fase: 1, nome: 'Contratação e Kick-off',
    itens: [
      { ordem: 1,  texto: 'Proposta e contrato assinado' },
      { ordem: 2,  texto: 'Reunião de kick-off realizada' },
      { ordem: 3,  texto: 'Escopo dos setores definido' },
    ],
  },
  {
    fase: 2, nome: 'Diagnóstico Quantitativo',
    itens: [
      { ordem: 4,  texto: 'Questionários enviados aos colaboradores' },
      { ordem: 5,  texto: 'Coleta encerrada (mín. 70% de resposta)' },
      { ordem: 6,  texto: 'Respostas importadas e avaliação calculada' },
    ],
  },
  {
    fase: 3, nome: 'Diagnóstico Qualitativo',
    itens: [
      { ordem: 7,  texto: 'Escuta da equipe realizada' },
      { ordem: 8,  texto: 'Entrevistas com lideranças concluídas' },
      { ordem: 9,  texto: 'Diagnóstico final elaborado' },
    ],
  },
  {
    fase: 4, nome: 'Plano de Ação',
    itens: [
      { ordem: 10, texto: 'Plano de ação apresentado à gestão' },
      { ordem: 11, texto: 'Responsáveis por cada ação definidos' },
      { ordem: 12, texto: 'OKRs e KPIs pactuados' },
    ],
  },
  {
    fase: 5, nome: 'Implementação',
    itens: [
      { ordem: 13, texto: 'Primeiras ações implementadas' },
      { ordem: 14, texto: 'Check-in intermediário realizado' },
    ],
  },
  {
    fase: 6, nome: 'Avaliação e Encerramento',
    itens: [
      { ordem: 15, texto: 'Reavaliação de indicadores' },
      { ordem: 16, texto: 'Relatório final entregue' },
    ],
  },
]

const TOTAL = FASES.reduce((s, f) => s + f.itens.length, 0)

// ── Componente de fase ────────────────────────────────────────────────────────
function FaseBloco({ fase, itens, onToggle, onSemana }) {
  const ok    = itens.filter(i => i.concluido).length
  const total = itens.length

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: '#1a2e4a' }}>
        <span className="text-sm font-bold text-white">
          Fase {fase.fase} — {fase.nome}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: ok === total ? '#22c55e' : 'rgba(255,255,255,0.15)', color: '#fff' }}>
          {ok}/{total}
        </span>
      </div>

      <div className="bg-white divide-y divide-border">
        {itens.map(item => (
          <div key={item.id ?? item.ordem}
            className={`flex items-center gap-3 px-4 py-3 transition-colors
              ${item.concluido ? 'bg-success/5' : ''}`}>
            <input
              type="checkbox"
              checked={!!item.concluido}
              onChange={() => onToggle(item)}
              className="w-4 h-4 flex-shrink-0 accent-primary cursor-pointer"
            />
            <span className={`flex-1 text-sm select-none cursor-pointer
              ${item.concluido ? 'line-through text-muted' : 'text-navy'}`}
              onClick={() => onToggle(item)}>
              {item.texto}
            </span>
            <input
              type="text"
              placeholder="S—"
              value={item.semana_prevista ?? ''}
              onChange={e => onSemana(item, e.target.value)}
              className="w-12 text-center text-xs border border-border rounded-lg px-1.5 py-1
                         outline-none focus:border-primary bg-bg text-muted placeholder-muted/40"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ChecklistPage() {
  const { empresaAtiva } = useEmpresa()

  const [itens, setItens]     = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)
  const debounceRef           = useRef({})

  const load = useCallback(async () => {
    if (!empresaAtiva?.id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('checklist_itens')
      .select('id, fase, ordem, texto, concluido, semana_prevista, observacao')
      .eq('empresa_id', empresaAtiva.id)
      .order('fase', { ascending: true })
      .order('ordem', { ascending: true })

    if (error) {
      setToast({ message: 'Erro ao carregar checklist: ' + error.message, type: 'error' })
      setLoading(false)
      return
    }

    if (!data?.length) {
      await seed(empresaAtiva.id)
      return
    }

    // Deduplica: mantém apenas um item por (fase, ordem)
    const vistos = new Set()
    const dedup  = []
    for (const item of data) {
      const chave = `${item.fase}-${item.ordem}`
      if (!vistos.has(chave)) { vistos.add(chave); dedup.push(item) }
    }
    setItens(dedup)
    setLoading(false)
  }, [empresaAtiva])

  useEffect(() => { load() }, [load])

  async function seed(empresaId) {
    const rows = FASES.flatMap(f =>
      f.itens.map(i => ({
        empresa_id: empresaId,
        fase:       f.fase,
        ordem:      i.ordem,
        texto:      i.texto,
        concluido:  false,
      }))
    )
    const { error } = await supabase.from('checklist_itens').insert(rows)
    if (error) {
      setToast({ message: 'Erro ao criar checklist: ' + error.message, type: 'error' })
      setLoading(false)
      return
    }
    load()
  }

  async function handleToggle(item) {
    const novo = !item.concluido
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, concluido: novo } : i))
    const { error } = await supabase
      .from('checklist_itens').update({ concluido: novo }).eq('id', item.id)
    if (error) {
      setItens(prev => prev.map(i => i.id === item.id ? { ...i, concluido: item.concluido } : i))
      setToast({ message: 'Erro: ' + error.message, type: 'error' })
    }
  }

  function handleSemana(item, valor) {
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, semana_prevista: valor } : i))
    const key = `semana_${item.id}`
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(async () => {
      await supabase.from('checklist_itens').update({ semana_prevista: valor }).eq('id', item.id)
    }, 1000)
  }

  async function salvarTudo() {
    if (!itens.length) return
    setSaving(true)
    await Promise.all(
      itens.map(i =>
        supabase.from('checklist_itens')
          .update({ concluido: i.concluido, semana_prevista: i.semana_prevista ?? null })
          .eq('id', i.id)
      )
    )
    setSaving(false)
    setToast({ message: 'Checklist salvo!', type: 'success' })
  }

  if (!empresaAtiva?.id) return (
    <EmptyState icon="🏢" title="Selecione uma empresa"
      description="Use o menu superior para selecionar uma empresa."
      action={<Link to="/empresas" className="btn-primary">Ir para Empresas</Link>} />
  )

  if (loading) return <LoadingSpinner />

  const totalConcluidos = itens.filter(i => i.concluido).length
  const progPct         = TOTAL ? Math.round((totalConcluidos / TOTAL) * 100) : 0

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: '#3a7bd5' }}>
            {empresaAtiva.nome}
          </p>
          <h1 className="text-xl font-black text-navy">✅ Checklist do Projeto</h1>
          <p className="text-sm text-muted mt-0.5">Acompanhamento geral da empresa</p>
        </div>
        <button className="btn-primary flex-shrink-0" onClick={salvarTudo} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="card py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-navy">
            {totalConcluidos} de {TOTAL} etapas concluídas
          </span>
          <span className="text-lg font-black text-navy">{progPct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progPct}%`,
              background: progPct === 100 ? '#22c55e' : '#3a7bd5',
            }} />
        </div>
        {progPct === 100 && (
          <p className="text-sm font-bold text-success mt-2 text-center">
            ✅ Projeto concluído!
          </p>
        )}
      </div>

      {/* Fases */}
      {FASES.map(fase => {
        const itensFase = itens.filter(i => i.fase === fase.fase)
        if (!itensFase.length) return null
        return (
          <FaseBloco
            key={fase.fase}
            fase={fase}
            itens={itensFase}
            onToggle={handleToggle}
            onSemana={handleSemana}
          />
        )
      })}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
