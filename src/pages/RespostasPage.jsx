import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PERGUNTAS, scoreResposta, calcularRiscos, nivelRisco } from '@/lib/perguntas'
import { PageHeader, EmptyState, LoadingSpinner, Toast, ConfirmModal, Modal } from '@/components/ui'

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const NIVEL_BADGE = {
  baixo:   { label: 'Baixo',   bg: '#dcfce7', color: '#166534' },
  médio:   { label: 'Médio',   bg: '#fef9c3', color: '#854d0e' },
  alto:    { label: 'Alto',    bg: '#ffedd5', color: '#9a3412' },
  crítico: { label: 'Crítico', bg: '#fee2e2', color: '#991b1b' },
}

function ScoreBadge({ respostas }) {
  const score = scoreResposta(respostas)
  if (score == null) return <span className="text-muted text-xs">—</span>
  const nivel = nivelRisco(score)
  const { label, bg, color } = NIVEL_BADGE[nivel]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}>
      {score.toFixed(1)} · {label}
    </span>
  )
}

// Modal que permite percorrer todas as 41 respostas de um questionário
function ModalRespostas({ resposta, idx, total, onPrev, onNext, onClose }) {
  const [blocoAtual, setBlocoAtual] = useState(1)
  const blocos = [...new Set(PERGUNTAS.map(p => p.bloco))]
  const perguntasBloco = PERGUNTAS.filter(p => p.bloco === blocoAtual)
  const blocoNome = PERGUNTAS.find(p => p.bloco === blocoAtual)?.blocoNome

  const OPTS_LABEL = { 1: 'Nunca/Quase nunca', 2: 'Raramente', 3: 'Às vezes', 4: 'Frequentemente', 5: 'Sempre' }

  return (
    <Modal title={`Resposta #${idx + 1} de ${total}`} onClose={onClose} size="lg">
      <div className="space-y-4">

        {/* Info */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{formatarData(resposta.created_at)}</span>
          <ScoreBadge respostas={resposta.respostas} />
        </div>

        {/* Navegação entre respostas */}
        <div className="flex gap-2">
          <button className="btn-secondary text-xs px-3 py-1.5 flex-1" onClick={onPrev} disabled={idx === 0}>
            ← Anterior
          </button>
          <button className="btn-secondary text-xs px-3 py-1.5 flex-1" onClick={onNext} disabled={idx === total - 1}>
            Próxima →
          </button>
        </div>

        {/* Tabs de bloco */}
        <div className="flex gap-1 flex-wrap">
          {blocos.map(b => {
            const nome = PERGUNTAS.find(p => p.bloco === b)?.blocoNome ?? `Bloco ${b}`
            return (
              <button key={b} onClick={() => setBlocoAtual(b)}
                className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                style={blocoAtual === b
                  ? { background: '#1a2e4a', color: '#fff', borderColor: '#1a2e4a' }
                  : { background: '#f4f6fa', color: '#64748b', borderColor: '#e2e8f0' }}>
                {b}. {nome.split(' ')[0]}
              </button>
            )
          })}
        </div>

        {/* Perguntas do bloco */}
        <div className="text-xs font-bold text-muted uppercase tracking-wide">{blocoNome}</div>
        <div className="space-y-3">
          {perguntasBloco.map((p, i) => {
            const val = resposta.respostas?.[p.id]
            const label = val != null
              ? (p.opts.find(o => o.v === val)?.t ?? val)
              : 'Não respondida'
            const semResposta = val == null
            return (
              <div key={p.id} className="flex gap-3 items-start py-2 border-b border-border last:border-0">
                <span className="text-muted text-xs w-5 flex-shrink-0 pt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-navy">{p.texto}</p>
                  <span className={`text-xs font-semibold mt-1 inline-block ${semResposta ? 'text-danger' : 'text-primary'}`}>
                    {semResposta ? '—' : label}
                    {val != null && <span className="text-muted font-normal ml-1">({val})</span>}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </Modal>
  )
}

export default function RespostasPage() {
  const { empresaAtiva } = useEmpresa()

  const [setores, setSetores]         = useState([])
  const [setorFiltro, setSetorFiltro] = useState('todos') // 'todos' ou id do setor
  const [respostas, setRespostas]     = useState([])
  const [loading, setLoading]         = useState(false)
  const [calculando, setCalculando]   = useState(false)
  const [deleting, setDeleting]       = useState(null)
  const [visualizando, setVisualizando] = useState(null)
  const [toast, setToast]             = useState(null)

  // Carrega lista de setores quando muda empresa
  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); return }
    supabase.from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id).order('nome')
      .then(({ data }) => setSetores(data ?? []))
  }, [empresaAtiva])

  const load = useCallback(async () => {
    if (!empresaAtiva) return
    setLoading(true)
    let query = supabase
      .from('respostas_publicas')
      .select('id, setor_id, respostas, created_at')
      .order('created_at', { ascending: false })

    if (setorFiltro === 'todos') {
      // Busca todos os setores da empresa
      const ids = setores.map(s => s.id)
      if (!ids.length) { setRespostas([]); setLoading(false); return }
      query = query.in('setor_id', ids)
    } else {
      query = query.eq('setor_id', setorFiltro)
    }

    const { data, error } = await query
    if (error) setToast({ message: 'Erro ao carregar: ' + error.message, type: 'error' })
    setRespostas(data ?? [])
    setLoading(false)
  }, [empresaAtiva, setorFiltro, setores])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    if (!empresaAtiva) return
    const channel = supabase
      .channel(`respostas-empresa-${empresaAtiva.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'respostas_publicas' },
        () => load()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [empresaAtiva, load])

  async function handleDelete(id) {
    const { error } = await supabase.from('respostas_publicas').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro ao remover: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Resposta removida.', type: 'info' })
    load()
  }

  const nomeSetor = setorFiltro === 'todos'
    ? 'Todos'
    : setores.find(s => s.id === setorFiltro)?.nome ?? ''

  function baixarPlanilha() {
    const mostraTodos = setorFiltro === 'todos'
    const cabecalho = [
      '#',
      ...(mostraTodos ? ['Setor'] : []),
      'Data/Hora',
      'Score Médio',
      ...PERGUNTAS.map(p => `${p.id} - ${p.texto.slice(0, 60).replace(/,/g, ';')}`),
    ]

    const linhas = respostas.map((r, i) => {
      const score = scoreResposta(r.respostas)
      const setor = setores.find(s => s.id === r.setor_id)?.nome ?? ''
      return [
        i + 1,
        ...(mostraTodos ? [setor] : []),
        formatarData(r.created_at),
        score != null ? score.toFixed(2) : '',
        ...PERGUNTAS.map(p => r.respostas?.[p.id] ?? ''),
      ]
    })

    const csv = [cabecalho, ...linhas]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `respostas_${nomeSetor.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function calcularEUpsert() {
    if (setorFiltro === 'todos') {
      setToast({ message: 'Selecione um setor específico para calcular riscos.', type: 'info' })
      return
    }
    if (!respostas.length) {
      setToast({ message: 'Nenhuma resposta para calcular.', type: 'info' })
      return
    }
    setCalculando(true)
    const resultados = calcularRiscos(respostas)
    const upserts = resultados.map(r => ({ ...r, setor_id: setorFiltro }))

    const { error } = await supabase
      .from('riscos')
      .upsert(upserts, { onConflict: 'setor_id,fator' })

    setCalculando(false)
    if (error) { setToast({ message: 'Erro ao calcular: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Riscos calculados e salvos com sucesso!', type: 'success' })
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior." />
  )

  return (
    <div>
      {/* Filtro de setor */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-semibold text-navy whitespace-nowrap">Setor:</label>
        <select
          className="input py-2 text-sm w-auto"
          value={setorFiltro}
          onChange={e => setSetorFiltro(e.target.value)}
        >
          <option value="todos">Todos</option>
          {setores.map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>

      <PageHeader
        title="Respostas"
        subtitle={`${nomeSetor} · ${respostas.length} resposta${respostas.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={baixarPlanilha} disabled={!respostas.length}
              title="Baixar planilha CSV com todas as respostas">
              ⬇️ Planilha
            </button>
            <button className="btn-primary" onClick={calcularEUpsert} disabled={calculando || !respostas.length}>
              {calculando ? 'Calculando...' : '⚠️ Calcular riscos'}
            </button>
          </div>
        }
      />

      {loading ? <LoadingSpinner /> : !respostas.length ? (
        <EmptyState icon="📋" title="Nenhuma resposta registrada"
          description="Compartilhe o link do questionário com os colaboradores para coletar respostas. A lista atualiza automaticamente." />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">#</th>
                {setorFiltro === 'todos' && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Setor</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Data / Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Score médio</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {respostas.map((r, i) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors">
                  <td className="px-4 py-3 text-muted font-mono text-xs">{i + 1}</td>
                  {setorFiltro === 'todos' && (
                    <td className="px-4 py-3 text-xs text-muted">
                      {setores.find(s => s.id === r.setor_id)?.nome ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-navy whitespace-nowrap">{formatarData(r.created_at)}</td>
                  <td className="px-4 py-3"><ScoreBadge respostas={r.respostas} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-1.5"
                        onClick={() => setVisualizando(i)}
                      >
                        Ver
                      </button>
                      <button
                        className="btn-danger text-xs px-3 py-1.5"
                        onClick={() => setDeleting(r)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visualizando != null && (
        <ModalRespostas
          resposta={respostas[visualizando]}
          idx={visualizando}
          total={respostas.length}
          onPrev={() => setVisualizando(i => Math.max(0, i - 1))}
          onNext={() => setVisualizando(i => Math.min(respostas.length - 1, i + 1))}
          onClose={() => setVisualizando(null)}
        />
      )}

      {deleting && (
        <ConfirmModal title="Remover resposta" danger
          message={`Remover a resposta #${respostas.indexOf(deleting) + 1} (${formatarData(deleting.created_at)})? Esta ação não pode ser desfeita.`}
          confirmLabel="Remover"
          onConfirm={() => handleDelete(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
