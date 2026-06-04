import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { useSetorLocal } from '@/hooks/useSetorLocal'
import { SetorSelect } from '@/components/ui/SetorSelect'
import { PageHeader, EmptyState, LoadingSpinner, Toast } from '@/components/ui'
import { Link } from 'react-router-dom'

// ── Seed ─────────────────────────────────────────────────────────────────────

const FASES_SEED = [
  {
    fase: 1, nome: 'Contratação e Kick-off',
    itens: [
      'Contrato assinado e briefing realizado',
      'Questionário configurado para a empresa',
      'Link do questionário enviado aos colaboradores',
    ],
  },
  {
    fase: 2, nome: 'Diagnóstico Quantitativo',
    itens: [
      'Mínimo de 5 respostas coletadas',
      'Dados importados e riscos calculados',
      'Avaliação de riscos revisada pelo consultor',
    ],
  },
  {
    fase: 3, nome: 'Diagnóstico Qualitativo',
    itens: [
      'Entrevistas de escuta realizadas',
      'Escuta da equipe preenchida no sistema',
      'Diagnóstico final elaborado',
    ],
  },
  {
    fase: 4, nome: 'Plano de Ação',
    itens: [
      'Devolutiva para a gestão realizada',
      'Plano de ação construído com a empresa',
      'Responsáveis e prazos definidos',
    ],
  },
  {
    fase: 5, nome: 'Implementação',
    itens: [
      'Ações do plano em andamento',
      'Monitoramento mensal iniciado',
    ],
  },
  {
    fase: 6, nome: 'Avaliação e Encerramento',
    itens: [
      'Relatório final entregue',
      'Avaliação de efetividade realizada',
    ],
  },
]

const TOTAL_ITENS = FASES_SEED.reduce((s, f) => s + f.itens.length, 0) // 16

// ── Utilitários ───────────────────────────────────────────────────────────────

function pct(ok, total) {
  return total ? Math.round((ok / total) * 100) : 0
}

// ── Componente de item ────────────────────────────────────────────────────────

function CheckItem({ item, onToggle, onField }) {
  const [expandido, setExpandido] = useState(!!item.observacao)

  return (
    <div className={`rounded-xl border transition-colors ${item.concluido ? 'border-success/30 bg-success/5' : 'border-border bg-white'}`}>
      {/* Linha principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={!!item.concluido}
          onChange={() => onToggle(item)}
          className="w-4 h-4 flex-shrink-0 accent-primary cursor-pointer"
        />

        {/* Número + texto */}
        <span className={`flex-1 text-sm select-none cursor-pointer ${item.concluido ? 'line-through text-muted' : 'text-navy font-medium'}`}
          onClick={() => onToggle(item)}>
          <span className="text-muted font-normal mr-1.5">{item.ordem}.</span>
          {item.texto}
        </span>

        {/* Semana prevista */}
        <input
          type="text"
          placeholder="Sem. —"
          value={item.semana_prevista ?? ''}
          onChange={e => onField(item, 'semana_prevista', e.target.value)}
          className="w-20 text-xs text-center border border-border rounded-lg px-2 py-1 outline-none
                     focus:border-primary bg-transparent text-muted placeholder-muted/50"
        />

        {/* Botão observação */}
        <button
          onClick={() => setExpandido(v => !v)}
          title="Observação"
          className={`text-xs px-2 py-1 rounded-lg transition-colors flex-shrink-0
            ${expandido ? 'bg-primary text-white' : 'text-muted hover:text-navy hover:bg-bg'}`}>
          💬
        </button>
      </div>

      {/* Campo de observação */}
      {expandido && (
        <div className="px-4 pb-3">
          <textarea
            rows={2}
            placeholder="Observações sobre esta etapa..."
            value={item.observacao ?? ''}
            onChange={e => onField(item, 'observacao', e.target.value)}
            className="w-full text-xs border border-border rounded-xl px-3 py-2 resize-none outline-none
                       focus:border-primary bg-white text-navy placeholder-muted/60"
          />
        </div>
      )}
    </div>
  )
}

// ── Componente de fase ────────────────────────────────────────────────────────

function FaseCard({ fase, itens, faseAtual, onToggle, onField }) {
  const ok        = itens.filter(i => i.concluido).length
  const total     = itens.length
  const progresso = pct(ok, total)
  const isAtual   = fase.fase === faseAtual

  return (
    <div className={`card p-0 overflow-hidden ${isAtual ? 'ring-2 ring-primary' : ''}`}>
      {/* Cabeçalho da fase */}
      <div className="px-5 py-3.5 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
              style={{ background: isAtual ? '#3a7bd5' : '#94a3b8' }}>
              Fase {fase.fase}
            </span>
            <span className={`text-sm font-bold ${isAtual ? 'text-primary' : 'text-navy'}`}>
              {fase.nome}
            </span>
            {isAtual && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary">
                Fase atual
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-navy">{ok}/{total} · {progresso}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progresso}%`,
              background: progresso === 100 ? '#22c55e' : isAtual ? '#3a7bd5' : '#94a3b8',
            }} />
        </div>
      </div>

      {/* Itens */}
      <div className="px-4 py-3 space-y-2">
        {itens.map(item => (
          <CheckItem key={item.id} item={item} onToggle={onToggle} onField={onField} />
        ))}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const { empresaAtiva } = useEmpresa()
  const { setores, setorId, setSetorId, nomeSetor } = useSetorLocal(empresaAtiva)

  const [itens, setItens]     = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast]     = useState(null)
  const debounceRef           = useRef({})

  const load = useCallback(async () => {
    if (!setorId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('checklist_itens')
      .select('id, setor_id, fase, ordem, texto, concluido, semana_prevista, observacao')
      .eq('setor_id', setorId)
      .order('ordem')
    if (error) {
      setToast({ message: 'Erro ao carregar: ' + error.message, type: 'error' })
      setLoading(false)
      return
    }
    if (!data?.length) {
      await seed(setorId)
    } else {
      setItens(data)
      setLoading(false)
    }
  }, [setorId])

  useEffect(() => { load() }, [load])

  async function seed(setorId) {
    let ordem = 1
    const rows = []
    for (const fase of FASES_SEED) {
      for (const texto of fase.itens) {
        rows.push({ setor_id: setorId, fase: fase.fase, ordem: ordem++, texto, concluido: false })
      }
    }
    const { error } = await supabase.from('checklist_itens').insert(rows)
    if (error) setToast({ message: 'Erro ao criar checklist: ' + error.message, type: 'error' })
    load()
  }

  // Toggle imediato
  async function handleToggle(item) {
    const novoConcluido = !item.concluido
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, concluido: novoConcluido } : i))
    const { error } = await supabase
      .from('checklist_itens').update({ concluido: novoConcluido }).eq('id', item.id)
    if (error) {
      setItens(prev => prev.map(i => i.id === item.id ? { ...i, concluido: item.concluido } : i))
      setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
    }
  }

  // Campo de texto com debounce
  function handleField(item, campo, valor) {
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, [campo]: valor } : i))
    const key = `${item.id}_${campo}`
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(async () => {
      const { error } = await supabase
        .from('checklist_itens').update({ [campo]: valor }).eq('id', item.id)
      if (error) setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
    }, 1000)
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Selecione uma empresa"
      description="Use o menu superior para selecionar uma empresa."
      action={<Link to="/empresas" className="btn-primary">Ir para Empresas</Link>} />
  )

  if (loading) return <LoadingSpinner />

  if (!setorId) return (
    <div>
      <SetorSelect setores={setores} setorId={setorId} onChange={id => { setSetorId(id); setItens([]) }} />
      <div className="card text-center py-10 text-muted text-sm">Selecione um setor acima para ver o checklist.</div>
    </div>
  )

  // Métricas globais
  const totalConcluidos = itens.filter(i => i.concluido).length
  const totalItens      = itens.length || TOTAL_ITENS
  const progGeral       = pct(totalConcluidos, totalItens)

  // Fase atual = primeira fase que ainda tem itens pendentes
  const faseAtual = FASES_SEED.find(f =>
    itens.filter(i => i.fase === f.fase).some(i => !i.concluido)
  )?.fase ?? FASES_SEED.length

  return (
    <div className="space-y-5">
      <SetorSelect setores={setores} setorId={setorId} onChange={id => { setSetorId(id); setItens([]) }} />
      <PageHeader title="Checklist do Projeto" subtitle={nomeSetor} />

      {/* ── Barra de progresso geral ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-navy">
            {totalConcluidos} de {totalItens} etapas concluídas
          </span>
          <span className="text-lg font-black text-navy">{progGeral}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progGeral}%`,
              background: progGeral === 100
                ? '#22c55e'
                : `linear-gradient(90deg, #3a7bd5 ${progGeral}%, #5a96e8 100%)`,
            }} />
        </div>
        {progGeral === 100 && (
          <p className="text-sm font-bold text-success mt-2 text-center">
            ✅ Projeto concluído! Todas as etapas foram finalizadas.
          </p>
        )}
      </div>

      {/* ── Fases ── */}
      <div className="space-y-4">
        {FASES_SEED.map(fase => {
          const itensFase = itens.filter(i => i.fase === fase.fase)
          return (
            <FaseCard
              key={fase.fase}
              fase={fase}
              itens={itensFase}
              faseAtual={faseAtual}
              onToggle={handleToggle}
              onField={handleField}
            />
          )
        })}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
