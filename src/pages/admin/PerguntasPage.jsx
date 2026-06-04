import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PERGUNTAS } from '@/lib/perguntas'
import { PageHeader, Toast, ConfirmModal } from '@/components/ui'

// Clona profundamente para evitar mutações acidentais
function clonar(arr) {
  return arr.map(p => ({ ...p, opts: p.opts.map(o => ({ ...o })) }))
}

// Verifica se um bloco tem alguma diferença em relação ao padrão
function blocoAlterado(perguntasBloco, blocoNum) {
  const originais = PERGUNTAS.filter(p => p.bloco === blocoNum)
  return originais.some((orig, i) => {
    const custom = perguntasBloco[i]
    if (!custom) return false
    if (custom.texto !== orig.texto) return true
    return orig.opts.some((o, j) => o.t !== custom.opts[j]?.t)
  })
}

function BadgeBloco({ alterado }) {
  return alterado
    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">Personalizado</span>
    : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">Padrão</span>
}

function PerguntaEditor({ pergunta, onChange }) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold text-muted">{pergunta.id}</span>
        <span className="text-xs bg-primary-light text-primary font-bold px-1.5 py-0.5 rounded">
          {pergunta.sf}
        </span>
        {pergunta.inv && (
          <span className="text-xs bg-warning/10 text-warning font-bold px-1.5 py-0.5 rounded">
            invertida
          </span>
        )}
      </div>

      {/* Enunciado */}
      <textarea
        className="input resize-none text-sm"
        rows={2}
        value={pergunta.texto}
        onChange={e => onChange({ ...pergunta, texto: e.target.value })}
      />

      {/* Opções */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {pergunta.opts.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted w-4 flex-shrink-0">{opt.v}</span>
            <input
              className="input text-xs py-1.5"
              value={opt.t}
              onChange={e => {
                const novosOpts = pergunta.opts.map((o, j) => j === i ? { ...o, t: e.target.value } : o)
                onChange({ ...pergunta, opts: novosOpts })
              }}
            />
          </div>
        ))}
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
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white px-2 py-0.5 rounded"
            style={{ background: '#1a2e4a' }}>
            Bloco {bloco}
          </span>
          <span className="font-bold text-navy text-sm">{nome}</span>
          <span className="text-xs text-muted">{perguntas.length} perguntas</span>
          <BadgeBloco alterado={alterado} />
        </div>
        <span className="text-muted">{aberto ? '▲' : '▼'}</span>
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
              {saving ? 'Salvando...' : 'Salvar bloco'}
            </button>
            <button
              className="btn-secondary text-xs px-4"
              onClick={() => onRestaurar(bloco)}
            >
              Restaurar padrão
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PerguntasPage() {
  const { user } = useAuth()

  const [perguntas, setPerguntas] = useState(clonar(PERGUNTAS))
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const [toast, setToast]         = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('perguntas_customizadas')
      .select('perguntas')
      .eq('consultor_id', user.id)
      .maybeSingle()

    if (data?.perguntas?.length) {
      // Mescla: mantém estrutura do padrão, substitui texto/opts salvos
      const mapa = {}
      for (const p of data.perguntas) mapa[p.id] = p
      setPerguntas(clonar(PERGUNTAS).map(p => mapa[p.id]
        ? { ...p, texto: mapa[p.id].texto, opts: mapa[p.id].opts }
        : p
      ))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  function handleChangeP(bloco, idx, updated) {
    setPerguntas(prev => prev.map(p =>
      p.bloco === bloco
        ? (prev.filter(x => x.bloco === bloco).indexOf(p) === idx ? updated : p)
        : p
    ))
  }

  async function salvarBloco(bloco) {
    setSaving(true)
    // Substitui as perguntas desse bloco no array completo atual
    const payload = perguntas
    const { error } = await supabase
      .from('perguntas_customizadas')
      .upsert({ consultor_id: user.id, perguntas: payload }, { onConflict: 'consultor_id' })
    setSaving(false)
    if (error) setToast({ message: 'Erro: ' + error.message, type: 'error' })
    else setToast({ message: `Bloco ${bloco} salvo!`, type: 'success' })
  }

  function restaurarBloco(bloco) {
    const originais = PERGUNTAS.filter(p => p.bloco === bloco)
    setPerguntas(prev => {
      const novas = [...prev]
      let idxOriginal = 0
      for (let i = 0; i < novas.length; i++) {
        if (novas[i].bloco === bloco) {
          novas[i] = clonar([originais[idxOriginal++]])[0]
        }
      }
      return novas
    })
    setToast({ message: `Bloco ${bloco} restaurado para o padrão. Clique em "Salvar bloco" para confirmar.`, type: 'info' })
  }

  async function restaurarTudo() {
    setSaving(true)
    const { error } = await supabase
      .from('perguntas_customizadas')
      .delete()
      .eq('consultor_id', user.id)
    setSaving(false)
    setConfirmAll(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setPerguntas(clonar(PERGUNTAS))
    setToast({ message: 'Todas as perguntas restauradas para o padrão COPSOQ II.', type: 'success' })
  }

  // Agrupa blocos
  const blocos = [...new Set(PERGUNTAS.map(p => p.bloco))].map(b => ({
    bloco: b,
    nome:  PERGUNTAS.find(p => p.bloco === b).blocoNome,
    perguntas: perguntas.filter(p => p.bloco === b),
  }))

  if (loading) return <div className="flex items-center justify-center py-20 text-muted text-sm">Carregando...</div>

  const algumAlterado = blocos.some(b => blocoAlterado(b.perguntas, b.bloco))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Questionário COPSOQ II"
        subtitle="Edite os enunciados e opções de resposta para todos os clientes da consultoria"
        action={
          <button
            className="btn-secondary text-sm"
            onClick={() => setConfirmAll(true)}
            disabled={!algumAlterado}
          >
            Restaurar tudo
          </button>
        }
      />

      <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 text-sm text-warning">
        <strong>Atenção:</strong> As alterações aqui valem para o questionário enviado a <strong>todos os colaboradores</strong> de todos os clientes desta consultoria.
        Subescalas (sf) e valores (1–5) são fixos e não podem ser alterados.
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
          message="Restaurar todas as perguntas para o padrão original do COPSOQ II? Todas as personalizações serão perdidas."
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
