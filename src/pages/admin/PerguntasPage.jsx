import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PERGUNTAS } from '@/lib/perguntas'
import { PageHeader, Toast, ConfirmModal } from '@/components/ui'

const BLOCO_PREFIXO = { 1:'EL', 2:'OT', 3:'RS', 4:'VA', 5:'PE', 6:'IT', 7:'SB', 8:'CO' }

function codigoPergunta(p) {
  const num = parseInt(p.id.replace('q', ''), 10)
  return `${BLOCO_PREFIXO[p.bloco]}${String(num).padStart(2, '0')}`
}

function clonar(arr) {
  return arr.map(p => ({ ...p, opts: p.opts.map(o => ({ ...o })) }))
}

function blocoAlterado(perguntasBloco, blocoNum) {
  const originais = PERGUNTAS.filter(p => p.bloco === blocoNum)
  return originais.some((orig, i) => {
    const custom = perguntasBloco[i]
    if (!custom) return false
    if (custom.texto !== orig.texto) return true
    if (custom.inv !== orig.inv) return true
    return orig.opts.some((o, j) => o.t !== custom.opts[j]?.t)
  })
}

function PerguntaEditor({ pergunta, onChange }) {
  const [opcoesAberto, setOpcoesAberto] = useState(false)

  function handleOpt(i, valor) {
    const novosOpts = pergunta.opts.map((o, j) => j === i ? { ...o, t: valor } : o)
    onChange({ ...pergunta, opts: novosOpts })
  }

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono font-bold text-muted">{codigoPergunta(pergunta)}</span>
        <span className="text-sm font-semibold text-navy">{pergunta.item}</span>
        <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pergunta.inv}
            onChange={e => onChange({ ...pergunta, inv: e.target.checked })}
            className="w-3.5 h-3.5 accent-warning"
          />
          <span className="text-xs font-semibold text-warning">Invertida</span>
        </label>
      </div>

      {/* Enunciado */}
      <textarea
        className="input resize-none text-sm"
        rows={2}
        value={pergunta.texto}
        onChange={e => onChange({ ...pergunta, texto: e.target.value })}
      />

      {/* Opções de resposta */}
      <div>
        <button
          className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          onClick={() => setOpcoesAberto(v => !v)}
        >
          {opcoesAberto ? '▲' : '▼'} Opções de resposta
        </button>

        {opcoesAberto && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-5 gap-2">
            {pergunta.opts.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted w-4 flex-shrink-0">{opt.v}</span>
                <input
                  className="input text-xs py-1.5"
                  value={opt.t}
                  onChange={e => handleOpt(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BlocoCard({ bloco, nome, perguntas, onSave, onRestaurar, onChangeP, saving }) {
  const [aberto, setAberto] = useState(false)
  const alterado = blocoAlterado(perguntas, bloco)

  return (
    <div className="card p-0 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setAberto(v => !v)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-white px-2 py-0.5 rounded"
            style={{ background: '#1a2e4a' }}>
            Domínio {bloco}
          </span>
          <span className="font-bold text-navy text-sm">{nome}</span>
          <span className="text-xs text-muted">{perguntas.length} perguntas</span>
          {alterado
            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">Personalizado</span>
            : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">Padrão</span>
          }
        </div>
        <span className="text-muted ml-4">{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {perguntas.map((p, i) => (
            <PerguntaEditor
              key={p.id}
              pergunta={p}
              onChange={updated => onChangeP(bloco, i, updated)}
            />
          ))}

          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              className="btn-primary text-xs px-4"
              onClick={() => onSave(bloco)}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar domínio'}
            </button>
            {alterado && (
              <button
                className="btn-secondary text-xs px-4"
                onClick={() => onRestaurar(bloco)}
              >
                Restaurar padrão
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PerguntasPage() {
  const { user } = useAuth()
  const { empresaAtiva } = useEmpresa()

  const [perguntas, setPerguntas] = useState(clonar(PERGUNTAS))
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const [toast, setToast]         = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('nr1_perguntas')
      .select('perguntas')
      .eq('consultor_id', user.id)
      .maybeSingle()

    if (data?.perguntas?.length) {
      const mapa = {}
      for (const p of data.perguntas) mapa[p.id] = p
      setPerguntas(clonar(PERGUNTAS).map(p =>
        mapa[p.id]
          ? { ...p, texto: mapa[p.id].texto, opts: mapa[p.id].opts ?? p.opts, inv: mapa[p.id].inv ?? p.inv }
          : p
      ))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  function handleChangeP(bloco, idx, updated) {
    setPerguntas(prev => {
      const novas = [...prev]
      let i = 0
      for (let j = 0; j < novas.length; j++) {
        if (novas[j].bloco === bloco) {
          if (i === idx) { novas[j] = updated; break }
          i++
        }
      }
      return novas
    })
  }

  async function salvarBloco(bloco) {
    setSaving(true)
    const { error } = await supabase
      .from('nr1_perguntas')
      .upsert({ consultor_id: user.id, perguntas }, { onConflict: 'consultor_id' })
    setSaving(false)
    if (error) setToast({ message: 'Erro: ' + error.message, type: 'error' })
    else setToast({ message: 'Domínio salvo!', type: 'success' })
  }

  function restaurarBloco(bloco) {
    const originais = PERGUNTAS.filter(p => p.bloco === bloco)
    setPerguntas(prev => {
      const novas = [...prev]
      let i = 0
      for (let j = 0; j < novas.length; j++) {
        if (novas[j].bloco === bloco) {
          novas[j] = { ...originais[i++] }
        }
      }
      return novas
    })
    setToast({ message: 'Restaurado. Clique em "Salvar domínio" para confirmar.', type: 'info' })
  }

  async function restaurarTudo() {
    setSaving(true)
    const { error } = await supabase
      .from('nr1_perguntas')
      .delete()
      .eq('consultor_id', user.id)
    setSaving(false)
    setConfirmAll(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setPerguntas(clonar(PERGUNTAS))
    setToast({ message: 'Todas as perguntas restauradas para o padrão.', type: 'success' })
  }

  const blocos = [...new Set(PERGUNTAS.map(p => p.bloco))].map(b => ({
    bloco: b,
    nome:  PERGUNTAS.find(p => p.bloco === b).blocoNome,
    perguntas: perguntas.filter(p => p.bloco === b),
  }))

  const algumAlterado = blocos.some(b => blocoAlterado(b.perguntas, b.bloco))

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted text-sm">Carregando...</div>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Questionário COPSOQ II"
        eyebrow={empresaAtiva?.nome}
        subtitle={`${blocos.length} domínios · ${PERGUNTAS.length} perguntas — ajuste os enunciados conforme necessário`}
        action={
          algumAlterado && (
            <button className="btn-secondary text-sm" onClick={() => setConfirmAll(true)}>
              Restaurar tudo
            </button>
          )
        }
      />

      <div className="card border-l-4 border-primary">
        <p className="text-sm text-muted leading-relaxed">
          O <strong className="text-navy">COPSOQ II (Copenhagen Psychosocial Questionnaire II)</strong> é um instrumento
          validado internacionalmente para avaliação de riscos psicossociais no trabalho, em conformidade com a NR-1.
          Estruturado em 8 domínios e 29 subescalas, identifica fatores de risco relacionados à organização do trabalho,
          relações sociais, liderança, saúde e bem-estar dos colaboradores. Os enunciados das perguntas podem ser
          personalizados para refletir melhor a realidade de cada empresa, sem alterar a metodologia de cálculo.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <strong>Atenção:</strong> Alterações aqui valem para o questionário enviado a <strong>todos os colaboradores</strong> desta consultoria.
        Subfatores (sf) e escala de valores (1–5) são fixos.
      </div>

      <div className="space-y-3">
        {blocos.map(b => (
          <BlocoCard
            key={b.bloco}
            bloco={b.bloco}
            nome={b.nome}
            perguntas={b.perguntas}
            saving={saving}
            onSave={salvarBloco}
            onRestaurar={restaurarBloco}
            onChangeP={handleChangeP}
          />
        ))}
      </div>

      {confirmAll && (
        <ConfirmModal
          title="Restaurar tudo"
          message="Restaurar todas as perguntas para o texto padrão? Todas as personalizações serão perdidas."
          confirmLabel="Restaurar tudo"
          danger
          onConfirm={restaurarTudo}
          onClose={() => setConfirmAll(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
