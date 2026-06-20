import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { configClimaInicial } from '@/lib/culturaDefaults'

const LIKERT_OPTS = [
  { v: 1, t: 'Discordo totalmente' },
  { v: 2, t: 'Discordo' },
  { v: 3, t: 'Neutro' },
  { v: 4, t: 'Concordo' },
  { v: 5, t: 'Concordo totalmente' },
]

function LikertInput({ value, onChange }) {
  return (
    <div className="space-y-2">
      {LIKERT_OPTS.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all
            ${value === o.v ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border hover:border-primary/40 text-navy'}`}
        >
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

function SimNaoInput({ value, onChange }) {
  return (
    <div className="flex gap-3">
      <button onClick={() => onChange('sim')}
        className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all
          ${value === 'sim' ? 'border-green-500 bg-green-50 text-green-700' : 'border-border hover:border-green-300 text-navy'}`}>
        ✓ Sim
      </button>
      <button onClick={() => onChange('nao')}
        className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all
          ${value === 'nao' ? 'border-red-400 bg-red-50 text-red-700' : 'border-border hover:border-red-200 text-navy'}`}>
        ✕ Não
      </button>
    </div>
  )
}

export default function ClimaPublicaPage() {
  const [params] = useSearchParams()
  const empresaId = params.get('empresa') || ''

  const [empresa, setEmpresa]   = useState(null)
  const [topicos, setTopicos]   = useState([])
  const [setores, setSetores]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState('')
  const [fase, setFase]         = useState('welcome')
  const [setorId, setSetorId]   = useState(undefined)
  const [topicoIdx, setTopicoIdx] = useState(0)
  const [respostas, setRespostas] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    async function carregar() {
      if (!empresaId) { setErro('Link inválido.'); setLoading(false); return }
      const [{ data: emp }, { data: pesq }, { data: setsData }] = await Promise.all([
        supabase.from('empresas').select('id, nome').eq('id', empresaId).single(),
        supabase.from('clima_pesquisas').select('configuracao').eq('empresa_id', empresaId).maybeSingle(),
        supabase.from('setores').select('id, nome').eq('empresa_id', empresaId).order('nome'),
      ])
      if (!emp) { setErro('Empresa não encontrada.'); setLoading(false); return }
      setEmpresa(emp)
      setSetores(setsData ?? [])
      const cfg = pesq?.configuracao ?? configClimaInicial()
      setTopicos([...(cfg.topicos_fixos ?? []), ...(cfg.topicos_custom ?? [])])
      setLoading(false)
    }
    carregar()
  }, [empresaId])

  function setResp(topicoId, pergId, valor) {
    setRespostas(r => ({ ...r, [topicoId]: { ...(r[topicoId] ?? {}), [pergId]: valor } }))
  }

  function topicoCompleto(topico) {
    const r = respostas[topico.id] ?? {}
    return topico.perguntas.filter(p => p.tipo !== 'texto').every(p => r[p.id] != null)
  }

  async function enviar() {
    setEnviando(true)
    setErroEnvio('')
    const { error } = await supabase.from('clima_respostas').insert({ empresa_id: empresaId, setor_id: setorId === undefined ? null : setorId, respostas })
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
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-black text-navy">Obrigado pela sua participação!</h2>
        <p className="text-sm text-muted mt-2">Sua resposta foi registrada com sucesso.</p>
      </div>
    </div>
  )

  if (fase === 'welcome') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="bg-navy text-white rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🌡️</div>
          <h1 className="font-black text-lg">Pesquisa de Clima Organizacional</h1>
          <p className="text-white/70 text-sm mt-1">{empresa.nome}</p>
          <span className="inline-block mt-3 bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full">
            🔒 100% Anônimo
          </span>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm font-semibold text-navy mb-2">Sobre esta pesquisa</p>
          <p className="text-sm text-muted">
            Esta pesquisa busca entender como você percebe o ambiente de trabalho. Suas respostas são
            completamente anônimas e serão usadas para melhorias internas.
          </p>
          <p className="text-sm text-muted mt-2">
            São <strong className="text-navy">{topicos.length} tópicos</strong> com poucas perguntas cada. Leva cerca de 5 minutos.
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
          <h1 className="font-black text-lg">Pesquisa de Clima Organizacional</h1>
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

  const topico = topicos[topicoIdx]
  if (!topico) return null
  const respsTopico = respostas[topico.id] ?? {}
  const ultimo = topicoIdx === topicos.length - 1

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-6 pb-16">

        {/* Header com progresso */}
        <div className="bg-navy text-white rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-black text-sm">Pesquisa de Clima</h1>
            <span className="text-white/60 text-xs">{topicoIdx + 1} / {topicos.length}</span>
          </div>
          <div className="flex gap-1">
            {topicos.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= topicoIdx ? 'bg-primary' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        {/* Badge do tópico */}
        <div className="mb-4">
          <span className="inline-block bg-primary text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full">
            {topico.nome}
          </span>
        </div>

        {/* Perguntas */}
        <div className="space-y-4">
          {topico.perguntas.map(p => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-sm font-semibold text-navy mb-4">{p.texto}</p>
              {(!p.tipo || p.tipo === 'likert') && (
                <LikertInput value={respsTopico[p.id]} onChange={v => setResp(topico.id, p.id, v)} />
              )}
              {p.tipo === 'sim_nao' && (
                <SimNaoInput value={respsTopico[p.id]} onChange={v => setResp(topico.id, p.id, v)} />
              )}
              {p.tipo === 'texto' && (
                <textarea
                  className="input w-full h-24 resize-none"
                  placeholder="Sua resposta (opcional)..."
                  value={respsTopico[p.id] ?? ''}
                  onChange={e => setResp(topico.id, p.id, e.target.value || undefined)}
                />
              )}
            </div>
          ))}
        </div>

        {erroEnvio && <p className="text-red-500 text-xs text-center mt-3">{erroEnvio}</p>}

        <div className="flex gap-3 mt-5">
          {topicoIdx > 0 && (
            <button className="btn-secondary flex-1" onClick={() => setTopicoIdx(i => i - 1)}>
              ← Voltar
            </button>
          )}
          {ultimo ? (
            <button className="btn-primary flex-1" onClick={enviar}
              disabled={!topicoCompleto(topico) || enviando}>
              {enviando ? 'Enviando...' : 'Finalizar ✓'}
            </button>
          ) : (
            <button className="btn-primary flex-1"
              onClick={() => setTopicoIdx(i => i + 1)}
              disabled={!topicoCompleto(topico)}>
              Avançar →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
