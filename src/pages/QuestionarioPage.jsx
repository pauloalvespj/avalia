import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PERGUNTAS } from '@/lib/perguntas'

export default function QuestionarioPage() {
  const [params] = useSearchParams()
  const empresaId = params.get('emp') || ''

  const [empresa, setEmpresa]                     = useState(null)
  const [setores, setSetores]                     = useState([])
  const [perguntasAtivas, setPerguntasAtivas]     = useState(PERGUNTAS)
  const [loadingInicial, setLoadingInicial]       = useState(true)
  const [erroInicial, setErroInicial]             = useState('')

  const [setorEscolhido, setSetorEscolhido] = useState(null)

  const [idx, setIdx]             = useState(0)
  const [respostas, setRespostas] = useState({})
  const [enviando, setEnviando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    async function carregar() {
      if (!empresaId) {
        setErroInicial('Link inválido: empresa não informada.')
        setLoadingInicial(false)
        return
      }

      const [{ data: emp }, { data: secs }] = await Promise.all([
        supabase.from('empresas').select('id, nome, consultor_id').eq('id', empresaId).single(),
        supabase.from('setores').select('id, nome').eq('empresa_id', empresaId).order('nome'),
      ])

      if (!emp) {
        setErroInicial('Empresa não encontrada.')
        setLoadingInicial(false)
        return
      }

      // Carrega personalizações de texto do consultor dono da empresa
      if (emp.consultor_id) {
        const { data: custom } = await supabase
          .from('nr1_perguntas')
          .select('perguntas')
          .eq('consultor_id', emp.consultor_id)
          .maybeSingle()

        if (custom?.perguntas?.length) {
          const mapa = {}
          for (const p of custom.perguntas) mapa[p.id] = p
          setPerguntasAtivas(PERGUNTAS.map(p =>
            mapa[p.id]
              ? { ...p, texto: mapa[p.id].texto, opts: mapa[p.id].opts ?? p.opts, inv: mapa[p.id].inv ?? p.inv }
              : p
          ))
        }
      }

      setEmpresa(emp)
      setSetores(secs ?? [])
      setLoadingInicial(false)
    }
    carregar()
  }, [empresaId])

  const total   = perguntasAtivas.length
  const p       = perguntasAtivas[idx]
  const progPct = Math.round((idx / total) * 100)

  function selecionar(v) {
    setRespostas(r => ({ ...r, [p.id]: v }))
    setErro('')
  }

  function avancar() {
    if (respostas[p.id] == null) { setErro('Selecione uma opção para continuar.'); return }
    if (idx === total - 1) enviar()
    else setIdx(i => i + 1)
  }

  async function enviar() {
    setEnviando(true)
    const { error } = await supabase.from('nr1_respostas').insert({
      empresa_id: empresaId || null,
      setor_id:   setorEscolhido?.id || null,
      respostas,
    })
    setEnviando(false)
    if (error) { setErro('Erro ao enviar: ' + error.message); return }
    setConcluido(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Loading ──
  if (loadingInicial) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-muted text-sm">Carregando...</p>
    </div>
  )

  // ── Erro ──
  if (erroInicial) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center py-10">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-sm text-danger font-semibold">{erroInicial}</p>
      </div>
    </div>
  )

  // ── Conclusão ──
  if (concluido) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-black text-navy">Resposta registrada!</h2>
        <p className="text-sm text-muted mt-2">Obrigado por participar.</p>
      </div>
    </div>
  )

  // ── Seleção de setor ──
  if (!setorEscolhido) return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="bg-navy text-white rounded-2xl p-5 mb-6 text-center">
          <h1 className="font-black text-base">Questionário de Avaliação Psicossocial</h1>
          <p className="text-sm font-semibold mt-1 text-white/80">{empresa.nome}</p>
          <p className="text-xs text-white/60 mt-1">Suas respostas são <strong>anônimas</strong>.</p>
        </div>

        <div className="card">
          <h2 className="font-bold text-navy text-sm mb-1">Em qual setor você trabalha?</h2>
          <p className="text-xs text-muted mb-4">Selecione seu setor para iniciar o questionário.</p>

          {setores.length === 0 ? (
            <p className="text-sm text-danger text-center py-4">
              Nenhum setor disponível. Contate o responsável.
            </p>
          ) : (
            <div className="space-y-2">
              {setores.map(s => (
                <button key={s.id} onClick={() => setSetorEscolhido(s)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary-light text-sm font-semibold text-navy transition-all text-left">
                  {s.nome}
                  <span className="text-primary text-xs">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Quiz ──
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-6 pb-16">

        {/* Header */}
        <div className="bg-navy text-white rounded-2xl p-5 mb-5">
          <h1 className="font-black text-base">Questionário de Avaliação Psicossocial</h1>
          <p className="text-xs text-white/70 mt-1">Suas respostas são <strong>anônimas</strong>.</p>
          <div className="flex gap-6 mt-3">
            <div>
              <div className="text-[10px] text-white/50 uppercase tracking-wide">Empresa</div>
              <div className="text-sm font-bold">{empresa.nome}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/50 uppercase tracking-wide">Setor</div>
              <div className="text-sm font-bold">{setorEscolhido.nome}</div>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: progPct + '%' }} />
          </div>
          <div className="text-right text-[11px] text-white/60 mt-1">{idx + 1} de {total}</div>
        </div>

        {/* Card da pergunta */}
        <div className="card">
          <span className="inline-block bg-primary-light text-primary text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4">
            {p.blocoNome}
          </span>
          <p className="text-base font-semibold text-navy mb-5">
            <span className="text-muted font-bold mr-1">{idx + 1}.</span>{p.texto}
          </p>

          <div className="space-y-2.5">
            {p.opts.map(o => (
              <button key={o.v} onClick={() => selecionar(o.v)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm text-left transition-all
                  ${respostas[p.id] === o.v
                    ? 'border-primary bg-primary-light font-semibold'
                    : 'border-border hover:border-primary/50 hover:bg-gray-50'}`}>
                <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                  ${respostas[p.id] === o.v ? 'border-primary' : 'border-gray-300'}`}>
                  {respostas[p.id] === o.v && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </span>
                {o.t}
              </button>
            ))}
          </div>

          {erro && <p className="text-danger text-xs mt-3 text-center">{erro}</p>}

          <div className="flex gap-3 mt-5">
            {idx > 0 && (
              <button className="btn-secondary flex-1" onClick={() => setIdx(i => i - 1)}>
                ← Voltar
              </button>
            )}
            <button className="btn-primary flex-1" onClick={avancar} disabled={enviando}>
              {enviando ? 'Enviando...' : idx === total - 1 ? 'Finalizar ✓' : 'Avançar →'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-6">Avaliary</p>
      </div>
    </div>
  )
}
