import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { configNpsInicial } from '@/lib/culturaDefaults'

const LIKERT_OPTS = [
  { v: 1, t: 'Discordo totalmente' },
  { v: 2, t: 'Discordo' },
  { v: 3, t: 'Neutro' },
  { v: 4, t: 'Concordo' },
  { v: 5, t: 'Concordo totalmente' },
]

function NpsScale({ value, onChange }) {
  const cor = (n) => n <= 6 ? '#ef4444' : n <= 8 ? '#eab308' : '#22c55e'
  return (
    <div>
      <div className="grid grid-cols-11 gap-1 mb-3">
        {Array.from({ length: 11 }, (_, i) => i).map(n => (
          <button key={n} onClick={() => onChange(n)}
            className={`py-3 rounded-lg text-sm font-bold transition-all ${value === n ? 'text-white shadow-md scale-110' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={value === n ? { background: cor(n) } : undefined}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>Definitivamente não</span>
        <span>Com certeza sim</span>
      </div>
    </div>
  )
}

function LikertInput({ value, onChange }) {
  return (
    <div className="space-y-2">
      {LIKERT_OPTS.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all
            ${value === o.v ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border hover:border-primary/40 text-navy'}`}>
          <span className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold
            ${value === o.v ? 'border-primary bg-primary text-white' : 'border-gray-300 text-muted'}`}>
            {o.v}
          </span>
          {o.t}
        </button>
      ))}
    </div>
  )
}

export default function NpsPublicaPage() {
  const [params] = useSearchParams()
  const empresaId = params.get('empresa') || ''

  const [empresa, setEmpresa]     = useState(null)
  const [categorias, setCategorias] = useState([])
  const [setores, setSetores]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [erro, setErro]           = useState('')
  const [fase, setFase]           = useState('welcome')
  const [setorId, setSetorId]     = useState(undefined)
  const [step, setStep]           = useState(0)  // 0=NPS, 1..N=categorias, N+1=comentario
  const [notaNps, setNotaNps]     = useState(null)
  const [respostas, setRespostas] = useState({})
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando]   = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    async function carregar() {
      if (!empresaId) { setErro('Link inválido.'); setLoading(false); return }
      const [{ data: emp }, { data: pesq }, { data: setsData }] = await Promise.all([
        supabase.from('empresas').select('id, nome').eq('id', empresaId).single(),
        supabase.from('nps_pesquisas').select('configuracao').eq('empresa_id', empresaId).maybeSingle(),
        supabase.from('setores').select('id, nome').eq('empresa_id', empresaId).order('nome'),
      ])
      if (!emp) { setErro('Empresa não encontrada.'); setLoading(false); return }
      setEmpresa(emp)
      setSetores(setsData ?? [])
      const cfg = pesq?.configuracao ?? configNpsInicial()
      setCategorias(cfg.categorias ?? [])
      setLoading(false)
    }
    carregar()
  }, [empresaId])

  function setResp(catId, pergId, valor) {
    setRespostas(r => ({ ...r, [catId]: { ...(r[catId] ?? {}), [pergId]: valor } }))
  }

  function categoriaCompleta(cat) {
    const r = respostas[cat.id] ?? {}
    return cat.perguntas.every(p => r[p.id] != null)
  }

  async function enviar() {
    setEnviando(true)
    setErroEnvio('')
    const { error } = await supabase.from('nps_respostas').insert({
      empresa_id: empresaId,
      setor_id: setorId === undefined ? null : setorId,
      nota_nps: notaNps,
      respostas,
      comentario: comentario || null,
    })
    setEnviando(false)
    if (error) { setErroEnvio('Erro ao enviar: ' + error.message); return }
    setConcluido(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-muted text-sm">Carregando...</p>
    </div>
  )

  if (erro) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-10 text-center max-w-sm w-full">
        <p className="text-red-500 font-semibold">{erro}</p>
      </div>
    </div>
  )

  if (concluido) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-12 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">⭐</div>
        <h2 className="text-xl font-black text-navy">Obrigado pelo seu feedback!</h2>
        <p className="text-sm text-muted mt-2">Sua resposta foi registrada com sucesso.</p>
      </div>
    </div>
  )

  if (fase === 'welcome') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="bg-navy text-white rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <h1 className="font-black text-lg">Pesquisa NPS</h1>
          <p className="text-white/70 text-sm mt-1">{empresa.nome}</p>
          <span className="inline-block mt-3 bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full">
            🔒 100% Anônimo
          </span>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm font-semibold text-navy mb-2">Sobre esta pesquisa</p>
          <p className="text-sm text-muted">
            Queremos saber o quanto você indicaria esta empresa como um bom lugar para trabalhar e
            como avalia aspectos do ambiente de trabalho. Leva cerca de 3 minutos.
          </p>
        </div>
        <button className="btn-primary w-full py-3 text-base" onClick={() => setFase(setores.length ? 'setor' : 'quiz')}>
          Iniciar pesquisa →
        </button>
      </div>
    </div>
  )

  if (fase === 'setor') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="bg-navy text-white rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🏬</div>
          <h1 className="font-black text-lg">Pesquisa NPS</h1>
          <p className="text-white/70 text-sm mt-1">{empresa.nome}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <p className="text-sm font-semibold text-navy">Em qual setor você trabalha?</p>
          <div className="space-y-2">
            {setores.map(s => (
              <button key={s.id} onClick={() => setSetorId(s.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all
                  ${setorId === s.id ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border hover:border-primary/40 text-navy'}`}>
                {s.nome}
              </button>
            ))}
            <button onClick={() => setSetorId(null)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all
                ${setorId === null ? 'border-gray-400 bg-gray-50 font-semibold text-gray-600' : 'border-border hover:border-gray-300 text-muted'}`}>
              Prefiro não informar
            </button>
          </div>
        </div>
        <button className="btn-primary w-full py-3 text-base"
          onClick={() => setFase('quiz')}
          disabled={setorId === undefined}>
          Continuar →
        </button>
      </div>
    </div>
  )

  const totalSteps = 1 + categorias.length + 1 // NPS + categorias + comentario
  const progresso = ((step + 1) / totalSteps) * 100

  // Step 0: NPS
  if (step === 0) return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-6 pb-16">
        <div className="bg-navy text-white rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-black text-sm">Pesquisa NPS</h1>
            <span className="text-white/60 text-xs">1 / {totalSteps}</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full">
            <div className="h-full bg-primary rounded-full" style={{ width: progresso + '%' }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm font-semibold text-navy mb-2">Pergunta principal</p>
          <p className="text-base font-bold text-navy mb-6">
            Em uma escala de 0 a 10, o quanto você recomendaria esta empresa como um bom lugar para trabalhar?
          </p>
          <NpsScale value={notaNps} onChange={setNotaNps} />
        </div>

        <div className="flex justify-end mt-5">
          <button className="btn-primary" onClick={() => setStep(1)} disabled={notaNps == null}>
            Avançar →
          </button>
        </div>
      </div>
    </div>
  )

  // Steps 1..N: categorias
  if (step >= 1 && step <= categorias.length) {
    const cat = categorias[step - 1]
    const resps = respostas[cat.id] ?? {}
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 py-6 pb-16">
          <div className="bg-navy text-white rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h1 className="font-black text-sm">Pesquisa NPS</h1>
              <span className="text-white/60 text-xs">{step + 1} / {totalSteps}</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full">
              <div className="h-full bg-primary rounded-full" style={{ width: progresso + '%' }} />
            </div>
          </div>

          <div className="mb-4">
            <span className="inline-block bg-primary text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full">
              {cat.nome}
            </span>
          </div>

          <div className="space-y-4">
            {cat.perguntas.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-sm font-semibold text-navy mb-4">{p.texto}</p>
                <LikertInput value={resps[p.id]} onChange={v => setResp(cat.id, p.id, v)} />
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <button className="btn-secondary flex-1" onClick={() => setStep(s => s - 1)}>
              ← Voltar
            </button>
            <button className="btn-primary flex-1"
              onClick={() => setStep(s => s + 1)}
              disabled={!categoriaCompleta(cat)}>
              Avançar →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Último step: comentário
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-6 pb-16">
        <div className="bg-navy text-white rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-black text-sm">Pesquisa NPS</h1>
            <span className="text-white/60 text-xs">{totalSteps} / {totalSteps}</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full">
            <div className="h-full bg-primary rounded-full w-full" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm font-semibold text-navy mb-1">Comentário final (opcional)</p>
          <p className="text-xs text-muted mb-3">O que poderia melhorar na empresa?</p>
          <textarea
            className="input w-full h-28 resize-none"
            placeholder="Escreva aqui sua sugestão..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
          />
        </div>

        {erroEnvio && <p className="text-red-500 text-xs text-center mt-3">{erroEnvio}</p>}

        <div className="flex gap-3 mt-5">
          <button className="btn-secondary flex-1" onClick={() => setStep(s => s - 1)}>
            ← Voltar
          </button>
          <button className="btn-primary flex-1" onClick={enviar} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Finalizar ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
